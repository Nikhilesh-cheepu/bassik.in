"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import {
  formatTeamStartDate,
  isAsapStartDate,
  TEAM_START_ASAP,
  type TeamTaskDto,
} from "@/lib/team-tasks";
import {
  endTimeModeFromTask,
  formatTeamEndDateTime as formatDeadline,
  isPastDeadline,
  resolveEndTimeForSave,
  TEAM_END_TIME_PRESETS,
  type TeamEndTimeMode,
} from "@/lib/team-end-time";
import type { TeamReminderDto } from "@/lib/team-reminders";
import type { TeamTaskPriority } from "@prisma/client";
import { TEAM_PRIORITY_LABELS, TEAM_PRIORITIES } from "@/lib/team-priority";
import AdTaskList from "./AdTaskList";
import ExpandableText from "./ExpandableText";
import { emptyMemberRecordForm, MemberRecordSheet, type MemberRecordForm } from "./MemberRecordSheet";
import TeamPageHeader from "./TeamPageHeader";
import TeamMineView, { type MineSection } from "./TeamMineView";
import {
  emptyPlanningSheetForm,
  PlanningSheetFormSheet,
  type PlanningSheetForm,
} from "./TeamPlanningSheet";
import { TeamSidebarNav, TEAM_PAGE, TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL, type TeamTab } from "./TeamNav";
import TeamDock, { TeamActionSheet, TeamMoreSheet } from "./TeamDock";
import TeamWhatsAppSheet from "./TeamWhatsAppSheet";
import { TEAM_DOCK_PADDING } from "./TeamIcons";
import TeamAiPanel from "./TeamAiPanel";
import { PlanningNoteList } from "./TeamPlanningView";
import type { TeamPlanningDto, TeamPlanningFilter } from "@/lib/team-planning";

type TeamUser = { username: string; role: "admin" | "member" | "viewer"; memberId?: string };
type TeamMember = { id: string; name: string; role?: string };
type Filter = "all" | "todo" | "done" | "pending";
type MemberTab = "all" | string;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "To do" },
  { id: "done", label: "Done" },
];

const MEMBER_AD_FILTERS: { id: Filter; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "done", label: "Done" },
];

type StartTiming = "asap" | "date" | "none";

type TaskForm = {
  outletId: string;
  assigneeId: string;
  title: string;
  description: string;
  creativeUrl: string;
  uploadedUrl: string;
  uploadedName: string;
  startTiming: StartTiming;
  startDate: string;
  endDate: string;
  endTimeMode: TeamEndTimeMode;
  endTimeCustom: string;
  deadlineDate: string;
  deadlineTimeMode: TeamEndTimeMode;
  deadlineTimeCustom: string;
  priority: TeamTaskPriority;
  referenceUrls: string[];
};

type ReminderForm = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  deadlineDate: string;
  deadlineTimeMode: TeamEndTimeMode;
  deadlineTimeCustom: string;
  ownerId: string;
};

const emptyReminderForm = (): ReminderForm => ({
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  deadlineDate: "",
  deadlineTimeMode: "none",
  deadlineTimeCustom: "",
  ownerId: "",
});

const emptyTaskForm = (assigneeId = "amit"): TaskForm => ({
  outletId: TEAM_AD_OUTLETS[0].id,
  assigneeId,
  title: "",
  description: "",
  creativeUrl: "",
  uploadedUrl: "",
  uploadedName: "",
  startTiming: "asap",
  startDate: "",
  endDate: "",
  endTimeMode: "none",
  endTimeCustom: "",
  deadlineDate: "",
  deadlineTimeMode: "none",
  deadlineTimeCustom: "",
  priority: "NORMAL",
  referenceUrls: [],
});

