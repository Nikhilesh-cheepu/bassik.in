import type { TeamTaskPriority, TeamAdTaskStatus } from "@prisma/client";
import { parseUrlList } from "@/lib/team-planning";
import { defaultTeamMemberId, isTeamMemberId } from "@/lib/team-members";
import { normalizeTeamPriority } from "@/lib/team-priority";
import { isTeamOutletId } from "@/lib/team-outlets";
import {
  applyCreativeLinksFields,
  normalizeTeamStartDate,
  normalizeTeamEndTime,
  parseCreativeLinks,
  toTeamTaskDto,
  type TeamCreativeLink,
  type TeamTaskDto,
} from "@/lib/team-tasks";
import { prisma } from "@/lib/db";

export type CreateTeamAdTaskInput = {
  outletId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  creativeUrl?: string;
  creativeLinks?: TeamCreativeLink[];
  uploadedUrl?: string;
  referenceUrls?: string[];
  startDate?: string;
  endDate?: string;
  endTime?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  priority?: TeamTaskPriority | string;
  status?: TeamAdTaskStatus;
};

export async function createTeamAdTask(
  input: CreateTeamAdTaskInput,
  createdBy: string
): Promise<TeamTaskDto> {
  const outletId = input.outletId.trim();
  const assigneeId = (input.assigneeId?.trim() || defaultTeamMemberId()).trim();
  const title = input.title.trim();
  const description = input.description?.trim() ?? "";
  const creativeUrl = input.creativeUrl?.trim() ?? "";
  const creativeLinksInput = parseCreativeLinks(input.creativeLinks);
  const uploadedUrl = input.uploadedUrl?.trim() ?? "";
  const referenceUrls = parseUrlList(input.referenceUrls);
  const startDate = input.startDate?.trim() ?? "";
  const endDate = input.endDate?.trim() ?? "";
  const endTime = input.endTime?.trim() ?? "";
  const deadlineDate = input.deadlineDate?.trim() ?? "";
  const deadlineTime = input.deadlineTime?.trim() ?? "";
  const priority = normalizeTeamPriority(input.priority);
  const status = input.status ?? "TODO";

  if (!isTeamOutletId(outletId)) {
    throw new Error(`Invalid outlet: ${outletId}`);
  }
  if (!isTeamMemberId(assigneeId)) {
    throw new Error(`Invalid assignee: ${assigneeId}`);
  }

  const finalTitle = title || description.slice(0, 80) || `Ad — ${outletId}`;
  if (finalTitle.length > 200) {
    throw new Error("Title too long");
  }

  const maxSort = await prisma.teamAdTask.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1000;

  const creativeFields = applyCreativeLinksFields(
    creativeLinksInput.length
      ? creativeLinksInput
      : creativeUrl
        ? [{ title: "Creative link", url: creativeUrl }]
        : [],
    uploadedUrl || null
  );

  const row = await prisma.teamAdTask.create({
    data: {
      outletId,
      assigneeId,
      priority,
      sortOrder,
      title: finalTitle,
      description: description || null,
      creativeUrl: creativeFields.creativeUrl,
      creativeSource: creativeFields.creativeSource,
      creativeLinks: creativeFields.creativeLinks.length ? creativeFields.creativeLinks : undefined,
      uploadedUrl: uploadedUrl || null,
      referenceUrls: referenceUrls.length ? referenceUrls : undefined,
      startDate: normalizeTeamStartDate(startDate),
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : null,
      endTime: normalizeTeamEndTime(endTime),
      deadlineDate: /^\d{4}-\d{2}-\d{2}$/.test(deadlineDate) ? deadlineDate : null,
      deadlineTime: normalizeTeamEndTime(deadlineTime),
      createdBy,
      status,
    },
  });

  return toTeamTaskDto(row);
}

export async function createTeamAdTasks(
  inputs: CreateTeamAdTaskInput[],
  createdBy: string
): Promise<{ created: TeamTaskDto[]; errors: string[] }> {
  const created: TeamTaskDto[] = [];
  const errors: string[] = [];
  for (const input of inputs) {
    try {
      created.push(await createTeamAdTask(input, createdBy));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Create failed");
    }
  }
  return { created, errors };
}
