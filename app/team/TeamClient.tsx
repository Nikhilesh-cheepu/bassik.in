"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { pocDelegateAssigneeIds, teamMembersForClient } from "@/lib/team-members";
import {
  isAsapStartDate,
  TEAM_START_ASAP,
  teamTaskCompletedDayKey,
  type TeamCreativeLink,
  type TeamTaskDto,
} from "@/lib/team-tasks";
import {
  endTimeModeFromTask,
  resolveEndTimeForSave,
  TEAM_END_TIME_PRESETS,
  type TeamEndTimeMode,
} from "@/lib/team-end-time";
import type { TeamPersonalNoteDto, NoteListScope } from "@/lib/team-personal-notes";
import type { TeamVaultEntryDto, VaultListScope } from "@/lib/team-vault";
import type { TeamTaskPriority } from "@prisma/client";
import { TEAM_PRIORITY_LABELS, TEAM_PRIORITIES } from "@/lib/team-priority";
import AdTaskList from "./AdTaskList";
import { emptyMemberRecordForm, MemberRecordSheet, type MemberRecordForm } from "./MemberRecordSheet";
import TeamPageHeader from "./TeamPageHeader";
import TeamNotesView, { emptyNoteForm, type NoteForm } from "./TeamNotesView";
import TeamVaultView, { emptyVaultForm, type VaultForm } from "./TeamVaultView";
import TeamCalendarView from "./TeamCalendarView";
import TeamShootsView from "./TeamShootsView";
import TeamContentFilesView from "./TeamContentFilesView";
import TeamTasksView from "./TeamTasksView";
import { canCreateShoots } from "@/lib/team-shoots";
import { readCachedTeamUser, writeCachedTeamUser } from "@/lib/team-session-cache";
import { TeamSidebarNav, TEAM_PAGE, TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL, type TeamTab } from "./TeamNav";
import TeamDock, { TeamActionSheet, TeamMoreSheet } from "./TeamDock";
import TeamWhatsAppSheet from "./TeamWhatsAppSheet";
import { TeamDatePicker, TeamTimePicker } from "./TeamDatePicker";
import TeamDoneReportBanner from "./TeamDoneReportBanner";
import TeamDoneReportSheet from "./TeamDoneReportSheet";
import { TEAM_DOCK_PADDING } from "./TeamIcons";
import TeamAiPanel from "./TeamAiPanel";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

type TeamUser = { username: string; role: "admin" | "member" | "viewer" | "poc" | "content"; memberId?: string };
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

type TaskFormMode = "new" | "edit" | "duplicate";

