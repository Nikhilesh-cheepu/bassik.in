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
import TeamBottomNav, { TeamSidebarNav, TEAM_PAGE, TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL, type TeamTab } from "./TeamNav";
import TeamAiPanel from "./TeamAiPanel";
import {
  emptyPlanningForm,
  PlanningFilters,
  PlanningFormSheet,
  PlanningNoteList,
  type PlanningForm,
} from "./TeamPlanningView";
import type { TeamPlanningDto, TeamPlanningFilter } from "@/lib/team-planning";

type TeamUser = { username: string; role: "admin" | "member" | "viewer"; memberId?: string };
type TeamMember = { id: string; name: string; role?: string };
type Filter = "all" | "todo" | "done";
type MemberTab = "all" | string;

const TAB_TITLES: Record<TeamTab, string> = {
  ads: "Ads & creatives",
  planning: "Planning & feedback",
  reminders: "My reminders",
  ai: "AI assistant",
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
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
};

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

const emptyReminderForm = (): ReminderForm => ({
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  deadlineDate: "",
  deadlineTimeMode: "none",
  deadlineTimeCustom: "",
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

function chipClass(active: boolean, tone: "cyan" | "violet" = "cyan"): string {
  const on =
    tone === "violet"
      ? "bg-violet-500/15 text-violet-100"
      : "bg-white/10 text-white";
  return `shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
    active ? on : "text-white/45"
  }`;
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
  const [planningForm, setPlanningForm] = useState<PlanningForm>(emptyPlanningForm);
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
  const [saving, setSaving] = useState(false);

  const soleMember = members.length === 1 ? members[0] : null;
  const isViewer = user?.role === "viewer";
  const canBrowseAllMembers = user?.role === "admin" || user?.role === "viewer";
  const showMemberTabs = canBrowseAllMembers && members.length > 1 && tab === "ads";

  const counts = useMemo(() => {
    const list = tab === "ads" ? tasks : tab === "reminders" ? reminders : [];
    const todo = list.filter((t) => t.status === "TODO").length;
    const done = list.filter((t) => t.status === "DONE").length;
    return { todo, done };
  }, [tasks, reminders, tab]);

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
        const qs = new URLSearchParams({ filter });
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
    [filter]
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
    if (tab === "ads") void loadTasks(tasksReady);
    else if (tab === "reminders" && !isViewer) void loadReminders(remindersReady);
    else if (tab === "planning") void loadPlanning(planningReady);
  }, [user, tab, loadTasks, loadReminders, loadPlanning, isViewer]);

  useEffect(() => {
    if (!user || tab !== "planning") return;
    void loadPlanning(planningReady);
  }, [planningFilter]);

  useEffect(() => {
    const open = showTaskForm || showReminderForm || showPlanningForm;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showTaskForm, showReminderForm, showPlanningForm]);

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

  const uploadPlanningImage = async (file: File) => {
    setRefUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outletId", planningForm.outletId || taskForm.outletId);
      fd.append("kind", "reference");
      const res = await fetch("/api/team/upload", { method: "POST", body: fd });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPlanningForm((f) => ({ ...f, imageUrls: [...f.imageUrls, data.url] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setRefUploading(false);
    }
  };

  const openCreatePlanning = () => {
    setEditingPlanning(null);
    setPlanningForm(emptyPlanningForm());
    setShowPlanningForm(true);
  };

  const openEditPlanning = (n: TeamPlanningDto) => {
    setEditingPlanning(n);
    setPlanningForm({
      type: n.type,
      title: n.title,
      body: n.body ?? "",
      outletId: n.outletId ?? "",
      imageUrls: n.imageUrls,
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
        body: planningForm.body.trim(),
        outletId: planningForm.outletId,
        imageUrls: planningForm.imageUrls,
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
      const payload = {
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

  const activeMemberLabel =
    memberTab !== "all" ? memberName(members, memberTab) : null;
  const listReady =
    tab === "ads" ? tasksReady : tab === "reminders" ? remindersReady : tab === "planning" ? planningReady : true;
  const listEmpty =
    tab === "ads" ? tasks.length === 0 : tab === "reminders" ? reminders.length === 0 : tab === "planning" ? planningNotes.length === 0 : false;

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
        <div className="flex gap-2">
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
      ) : tab === "planning" ? (
        <button
          type="button"
          onClick={openCreatePlanning}
          className="rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white"
        >
          + Note
        </button>
      ) : tab === "reminders" ? (
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
        hideAi={isViewer}
        userLabel={userLabel}
        onLogout={() => void logout()}
      />

      <div className="flex min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)] xl:pb-0">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06060a]/95 backdrop-blur-md xl:static">
        <div className={TEAM_PAGE}>
          <div className="flex items-center justify-between gap-3 pt-3 pb-2 xl:pt-5 xl:pb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70 xl:hidden">
                Bassik Team
              </p>
              <h1 className="truncate text-lg font-semibold xl:text-2xl">{TAB_TITLES[tab]}</h1>
              <p className="text-xs text-white/40">
                <span className="xl:hidden">{userLabel}</span>
                {tab === "ads" || tab === "reminders" ? (
                  <>
                    <span className="xl:hidden"> · </span>
                    {counts.todo} to do · {counts.done} done
                  </>
                ) : null}
                {refreshing ? " · …" : ""}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-3 xl:flex">
              {desktopPrimaryAction}
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:bg-white/[0.04]"
              >
                Lock
              </button>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs text-white/50 min-h-[40px] xl:hidden"
            >
              Lock
            </button>
          </div>

          {(tab === "ads" || tab === "planning" || tab === "reminders") && (
            <div className="mb-2 rounded-xl bg-white/[0.03] p-2 md:flex md:flex-wrap md:items-center md:gap-2">
              {tab === "ads" ? (
                <>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={chipClass(filter === f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={outletFilter}
                    onChange={(e) => setOutletFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70 md:mt-0 md:w-auto"
                  >
                    <option value="">All outlets</option>
                    {TEAM_AD_OUTLETS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : tab === "planning" ? (
                <PlanningFilters filter={planningFilter} onFilterChange={setPlanningFilter} />
              ) : (
                <div className="flex gap-1.5">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={chipClass(filter === f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {showMemberTabs ? (
                <div className="mt-2 flex gap-1.5 overflow-x-auto border-t border-white/[0.05] pt-2 md:mt-0 md:overflow-visible md:border-t-0 md:border-l md:pt-0 md:pl-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setMemberTab("all")}
                    className={chipClass(memberTab === "all", "violet")}
                  >
                    All
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMemberTab(m.id)}
                      className={chipClass(memberTab === m.id, "violet")}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className={`${TEAM_PAGE} min-h-[40vh] flex-1 py-3 md:py-4`}>
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
        ) : tab === "ai" ? (
          <TeamAiPanel
            username={user.username}
            members={members}
            onTasksCreated={() => void loadTasks(true)}
          />
        ) : (
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
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#06060a]/98 pb-[max(0.25rem,env(safe-area-inset-bottom))] xl:hidden">
        {!isViewer && tab !== "ai" ? (
          <div className={`${TEAM_PAGE} flex gap-2 py-2`}>
            {tab === "ads" && user.role === "admin" ? (
              <>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="min-h-[44px] rounded-xl border border-white/10 px-3 text-xs text-white/60"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={openCreateTask}
                  className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold text-white"
                >
                  + Ad task
                </button>
              </>
            ) : tab === "planning" ? (
              <button
                type="button"
                onClick={openCreatePlanning}
                className="min-h-[44px] flex-1 rounded-xl bg-sky-500/80 text-sm font-semibold text-white"
              >
                + Note
              </button>
            ) : tab === "reminders" ? (
              <button
                type="button"
                onClick={openCreateReminder}
                className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-semibold text-white"
              >
                + Reminder
              </button>
            ) : null}
          </div>
        ) : null}
        <TeamBottomNav
          active={tab}
          onChange={setTab}
          hideReminders={isViewer}
          hideAi={isViewer}
        />
      </div>

      <div className={tab === "ai" ? "h-[200px] xl:h-0" : "h-[108px] xl:h-0"} />
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
              Personal notes — not shared ad work. Set a deadline to stay on track.
            </p>

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

      <PlanningFormSheet
        open={showPlanningForm}
        form={planningForm}
        setForm={setPlanningForm}
        editing={editingPlanning}
        saving={saving}
        uploading={refUploading}
        onClose={() => {
          setShowPlanningForm(false);
          setEditingPlanning(null);
        }}
        onSubmit={savePlanning}
        onUploadImage={(file) => void uploadPlanningImage(file)}
      />
    </div>
  );
}
