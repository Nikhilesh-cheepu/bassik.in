import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { isTeamDesignerMember } from "@/lib/team-members";
import {
  clearDesignerJobChecklistHandoff,
  findActiveDesignerJob,
  linksFromText,
  loadDesignerEditMetaByIds,
  loadDesignerFileUrlsByIds,
  loadDesignerJobLinksByIds,
  nextManualDesignerSortOrder,
  parseDesignerLinks,
  bankDesignerActiveSegment,
  ensureDesignerWorkTimingColumns,
  pauseDesignerJobNow,
  releaseDesignerJobFromCatchUp,
  setDesignerEditRequest,
  setDesignerJobFileUrls,
  setDesignerJobLinks,
  setDesignerPauseRequest,
  syncDesignerJobToChecklistHandoff,
  toDesignerJobDto,
} from "@/lib/team-designer-jobs";
import { addDaysYmd, getTodayKey } from "@/lib/team-checklists";
import {
  isBoilerplateDesignerDescription,
  normalizeDesignerFileUrls,
  parseDesignerPriorityMode,
  type DesignerPriorityMode,
} from "@/lib/team-designer-jobs-shared";
import { deleteTeamHandoffBlobUrl } from "@/lib/team-handoff-blobs";
import {
  getAmitReadyNudge,
} from "@/lib/team-designer-nudges";

async function jobDtoWithLinks(job: Parameters<typeof toDesignerJobDto>[0]) {
  const [linksMap, editMap, filesMap] = await Promise.all([
    loadDesignerJobLinksByIds([job.id]),
    loadDesignerEditMetaByIds([job.id]),
    loadDesignerFileUrlsByIds([job.id]),
  ]);
  const edit = editMap.get(job.id);
  return toDesignerJobDto({
    ...job,
    links: linksMap.get(job.id) ?? [],
    fileUrls: filesMap.get(job.id) ?? normalizeDesignerFileUrls(job.fileUrl, null),
    editRequestedAt: edit?.editRequestedAt ?? null,
    editRequestNote: edit?.editRequestNote ?? null,
    pauseRequestedAt: edit?.pauseRequestedAt ?? null,
    pauseRequestNote: edit?.pauseRequestNote ?? null,
    catchUpExempt: edit?.catchUpExempt ?? false,
    activeWorkMs: edit?.activeWorkMs ?? 0,
    pausedAt: edit?.pausedAt ?? null,
    noPost: edit?.noPost ?? false,
  });
}

function fileUrlsFromBody(body: {
  fileUrl?: string;
  fileUrls?: unknown;
}): string[] {
  const fromList = Array.isArray(body.fileUrls)
    ? body.fileUrls.filter((u): u is string => typeof u === "string")
    : [];
  return normalizeDesignerFileUrls(
    typeof body.fileUrl === "string" ? body.fileUrl : null,
    fromList
  );
}

async function deleteJobCreativeBlobs(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => deleteTeamHandoffBlobUrl(u)));
}

type Action =
  | "set-brief"
  | "brief-ready"
  | "brief-waiting"
  | "start"
  | "upload-close"
  | "set-upload"
  | "mark-done"
  | "replace-upload"
  | "clear-upload"
  | "force-clear"
  | "set-urgent"
  | "request-edit"
  | "approve-edit"
  | "reject-edit"
  | "reopen"
  | "request-pause"
  | "approve-pause"
  | "reject-pause"
  | "pause"
  | "resume"
  | "unsend"
  | "delete"
  | "purge-file"
  | "release-catch-up";