type TaskForm = {
  outletId: string;
  assigneeId: string;
  title: string;
  description: string;
  creativeLinks: TeamCreativeLink[];
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

const emptyCreativeLink = (): TeamCreativeLink => ({ title: "", url: "" });

const emptyTaskForm = (assigneeId = "amit"): TaskForm => ({
  outletId: "",
  assigneeId,
  title: "",
  description: "",
  creativeLinks: [emptyCreativeLink()],
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

type TeamApiJson = Record<string, unknown>;

function teamApiError(data: TeamApiJson, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}

function teamApiArray<T>(data: TeamApiJson, key: string): T[] {
  const value = data[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function teamApiString(data: TeamApiJson, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

async function readTeamApiJson(res: Response): Promise<TeamApiJson> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return {};
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok ? "Invalid server response" : `Server error (${res.status}) — try refreshing`
    );
  }
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
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

function taskToForm(task: TeamTaskDto): TaskForm {
  const timing = startTimingFromTask(task);
  const end = endTimeModeFromTask(task.endTime);
  const dl = endTimeModeFromTask(task.deadlineTime);
  return {
    outletId: task.outletId ?? "",
    assigneeId: task.assigneeId,
    title: task.title,
    description: task.description ?? "",
    creativeLinks:
      task.creativeLinks.length > 0
        ? task.creativeLinks.map((l) => ({ ...l }))
        : [emptyCreativeLink()],
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
  };
}

function duplicateTaskTitle(title: string): string {
  const base = title.trim();
  const suffix = " (copy)";
  if (!base) return "Copy";
  if (base.toLowerCase().endsWith("(copy)")) return base;
  const next = `${base}${suffix}`;
  return next.length <= 200 ? next : `${base.slice(0, 200 - suffix.length)}${suffix}`;
}

function closeTaskForm(
  setShowTaskForm: (v: boolean) => void,
  setEditing: (v: TeamTaskDto | null) => void,
  setTaskFormMode: (v: TaskFormMode) => void
) {
  setShowTaskForm(false);
  setEditing(null);
  setTaskFormMode("new");
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
      <TeamDatePicker
        value={dateValue}
        onChange={onDateChange}
        placeholder="Select date"
        clearable
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
        <TeamTimePicker value={timeCustom} onChange={onTimeCustomChange} />
      ) : null}
    </div>
  );
}

export default function TeamClient() {
  const [user, setUser] = useState<TeamUser | null>(() => readCachedTeamUser());
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<TeamTab>("ads");
  const [tasks, setTasks] = useState<TeamTaskDto[]>([]);
  const [personalNotes, setPersonalNotes] = useState<TeamPersonalNoteDto[]>([]);
  const [tasksReady, setTasksReady] = useState(true);
  const [notesReady, setNotesReady] = useState(true);
  const [calendarAddSignal, setCalendarAddSignal] = useState(0);
  const [shootAddSignal, setShootAddSignal] = useState(0);
  const [contentFilesAddSignal, setContentFilesAddSignal] = useState(0);
  const [noteForm, setNoteForm] = useState<NoteForm>(emptyNoteForm());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notesSearch, setNotesSearch] = useState("");
  const [notesOutletFilter, setNotesOutletFilter] = useState("");
  const [notesScope, setNotesScope] = useState<NoteListScope>("all");
  const [noteUploading, setNoteUploading] = useState(false);
  const [noteComposeKey, setNoteComposeKey] = useState(0);
  const [vaultEntries, setVaultEntries] = useState<TeamVaultEntryDto[]>([]);
  const [vaultReady, setVaultReady] = useState(true);
  const [vaultForm, setVaultForm] = useState<VaultForm>(emptyVaultForm());
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultScope, setVaultScope] = useState<VaultListScope>("all");
  const [vaultComposeKey, setVaultComposeKey] = useState(0);
  const [vaultSavedEntryId, setVaultSavedEntryId] = useState<string | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("todo");
  const [memberTab, setMemberTab] = useState<MemberTab>("all");
  const [outletFilter, setOutletFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editing, setEditing] = useState<TeamTaskDto | null>(null);
  const [taskFormMode, setTaskFormMode] = useState<TaskFormMode>("new");
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ fileName: string; siteUrl: string } | null>(null);
  const [showMemberRecordForm, setShowMemberRecordForm] = useState(false);
  const [memberRecordForm, setMemberRecordForm] = useState<MemberRecordForm>(emptyMemberRecordForm);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showWhatsAppSheet, setShowWhatsAppSheet] = useState(false);
  const [showDoneReportSheet, setShowDoneReportSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const soleMember = members.length === 1 ? members[0] : null;
  const isViewer = user?.role === "viewer";
  const canBrowseAllMembers = user?.role === "admin" || user?.role === "viewer";
  const showMemberTabs = canBrowseAllMembers && members.length > 1 && tab === "ads";

  const counts = useMemo(() => {
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const pending = tasks.filter((t) => t.status === "PENDING_APPROVAL").length;
    return { todo, done, pending };
  }, [tasks]);

  const isMember = user?.role === "member";
  const isPoc = user?.role === "poc";
  const isContent = user?.role === "content";
  const isMemberLike = isMember || isPoc;
  const isMemberHub = isMemberLike && tab === "reminders";

  const adFilters = useMemo(() => {
    if (user?.role === "member" || user?.role === "poc") return MEMBER_AD_FILTERS;
    if (user?.role !== "admin") return FILTERS;
    return [
      ...FILTERS,
      {
        id: "pending" as const,
        label: counts.pending > 0 ? `Pending (${counts.pending})` : "Pending",
      },
    ];
  }, [user?.role, counts.pending]);

  useEffect(() => {
    if (!user) return;
    setMembers(teamMembersForClient());
  }, [user]);

  const loadTasks = useCallback(
    async (silent = true) => {
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
        if (!res.ok) throw new Error(teamApiError(data, "Could not load tasks"));
        setTasks(teamApiArray<TeamTaskDto>(data, "tasks"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setTasksReady(true);
        setRefreshing(false);
      }
    },
    [filter, outletFilter, memberTab, canBrowseAllMembers]
  );

  const loadPersonalNotes = useCallback(async (silent = true) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (notesSearch.trim()) qs.set("q", notesSearch.trim());
      if (notesOutletFilter) qs.set("outletId", notesOutletFilter);
      if (notesScope !== "all") qs.set("scope", notesScope);
      const res = await fetch(`/api/team/notes?${qs}`);
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Could not load notes"));
      setPersonalNotes(teamApiArray<TeamPersonalNoteDto>(data, "notes"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setNotesReady(true);
      setRefreshing(false);
    }
  }, [notesSearch, notesOutletFilter, notesScope]);

  const loadVaultEntries = useCallback(async (silent = true) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (vaultSearch.trim()) qs.set("q", vaultSearch.trim());
      if (vaultScope !== "all") qs.set("scope", vaultScope);
      const res = await fetch(`/api/team/vault?${qs}`);
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Could not load passwords"));
      setVaultEntries(teamApiArray<TeamVaultEntryDto>(data, "entries"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setVaultReady(true);
      setRefreshing(false);
    }
  }, [vaultSearch, vaultScope]);

  const probeSession = useCallback(async () => {
    try {
      const res = await fetch("/api/team/auth");
      if (res.ok) {
        const data = await readTeamApiJson(res);
        const u = (data.user as TeamUser | null | undefined) ?? null;
        setUser(u);
        writeCachedTeamUser(u);
        if (u?.role === "content") setTab("shoots");
      } else {
        setUser(null);
        writeCachedTeamUser(null);
      }
    } catch {
      /* keep cached user if offline; session will revalidate on next action */
    } finally {
      setSessionResolved(true);
    }
  }, []);

  useEffect(() => {
    void probeSession();
  }, [probeSession]);

  useEffect(() => {
    if (!user) return;
    if (isMemberLike && tab === "ai") {
      setTab("reminders");
    }
    if (isContent && (tab === "ads" || tab === "calendar" || tab === "ai")) {
      setTab("shoots");
    }
    if (
      isViewer &&
      (tab === "calendar" ||
        tab === "reminders" ||
        tab === "vault" ||
        tab === "ai" ||
        tab === "shoots" ||
        tab === "raw-files" ||
        tab === "edit-files" ||
        tab === "tasks")
    ) {
      setTab("ads");
    }
  }, [user, tab, isMemberLike, isViewer, isContent]);

  useEffect(() => {
    if (!user || tab !== "ads") return;
    void loadTasks(true);
  }, [user, tab, filter, outletFilter, memberTab, loadTasks]);

  useEffect(() => {
    if (!user || tab !== "reminders" || isViewer) return;
    void loadPersonalNotes(true);
  }, [user, tab, isViewer, notesSearch, notesOutletFilter, notesScope, loadPersonalNotes]);

  useEffect(() => {
    if (!user || tab !== "vault" || isViewer) return;
    void loadVaultEntries(true);
  }, [user, tab, isViewer, vaultSearch, vaultScope, loadVaultEntries]);

  const shareDoneReport = () => setShowDoneReportSheet(true);

  useEffect(() => {
    const open =
      showTaskForm ||
      showMemberRecordForm ||
      showActionSheet ||
      showMoreSheet ||
      showWhatsAppSheet ||
      showDoneReportSheet;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showTaskForm, showMemberRecordForm, showActionSheet, showMoreSheet, showWhatsAppSheet, showDoneReportSheet]);

  const uploadBlob = async (file: File, kind: "creative" | "reference") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("outletId", taskForm.outletId || "general");
    fd.append("kind", kind);
    const res = await fetch("/api/team/upload", { method: "POST", body: fd });
    const data = await readTeamApiJson(res);
    if (!res.ok) throw new Error(teamApiError(data, "Upload failed"));
    const url = teamApiString(data, "url");
    if (!url) throw new Error("Upload failed");
    return url;
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch("/api/team/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) {
        setLoginError(teamApiError(data, "Invalid password"));
        return;
      }
      const loggedIn = data.user as TeamUser;
      setUser(loggedIn);
      writeCachedTeamUser(loggedIn);
      if (loggedIn.role === "content") setTab("shoots");
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed — try refreshing the page");
    }
  };

  const logout = async () => {
    await fetch("/api/team/auth", { method: "DELETE" });
    setUser(null);
    writeCachedTeamUser(null);
    setMembers([]);
    setMemberTab("all");
    setTab("ads");
    setTasks([]);
    setPersonalNotes([]);
    setTasksReady(true);
    setNotesReady(true);
    setVaultReady(true);
    setNoteForm(emptyNoteForm());
    setEditingNoteId(null);
    setNotesSearch("");
    setNotesOutletFilter("");
  };

  const resolveAssigneeId = () =>
    soleMember?.id ?? (memberTab !== "all" ? memberTab : (members[0]?.id ?? "amit"));

  const openCreateTask = () => {
    setTaskFormMode("new");
    setEditing(null);
    setTaskForm(emptyTaskForm(resolveAssigneeId()));
    setUploadStatus(null);
    setShowTaskForm(true);
  };

  const openPocAssignTask = () => {
    const delegates = user?.memberId ? pocDelegateAssigneeIds(user.memberId) : ["mahesh"];
    setTaskFormMode("new");
    setEditing(null);
    setTaskForm(emptyTaskForm(delegates[0] ?? "mahesh"));
    setUploadStatus(null);
    setShowTaskForm(true);
  };

  const openEditTask = (task: TeamTaskDto) => {
    setTaskFormMode("edit");
    setEditing(task);
    setTaskForm(taskToForm(task));
    setShowTaskForm(true);
  };

  const duplicateTask = (task: TeamTaskDto) => {
    setTaskFormMode("duplicate");
    setEditing(null);
    setUploadStatus(null);
    setTaskForm({
      ...taskToForm(task),
      title: duplicateTaskTitle(task.title),
    });
    setShowTaskForm(true);
  };

  const startNewNote = () => {
    setEditingNoteId(null);
    setNoteForm(emptyNoteForm());
    setNoteComposeKey((k) => k + 1);
  };

  const focusNoteComposer = () => {
    startNewNote();
  };

  const savePersonalNote = async () => {
    const body = noteForm.body.trim();
    if (!body && noteForm.attachments.length === 0) return;
    const active = editingNoteId ? personalNotes.find((n) => n.id === editingNoteId) : null;
    if (active && !active.isOwner) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: noteForm.title.trim() || undefined,
        body: body || "See attached files.",
        outletId: noteForm.outletId || undefined,
        category: noteForm.category.trim() || undefined,
        aiSummary: noteForm.aiSummary.trim() || undefined,
        attachments: noteForm.attachments,
        sharedWith: noteForm.sharedWith,
      };
      const res = await fetch(
        editingNoteId ? `/api/team/notes/${editingNoteId}` : "/api/team/notes",
        {
          method: editingNoteId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Save failed"));
      setNoteForm(emptyNoteForm());
      setEditingNoteId(null);
      setNoteComposeKey(0);
      await loadPersonalNotes(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const cancelNoteEdit = () => {
    setEditingNoteId(null);
    setNoteForm(emptyNoteForm());
  };

  const openEditNote = useCallback((note: TeamPersonalNoteDto) => {
    setEditingNoteId(note.id);
    setNoteForm({
      title: note.title ?? "",
      body: note.body,
      outletId: note.outletId ?? "",
      category: note.category ?? "",
      aiSummary: note.aiSummary ?? "",
      attachments: note.attachments ?? [],
      sharedWith: note.sharedWith ?? [],
    });
  }, []);

  const uploadNoteFile = async (file: File) => {
    setNoteUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outletId", noteForm.outletId || "general");
      fd.append("kind", "note");
      const res = await fetch("/api/team/upload", { method: "POST", body: fd });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Upload failed"));
      setNoteForm((f) => ({
        ...f,
        attachments: [
          ...f.attachments,
          {
            url: teamApiString(data, "url") ?? "",
            fileName: teamApiString(data, "fileName") ?? file.name,
            mimeType: teamApiString(data, "mimeType") ?? file.type,
          },
        ],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setNoteUploading(false);
    }
  };

  const deletePersonalNote = async (note: TeamPersonalNoteDto) => {
    if (!window.confirm("Delete this note?")) return;
    const res = await fetch(`/api/team/notes/${note.id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingNoteId === note.id) {
        setEditingNoteId(null);
        setNoteForm(emptyNoteForm());
      }
      await loadPersonalNotes(true);
    }
  };

  const startNewVaultEntry = () => {
    setEditingVaultId(null);
    setVaultForm(emptyVaultForm());
    setVaultComposeKey((k) => k + 1);
  };

  const focusVaultComposer = () => startNewVaultEntry();

  const loadVaultForEdit = useCallback(async (entry: TeamVaultEntryDto) => {
    setEditingVaultId(entry.id);
    let password = "";
    try {
      const res = await fetch(`/api/team/vault/${entry.id}/reveal`);
      const data = await res.json();
      if (res.ok && typeof data.password === "string") password = data.password;
    } catch {
      /* ignore */
    }
    setVaultForm({
      title: entry.title ?? "",
      username: entry.username ?? "",
      password,
      url: entry.url ?? "",
      notes: entry.notes ?? "",
      outletId: entry.outletId ?? "",
      category: entry.category ?? "",
      sharedWith: entry.sharedWith ?? [],
    });
  }, []);

  const saveVaultEntry = async () => {
    if (!vaultForm.password.trim()) return;
    const active = editingVaultId ? vaultEntries.find((e) => e.id === editingVaultId) : null;
    if (active && !active.isOwner) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: vaultForm.title.trim() || undefined,
        username: vaultForm.username.trim() || undefined,
        password: vaultForm.password,
        url: vaultForm.url.trim() || undefined,
        notes: vaultForm.notes.trim() || undefined,
        outletId: vaultForm.outletId || undefined,
        category: vaultForm.category.trim() || undefined,
        sharedWith: vaultForm.sharedWith,
      };
      const res = await fetch(
        editingVaultId ? `/api/team/vault/${editingVaultId}` : "/api/team/vault",
        {
          method: editingVaultId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Save failed"));
      const saved = data.entry as TeamVaultEntryDto | undefined;
      setVaultForm(emptyVaultForm());
      setEditingVaultId(null);
      setVaultComposeKey(0);
      if (saved?.id) setVaultSavedEntryId(saved.id);
      await loadVaultEntries(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const cancelVaultEdit = () => {
    setEditingVaultId(null);
    setVaultForm(emptyVaultForm());
  };

  const deleteVaultEntry = async (entry: TeamVaultEntryDto) => {
    if (!window.confirm("Delete this saved password?")) return;
    const res = await fetch(`/api/team/vault/${entry.id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingVaultId === entry.id) {
        setEditingVaultId(null);
        setVaultForm(emptyVaultForm());
      }
      await loadVaultEntries(true);
    }
  };

  const shareVaultEntry = useCallback(async (entryId: string, sharedWith: string[]) => {
    setError(null);
    const res = await fetch(`/api/team/vault/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedWith }),
    });
    const data = await readTeamApiJson(res);
    if (!res.ok) throw new Error(teamApiError(data, "Could not share password"));
    await loadVaultEntries(true);
  }, [loadVaultEntries]);

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

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        outletId: taskForm.outletId.trim() || undefined,
        assigneeId: soleMember?.id ?? taskForm.assigneeId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        creativeLinks: taskForm.creativeLinks
          .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
          .filter((l) => l.url),
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
      if (!res.ok) throw new Error(teamApiError(data, "Save failed"));
      closeTaskForm(setShowTaskForm, setEditing, setTaskFormMode);
      await loadTasks(true);
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
      if (!res.ok) throw new Error(teamApiError(data, "Submit failed"));
      setShowMemberRecordForm(false);
      setMemberRecordForm(emptyMemberRecordForm());
      await loadTasks(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  const activeMemberLabel =
    memberTab !== "all" ? memberName(members, memberTab) : null;

  const listReady =
    tab === "ads" ? tasksReady : tab === "reminders" ? notesReady : tab === "vault" ? vaultReady : true;
  const listEmpty =
    tab === "ads"
      ? tasks.length === 0
      : tab === "reminders"
        ? personalNotes.length === 0 && !notesSearch && !notesOutletFilter
        : false;

  const doneReportDateCount = useMemo(() => {
    const keys = new Set(
      tasks.map((t) => teamTaskCompletedDayKey(t.completedAt ?? t.updatedAt))
    );
    keys.delete("unknown");
    return keys.size;
  }, [tasks]);

  const showDoneReportBanner =
    !isViewer &&
    tab === "ads" &&
    filter === "done" &&
    listReady &&
    tasks.length > 0;

  if (!user && !sessionResolved) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#06060a] text-white/50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-cyan-400" />
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
        : user.role === "poc"
          ? `${memberName(members, user.memberId ?? user.username)} · POC`
          : user.role === "content"
            ? `${memberName(members, user.memberId ?? user.username)} · Content`
            : memberName(members, user.memberId ?? user.username);

  const notesViewerId =
    user.role === "admin" ? "admin" : (user.memberId ?? user.username);

  const desktopPrimaryAction =
    !isViewer && tab !== "ai" ? (
      tab === "ads" && user.role === "admin" ? (
        <div className="flex flex-wrap gap-2">
          {filter === "done" && tasks.length > 0 ? (
            <button
              type="button"
              onClick={shareDoneReport}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/30"
            >
              Send done report
            </button>
          ) : null}
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
      ) : tab === "ads" && isPoc ? (
        <button
          type="button"
          onClick={openPocAssignTask}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + Assign to Mahesh
        </button>
      ) : tab === "ads" && user.role === "member" ? (
        <div className="flex flex-wrap gap-2">
          {filter === "done" && tasks.length > 0 ? (
            <button
              type="button"
              onClick={shareDoneReport}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/30"
            >
              Send done report
            </button>
          ) : null}
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
        </div>
      ) : tab === "reminders" && !isViewer ? (
        <button
          type="button"
          onClick={focusNoteComposer}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + Note
        </button>
      ) : tab === "calendar" && user.role === "admin" ? (
        <button
          type="button"
          onClick={() => setCalendarAddSignal((n) => n + 1)}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + Event
        </button>
      ) : tab === "shoots" && canCreateShoots(user) ? (
        <button
          type="button"
          onClick={() => setShootAddSignal((n) => n + 1)}
          className="rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + New shoot
        </button>
      ) : (tab === "raw-files" || tab === "edit-files") && canCreateShoots(user) ? (
        <button
          type="button"
          onClick={() => setContentFilesAddSignal((n) => n + 1)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
            tab === "raw-files" ? "bg-amber-600" : "bg-cyan-600"
          }`}
        >
          {tab === "raw-files" ? "+ Raw file" : "+ Edit file"}
        </button>
      ) : tab === "vault" ? (
        <button
          type="button"
          onClick={focusVaultComposer}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + Password
        </button>
      ) : null
    ) : null;

  const mobileHeaderAction =
    isContent && tab === "shoots" && canCreateShoots(user) ? (
      <button
        type="button"
        onClick={() => setShootAddSignal((n) => n + 1)}
        className="rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
      >
        + New shoot
      </button>
    ) : isContent && tab === "reminders" ? (
      <button
        type="button"
        onClick={focusNoteComposer}
        className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
      >
        + Note
      </button>
    ) : isContent && (tab === "raw-files" || tab === "edit-files") && canCreateShoots(user) ? (
      <button
        type="button"
        onClick={() => setContentFilesAddSignal((n) => n + 1)}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white ${
          tab === "raw-files" ? "bg-amber-600" : "bg-cyan-600"
        }`}
      >
        + Add
      </button>
    ) : isContent && tab === "vault" ? (
      <button
        type="button"
        onClick={focusVaultComposer}
        className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
      >
        + Password
      </button>
    ) : null;

  return (
    <div className="min-h-[100dvh] bg-[#06060a] text-white xl:flex xl:h-[100dvh]">
      <TeamSidebarNav
        active={tab}
        onChange={setTab}
        hideReminders={isViewer}
        hideVault={isViewer}
        hideAi={isViewer || isMemberLike || isContent}
        hideCalendar={isViewer || isContent}
        hideShoots={isViewer}
        hideRawFiles={!isContent}
        hideEditFiles={!isContent}
        hideAds={isContent}
        hideTasks={isViewer}
        userLabel={userLabel}
        onLogout={() => void logout()}
      />

      <div className="flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] xl:max-h-[100dvh] xl:pb-0">
      <TeamPageHeader
        tab={tab}
        userLabel={userLabel}
        counts={counts}
        refreshing={refreshing}
        showStats={tab === "ads"}
        isMemberHub={isMemberHub}
        desktopAction={desktopPrimaryAction}
        mobileAction={mobileHeaderAction}
        onLogout={() => void logout()}
        filter={filter}
        onFilterChange={setFilter}
        adFilters={adFilters}
        showOutletFilter={user.role !== "member" && !isPoc}
        outletFilter={outletFilter}
        onOutletFilterChange={setOutletFilter}
        showMemberTabs={showMemberTabs}
        members={members}
        memberTab={memberTab}
        onMemberTabChange={setMemberTab}
      />

      <main
        className={`${TEAM_PAGE} min-h-0 min-w-0 w-full max-w-full flex-1 max-xl:pb-[var(--team-dock-pad)] ${
          tab === "ai" ||
          tab === "reminders" ||
          tab === "calendar" ||
          tab === "vault" ||
          tab === "shoots" ||
          tab === "raw-files" ||
          tab === "edit-files" ||
          tab === "tasks"
            ? "flex flex-col overflow-hidden py-0 max-xl:px-0 max-xl:max-w-none md:py-4"
            : "overflow-y-auto overscroll-contain py-3 [-webkit-overflow-scrolling:touch] md:py-4"
        }`}
        style={{ ["--team-dock-pad" as string]: TEAM_DOCK_PADDING }}
      >
        {error ? (
          <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {listEmpty && tab === "ads" && tasksReady ? (
          <p className="py-16 text-center text-sm text-white/40">
            {isViewer
              ? activeMemberLabel
                ? `No tasks for ${activeMemberLabel}.`
                : "No ad tasks to show."
              : filter === "pending"
                ? "No work waiting for approval."
                : user.role === "admin"
                  ? activeMemberLabel
                    ? `No tasks for ${activeMemberLabel}.`
                    : "No ad tasks here yet."
                  : "No tasks assigned to you yet."}
          </p>
        ) : tab === "ads" ? (
          <>
            {showDoneReportBanner ? (
              <TeamDoneReportBanner
                count={tasks.length}
                dateCount={doneReportDateCount}
                onSend={shareDoneReport}
                isMember={isMemberLike}
              />
            ) : null}
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
            onDuplicate={duplicateTask}
            onDelete={(t) => void deleteTask(t)}
            onReorder={reorderTasks}
            onPriorityChange={changeTaskPriority}
          />
          </>
        ) : tab === "tasks" && !isViewer ? (
          <TeamTasksView
            isAdmin={user.role === "admin"}
            viewerId={notesViewerId}
            members={members}
          />
        ) : tab === "shoots" && !isViewer ? (
          <TeamShootsView
            members={members}
            viewerId={notesViewerId}
            canCreate={canCreateShoots(user)}
            addSignal={shootAddSignal}
          />
        ) : tab === "raw-files" && isContent ? (
          <TeamContentFilesView
            mode="raw"
            canEdit={canCreateShoots(user)}
            addSignal={contentFilesAddSignal}
          />
        ) : tab === "edit-files" && isContent ? (
          <TeamContentFilesView
            mode="edit"
            canEdit={canCreateShoots(user)}
            addSignal={contentFilesAddSignal}
          />
        ) : tab === "calendar" && !isViewer ? (
          <TeamCalendarView
            members={members}
            isAdmin={user.role === "admin"}
            viewerId={teamPersonalNoteOwnerId(user)}
            addEventSignal={calendarAddSignal}
          />
        ) : tab === "ai" && user.role === "admin" ? (
          <TeamAiPanel
            username={user.username}
            members={members}
            onTasksCreated={() => void loadTasks(true)}
          />
        ) : tab === "reminders" ? (
          <TeamNotesView
            notes={personalNotes}
            ready={notesReady}
            form={noteForm}
            editingId={editingNoteId}
            composeKey={noteComposeKey}
            search={notesSearch}
            onSearchChange={setNotesSearch}
            outletFilter={notesOutletFilter}
            onOutletFilterChange={setNotesOutletFilter}
            scope={notesScope}
            onScopeChange={setNotesScope}
            viewerId={notesViewerId}
            members={members}
            onFormChange={setNoteForm}
            onSave={() => void savePersonalNote()}
            onCancelEdit={cancelNoteEdit}
            onNewNote={startNewNote}
            saving={saving}
            uploading={noteUploading}
            onUploadFile={(file) => void uploadNoteFile(file)}
            onEdit={openEditNote}
            onDelete={(n) => void deletePersonalNote(n)}
          />
        ) : tab === "vault" && !isViewer ? (
          <TeamVaultView
            entries={vaultEntries}
            ready={vaultReady}
            form={vaultForm}
            editingId={editingVaultId}
            composeKey={vaultComposeKey}
            savedEntryId={vaultSavedEntryId}
            search={vaultSearch}
            onSearchChange={setVaultSearch}
            scope={vaultScope}
            onScopeChange={setVaultScope}
            viewerId={notesViewerId}
            members={members}
            onFormChange={setVaultForm}
            onSave={() => void saveVaultEntry()}
            onCancelEdit={cancelVaultEdit}
            onNewEntry={startNewVaultEntry}
            onClearSavedEntry={() => setVaultSavedEntryId(null)}
            saving={saving}
            onLoadForEdit={loadVaultForEdit}
            onDelete={(e) => void deleteVaultEntry(e)}
            onShareEntry={async (entryId, sharedWith) => {
              try {
                await shareVaultEntry(entryId, sharedWith);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Share failed");
              }
            }}
          />
        ) : null}
      </main>

      <TeamDock
        tab={tab}
        onTab={setTab}
        isAdmin={user.role === "admin"}
        isMember={isMemberLike}
        isContent={isContent}
        isViewer={isViewer}
        onAdd={() => {
          if (tab === "shoots" && canCreateShoots(user)) {
            setShootAddSignal((n) => n + 1);
            return;
          }
          if ((tab === "raw-files" || tab === "edit-files") && canCreateShoots(user)) {
            setContentFilesAddSignal((n) => n + 1);
            return;
          }
          if (tab === "reminders" && !isViewer) {
            focusNoteComposer();
            return;
          }
          if (tab === "vault" && !isViewer) {
            focusVaultComposer();
            return;
          }
          if (tab === "calendar" && user.role === "admin") {
            setCalendarAddSignal((n) => n + 1);
            return;
          }
          setShowActionSheet(true);
        }}
        onWhatsApp={user.role === "admin" ? shareWhatsApp : undefined}
        onMore={() => setShowMoreSheet(true)}
      />

      <TeamActionSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={[
          ...(user.role === "admin"
            ? [{ label: "New ad task", onClick: openCreateTask, tone: "accent" as const }]
            : []),
          ...(user.role === "admin"
            ? [{ label: "New calendar event", onClick: () => setCalendarAddSignal((n) => n + 1), tone: "default" as const }]
            : []),
          ...(isPoc && tab === "ads"
            ? [
                {
                  label: "Assign to Mahesh",
                  onClick: openPocAssignTask,
                  tone: "accent" as const,
                },
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
        ]}
      />

      <TeamMoreSheet
        open={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        onReminders={!isContent ? () => setTab("reminders") : undefined}
        onShoots={!isViewer && !isContent ? () => setTab("shoots") : undefined}
        onRawFiles={isContent ? () => setTab("raw-files") : undefined}
        onEditFiles={isContent ? () => setTab("edit-files") : undefined}
        onVault={!isViewer && !isContent ? () => setTab("vault") : undefined}
        onCalendar={!isViewer && !isContent ? () => setTab("calendar") : undefined}
        onAi={!isContent ? () => setTab("ai") : undefined}
        onExport={!isContent ? exportExcel : undefined}
        onWhatsApp={user.role === "admin" ? shareWhatsApp : undefined}
      />

      <TeamWhatsAppSheet open={showWhatsAppSheet} onClose={() => setShowWhatsAppSheet(false)} />
      <TeamDoneReportSheet
        open={showDoneReportSheet}
        onClose={() => setShowDoneReportSheet(false)}
        assigneeFilter={canBrowseAllMembers ? memberTab : undefined}
        isMember={isMember}
      />

      </div>

      {showTaskForm && (user.role === "admin" || (isPoc && !editing)) ? (
        <div className={TEAM_SHEET_OVERLAY}>
          <form
            onSubmit={saveTask}
            className={TEAM_SHEET_PANEL}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-lg font-semibold">
              {taskFormMode === "edit"
                ? "Edit ad task"
                : taskFormMode === "duplicate"
                  ? "Duplicate ad task"
                  : isPoc
                    ? "Assign task to Mahesh"
                    : "New ad task"}
            </h2>
            {taskFormMode === "duplicate" ? (
              <p className="mt-1 text-xs text-white/45">Creates a new task — edit anything before saving.</p>
            ) : null}

            {isPoc ? (
              <p className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-sm text-cyan-50/90">
                This task will be assigned to{" "}
                <strong>{memberName(members, taskForm.assigneeId)}</strong> for creative work.
              </p>
            ) : showMemberTabs ? (
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
              <option value="">General</option>
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

            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-white/50">Creative links</label>
                <button
                  type="button"
                  onClick={() =>
                    setTaskForm((f) => ({
                      ...f,
                      creativeLinks: [...f.creativeLinks, emptyCreativeLink()],
                    }))
                  }
                  className="text-xs font-medium text-cyan-400/90"
                >
                  + Add link
                </button>
              </div>
              <div className="mt-2 space-y-3">
                {taskForm.creativeLinks.map((link, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-white/35">
                        Link {index + 1}
                      </span>
                      {taskForm.creativeLinks.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTaskForm((f) => ({
                              ...f,
                              creativeLinks: f.creativeLinks.filter((_, i) => i !== index),
                            }))
                          }
                          className="text-[11px] text-red-300/80"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <input
                      value={link.title}
                      onChange={(e) =>
                        setTaskForm((f) => ({
                          ...f,
                          creativeLinks: f.creativeLinks.map((l, i) =>
                            i === index ? { ...l, title: e.target.value } : l
                          ),
                        }))
                      }
                      placeholder="Title (e.g. Main drive, IG reel)"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base"
                    />
                    <input
                      value={link.url}
                      onChange={(e) =>
                        setTaskForm((f) => ({
                          ...f,
                          creativeLinks: f.creativeLinks.map((l, i) =>
                            i === index ? { ...l, url: e.target.value } : l
                          ),
                        }))
                      }
                      placeholder="Drive or Instagram URL"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base"
                    />
                  </div>
                ))}
              </div>
            </div>

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
                  <div className="mt-2">
                    <TeamDatePicker
                      value={taskForm.startDate}
                      onChange={(v) => setTaskForm((f) => ({ ...f, startDate: v }))}
                      placeholder="Select start date"
                    />
                  </div>
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
                onClick={() => closeTaskForm(setShowTaskForm, setEditing, setTaskFormMode)}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading || refUploading}
                className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : taskFormMode === "duplicate"
                    ? "Create copy"
                    : editing
                      ? "Save"
                      : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

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
