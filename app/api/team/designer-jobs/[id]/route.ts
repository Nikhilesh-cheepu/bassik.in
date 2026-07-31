import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { isTeamDesignerMember } from "@/lib/team-members";
import {
  clearDesignerJobChecklistHandoff,
  findActiveDesignerJob,
  linksFromText,
  loadDesignerEditMetaByIds,
  loadDesignerJobLinksByIds,
  parseDesignerLinks,
  setDesignerEditRequest,
  setDesignerJobLinks,
  setDesignerPauseRequest,
  syncDesignerJobToChecklistHandoff,
  toDesignerJobDto,
} from "@/lib/team-designer-jobs";
import {
  isBoilerplateDesignerDescription,
  parseDesignerPriorityMode,
} from "@/lib/team-designer-jobs-shared";
import { sendPriorityJobAlert } from "@/lib/team-designer-nudges";

async function jobDtoWithLinks(job: Parameters<typeof toDesignerJobDto>[0]) {
  const [linksMap, editMap] = await Promise.all([
    loadDesignerJobLinksByIds([job.id]),
    loadDesignerEditMetaByIds([job.id]),
  ]);
  const edit = editMap.get(job.id);
  return toDesignerJobDto({
    ...job,
    links: linksMap.get(job.id) ?? [],
    editRequestedAt: edit?.editRequestedAt ?? null,
    editRequestNote: edit?.editRequestNote ?? null,
    pauseRequestedAt: edit?.pauseRequestedAt ?? null,
    pauseRequestNote: edit?.pauseRequestNote ?? null,
  });
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
  | "delete";

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
      postingNotes?: string;
      scheduleNote?: string;
      waApproved?: boolean;
      format?: string;
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

      const priorityMode =
        body.priorityMode !== undefined
          ? parseDesignerPriorityMode(body.priorityMode)
          : undefined;
      const urgent =
        typeof body.urgent === "boolean"
          ? body.urgent
          : priorityMode && priorityMode !== "NONE"
            ? true
            : undefined;

      // Pin priority jobs near the top of the queue
      let sortOrder: number | undefined;
      if (action === "brief-ready" && priorityMode && priorityMode !== "NONE") {
        const minRow = await prisma.teamDesignerJob.findFirst({
          where: { assigneeId: job.assigneeId, status: { not: "DESIGN_DONE" } },
          orderBy: { sortOrder: "asc" },
          select: { sortOrder: true },
        });
        sortOrder = (minRow?.sortOrder ?? 0) - 1;
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

      let priorityNudge: Awaited<ReturnType<typeof sendPriorityJobAlert>> = null;
      if (
        action === "brief-ready" &&
        status === "READY_TO_DESIGN" &&
        priorityMode &&
        priorityMode !== "NONE"
      ) {
        try {
          priorityNudge = await sendPriorityJobAlert({
            jobId: updated.id,
            assigneeId: updated.assigneeId,
            title: updated.title,
            outletId: updated.outletId,
            postDate: updated.postDate,
            priorityMode,
          });
        } catch (e) {
          console.error("[designer-jobs] priority WA", e);
        }
      }

      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        priorityNudge,
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
      const canForceClear =
        job.status === "IN_PROGRESS" ||
        job.status === "PAUSED" ||
        job.status === "DESIGN_DONE" ||
        (job.status === "READY_TO_DESIGN" && Boolean(job.fileUrl));
      if (!canForceClear) {
        return NextResponse.json(
          { error: "Nothing to force-clear on this job" },
          { status: 400 }
        );
      }
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on force-clear", e);
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
          postingNotes: null,
          scheduleNote: null,
          waApproved: false,
        },
      });
      await setDesignerEditRequest(id, { at: null, note: null });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Cleared — designer must Start Job and upload again",
      });
    }

    if (action === "clear-upload") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!job.fileUrl) {
        return NextResponse.json({ error: "No upload to delete" }, { status: 400 });
      }
      try {
        await clearDesignerJobChecklistHandoff(job);
      } catch (e) {
        console.error("[designer-jobs] clear handoff on clear-upload", e);
      }
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          fileUrl: null,
          uploadedAt: null,
          waApproved: false,
          ...(job.status === "DESIGN_DONE"
            ? { status: "READY_TO_DESIGN" as const, startedAt: null }
            : {}),
        },
      });
      await setDesignerEditRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Upload deleted — Ready removed from Daily",
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
      const active = await findActiveDesignerJob(job.assigneeId);
      if (active && active.id !== job.id) {
        return NextResponse.json(
          {
            error: `Finish or pause current job first: ${active.title}`,
            activeJobId: active.id,
          },
          { status: 409 }
        );
      }
      const startedByRole = isAdmin && !canDesignerAct ? "admin" : "designer";
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          startedByRole,
        },
      });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: job.status === "PAUSED" ? "Resumed — timer restarted" : "Started",
      });
    }

    // Admin pauses immediately; designer must request → admin approve
    if (action === "pause") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Only in-progress jobs can be paused" }, { status: 400 });
      }
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: { status: "PAUSED" },
      });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Paused — Start again when ready",
      });
    }

    if (action === "request-pause") {
      if (!isAdmin && !canDesignerAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (job.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Only in-progress jobs can request pause" }, { status: 400 });
      }
      if (isAdmin) {
        const updated = await prisma.teamDesignerJob.update({
          where: { id },
          data: { status: "PAUSED" },
        });
        await setDesignerPauseRequest(id, { at: null, note: null });
        return NextResponse.json({
          job: await jobDtoWithLinks(updated),
          message: "Paused",
        });
      }
      const note =
        typeof body.note === "string" && body.note.trim()
          ? body.note.trim().slice(0, 500)
          : null;
      await setDesignerPauseRequest(id, { at: new Date(), note });
      return NextResponse.json({
        job: await jobDtoWithLinks(job),
        message: "Pause requested — waiting on admin",
      });
    }

    if (action === "approve-pause") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Job is not in progress" }, { status: 400 });
      }
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: { status: "PAUSED" },
      });
      await setDesignerPauseRequest(id, { at: null, note: null });
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
      const fileUrl =
        typeof body.fileUrl === "string" && body.fileUrl.trim()
          ? body.fileUrl.trim()
          : null;
      if (!fileUrl) {
        return NextResponse.json({ error: "File URL required" }, { status: 400 });
      }
      if (!body.waApproved && !isAdmin) {
        return NextResponse.json(
          { error: "Confirm WhatsApp approved before upload" },
          { status: 400 }
        );
      }

      const uploadedAt = new Date();
      const closedByRole = isAdmin && !canDesignerAct ? "admin" : "designer";
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "DESIGN_DONE",
          fileUrl,
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
          ...(typeof body.format === "string" && body.format.trim()
            ? { format: body.format.trim() }
            : {}),
        },
      });
      await setDesignerEditRequest(id, { at: null, note: null });

      try {
        await syncDesignerJobToChecklistHandoff(updated);
      } catch (e) {
        console.error("[designer-jobs] checklist sync", e);
      }

      return NextResponse.json({ job: await jobDtoWithLinks(updated) });
    }

    // Admin: attach creative without closing the job
    if (action === "set-upload") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const fileUrl =
        typeof body.fileUrl === "string" && body.fileUrl.trim()
          ? body.fileUrl.trim()
          : null;
      if (!fileUrl) {
        return NextResponse.json({ error: "File URL required" }, { status: 400 });
      }
      const uploadedAt = new Date();
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          fileUrl,
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
      try {
        await syncDesignerJobToChecklistHandoff(updated);
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
      const fileUrl =
        typeof body.fileUrl === "string" && body.fileUrl.trim()
          ? body.fileUrl.trim()
          : job.fileUrl;
      if (!fileUrl) {
        return NextResponse.json(
          {
            error:
              "Upload a creative before Mark done — Done without a file is not allowed. Use Force clear / reopen if you need to reset.",
          },
          { status: 400 }
        );
      }
      const uploadedAt = job.uploadedAt ?? new Date();
      const updated = await prisma.teamDesignerJob.update({
        where: { id },
        data: {
          status: "DESIGN_DONE",
          fileUrl,
          uploadedAt,
          waApproved: true,
          startedAt: job.startedAt ?? new Date(),
          // Admin Mark done never counts toward designer 4/day
          closedByRole: "admin",
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
      await setDesignerEditRequest(id, { at: null, note: null });
      try {
        await syncDesignerJobToChecklistHandoff(updated);
      } catch (e) {
        console.error("[designer-jobs] checklist sync on mark-done", e);
      }
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Marked done (admin) — does not count toward designer daily target",
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
      const fileUrl =
        typeof body.fileUrl === "string" && body.fileUrl.trim()
          ? body.fileUrl.trim()
          : null;
      if (!fileUrl) {
        return NextResponse.json({ error: "File URL required" }, { status: 400 });
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
          fileUrl,
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
      await setDesignerEditRequest(id, { at: null, note: null });

      try {
        await syncDesignerJobToChecklistHandoff(updated);
      } catch (e) {
        console.error("[designer-jobs] checklist sync on replace", e);
      }

      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Upload updated — Amit Ready refreshed",
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
      await setDesignerEditRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Reopened — upload cleared; designer must Start Job and upload again",
      });
    }

    /**
     * Admin Unsend — reverse of Send: off designer queue, clear upload + Amit Ready.
     * Works from Ready / In progress / Paused / Done.
     */
    if (action === "unsend") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (job.status === "WAITING_BRIEF") {
        return NextResponse.json(
          { error: "Already unsent — waiting on brief / Send" },
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
      await setDesignerEditRequest(id, { at: null, note: null });
      await setDesignerPauseRequest(id, { at: null, note: null });
      return NextResponse.json({
        job: await jobDtoWithLinks(updated),
        message: "Unsent — off designer queue; Amit Ready cleared",
      });
    }

    /** Admin hard-delete job (and clear Amit Ready if synced). */
    if (action === "delete") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
