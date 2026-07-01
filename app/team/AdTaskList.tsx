"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TeamTaskPriority } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  cyclePriority,
  priorityAccentClass,
  TEAM_PRIORITY_LABELS,
} from "@/lib/team-priority";
import {
  formatTeamEndDateTime,
  formatTeamRecordDateTime,
  formatTeamStartDate,
  groupTasksByCompletedDay,
  type TeamCreativeLink,
  type TeamTaskDto,
} from "@/lib/team-tasks";
import { formatTeamEndDateTime as formatDeadline, isPastDeadline } from "@/lib/team-end-time";
import ExpandableText from "./ExpandableText";

type TeamMember = { id: string; name: string };

function memberName(members: TeamMember[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

function creativeLinksForDisplay(task: TeamTaskDto): TeamCreativeLink[] {
  if (task.creativeLinks.length) return task.creativeLinks;
  const legacy = task.creativeUrl?.trim();
  return legacy ? [{ title: "Creative link", url: legacy }] : [];
}

function taskMetaLine(
  task: TeamTaskDto,
  members: TeamMember[],
  showAssignee: boolean
): string {
  const parts = [teamOutletLabel(task.outletId)];
  if (showAssignee) parts.push(memberName(members, task.assigneeId));
  if (task.deadlineDate) {
    const overdue = task.status !== "DONE" && isPastDeadline(task.deadlineDate, task.deadlineTime);
    parts.push(
      `${overdue ? "Overdue" : "Due"} ${formatDeadline(task.deadlineDate, task.deadlineTime)}`
    );
  } else if (task.startDate) {
    parts.push(`Start ${formatTeamStartDate(task.startDate)}`);
  }
  return parts.join(" · ");
}

function taskRecordLine(task: TeamTaskDto): string {
  const done = task.status === "DONE";
  const pending = task.status === "PENDING_APPROVAL";
  const parts: string[] = [];
  if (pending) {
    parts.push(`Submitted ${formatTeamRecordDateTime(task.createdAt)} · awaiting approval`);
    return parts.join(" · ");
  }
  if (done && task.completedAt) {
    parts.push(`Done ${formatTeamRecordDateTime(task.completedAt)}`);
  }
  parts.push(`Created ${formatTeamRecordDateTime(task.createdAt)}`);
  return parts.join(" · ");
}

type CardProps = {
  task: TeamTaskDto;
  members: TeamMember[];
  showAssignee: boolean;
  isViewer: boolean;
  isAdmin: boolean;
  canDrag: boolean;
  onToggleDone: (task: TeamTaskDto) => void;
  onEdit: (task: TeamTaskDto) => void;
  onDuplicate?: (task: TeamTaskDto) => void;
  onDelete: (task: TeamTaskDto) => void;
  onApprove?: (task: TeamTaskDto) => void;
  onReject?: (task: TeamTaskDto) => void;
  onPriorityChange: (task: TeamTaskDto, priority: TeamTaskPriority) => void;
};

function SortableAdTaskCard(props: CardProps) {
  const { task, canDrag } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AdTaskCard {...props} dragHandleProps={canDrag ? { ...attributes, ...listeners } : undefined} />
    </div>
  );
}

function AdTaskCard({
  task,
  members,
  showAssignee,
  isViewer,
  isAdmin,
  canDrag,
  onToggleDone,
  onEdit,
  onDuplicate,
  onDelete,
  onApprove,
  onReject,
  onPriorityChange,
  dragHandleProps,
}: CardProps & { dragHandleProps?: Record<string, unknown> }) {
  const done = task.status === "DONE";
  const pending = task.status === "PENDING_APPROVAL";
  const links = creativeLinksForDisplay(task);
  const uploaded = task.uploadedUrl?.trim() || null;
  const overdue = !done && !pending && isPastDeadline(task.deadlineDate, task.deadlineTime);
  const accent = priorityAccentClass(task.priority, task.status);

  return (
    <article
      className={`relative overflow-hidden rounded-xl bg-[#0e0e14] ring-1 ring-white/[0.06] ${
        done ? "opacity-85" : pending ? "ring-amber-500/20" : ""
      } ${dragHandleProps && canDrag ? "shadow-lg shadow-black/25" : ""}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex gap-2 py-3 pl-3.5 pr-3">
        {canDrag ? (
          <button
            type="button"
            className="mt-0.5 flex h-9 w-7 shrink-0 touch-none items-center justify-center text-white/25 active:text-white/50"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <span className="text-base leading-none">≡</span>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2
              className={`text-[15px] font-medium leading-snug ${
                done ? "text-white/55 line-through" : pending ? "text-amber-50/95" : "text-white"
              }`}
            >
              {task.title}
            </h2>
            {pending ? (
              <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                Pending
              </span>
            ) : isAdmin && !done ? (
              <button
                type="button"
                onClick={() => onPriorityChange(task, cyclePriority(task.priority))}
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  task.priority === "HIGH"
                    ? "bg-rose-500/20 text-rose-200"
                    : task.priority === "LOW"
                      ? "bg-slate-500/20 text-slate-300"
                      : "bg-white/[0.06] text-white/45"
                }`}
              >
                {TEAM_PRIORITY_LABELS[task.priority]}
              </button>
            ) : !isAdmin && task.priority === "HIGH" && !done ? (
              <span className="shrink-0 text-[10px] font-medium text-rose-300/80">High</span>
            ) : null}
          </div>
          <p className={`mt-1 text-xs ${overdue ? "text-red-300/80" : "text-white/38"}`}>
            {taskMetaLine(task, members, showAssignee)}
          </p>
          <p className="mt-0.5 text-[11px] text-white/28">{taskRecordLine(task)}</p>
          {task.description ? <ExpandableText text={task.description} /> : null}
          {!done && task.endDate ? (
            <p className="mt-1 text-[11px] text-white/30">
              Runs until {formatTeamEndDateTime(task.endDate, task.endTime)}
            </p>
          ) : null}
          {uploaded || links.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {uploaded ? (
                <a
                  href={uploaded}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-cyan-400/90"
                >
                  View upload
                </a>
              ) : null}
              {links.map((item) => (
                <a
                  key={`${item.title}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-cyan-400/90"
                >
                  {item.title}
                </a>
              ))}
            </div>
          ) : null}
          {task.referenceUrls.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {task.referenceUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Reference"
                    className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10"
                  />
                </a>
              ))}
            </div>
          ) : null}
          {!isViewer ? (
            <div className="mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-2.5">
              {pending && isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => onApprove?.(task)}
                    className="min-h-[40px] flex-1 rounded-lg bg-emerald-500/20 text-xs font-medium text-emerald-200"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject?.(task)}
                    className="min-h-[40px] rounded-lg px-3 text-xs text-red-300/70"
                  >
                    Reject
                  </button>
                </>
              ) : pending ? (
                <p className="py-2 text-xs text-amber-200/60">Waiting for admin approval</p>
              ) : (
                <>
              <button
                type="button"
                onClick={() => onToggleDone(task)}
                className={`min-h-[40px] flex-1 rounded-lg text-xs font-medium ${
                  done ? "text-white/45" : "bg-white/[0.06] text-emerald-200/90"
                }`}
              >
                {done ? "Reopen" : "Done"}
              </button>
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="min-h-[40px] rounded-lg px-3 text-xs text-white/50"
                  >
                    Edit
                  </button>
                  {onDuplicate ? (
                    <button
                      type="button"
                      onClick={() => onDuplicate(task)}
                      className="min-h-[40px] rounded-lg px-3 text-xs text-white/50"
                    >
                      Copy
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    className="min-h-[40px] rounded-lg px-2 text-xs text-red-300/60"
                  >
                    Del
                  </button>
                </>
              ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DoneDaySection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <h3 className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-white/35">
          {label}
        </h3>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>
      {children}
    </section>
  );
}

export type AdTaskListProps = {
  tasks: TeamTaskDto[];
  members: TeamMember[];
  showAssignee: boolean;
  isViewer: boolean;
  isAdmin: boolean;
  canDrag: boolean;
  groupDoneByDate?: boolean;
  onToggleDone: (task: TeamTaskDto) => void;
  onEdit: (task: TeamTaskDto) => void;
  onDuplicate?: (task: TeamTaskDto) => void;
  onDelete: (task: TeamTaskDto) => void;
  onApprove?: (task: TeamTaskDto) => void;
  onReject?: (task: TeamTaskDto) => void;
  onReorder: (taskIds: string[]) => Promise<void>;
  onPriorityChange: (task: TeamTaskDto, priority: TeamTaskPriority) => Promise<void>;
};

export default function AdTaskList({
  tasks,
  members,
  showAssignee,
  isViewer,
  isAdmin,
  canDrag,
  groupDoneByDate = false,
  onToggleDone,
  onEdit,
  onDuplicate,
  onDelete,
  onApprove,
  onReject,
  onReorder,
  onPriorityChange,
}: AdTaskListProps) {
  const [items, setItems] = useState(tasks);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const doneGroups = useMemo(
    () => (groupDoneByDate ? groupTasksByCompletedDay(items) : []),
    [groupDoneByDate, items]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await onReorder(next.map((t) => t.id));
  };

  const cardProps = {
    members,
    showAssignee,
    isViewer,
    isAdmin,
    canDrag,
  onToggleDone,
  onEdit,
  onDuplicate,
  onDelete,
  onApprove,
  onReject,
  onPriorityChange,
  };

  const renderCard = (task: TeamTaskDto) => (
    <AdTaskCard key={task.id} task={task} {...cardProps} canDrag={false} />
  );

  if (groupDoneByDate && doneGroups.length > 0) {
    return (
      <div className="space-y-5">
        {doneGroups.map((group) => (
          <DoneDaySection key={group.key} label={group.label}>
            <div className="space-y-2">{group.tasks.map(renderCard)}</div>
          </DoneDaySection>
        ))}
      </div>
    );
  }

  if (!canDrag) {
    return (
      <div className="space-y-2">
        {items.map((task) => (
          <AdTaskCard key={task.id} task={task} {...cardProps} canDrag={false} />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((task) => (
            <SortableAdTaskCard key={task.id} task={task} {...cardProps} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
