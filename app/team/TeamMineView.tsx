"use client";

import type { TeamPlanningDto } from "@/lib/team-planning";
import { TEAM_PLANNING_LABELS } from "@/lib/team-planning";
import type { TeamReminderDto } from "@/lib/team-reminders";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  formatTeamEndDateTime as formatDeadline,
  isPastDeadline,
} from "@/lib/team-end-time";
import { formatTeamStartDate } from "@/lib/team-tasks";
import ExpandableText from "./ExpandableText";
import { PlanningSheetPreview } from "./TeamPlanningSheet";

export type MineSection = "reminders" | "planning" | "feedback";

export default function TeamMineView({
  section,
  reminders,
  remindersReady,
  planningNotes,
  planningReady,
  readOnlyReminders,
  username,
  onEditPlanning,
  onDeletePlanning,
  onNewPlanning,
  onNewFeedback,
  onEditReminder,
  onToggleReminderDone,
  onDeleteReminder,
}: {
  section: MineSection;
  reminders: TeamReminderDto[];
  remindersReady: boolean;
  planningNotes: TeamPlanningDto[];
  planningReady: boolean;
  readOnlyReminders: boolean;
  username: string;
  onEditPlanning: (n: TeamPlanningDto) => void;
  onDeletePlanning: (n: TeamPlanningDto) => void;
  onNewPlanning: () => void;
  onNewFeedback: () => void;
  onEditReminder?: (r: TeamReminderDto) => void;
  onToggleReminderDone?: (r: TeamReminderDto) => void;
  onDeleteReminder?: (r: TeamReminderDto) => void;
}) {
  if (section === "reminders") {
    if (!remindersReady) {
      return (
        <div className="space-y-2 py-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      );
    }
    if (reminders.length === 0) {
      return (
        <p className="py-16 text-center text-sm text-white/40">
          No reminders yet. Tap + to add one.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {reminders.map((r) => {
          const done = r.status === "DONE";
          const overdue = !done && isPastDeadline(r.deadlineDate, r.deadlineTime);
          const meta = [
            r.startDate ? `From ${formatTeamStartDate(r.startDate)}` : null,
            r.endDate ? `Until ${formatTeamStartDate(r.endDate)}` : null,
            r.deadlineDate
              ? `${overdue ? "Overdue" : "Due"} ${formatDeadline(r.deadlineDate, r.deadlineTime)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <article
              key={r.id}
              className={`relative overflow-hidden rounded-xl bg-[#0e0e14] ring-1 ring-white/[0.06] ${
                done ? "opacity-80" : ""
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 w-1 ${
                  done ? "bg-emerald-500/70" : overdue ? "bg-red-500" : "bg-amber-500/60"
                }`}
              />
              <div className="py-3 pl-3.5 pr-3">
                <h2
                  className={`text-[15px] font-medium ${done ? "text-white/55 line-through" : "text-white"}`}
                >
                  {r.title}
                </h2>
                {meta ? (
                  <p className={`mt-1 text-xs ${overdue ? "text-red-300/80" : "text-white/35"}`}>
                    {meta}
                  </p>
                ) : null}
                {r.description ? <ExpandableText text={r.description} /> : null}
                {!readOnlyReminders && onToggleReminderDone && onEditReminder && onDeleteReminder ? (
                  <div className="mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleReminderDone(r)}
                      className={`min-h-[40px] flex-1 rounded-lg text-xs font-medium ${
                        done ? "text-white/45" : "bg-white/[0.06] text-emerald-200/90"
                      }`}
                    >
                      {done ? "Reopen" : "Done"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditReminder(r)}
                      className="min-h-[40px] rounded-lg px-3 text-xs text-white/50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReminder(r)}
                      className="min-h-[40px] rounded-lg px-2 text-xs text-red-300/60"
                    >
                      Del
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  const type = section === "feedback" ? "FEEDBACK" : "PLANNING";
  const notes = planningNotes.filter((n) => n.type === type);

  if (!planningReady) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={section === "feedback" ? onNewFeedback : onNewPlanning}
          className="rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/75"
        >
          {section === "feedback" ? "+ Feedback" : "+ Planning sheet"}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">
          {section === "feedback"
            ? "Share feedback for your team lead."
            : "Start a planning sheet — add rows, columns, and files."}
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const canEdit = n.createdBy === username;
            return (
              <article
                key={n.id}
                className="relative overflow-hidden rounded-xl bg-[#0e0e14] ring-1 ring-white/[0.06]"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-sky-400/50" />
                <div className="py-3 pl-3.5 pr-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[15px] font-medium text-white">
                      {n.title || TEAM_PLANNING_LABELS[n.type]}
                    </h2>
                    <span className="shrink-0 text-[10px] text-white/35">{n.createdBy}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/35">
                    {n.outletId ? teamOutletLabel(n.outletId) : "General"} ·{" "}
                    {new Date(n.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  {n.sheetData ? <PlanningSheetPreview data={n.sheetData} /> : null}
                  {n.body ? <ExpandableText text={n.body} /> : null}
                  {n.attachments.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {n.attachments.map((a) => (
                        <li key={a.url}>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cyan-300/80"
                          >
                            {a.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {n.imageUrls.length > 0 ? (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {n.imageUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {canEdit ? (
                    <div className="mt-3 flex gap-2 border-t border-white/[0.05] pt-2">
                      <button
                        type="button"
                        onClick={() => onEditPlanning(n)}
                        className="text-xs text-white/50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePlanning(n)}
                        className="text-xs text-red-300/60"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