/** Designers must wait this long after Start before Upload & close. Admin bypasses. */
const DESIGNER_UPLOAD_WAIT_MS = 2 * 60 * 1000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer" || session.role === "content") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const memberId = session.memberId ?? session.username;
  const isAdmin = session.role === "admin";

  try {
    const job = await prisma.teamDesignerJob.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as {
      action?: Action;
      title?: string;
      description?: string;
      note?: string;
      links?: string | string[];
      urgent?: boolean;
      priorityMode?: string;
      fileUrl?: string;
      fileUrls?: string[];
      postingNotes?: string;
      scheduleNote?: string;
      waApproved?: boolean;
      format?: string;
      /** Start/resume while another job is IN_PROGRESS — pause the old one */
      confirmAutoPause?: boolean;
    };

    const action = body.action;
    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 });
    }

    const isAssignee = job.assigneeId === memberId;
    const canDesignerAct = isAssignee && isTeamDesignerMember(memberId);

    if (action === "set-brief" || action === "brief-ready" || action === "brief-waiting") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : undefined;
      const rawDescription =
        body.description !== undefined
          ? body.description.trim() || null
          : job.description;
      const description =
        rawDescription &&
        isBoilerplateDesignerDescription(rawDescription, title ?? job.title)
          ? null
          : rawDescription;
      let links: string[] | undefined;
      if (typeof body.links === "string") links = linksFromText(body.links);
      else if (Array.isArray(body.links)) links = parseDesignerLinks(body.links);

      let status = job.status;
      if (action === "brief-ready") {
        if (job.status === "WAITING_BRIEF" || job.status === "READY_TO_DESIGN") {
          status = "READY_TO_DESIGN";
        }
      } else if (action === "brief-waiting") {
        if (job.status === "READY_TO_DESIGN" || job.status === "WAITING_BRIEF") {
          status = "WAITING_BRIEF";
        }
      } else if (action === "set-brief") {
        // Save notes only — Send (brief-ready) is what puts it on the designer queue.
        status = job.status;
      }

      let priorityMode: DesignerPriorityMode | undefined =
        body.priorityMode !== undefined
          ? parseDesignerPriorityMode(body.priorityMode)
          : undefined;
      // Late / tight deadline Send → jump the queue (Thu send for Mon-due Friday pack, etc.)
      if (action === "brief-ready") {
        const mode = priorityMode ?? "NONE";
        if (mode === "NONE") {
          const today = getTodayKey();
          const soon = addDaysYmd(today, 1);
          if (job.dueDate <= soon) {
            priorityMode = "AFTER_CURRENT";
          }
        }
      }
      const urgent =
        typeof body.urgent === "boolean"
          ? body.urgent
          : priorityMode && priorityMode !== "NONE"
            ? true
            : undefined;

      // Pin interrupt jobs in the manual sort band (above date queue)
      let sortOrder: number | undefined;
      if (action === "brief-ready" && priorityMode && priorityMode !== "NONE") {
        sortOrder = await nextManualDesignerSortOrder(job.assigneeId);
      }

      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          description,
          status,
          ...(title ? { title } : {}),
          ...(typeof urgent === "boolean" ? { urgent } : {}),
          ...(priorityMode ? { priorityMode } : {}),
          ...(typeof sortOrder === "number" ? { sortOrder } : {}),
        },
      });
      if (links) {
        await setDesignerJobLinks(id, links);
      }

      if (action === "brief-ready" && status === "READY_TO_DESIGN") {
        // Soft “queue changed” WA is a Send-now suggestion (last 30 min) — not auto-blast.
        if (priorityMode === "PAUSE_NOW") {
          const actives = await prisma.teamDesignerJob.findMany({
            where: {
              assigneeId: job.assigneeId,
              status: "IN_PROGRESS",
              id: { not: id },
            },
            select: { id: true },
          });
          for (const a of actives) {
            await pauseDesignerJobNow(a.id);
          }
        }
      }

      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
      });
    }

    if (action === "set-urgent") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const turningOn = Boolean(body.urgent);
      const priorityMode = turningOn
        ? parseDesignerPriorityMode(body.priorityMode ?? "AFTER_CURRENT")
        : ("NONE" as const);
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          urgent: turningOn,
          priorityMode,
        },
      });
      return NextResponse.json({ job: await jobDtoWithLinks(updated) });
    }

    if (action === "force-clear") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const existingFiles = (
        await loadDesignerFileUrlsByIds([id])
      ).get(id) ?? normalizeDesignerFileUrls(job.fileUrl, null);
      const canForceClear =
        job.status === "IN_PROGRESS" ||
        job.status === "PAUSED" ||
        job.status === "DESIGN_DONE" ||
        (job.status === "READY_TO_DESIGN" && existingFiles.length > 0);
      if (!canForceClear) {
        return NextResponse.json(
          { error: "Nothing to force-clear on this job" },
          { status: 400 }
        );
      }
      await deleteJobCreativeBlobs(existingFiles);
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on force-clear", e);
      }
      await ensureDesignerWorkTimingColumns();
      await prisma.$executeRawUnsafe(
        `UPDATE "TeamDesignerJob"
         SET status = 'READY_TO_DESIGN',
             "startedAt" = NULL,
             "startedByRole" = NULL,
             "uploadedAt" = NULL,
             "closedByRole" = NULL,
             "fileUrl" = NULL,
             "postingNotes" = NULL,
             "scheduleNote" = NULL,
             "waApproved" = false,
             "activeWorkMs" = 0,
             "pausedAt" = NULL,
             "updatedAt" = NOW()
         WHERE id = $1`,
        id
      );
      const updated = await prisma.teamDesignerJob.findUniqueOrThrow({ where: { id } });
      await setDesignerJobFileUrls(id, []);
      await setDesignerEditRequest(id, { at: null, note: null });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Cleared — designer must Start Job and upload again",
      });
    }

    if (action === "clear-upload") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const existingFiles = (
        await loadDesignerFileUrlsByIds([id])
      ).get(id) ?? normalizeDesignerFileUrls(job.fileUrl, null);
      if (existingFiles.length === 0) {
        return NextResponse.json({ error: "No upload to delete" }, { status: 400 });
      }
      await deleteJobCreativeBlobs(existingFiles);
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on clear-upload", e);
      }
      // Done stays Done (history). Open jobs just lose the attached file.
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          fileUrl: null,
          waApproved: false,
          ...(job.status === "DESIGN_DONE"
            ? {}
            : { uploadedAt: null }),
        },
      });
      await setDesignerJobFileUrls(id, []);
      await setDesignerEditRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message:
          job.status === "DESIGN_DONE"
            ? "Upload deleted — Done entry kept"
            : "Upload deleted — Ready removed from Daily",
      });
    }

    /** Admin: forgive one Catch up slot — job joins Today/Later by priority. */
    if (action === "release-catch-up") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status === "DESIGN_DONE") {
        return NextResponse.json({ error: "Done jobs stay in Done" }, { status: 400 });
      }
      await releaseDesignerJobFromCatchUp(id);
      const refreshed = await prisma.teamDesignerJob.findUnique({ where: { id } });
      if (!refreshed) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        job: await jobDtoWithLinks({ ...refreshed, catchUpExempt: true }),
        message: "Dropped from Catch up — count −1. Job is in Today/Later.",
      });
    }

    /** Expired creatives: delete blob only — Done history stays. */
    if (action === "purge-file") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const existingFiles = (
        await loadDesignerFileUrlsByIds([id])
      ).get(id) ?? normalizeDesignerFileUrls(job.fileUrl, null);
      if (job.status !== "DESIGN_DONE" || existingFiles.length === 0) {
        return NextResponse.json({ error: "Nothing to purge" }, { status: 400 });
      }
      await deleteJobCreativeBlobs(existingFiles);
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on purge-file", e);
      }
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          fileUrl: null,
          waApproved: false,
          // keep status DESIGN_DONE + uploadedAt so Done tab history stays
        },
      });
      await setDesignerJobFileUrls(id, []);
      return NextResponse.json({
        ok: true,
        job: await jobDtoWithLinks(updated),
        message: "File cleared — Done entry kept",
      });
    }

    if (action === "start" || action === "resume") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (job.status !== "READY_TO_DESIGN" && job.status !== "PAUSED") {
        return NextResponse.json(
          { error: "Only Ready or Paused jobs can be started" },
          { status: 400 }
        );
      }

      await ensureDesignerWorkTimingColumns();
      const active = await findActiveDesignerJob(job.assigneeId);
      const confirmAutoPause = body.confirmAutoPause === true;
      if (active && active.id !== job.id) {
        if (!confirmAutoPause) {
          return NextResponse.json(
            {
              error: `Starting “${job.title}” will pause “${active.title}”. You can resume it anytime.`,
              activeJobId: active.id,
              activeTitle: active.title,
              needsConfirm: true,
            },
            { status: 409 }
          );
        }
        await pauseDesignerJobNow(active.id);
      }

      const startedByRole = isAdmin && !canDesignerAct ? "admin" : "designer";
      const now = new Date();
      // Resume keeps banked activeWorkMs; only the live segment clock resets.
      await prisma.$executeRawUnsafe(
        `UPDATE "TeamDesignerJob"
         SET status = 'IN_PROGRESS',
             "startedAt" = $1,
             "startedByRole" = $2,
             "pausedAt" = NULL,
             "pauseRequestedAt" = NULL,
             "pauseRequestNote" = NULL,
             "updatedAt" = NOW()
         WHERE id = $3`,
        now,
        startedByRole,
        id
      );
      const updated = await prisma.teamDesignerJob.findUniqueOrThrow({ where: { id } });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message:
          job.status === "PAUSED"
            ? "Resumed"
            : active && active.id !== job.id
              ? `Started — paused “${active.title}”`
              : "Started",
        pausedJobId: active && active.id !== job.id ? active.id : undefined,
      });
    }

    // Designer or admin can pause immediately (work time is banked).
    if (action === "pause" || action === "request-pause") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (job.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Only in-progress jobs can be paused" }, { status: 400 });
      }
      await pauseDesignerJobNow(id);
      const updated = await prisma.teamDesignerJob.findUniqueOrThrow({ where: { id } });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Paused — Start again when ready",
      });
    }

    if (action === "approve-pause") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Job is not in progress" }, { status: 400 });
      }
      await pauseDesignerJobNow(id);
      const updated = await prisma.teamDesignerJob.findUniqueOrThrow({ where: { id } });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Pause approved",
      });
    }

    if (action === "reject-pause") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(job),
        message: "Pause request rejected",
      });
    }

    if (action === "upload-close") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (job.status !== "IN_PROGRESS" && !(isAdmin && job.status === "READY_TO_DESIGN")) {
        return NextResponse.json(
          { error: "Start the job before uploading" },
          { status: 400 }
        );
      }
      if (!isAdmin) {
        const startedMs = job.startedAt?.getTime() ?? 0;
        const remaining = DESIGNER_UPLOAD_WAIT_MS - (Date.now() - startedMs);
        if (!startedMs || remaining > 0) {
          const sec = Math.max(1, Math.ceil(remaining / 1000));
          return NextResponse.json(
            {
              error: `Please wait ${sec}s before you upload`,
              waitRemainingSec: sec,
            },
            { status: 429 }
          );
        }
      }
      const fileUrls = fileUrlsFromBody(body);
      if (fileUrls.length === 0) {
        return NextResponse.json(
          { error: "Upload at least one file" },
          { status: 400 }
        );
      }
      if (!body.waApproved && !isAdmin) {
        return NextResponse.json(
          { error: "Confirm WhatsApp approved before upload" },
          { status: 400 }
        );
      }

      const uploadedAt = new Date();
      const closedByRole = isAdmin && !canDesignerAct ? "admin" : "designer";
      await bankDesignerActiveSegment(id);
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "DESIGN_DONE",
          fileUrl: fileUrls[0]!,
          postingNotes:
            typeof body.postingNotes === "string"
              ? body.postingNotes.trim() || null
              : job.postingNotes,
          scheduleNote:
            typeof body.scheduleNote === "string"
              ? body.scheduleNote.trim() || null
              : job.scheduleNote,
          waApproved: true,
          uploadedAt,
          startedAt: job.startedAt ?? uploadedAt,
          closedByRole,
          pausedAt: null,
          ...(typeof body.format === "string" && body.format.trim()
            ? { format: body.format.trim() }
            : {}),
        },
      });
      await setDesignerJobFileUrls(id, fileUrls);
      await setDesignerEditRequest(id, { at: null, note: null });

      try {
        await syncDesignerJobToChecklistHandoff({ ...updated, fileUrl: fileUrls[0]! });
      } catch (e) {
        console.error("[designer-jobs] checklist sync", e);
      }

      const meta = (await loadDesignerEditMetaByIds([id])).get(id);
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        amitNudge: meta?.noPost ? null : await getAmitReadyNudge(),
        message: meta?.noPost ? "Done — no post (not sent to Amit)" : undefined,
      });
    }

    // Admin: attach creative without closing the job
    if (action === "set-upload") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const fileUrls = fileUrlsFromBody(body);
      if (fileUrls.length === 0) {
        return NextResponse.json(
          { error: "Upload at least one file" },
          { status: 400 }
        );
      }
      const uploadedAt = new Date();
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          fileUrl: fileUrls[0]!,
          postingNotes:
            typeof body.postingNotes === "string"
              ? body.postingNotes.trim() || null
              : job.postingNotes,
          scheduleNote:
            typeof body.scheduleNote === "string"
              ? body.scheduleNote.trim() || null
              : job.scheduleNote,
          uploadedAt,
          waApproved: true,
          ...(job.status === "WAITING_BRIEF" || job.status === "READY_TO_DESIGN"
            ? { status: "IN_PROGRESS" as const, startedAt: job.startedAt ?? uploadedAt }
            : {}),
          ...(typeof body.format === "string" && body.format.trim()
            ? { format: body.format.trim() }
            : {}),
        },
      });
      await setDesignerJobFileUrls(id, fileUrls);
      try {
        await syncDesignerJobToChecklistHandoff({ ...updated, fileUrl: fileUrls[0]! });
      } catch (e) {
        console.error("[designer-jobs] checklist sync on set-upload", e);
      }
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Upload saved — job still open until you Mark done",
      });
    }

    // Admin: mark done only with an uploaded file (syncs weekend story+post+ad).
    if (action === "mark-done") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (
        job.status !== "IN_PROGRESS" &&
        job.status !== "PAUSED" &&
        job.status !== "READY_TO_DESIGN" &&
        job.status !== "WAITING_BRIEF"
      ) {
        return NextResponse.json({ error: "Job is already done" }, { status: 400 });
      }
      const fromBody = fileUrlsFromBody(body);
      const existing =
        (await loadDesignerFileUrlsByIds([id])).get(id) ??
        normalizeDesignerFileUrls(job.fileUrl, null);
      const fileUrls = fromBody.length > 0 ? fromBody : existing;
      if (fileUrls.length === 0) {
        return NextResponse.json(
          {
            error:
              "Upload a creative before Mark done — Done without a file is not allowed. Use Force clear / reopen if you need to reset.",
          },
          { status: 400 }
        );
      }
      const uploadedAt = job.uploadedAt ?? new Date();
      await bankDesignerActiveSegment(id);
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "DESIGN_DONE",
          fileUrl: fileUrls[0]!,
          uploadedAt,
          waApproved: true,
          startedAt: job.startedAt ?? new Date(),
          // Admin Mark done never counts toward designer 4/day
          closedByRole: "admin",
          pausedAt: null,
          postingNotes:
            typeof body.postingNotes === "string"
              ? body.postingNotes.trim() || null
              : job.postingNotes,
          scheduleNote:
            typeof body.scheduleNote === "string"
              ? body.scheduleNote.trim() || null
              : job.scheduleNote,
        },
      });
      await setDesignerJobFileUrls(id, fileUrls);
      await setDesignerEditRequest(id, { at: null, note: null });
      try {
        await syncDesignerJobToChecklistHandoff({ ...updated, fileUrl: fileUrls[0]! });
      } catch (e) {
        console.error("[designer-jobs] checklist sync on mark-done", e);
      }
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Marked done (admin) — does not count toward designer daily target",
        amitNudge: await getAmitReadyNudge(),
      });
    }

    // Done job → designer/admin replace file in place (stays Done, re-syncs Amit Ready)
    if (action === "replace-upload") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (job.status !== "DESIGN_DONE") {
        return NextResponse.json(
          { error: "Only done jobs can replace upload — use Upload & close for open jobs" },
          { status: 400 }
        );
      }
      const fileUrls = fileUrlsFromBody(body);
      if (fileUrls.length === 0) {
        return NextResponse.json(
          { error: "Upload at least one file" },
          { status: 400 }
        );
      }
      if (!body.waApproved && !isAdmin) {
        return NextResponse.json(
          { error: "Confirm WhatsApp approved before upload" },
          { status: 400 }
        );
      }

      const uploadedAt = new Date();
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          fileUrl: fileUrls[0]!,
          postingNotes:
            typeof body.postingNotes === "string"
              ? body.postingNotes.trim() || null
              : job.postingNotes,
          scheduleNote:
            typeof body.scheduleNote === "string"
              ? body.scheduleNote.trim() || null
              : job.scheduleNote,
          waApproved: true,
          uploadedAt,
          ...(typeof body.format === "string" && body.format.trim()
            ? { format: body.format.trim() }
            : {}),
        },
      });
      await setDesignerJobFileUrls(id, fileUrls);
      await setDesignerEditRequest(id, { at: null, note: null });

      try {
        await syncDesignerJobToChecklistHandoff({ ...updated, fileUrl: fileUrls[0]! });
      } catch (e) {
        console.error("[designer-jobs] checklist sync on replace", e);
      }

      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Upload updated — Amit Ready refreshed",
        amitNudge: await getAmitReadyNudge(),
      });
    }

    // Closed job → designer asks admin for permission to edit / re-upload
    if (action === "request-edit") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (job.status !== "DESIGN_DONE") {
        return NextResponse.json({ error: "Only closed jobs can request edit" }, { status: 400 });
      }
      const note =
        typeof body.note === "string" && body.note.trim()
          ? body.note.trim().slice(0, 500)
          : typeof body.description === "string" && body.description.trim()
            ? body.description.trim().slice(0, 500)
            : null;
      await setDesignerEditRequest(id, { at: new Date(), note: note || null });
      return NextResponse.json({
        job: await jobDtoWithLinks(job),
        message: "Edit request sent to admin",
      });
    }

    if (action === "reject-edit") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status !== "DESIGN_DONE") {
        return NextResponse.json({ error: "Job is not closed" }, { status: 400 });
      }
      await setDesignerEditRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(job),
        message: "Edit request rejected",
      });
    }

    // Admin reopen → wipe upload + Amit Ready, back to Start Job (no leftover Download)
    if (action === "approve-edit" || action === "reopen") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status !== "DESIGN_DONE") {
        return NextResponse.json({ error: "Only closed jobs can be reopened" }, { status: 400 });
      }
      const existingFiles = (
        await loadDesignerFileUrlsByIds([id])
      ).get(id) ?? normalizeDesignerFileUrls(job.fileUrl, null);
      await deleteJobCreativeBlobs(existingFiles);
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on reopen", e);
      }
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "READY_TO_DESIGN",
          startedAt: null,
          startedByRole: null,
          uploadedAt: null,
          closedByRole: null,
          fileUrl: null,
          waApproved: false,
        },
      });
      await setDesignerJobFileUrls(id, []);
      await setDesignerEditRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Reopened — upload cleared; designer must Start Job and upload again",
      });
    }

    /** Admin Unsend — always → To send (WAITING_BRIEF). */
    if (action === "unsend") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status === "WAITING_BRIEF") {
        return NextResponse.json(
          { error: "Already unsent — see To send" },
          { status: 400 }
        );
      }
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on unsend", e);
      }
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "WAITING_BRIEF",
          startedAt: null,
          startedByRole: null,
          uploadedAt: null,
          closedByRole: null,
          priorityMode: "NONE",
          fileUrl: null,
          postingNotes: null,
          scheduleNote: null,
          waApproved: false,
        },
      });
      await setDesignerJobFileUrls(id, []);
      await setDesignerEditRequest(id, { at: null, note: null });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Unsent — in To send",
      });
    }

    /** Admin hard-delete job (and clear Amit Ready if synced). */
    if (action === "delete") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const existingFiles = (
        await loadDesignerFileUrlsByIds([id])
      ).get(id) ?? normalizeDesignerFileUrls(job.fileUrl, null);
      await deleteJobCreativeBlobs(existingFiles);
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on delete", e);
      }
      await prisma.teamDesignerJob.delete({ where: { id } });
      return NextResponse.json({ ok: true, deleted: true, message: "Job deleted" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[team/designer-jobs/[id]] PATCH", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}
