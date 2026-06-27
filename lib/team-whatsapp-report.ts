import type { TeamAdTask } from "@prisma/client";
import { getTeamMemberRoster, teamMemberName } from "@/lib/team-members";
import { teamOutletLabel } from "@/lib/team-outlets";
import { formatTeamEndDateTime, formatTeamRecordDateTime } from "@/lib/team-tasks";
import { isPastDeadline } from "@/lib/team-end-time";

const TZ = "Asia/Kolkata";

const BOARD_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")?.trim() || "https://bassik.in";

function teamBoardLink(): string {
  return `${BOARD_URL}/team`;
}

function istDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function isTodayIST(iso: Date | string | null | undefined): boolean {
  if (!iso) return false;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return false;
  return istDayKey(d) === istDayKey(new Date());
}

function headingDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dueLabel(t: TeamAdTask): string | null {
  if (!t.deadlineDate) return null;
  const prefix = isPastDeadline(t.deadlineDate, t.deadlineTime) ? "Overdue" : "Due";
  return `${prefix}: ${formatTeamEndDateTime(t.deadlineDate, t.deadlineTime)}`;
}

function taskLine(t: TeamAdTask, index: number): string {
  const outlet = teamOutletLabel(t.outletId);
  const due = dueLabel(t);
  const parts = [`${index}. ${t.title}`, outlet];
  if (due) parts.push(due);
  return parts.join(" · ");
}

function groupByAssignee(tasks: TeamAdTask[]): Map<string, TeamAdTask[]> {
  const map = new Map<string, TeamAdTask[]>();
  for (const t of tasks) {
    const id = t.assigneeId || "unassigned";
    const list = map.get(id) ?? [];
    list.push(t);
    map.set(id, list);
  }
  const roster = getTeamMemberRoster();
  const order = roster.map((m) => m.id);
  return new Map(
    [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
  );
}

function blockForMember(
  assigneeId: string,
  tasks: TeamAdTask[],
  kind: "todo" | "done"
): string[] {
  const name = teamMemberName(assigneeId);
  const lines: string[] = [];

  if (kind === "todo") {
    lines.push(`Hey ${name},`);
    lines.push("");
    lines.push(
      tasks.length === 1
        ? "You have a task to complete:"
        : "You have some tasks to complete:"
    );
    lines.push("");
    tasks.forEach((t, i) => lines.push(taskLine(t, i + 1)));
    lines.push("");
    lines.push(`Please open the board, complete the task${tasks.length > 1 ? "s" : ""}, and mark ${tasks.length > 1 ? "them" : "it"} done once finished.`);
    lines.push("");
    lines.push(teamBoardLink());
  } else {
    lines.push(`Hey ${name},`);
    lines.push("");
    lines.push(
      tasks.length === 1
        ? "This task was marked done today — thank you!"
        : "These tasks were marked done today — thank you!"
    );
    lines.push("");
    tasks.forEach((t, i) => {
      const doneAt = t.completedAt
        ? ` · Done ${formatTeamRecordDateTime(t.completedAt.toISOString())}`
        : "";
      lines.push(`${i + 1}. ${t.title} · ${teamOutletLabel(t.outletId)}${doneAt}`);
    });
  }

  return lines;
}

function joinMemberBlocks(blocks: string[][]): string {
  return blocks
    .map((b) => b.join("\n"))
    .join("\n\n—\n\n");
}

export function buildTeamWhatsAppReport(tasks: TeamAdTask[]): string {
  const lines: string[] = [];
  lines.push(`Bassik Team update`);
  lines.push(headingDate());
  lines.push("");

  const doneToday = tasks.filter((t) => t.status === "DONE" && isTodayIST(t.completedAt));
  if (doneToday.length > 0) {
    const doneBlocks = [...groupByAssignee(doneToday).entries()].map(([id, list]) =>
      blockForMember(id, list, "done")
    );
    lines.push(joinMemberBlocks(doneBlocks));
    lines.push("");
    lines.push("—");
    lines.push("");
  }

  const assignedToday = tasks.filter((t) => t.status === "TODO" && isTodayIST(t.createdAt));
  const open = tasks
    .filter((t) => t.status === "TODO")
    .sort((a, b) => {
      if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
      if (a.deadlineDate) return -1;
      if (b.deadlineDate) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const todoForMessage =
    assignedToday.length > 0 ? assignedToday : open.slice(0, 20);

  if (todoForMessage.length > 0) {
    const todoBlocks = [...groupByAssignee(todoForMessage).entries()].map(([id, list]) =>
      blockForMember(id, list, "todo")
    );
    lines.push(joinMemberBlocks(todoBlocks));
  } else if (doneToday.length === 0) {
    lines.push("All clear — no open tasks right now.");
    lines.push("");
    lines.push(teamBoardLink());
  }

  const pending = tasks.filter((t) => t.status === "PENDING_APPROVAL");
  if (pending.length > 0) {
    lines.push("");
    lines.push("—");
    lines.push("");
    lines.push(`Work logged — waiting for approval (${pending.length}):`);
    pending.forEach((t, i) => {
      lines.push(
        `${i + 1}. ${t.title} · ${teamOutletLabel(t.outletId)} · ${teamMemberName(t.assigneeId)}`
      );
    });
  }

  return lines.join("\n");
}

export function whatsAppShareUrl(text: string, phoneDigits?: string | null): string {
  const encoded = encodeURIComponent(text);
  const phone = phoneDigits?.replace(/\D/g, "");
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

export type WhatsAppReportMode = "reminder" | "assigned" | "full";

export function buildWhatsAppFromTasks(
  tasks: TeamAdTask[],
  selectedIds: string[],
  mode: WhatsAppReportMode
): string {
  const selected = tasks.filter((t) => selectedIds.includes(t.id));
  if (mode === "full") {
    return buildTeamWhatsAppReport(selected.length === tasks.length ? tasks : selected);
  }

  if (selected.length === 0) {
    return `Bassik Team\n${headingDate()}\n\nNo tasks selected.\n\n${teamBoardLink()}`;
  }

  if (mode === "assigned") {
    const blocks = [...groupByAssignee(selected).entries()].map(([id, list]) =>
      blockForMember(id, list, "todo")
    );
    const header = [`Bassik Team`, headingDate(), ""].join("\n");
    return `${header}${joinMemberBlocks(blocks)}`;
  }

  // reminder — open / deadline nudge
  const blocks = [...groupByAssignee(selected).entries()].map(([id, list]) =>
    blockForMember(id, list, "todo")
  );
  const header = [`Bassik Team — reminder`, headingDate(), ""].join("\n");
  return `${header}${joinMemberBlocks(blocks)}`;
}

export function defaultSelectedIds(tasks: TeamAdTask[], mode: WhatsAppReportMode): string[] {
  if (mode === "assigned") {
    return tasks.filter((t) => t.status === "TODO" && isTodayIST(t.createdAt)).map((t) => t.id);
  }
  if (mode === "reminder") {
    return tasks.filter((t) => t.status === "TODO").map((t) => t.id);
  }
  return tasks.map((t) => t.id);
}
