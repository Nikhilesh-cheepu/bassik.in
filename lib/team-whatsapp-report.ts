import type { TeamAdTask } from "@prisma/client";
import { teamMemberName } from "@/lib/team-members";
import { teamOutletLabel } from "@/lib/team-outlets";
import { formatTeamEndDateTime, formatTeamRecordDateTime } from "@/lib/team-tasks";
import { isPastDeadline } from "@/lib/team-end-time";

const TZ = "Asia/Kolkata";

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

function lineTask(t: TeamAdTask, extra?: string): string {
  const who = teamMemberName(t.assigneeId);
  const outlet = teamOutletLabel(t.outletId);
  const bits = [`• ${t.title}`, outlet, who];
  if (extra) bits.push(extra);
  return bits.join(" · ");
}

export function buildTeamWhatsAppReport(tasks: TeamAdTask[]): string {
  const lines: string[] = [];
  lines.push(`*Bassik Team — Daily update*`);
  lines.push(`📅 ${headingDate()}`);
  lines.push("");

  const doneToday = tasks.filter((t) => t.status === "DONE" && isTodayIST(t.completedAt));
  lines.push(`✅ *Done today* (${doneToday.length})`);
  if (doneToday.length === 0) {
    lines.push("_Nothing marked done yet today._");
  } else {
    for (const t of doneToday) {
      lines.push(
        lineTask(
          t,
          t.completedAt ? `Done ${formatTeamRecordDateTime(t.completedAt.toISOString())}` : undefined
        )
      );
    }
  }
  lines.push("");

  const assignedToday = tasks.filter((t) => t.status === "TODO" && isTodayIST(t.createdAt));
  lines.push(`📋 *Assigned today — please complete* (${assignedToday.length})`);
  if (assignedToday.length === 0) {
    lines.push("_No new tasks assigned today._");
  } else {
    for (const t of assignedToday) {
      const due = t.deadlineDate
        ? `Due ${formatTeamEndDateTime(t.deadlineDate, t.deadlineTime)}`
        : "Check brief";
      lines.push(lineTask(t, due));
    }
  }
  lines.push("");

  const open = tasks
    .filter((t) => t.status === "TODO")
    .sort((a, b) => {
      if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
      if (a.deadlineDate) return -1;
      if (b.deadlineDate) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const overdue = open.filter((t) => t.deadlineDate && isPastDeadline(t.deadlineDate, t.deadlineTime));
  const upcoming = open.filter(
    (t) => !t.deadlineDate || !isPastDeadline(t.deadlineDate, t.deadlineTime)
  );

  lines.push(`⏰ *Open tasks — check deadlines* (${open.length})`);
  if (overdue.length > 0) {
    lines.push(`_Overdue:_`);
    for (const t of overdue.slice(0, 12)) {
      lines.push(lineTask(t, `⚠️ Due ${formatTeamEndDateTime(t.deadlineDate!, t.deadlineTime)}`));
    }
  }
  if (upcoming.length > 0) {
    if (overdue.length > 0) lines.push("");
    lines.push(`_Upcoming / no date:_`);
    for (const t of upcoming.slice(0, 12)) {
      const due = t.deadlineDate
        ? `Due ${formatTeamEndDateTime(t.deadlineDate, t.deadlineTime)}`
        : "No deadline set";
      lines.push(lineTask(t, due));
    }
  }
  if (open.length === 0) {
    lines.push("_All clear — no open tasks._");
  }

  const pending = tasks.filter((t) => t.status === "PENDING_APPROVAL");
  if (pending.length > 0) {
    lines.push("");
    lines.push(`📝 *Work logged — pending approval* (${pending.length})`);
    for (const t of pending) {
      lines.push(lineTask(t, `Submitted ${formatTeamRecordDateTime(t.createdAt.toISOString())}`));
    }
  }

  lines.push("");
  lines.push("Please check deadlines and update the board when done. 🙏");

  return lines.join("\n");
}

export function whatsAppShareUrl(text: string, phoneDigits?: string | null): string {
  const encoded = encodeURIComponent(text);
  const phone = phoneDigits?.replace(/\D/g, "");
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}