function memberName(members: TeamMember[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

async function readTeamApiJson(res: Response) {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.ok ? "Invalid server response" : `Server error (${res.status}) — try refreshing`
    );
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function startTimingFromTask(task: TeamTaskDto): StartTiming {
  if (isAsapStartDate(task.startDate)) return "asap";
  if (task.startDate) return "date";
  return "none";
}

function resolveStartDateForSave(form: TaskForm): string {
  if (form.startTiming === "asap") return TEAM_START_ASAP;
  if (form.startTiming === "date" && form.startDate) return form.startDate;
  return "";
}

function DateFields({
  label,
  dateValue,
  onDateChange,
  timeMode,
  onTimeModeChange,
  timeCustom,
  onTimeCustomChange,
  timeLabel = "Time",
}: {
  label: string;
  dateValue: string;
  onDateChange: (v: string) => void;
  timeMode: TeamEndTimeMode;
  onTimeModeChange: (v: TeamEndTimeMode) => void;
  timeCustom: string;
  onTimeCustomChange: (v: string) => void;
  timeLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/50">{label}</label>
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
      />
      <label className="block text-xs font-medium text-white/50">{timeLabel}</label>
      <select
        value={timeMode}
        onChange={(e) => onTimeModeChange(e.target.value as TeamEndTimeMode)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
      >
        <option value="none">No time</option>
        {TEAM_END_TIME_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} ({p.hint})
          </option>
        ))}
        <option value="custom">Exact time</option>
      </select>
      {timeMode === "custom" ? (
        <input
          type="time"
          value={timeCustom}
          onChange={(e) => onTimeCustomChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
        />
      ) : null}
    </div>
  );
}

export default function TeamClient() {
  const [user, setUser] = useState<TeamUser | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [booting, setBooting] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<TeamTab>("ads");
  const [tasks, setTasks] = useState<TeamTaskDto[]>([]);
  const [reminders, setReminders] = useState<TeamReminderDto[]>([]);
  const [planningNotes, setPlanningNotes] = useState<TeamPlanningDto[]>([]);
  const [tasksReady, setTasksReady] = useState(false);
  const [remindersReady, setRemindersReady] = useState(false);
  const [planningReady, setPlanningReady] = useState(false);
  const [planningFilter, setPlanningFilter] = useState<TeamPlanningFilter>("all");
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<TeamPlanningDto | null>(null);
  const [planningForm, setPlanningForm] = useState<PlanningSheetForm>(emptyPlanningSheetForm());
  const [mineSection, setMineSection] = useState<MineSection>("reminders");
  const [refUploading, setRefUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("todo");
  const [memberTab, setMemberTab] = useState<MemberTab>("all");
  const [outletFilter, setOutletFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editing, setEditing] = useState<TeamTaskDto | null>(null);
  const [editingReminder, setEditingReminder] = useState<TeamReminderDto | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [reminderForm, setReminderForm] = useState<ReminderForm>(emptyReminderForm);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ fileName: string; siteUrl: string } | null>(null);
  const [showMemberRecordForm, setShowMemberRecordForm] = useState(false);
  const [memberRecordForm, setMemberRecordForm] = useState<MemberRecordForm>(emptyMemberRecordForm);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showWhatsAppSheet, setShowWhatsAppSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const soleMember = members.length === 1 ? members[0] : null;
  const isViewer = user?.role === "viewer";
  const canBrowseAllMembers = user?.role === "admin" || user?.role === "viewer";
  const showMemberTabs = canBrowseAllMembers && members.length > 1 && tab === "ads";

  const counts = useMemo(() => {
    const list = tab === "ads" ? tasks : tab === "reminders" ? reminders : [];
    const todo = list.filter((t) => t.status === "TODO").length;
    const done = list.filter((t) => t.status === "DONE").length;
    const pending = list.filter((t) => t.status === "PENDING_APPROVAL").length;
    return { todo, done, pending };
  }, [tasks, reminders, tab]);

  const isMember = user?.role === "member";
  const isMemberHub = isMember && tab === "reminders";

  const adFilters = useMemo(() => {
    if (user?.role === "member") return MEMBER_AD_FILTERS;
    if (user?.role !== "admin") return FILTERS;
    return [
      ...FILTERS,
      {
        id: "pending" as const,
        label: counts.pending > 0 ? `Pending (${counts.pending})` : "Pending",
      },
    ];
  }, [user?.role, counts.pending]);

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/team/members");
    if (res.status === 401) {
      setUser(null);
      return;
    }
    if (res.ok) {
      const data = await readTeamApiJson(res);
      setMembers(data.members ?? []);
    }
  }, []);

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ filter });
        if (outletFilter) qs.set("outletId", outletFilter);
        if (canBrowseAllMembers && memberTab !== "all") qs.set("assignee", memberTab);
        const res = await fetch(`/api/team/tasks?${qs}`);
        if (res.status === 401) {
          setUser(null);
          return;
        }
        const data = await readTeamApiJson(res);
        if (!res.ok) throw new Error(data.error || "Could not load tasks");
        setTasks(data.tasks ?? []);
        setTasksReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setRefreshing(false);
      }
    },
    [filter, outletFilter, memberTab, canBrowseAllMembers]
  );

  const loadReminders = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          filter: user?.role === "member" ? "all" : filter,
        });
        const res = await fetch(`/api/team/reminders?${qs}`);
        if (res.status === 401) {
          setUser(null);
          return;
        }
        const data = await readTeamApiJson(res);
        if (!res.ok) throw new Error(data.error || "Could not load reminders");
        setReminders(data.reminders ?? []);
        setRemindersReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setRefreshing(false);
      }
    },
    [filter, user?.role]
  );

  const loadPlanning = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (planningFilter !== "all") qs.set("type", planningFilter);
        const res = await fetch(`/api/team/planning?${qs}`);
        if (res.status === 401) {
          setUser(null);
          return;
        }
        const data = await readTeamApiJson(res);
        if (!res.ok) throw new Error(data.error || "Could not load planning");
        setPlanningNotes(data.notes ?? []);
        setPlanningReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setRefreshing(false);
      }
    },
    [planningFilter]
  );

  const probeSession = useCallback(async () => {
    try {
      const res = await fetch("/api/team/auth");
      if (res.ok) {
        const data = await readTeamApiJson(res);
        setUser(data.user ?? null);
      } else setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void probeSession();
  }, [probeSession]);

  useEffect(() => {
    if (!user) return;
    void loadMembers();
  }, [user, loadMembers]);

  useEffect(() => {
    if (!user) return;
    if (isMember && (tab === "planning" || tab === "ai")) {
      setTab("reminders");
      if (tab === "planning") setMineSection("planning");
    }
  }, [user, tab, isMember]);

  useEffect(() => {
    if (!user) return;
    if (tab === "ads") void loadTasks(tasksReady);
    else if (tab === "reminders" && !isViewer) {
      void loadReminders(remindersReady);
      if (isMember) void loadPlanning(planningReady);
    } else if (tab === "planning") void loadPlanning(planningReady);
  }, [user, tab, loadTasks, loadReminders, loadPlanning, isViewer, isMember]);

  useEffect(() => {
    if (!user || tab !== "planning") return;
    void loadPlanning(planningReady);
  }, [planningFilter]);

  useEffect(() => {
    const open = showTaskForm || showReminderForm || showPlanningForm || showMemberRecordForm || showActionSheet || showMoreSheet || showWhatsAppSheet;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showTaskForm, showReminderForm, showPlanningForm, showMemberRecordForm, showActionSheet, showMoreSheet, showWhatsAppSheet]);

  const uploadBlob = async (file: File, kind: "creative" | "reference") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("outletId", taskForm.outletId);
    fd.append("kind", kind);
    const res = await fetch("/api/team/upload", { method: "POST", body: fd });
    const data = await readTeamApiJson(res);
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/team/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await readTeamApiJson(res);
    if (!res.ok) {
      setLoginError(data.error || "Invalid password");
      return;
    }
    setUser(data.user);
    setPassword("");
  };

  const logout = async () => {
    await fetch("/api/team/auth", { method: "DELETE" });
    setUser(null);
    setMembers([]);
    setMemberTab("all");
    setTab("ads");
    setTasks([]);
    setReminders([]);
    setPlanningNotes([]);
    setTasksReady(false);
    setRemindersReady(false);
    setPlanningReady(false);
  };

  const resolveAssigneeId = () =>
    soleMember?.id ?? (memberTab !== "all" ? memberTab : (members[0]?.id ?? "amit"));

  const openCreateTask = () => {
    setEditing(null);
    setTaskForm(emptyTaskForm(resolveAssigneeId()));
    setUploadStatus(null);
    setShowTaskForm(true);
  };

  const openEditTask = (task: TeamTaskDto) => {
    const timing = startTimingFromTask(task);
    const end = endTimeModeFromTask(task.endTime);
    const dl = endTimeModeFromTask(task.deadlineTime);
    setEditing(task);
    setTaskForm({
      outletId: task.outletId,
      assigneeId: task.assigneeId,
      title: task.title,
      description: task.description ?? "",
      creativeUrl: task.creativeUrl ?? "",
      uploadedUrl: task.uploadedUrl ?? "",
      uploadedName: task.uploadedUrl ? "Uploaded file" : "",
      startTiming: timing,
      startDate: timing === "date" ? (task.startDate ?? "") : "",
      endDate: task.endDate ?? "",
      endTimeMode: end.mode,
      endTimeCustom: end.customTime,
      deadlineDate: task.deadlineDate ?? "",
      deadlineTimeMode: dl.mode,
      deadlineTimeCustom: dl.customTime,
      priority: task.priority,
      referenceUrls: task.referenceUrls ?? [],
    });
    setShowTaskForm(true);
  };

  const openCreateReminder = () => {
    setEditingReminder(null);
    setReminderForm(emptyReminderForm());
    if (isMember) setMineSection("reminders");
    setShowReminderForm(true);
  };

  const openEditReminder = (r: TeamReminderDto) => {
    const dl = endTimeModeFromTask(r.deadlineTime);
    setEditingReminder(r);
    setReminderForm({
      title: r.title,
      description: r.description ?? "",
      startDate: r.startDate ?? "",
      endDate: r.endDate ?? "",
      deadlineDate: r.deadlineDate ?? "",
      deadlineTimeMode: dl.mode,
      deadlineTimeCustom: dl.customTime,
      ownerId: "",
    });
    setShowReminderForm(true);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadStatus(null);
    try {
      const url = await uploadBlob(file, "creative");
      setUploadStatus({ fileName: file.name, siteUrl: url });
      setTaskForm((f) => ({
        ...f,
        uploadedUrl: url,
        uploadedName: file.name,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadReference = async (file: File) => {
    setRefUploading(true);
    setError(null);
    try {
      const url = await uploadBlob(file, "reference");
      setTaskForm((f) => ({ ...f, referenceUrls: [...f.referenceUrls, url] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setRefUploading(false);
    }
  };

  const uploadPlanningFile = async (file: File) => {
    setRefUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outletId", planningForm.outletId || "general");
      fd.append("kind", "planning");
      const res = await fetch("/api/team/upload", { method: "POST", body: fd });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPlanningForm((f) => ({
        ...f,
        attachments: [
          ...f.attachments,
          { url: data.url, fileName: data.fileName ?? file.name, mimeType: data.mimeType ?? file.type },
        ],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setRefUploading(false);
    }
  };

  const openCreatePlanning = (type: "PLANNING" | "FEEDBACK" = "PLANNING") => {
    setEditingPlanning(null);
    setPlanningForm(emptyPlanningSheetForm(type));
    setShowPlanningForm(true);
  };

  const openEditPlanning = (n: TeamPlanningDto) => {
    setEditingPlanning(n);
    setPlanningForm({
      type: n.type,
      title: n.title,
      outletId: n.outletId ?? "",
      sheetData: n.sheetData ?? emptyPlanningSheetForm(n.type).sheetData,
      attachments: n.attachments ?? [],
    });
    setShowPlanningForm(true);
  };

  const savePlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type: planningForm.type,
        title: planningForm.title.trim(),
        outletId: planningForm.outletId,
        sheetData: planningForm.sheetData,
        attachmentUrls: planningForm.attachments,
      };
      const url = editingPlanning
        ? `/api/team/planning/${editingPlanning.id}`
        : "/api/team/planning";
      const res = await fetch(url, {
        method: editingPlanning ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowPlanningForm(false);
      setEditingPlanning(null);
      await loadPlanning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deletePlanningNote = async (n: TeamPlanningDto) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    const res = await fetch(`/api/team/planning/${n.id}`, { method: "DELETE" });
    if (res.ok) await loadPlanning(true);
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        outletId: taskForm.outletId,
        assigneeId: soleMember?.id ?? taskForm.assigneeId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        creativeUrl: taskForm.creativeUrl.trim(),
        uploadedUrl: taskForm.uploadedUrl.trim(),
        startDate: resolveStartDateForSave(taskForm),
        endDate: taskForm.endDate,
        endTime: resolveEndTimeForSave(taskForm.endTimeMode, taskForm.endTimeCustom),
        deadlineDate: taskForm.deadlineDate,
        deadlineTime: resolveEndTimeForSave(taskForm.deadlineTimeMode, taskForm.deadlineTimeCustom),
        priority: taskForm.priority,
        referenceUrls: taskForm.referenceUrls,
      };
      const url = editing ? `/api/team/tasks/${editing.id}` : "/api/team/tasks";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowTaskForm(false);
      setEditing(null);
      await loadTasks(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        title: reminderForm.title.trim(),
        description: reminderForm.description.trim(),
        startDate: reminderForm.startDate,
        endDate: reminderForm.endDate,
        deadlineDate: reminderForm.deadlineDate,
        deadlineTime: resolveEndTimeForSave(
          reminderForm.deadlineTimeMode,
          reminderForm.deadlineTimeCustom
        ),
      };
      if (user?.role === "admin" && reminderForm.ownerId && !editingReminder) {
        payload.ownerId = reminderForm.ownerId;
      }
      const url = editingReminder
        ? `/api/team/reminders/${editingReminder.id}`
        : "/api/team/reminders";
      const res = await fetch(url, {
        method: editingReminder ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowReminderForm(false);
      setEditingReminder(null);
      await loadReminders(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskDone = async (task: TeamTaskDto) => {
    const res = await fetch(`/api/team/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: task.status === "DONE" ? "TODO" : "DONE" }),
    });
    if (res.ok) await loadTasks(true);
  };

  const toggleReminderDone = async (r: TeamReminderDto) => {
    const res = await fetch(`/api/team/reminders/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: r.status === "DONE" ? "TODO" : "DONE" }),
    });
    if (res.ok) await loadReminders(true);
  };

  const deleteTask = async (task: TeamTaskDto) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const res = await fetch(`/api/team/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) await loadTasks(true);
  };

  const reorderTasks = async (taskIds: string[]) => {
    const res = await fetch("/api/team/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds }),
    });
    if (res.ok) await loadTasks(true);
  };

  const changeTaskPriority = async (task: TeamTaskDto, priority: TeamTaskPriority) => {
    const res = await fetch(`/api/team/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (res.ok) await loadTasks(true);
  };

  const canDragTasks = user?.role === "admin" && filter === "todo" && tab === "ads";

  const deleteReminder = async (r: TeamReminderDto) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    const res = await fetch(`/api/team/reminders/${r.id}`, { method: "DELETE" });
    if (res.ok) await loadReminders(true);
  };

  const exportExcel = () => {
    const qs = new URLSearchParams({ filter });
    if (outletFilter) qs.set("outletId", outletFilter);
    if (user?.role === "admin" && memberTab !== "all") qs.set("assignee", memberTab);
    window.open(`/api/team/export?${qs}`, "_blank");
  };

  const shareWhatsApp = () => setShowWhatsAppSheet(true);

  const approveTask = async (task: TeamTaskDto) => {
    const res = await fetch(`/api/team/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    if (res.ok) await loadTasks(true);
  };

  const rejectTask = async (task: TeamTaskDto) => {
    if (!window.confirm(`Reject "${task.title}"?`)) return;
    const res = await fetch(`/api/team/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    if (res.ok) await loadTasks(true);
  };

  const saveMemberRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/tasks/member-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberRecordForm),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setShowMemberRecordForm(false);
      setMemberRecordForm(emptyMemberRecordForm());
      await loadTasks(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  const openMemberSheet = (type: "PLANNING" | "FEEDBACK") => {
    if (isMember) {
      setTab("reminders");
      setMineSection(type === "FEEDBACK" ? "feedback" : "planning");
    }
    openCreatePlanning(type);
  };

  const activeMemberLabel =
    memberTab !== "all" ? memberName(members, memberTab) : null;
  const listReady =
    tab === "ads"
      ? tasksReady
      : isMemberHub
        ? mineSection === "reminders"
          ? remindersReady
          : planningReady
        : tab === "reminders"
          ? remindersReady
          : tab === "planning"
            ? planningReady
            : true;
  const listEmpty =
    tab === "ads"
      ? tasks.length === 0
      : isMemberHub
        ? false
        : tab === "reminders"
          ? reminders.length === 0
          : tab === "planning"
            ? planningNotes.length === 0
            : false;

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#06060a] text-white/50">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#06060a] px-4 pb-[env(safe-area-inset-bottom)]">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Bassik Team
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Team board</h1>
          <p className="mt-1 text-sm text-white/45">Enter your password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-base text-white outline-none ring-cyan-400/30 focus:ring-2"
            autoFocus
          />
          {loginError ? <p className="mt-2 text-sm text-red-300">{loginError}</p> : null}
          <button
            type="submit"
            className="mt-4 w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const userLabel =
    user.role === "admin"
      ? "Admin"
      : user.role === "viewer"
        ? "Viewer · read-only"
        : memberName(members, user.memberId ?? user.username);

  const desktopPrimaryAction =
    !isViewer && tab !== "ai" ? (
      tab === "ads" && user.role === "admin" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/[0.04]"
          >
            Export
          </button>
          <button
            type="button"
            onClick={openCreateTask}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            + Ad task
          </button>
        </div>
      ) : tab === "ads" && user.role === "member" ? (
        <button
          type="button"
          onClick={() => {
            setMemberRecordForm(emptyMemberRecordForm());
            setShowMemberRecordForm(true);
          }}
          className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white"
        >
          + Log work
        </button>
      ) : tab === "planning" ? (
        <button
          type="button"
          onClick={() => openCreatePlanning("PLANNING")}
          className="rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white"
        >
          + Planning
        </button>
      ) : tab === "reminders" && user.role === "admin" ? (
        <button
          type="button"
          onClick={openCreateReminder}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + Reminder
        </button>
      ) : null
    ) : null;

  return (
    <div className="min-h-[100dvh] bg-[#06060a] text-white xl:flex">
      <TeamSidebarNav
        active={tab}
        onChange={setTab}
        hideReminders={isViewer}
        hideAi={isViewer || isMember}
        hidePlanning={isMember}
        userLabel={userLabel}
        onLogout={() => void logout()}
      />

      <div className="flex min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)] xl:pb-0">
      <TeamPageHeader
        tab={tab}
        userLabel={userLabel}
        counts={counts}
        refreshing={refreshing}
        showStats={tab === "ads" || (tab === "reminders" && !isMember)}
        isMemberHub={isMemberHub}
        mineSection={mineSection}
        onMineSectionChange={setMineSection}
        desktopAction={desktopPrimaryAction}
        onLogout={() => void logout()}
        filter={filter}
        onFilterChange={setFilter}
        adFilters={adFilters}
        showOutletFilter={user.role !== "member"}
        outletFilter={outletFilter}
        onOutletFilterChange={setOutletFilter}
        showMemberTabs={showMemberTabs}
        members={members}
        memberTab={memberTab}
        onMemberTabChange={setMemberTab}
        planningFilter={planningFilter}
        onPlanningFilterChange={setPlanningFilter}
        reminderFilters={FILTERS}
      />

      <main className={`${TEAM_PAGE} min-h-[40vh] flex-1 py-3 md:py-4 max-xl:pb-[var(--team-dock-pad)]`} style={{ ["--team-dock-pad" as string]: TEAM_DOCK_PADDING }}>
        {error ? (
          <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {!listReady ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : listEmpty && tab !== "ai" ? (
          <p className="py-16 text-center text-sm text-white/40">
            {tab === "ads"
              ? isViewer
                ? activeMemberLabel
                  ? `No tasks for ${activeMemberLabel}.`
                  : "No ad tasks to show."
                : filter === "pending"
                  ? "No work waiting for approval."
                  : user.role === "admin"
                  ? activeMemberLabel
                    ? `No tasks for ${activeMemberLabel}.`
                    : "No ad tasks here yet."
                  : "No tasks assigned to you yet."
              : tab === "planning"
                ? isViewer
                  ? "No planning notes yet."
                  : "No notes yet. Tap + below to add one."
                : "No reminders yet. Tap + below to add one."}
          </p>
        ) : tab === "ads" ? (
          <AdTaskList
            tasks={tasks}
            members={members}
            showAssignee={showMemberTabs && memberTab === "all"}
            isViewer={isViewer}
            isAdmin={user.role === "admin"}
            canDrag={canDragTasks}
            groupDoneByDate={filter === "done"}
            onApprove={(t) => void approveTask(t)}
            onReject={(t) => void rejectTask(t)}
            onToggleDone={(t) => void toggleTaskDone(t)}
            onEdit={openEditTask}
            onDelete={(t) => void deleteTask(t)}
            onReorder={reorderTasks}
            onPriorityChange={changeTaskPriority}
          />
        ) : tab === "planning" ? (
          <PlanningNoteList
            notes={planningNotes}
            ready={planningReady}
            isViewer={isViewer}
            onEdit={openEditPlanning}
            onDelete={(n) => void deletePlanningNote(n)}
          />
        ) : tab === "ai" && user.role === "admin" ? (
          <TeamAiPanel
            username={user.username}
            members={members}
            onTasksCreated={() => void loadTasks(true)}
          />
        ) : isMemberHub ? (
          <TeamMineView
            section={mineSection}
            reminders={reminders}
            remindersReady={remindersReady}
            planningNotes={planningNotes}
            planningReady={planningReady}
            readOnlyReminders={false}
            username={user.username}
            onEditPlanning={openEditPlanning}
            onDeletePlanning={(n) => void deletePlanningNote(n)}
            onNewPlanning={() => openCreatePlanning("PLANNING")}
            onNewFeedback={() => openCreatePlanning("FEEDBACK")}
            onEditReminder={openEditReminder}
            onToggleReminderDone={(r) => void toggleReminderDone(r)}
            onDeleteReminder={(r) => void deleteReminder(r)}
          />
        ) : tab === "reminders" ? (
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
                      className={`text-[15px] font-medium leading-snug ${
                        done ? "text-white/55 line-through" : "text-white"
                      }`}
                    >
                      {r.title}
                    </h2>
                    {meta ? (
                      <p className={`mt-1 text-xs ${overdue ? "text-red-300/80" : "text-white/38"}`}>
                        {meta}
                      </p>
                    ) : null}
                    {r.description ? <ExpandableText text={r.description} /> : null}
                    <div className="mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-2.5">
                      <button
                        type="button"
                        onClick={() => void toggleReminderDone(r)}
                        className={`min-h-[40px] flex-1 rounded-lg text-xs font-medium ${
                          done ? "text-white/45" : "bg-white/[0.06] text-emerald-200/90"
                        }`}
                      >
                        {done ? "Reopen" : "Done"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditReminder(r)}
                        className="min-h-[40px] rounded-lg px-3 text-xs text-white/50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteReminder(r)}
                        className="min-h-[40px] rounded-lg px-2 text-xs text-red-300/60"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </main>

      <TeamDock
        tab={tab}
        onTab={setTab}
        isAdmin={user.role === "admin"}
        isMember={user.role === "member"}
        isViewer={isViewer}
        onAdd={() => setShowActionSheet(true)}
        onWhatsApp={user.role === "admin" ? shareWhatsApp : undefined}
        onMore={() => setShowMoreSheet(true)}
      />

      <TeamActionSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={[
          ...(user.role === "admin"
            ? [
                { label: "New ad task", onClick: openCreateTask, tone: "accent" as const },
                { label: "Planning sheet", onClick: () => openCreatePlanning("PLANNING") },
                { label: "Reminder", onClick: openCreateReminder },
              ]
            : []),
          ...(user.role === "member" && tab === "ads"
            ? [
                {
                  label: "Log work done",
                  onClick: () => {
                    setMemberRecordForm(emptyMemberRecordForm());
                    setShowMemberRecordForm(true);
                  },
                  tone: "accent" as const,
                },
              ]
            : []),
          ...(user.role === "member" && tab === "reminders"
            ? [
                { label: "Reminder", onClick: openCreateReminder, tone: "accent" as const },
                { label: "Planning sheet", onClick: () => openMemberSheet("PLANNING") },
                { label: "Share feedback", onClick: () => openMemberSheet("FEEDBACK") },
              ]
            : []),
        ]}
      />

      <TeamMoreSheet
        open={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        onReminders={() => setTab("reminders")}
        onAi={() => setTab("ai")}
        onExport={exportExcel}
      />

      <TeamWhatsAppSheet open={showWhatsAppSheet} onClose={() => setShowWhatsAppSheet(false)} />

      </div>

      {showTaskForm && user.role === "admin" ? (
        <div className={TEAM_SHEET_OVERLAY}>
          <form
            onSubmit={saveTask}
            className={TEAM_SHEET_PANEL}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-lg font-semibold">{editing ? "Edit ad task" : "New ad task"}</h2>

            {showMemberTabs ? (
              <>
                <label className="mt-4 block text-xs font-medium text-white/50">Assign to</label>
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="mt-3 block text-xs font-medium text-white/50">Outlet</label>
            <select
              value={taskForm.outletId}
              onChange={(e) => setTaskForm((f) => ({ ...f, outletId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            >
              {TEAM_AD_OUTLETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-white/50">Title</label>
            <input
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Priority</label>
            <select
              value={taskForm.priority}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, priority: e.target.value as TeamTaskPriority }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            >
              {TEAM_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TEAM_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-white/50">Notes</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Creative link</label>
            <input
              value={taskForm.creativeUrl}
              onChange={(e) => setTaskForm((f) => ({ ...f, creativeUrl: e.target.value }))}
              placeholder="Drive or Instagram URL"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block cursor-pointer text-xs font-medium text-white/50">
              Attach file
              <input
                type="file"
                className="mt-1 block w-full text-sm text-white/60"
                accept="image/*,video/mp4,video/quicktime,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
                disabled={uploading}
              />
            </label>
            {uploading ? <p className="text-xs text-cyan-200">Uploading…</p> : null}
            {uploadStatus ? (
              <p className="text-xs text-emerald-300">✓ {uploadStatus.fileName}</p>
            ) : null}

            <label className="mt-3 block text-xs font-medium text-white/50">
              Reference images (moodboard / examples)
            </label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-white/60"
              disabled={refUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadReference(file);
                e.target.value = "";
              }}
            />
            {refUploading ? <p className="text-xs text-cyan-200">Uploading…</p> : null}
            {taskForm.referenceUrls.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {taskForm.referenceUrls.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setTaskForm((f) => ({
                          ...f,
                          referenceUrls: f.referenceUrls.filter((u) => u !== url),
                        }))
                      }
                      className="absolute -right-1 -top-1 rounded-full bg-black/80 px-1.5 text-[10px] text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50">Ad start</label>
                <select
                  value={taskForm.startTiming}
                  onChange={(e) => {
                    const next = e.target.value as StartTiming;
                    setTaskForm((f) => ({
                      ...f,
                      startTiming: next,
                      startDate: next === "date" ? f.startDate : "",
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
                >
                  <option value="asap">ASAP</option>
                  <option value="date">Pick a date</option>
                  <option value="none">No start</option>
                </select>
                {taskForm.startTiming === "date" ? (
                  <input
                    type="date"
                    value={taskForm.startDate}
                    onChange={(e) => setTaskForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
                  />
                ) : null}
              </div>
              <DateFields
                label="Ad end date"
                dateValue={taskForm.endDate}
                onDateChange={(v) => setTaskForm((f) => ({ ...f, endDate: v }))}
                timeMode={taskForm.endTimeMode}
                onTimeModeChange={(v) =>
                  setTaskForm((f) => ({
                    ...f,
                    endTimeMode: v,
                    endTimeCustom: v === "custom" ? f.endTimeCustom : "",
                  }))
                }
                timeCustom={taskForm.endTimeCustom}
                onTimeCustomChange={(v) => setTaskForm((f) => ({ ...f, endTimeCustom: v }))}
                timeLabel="Ad end time"
              />
              <DateFields
                label="Deadline (due by)"
                dateValue={taskForm.deadlineDate}
                onDateChange={(v) => setTaskForm((f) => ({ ...f, deadlineDate: v }))}
                timeMode={taskForm.deadlineTimeMode}
                onTimeModeChange={(v) =>
                  setTaskForm((f) => ({
                    ...f,
                    deadlineTimeMode: v,
                    deadlineTimeCustom: v === "custom" ? f.deadlineTimeCustom : "",
                  }))
                }
                timeCustom={taskForm.deadlineTimeCustom}
                onTimeCustomChange={(v) => setTaskForm((f) => ({ ...f, deadlineTimeCustom: v }))}
                timeLabel="Deadline time"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm(false);
                  setEditing(null);
                }}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading || refUploading}
                className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showReminderForm ? (
        <div className={TEAM_SHEET_OVERLAY}>
          <form
            onSubmit={saveReminder}
            className={TEAM_SHEET_PANEL}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-lg font-semibold">
              {editingReminder ? "Edit reminder" : "New reminder"}
            </h2>
            <p className="mt-1 text-xs text-white/40">
              {user.role === "admin"
                ? "Assign to a team member — they see it in Mine."
                : "Your personal reminder — shows in Mine."}
            </p>

            {user.role === "admin" && !editingReminder ? (
              <>
                <label className="mt-4 block text-xs font-medium text-white/50">For</label>
                <select
                  value={reminderForm.ownerId}
                  onChange={(e) => setReminderForm((f) => ({ ...f, ownerId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
                >
                  <option value="">Me (admin)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="mt-4 block text-xs font-medium text-white/50">Title</label>
            <input
              value={reminderForm.title}
              onChange={(e) => setReminderForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Follow up with outlet"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Notes</label>
            <textarea
              value={reminderForm.description}
              onChange={(e) => setReminderForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
            />

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50">Start date (optional)</label>
                <input
                  type="date"
                  value={reminderForm.startDate}
                  onChange={(e) => setReminderForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50">End date (optional)</label>
                <input
                  type="date"
                  value={reminderForm.endDate}
                  onChange={(e) => setReminderForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
                />
              </div>
              <DateFields
                label="Deadline"
                dateValue={reminderForm.deadlineDate}
                onDateChange={(v) => setReminderForm((f) => ({ ...f, deadlineDate: v }))}
                timeMode={reminderForm.deadlineTimeMode}
                onTimeModeChange={(v) =>
                  setReminderForm((f) => ({
                    ...f,
                    deadlineTimeMode: v,
                    deadlineTimeCustom: v === "custom" ? f.deadlineTimeCustom : "",
                  }))
                }
                timeCustom={reminderForm.deadlineTimeCustom}
                onTimeCustomChange={(v) => setReminderForm((f) => ({ ...f, deadlineTimeCustom: v }))}
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReminderForm(false);
                  setEditingReminder(null);
                }}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : editingReminder ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <PlanningSheetFormSheet
        open={showPlanningForm}
        form={planningForm}
        setForm={setPlanningForm}
        editing={Boolean(editingPlanning)}
        saving={saving}
        uploading={refUploading}
        onClose={() => {
          setShowPlanningForm(false);
          setEditingPlanning(null);
        }}
        onSubmit={savePlanning}
        onUploadFile={(file) => void uploadPlanningFile(file)}
      />

      <MemberRecordSheet
        open={showMemberRecordForm}
        form={memberRecordForm}
        setForm={setMemberRecordForm}
        saving={saving}
        onClose={() => setShowMemberRecordForm(false)}
        onSubmit={saveMemberRecord}
      />
    </div>
  );
}
