"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";
import {
  formatTeamEndDateTime,
  formatTeamStartDate,
  isAsapStartDate,
  TEAM_START_ASAP,
  type TeamTaskDto,
} from "@/lib/team-tasks";
import {
  endTimeModeFromTask,
  resolveEndTimeForSave,
  TEAM_END_TIME_PRESETS,
  type TeamEndTimeMode,
} from "@/lib/team-end-time";

type TeamUser = { username: string; role: "admin" | "member"; memberId?: string };
type TeamMember = { id: string; name: string; role?: string };
type Filter = "all" | "todo" | "done";
type MemberTab = "all" | string;

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
};

const emptyForm = (assigneeId = "amit"): TaskForm => ({
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
});

function memberName(members: TeamMember[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

type UploadStatus = {
  fileName: string;
  siteUrl: string;
} | null;

function creativeLink(task: TeamTaskDto): string | null {
  return task.uploadedUrl?.trim() || task.creativeUrl?.trim() || null;
}

export default function TeamClient() {
  const [user, setUser] = useState<TeamUser | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [booting, setBooting] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TeamTaskDto[]>([]);
  const [filter, setFilter] = useState<Filter>("todo");
  const [memberTab, setMemberTab] = useState<MemberTab>("all");
  const [outletFilter, setOutletFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeamTaskDto | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const [saving, setSaving] = useState(false);

  const soleMember = members.length === 1 ? members[0] : null;
  const showMemberTabs = user?.role === "admin" && members.length > 1;

  const counts = useMemo(() => {
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    return { todo, done, total: tasks.length };
  }, [tasks]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team/members");
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } catch {
      /* roster optional for display */
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ filter });
      if (outletFilter) qs.set("outletId", outletFilter);
      if (user?.role === "admin" && memberTab !== "all") qs.set("assignee", memberTab);
      const res = await fetch(`/api/team/tasks?${qs}`);
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load tasks");
      setTasks(data.tasks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [filter, outletFilter, memberTab, user?.role]);

  const probeSession = useCallback(async () => {
    try {
      const res = await fetch("/api/team/auth");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void probeSession();
  }, [probeSession]);

  useEffect(() => {
    if (user) {
      void loadMembers();
      void loadTasks();
    }
  }, [user, loadMembers, loadTasks]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/team/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
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
    setTasks([]);
  };

  const resolveAssigneeId = () =>
    soleMember?.id ?? (memberTab !== "all" ? memberTab : (members[0]?.id ?? "amit"));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(resolveAssigneeId()));
    setUploadStatus(null);
    setShowForm(true);
  };

  const openEdit = (task: TeamTaskDto) => {
    const timing = startTimingFromTask(task);
    const end = endTimeModeFromTask(task.endTime);
    setEditing(task);
    setForm({
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
    });
    setShowForm(true);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadStatus(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outletId", form.outletId);
      const res = await fetch("/api/team/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadStatus({
        fileName: data.fileName || file.name,
        siteUrl: data.url,
      });

      setForm((f) => ({
        ...f,
        uploadedUrl: data.url ?? "",
        uploadedName: data.fileName || file.name,
      }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploadStatus(null);
    } finally {
      setUploading(false);
    }
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        outletId: form.outletId,
        assigneeId: soleMember?.id ?? form.assigneeId,
        title: form.title.trim(),
        description: form.description.trim(),
        creativeUrl: form.creativeUrl.trim(),
        uploadedUrl: form.uploadedUrl.trim(),
        startDate: resolveStartDateForSave(form),
        endDate: form.endDate,
        endTime: resolveEndTimeForSave(form.endTimeMode, form.endTimeCustom),
      };

      if (editing) {
        const res = await fetch(`/api/team/tasks/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
      } else {
        const res = await fetch("/api/team/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
      }

      setShowForm(false);
      setEditing(null);
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task: TeamTaskDto) => {
    const next = task.status === "DONE" ? "TODO" : "DONE";
    const res = await fetch(`/api/team/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) await loadTasks();
  };

  const deleteTask = async (task: TeamTaskDto) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const res = await fetch(`/api/team/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) await loadTasks();
  };

  const exportExcel = () => {
    const qs = new URLSearchParams({ filter });
    if (outletFilter) qs.set("outletId", outletFilter);
    if (user?.role === "admin" && memberTab !== "all") qs.set("assignee", memberTab);
    window.open(`/api/team/export?${qs}`, "_blank");
  };

  const activeMemberLabel =
    memberTab !== "all" ? memberName(members, memberTab) : null;

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#06060a] text-white/50">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#06060a] px-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Bassik Team
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Ads & SEO board</h1>
          <p className="mt-1 text-sm text-white/45">
            Enter your team password to manage ad tasks across outlets.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-cyan-400/30 focus:ring-2"
            autoFocus
          />
          {loginError ? (
            <p className="mt-2 text-sm text-red-300">{loginError}</p>
          ) : null}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#06060a] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06060a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
              Bassik Team
            </p>
            <h1 className="text-lg font-semibold">Ads & creatives</h1>
            <p className="text-xs text-white/40">
              {user.role === "admin"
                ? "Admin"
                : memberName(members, user.memberId ?? user.username)}{" "}
              · {counts.todo} to do · {counts.done} done
              {activeMemberLabel ? ` · ${activeMemberLabel}'s board` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportExcel}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/70"
            >
              Export Excel
            </button>
            {user.role === "admin" ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white"
              >
                + New ad task
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/45"
            >
              Lock
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 pb-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === f.id
                  ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                  : "bg-white/[0.04] text-white/50"
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="ml-auto rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70"
          >
            <option value="">All outlets</option>
            {TEAM_AD_OUTLETS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {showMemberTabs ? (
          <div className="mx-auto flex max-w-5xl flex-wrap gap-2 border-t border-white/[0.04] px-4 py-3">
            <button
              type="button"
              onClick={() => setMemberTab("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                memberTab === "all"
                  ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/30"
                  : "bg-white/[0.04] text-white/50"
              }`}
            >
              All members
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMemberTab(m.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  memberTab === m.id
                    ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/30"
                    : "bg-white/[0.04] text-white/50"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/45">
          <strong className="text-white/70">Workflow:</strong> upload the creative in Google Drive (or
          Instagram), paste the link on the task, mark done when posted. Optional: attach a file here
          if you don&apos;t have a link yet.
        </div>

        {error ? (
          <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-12 text-center text-sm text-white/40">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/40">
            {user.role === "admin"
              ? activeMemberLabel
                ? `No tasks for ${activeMemberLabel}. Create one with "New ad task".`
                : 'No tasks in this view. Create one with "New ad task".'
              : "No tasks in this view. Ask admin to add ad tasks."}
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const link = creativeLink(task);
              const done = task.status === "DONE";
              return (
                <article
                  key={task.id}
                  className={`rounded-2xl border p-4 ${
                    done
                      ? "border-emerald-400/15 bg-emerald-500/[0.04]"
                      : "border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
                          {teamOutletLabel(task.outletId)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            done ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {done ? "Done" : "To do"}
                        </span>
                        {showMemberTabs && memberTab === "all" ? (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-200">
                            {memberName(members, task.assigneeId)}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-white">{task.title}</h2>
                      {task.description ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-white/55">{task.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                        <span>Ad start: {formatTeamStartDate(task.startDate)}</span>
                        <span>Ad end: {formatTeamEndDateTime(task.endDate, task.endTime)}</span>
                        <span>Created: {formatDateTime(task.createdAt)}</span>
                        {task.completedAt ? (
                          <span className="text-emerald-300/80">
                            Done: {formatDateTime(task.completedAt)}
                            {task.completedBy ? ` · ${task.completedBy}` : ""}
                          </span>
                        ) : null}
                        <span>By {task.createdBy}</span>
                      </div>
                      {link ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-sm font-medium text-cyan-300 hover:underline"
                          >
                            Open creative →
                          </a>
                          {task.uploadedUrl ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                              Saved on Bassik
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-white/30">No creative link yet</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {user.role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100"
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void toggleDone(task)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          done
                            ? "border border-white/15 text-white/60"
                            : "bg-emerald-500/20 text-emerald-100"
                        }`}
                      >
                        {done ? "Reopen" : "Mark done"}
                      </button>
                      {user.role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => void deleteTask(task)}
                          className="rounded-full border border-red-400/20 px-3 py-1.5 text-xs text-red-300/80"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {showForm && user.role === "admin" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <form
            onSubmit={saveTask}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c12] p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">{editing ? "Edit task" : "New ad task"}</h2>
            <p className="mt-1 text-xs text-white/40">
              {soleMember
                ? `Tasks go to ${soleMember.name}. Pick outlet, add creative link or upload file.`
                : "Pick member and outlet, add creative link or upload file, optional campaign dates."}
            </p>

            {showMemberTabs ? (
              <>
                <label className="mt-4 block text-xs font-medium text-white/50">Assign to</label>
                <select
                  value={form.assigneeId}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className={`block text-xs font-medium text-white/50 ${showMemberTabs ? "mt-3" : "mt-4"}`}>
              Outlet
            </label>
            <select
              value={form.outletId}
              onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
              disabled={Boolean(editing && user.role !== "admin")}
            >
              {TEAM_AD_OUTLETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-white/50">Title (optional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Ladies Night reel — Firefly"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
              disabled={Boolean(editing && user.role !== "admin")}
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Notes / brief</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="What ad, which platform, sizes, copy…"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
              disabled={Boolean(editing && user.role !== "admin")}
            />

            <label className="mt-3 block text-xs font-medium text-white/50">
              Creative link (Google Drive or Instagram) — main
            </label>
            <input
              value={form.creativeUrl}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  creativeUrl: e.target.value,
                }))
              }
              placeholder="https://drive.google.com/… or instagram.com/p/…"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
              disabled={Boolean(editing && user.role !== "admin")}
            />

            <p className="mt-3 text-xs font-medium text-white/50">Optional — attach file here</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-white/60 hover:bg-white/[0.04]">
                {uploading ? "Uploading…" : "Choose file"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/mp4,video/quicktime,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file);
                  }}
                  disabled={uploading || Boolean(editing && user.role !== "admin")}
                />
              </label>
              {uploading ? (
                <p className="text-xs text-cyan-200">Uploading…</p>
              ) : uploadStatus ? (
                <p className="text-xs text-emerald-300">
                  ✓ {uploadStatus.fileName} attached ·{" "}
                  <a
                    href={uploadStatus.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    preview
                  </a>
                </p>
              ) : form.uploadedName ? (
                <span className="text-xs text-emerald-300">✓ {form.uploadedName}</span>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-white/50">Ad start</label>
                <select
                  value={form.startTiming}
                  onChange={(e) => {
                    const next = e.target.value as StartTiming;
                    setForm((f) => ({
                      ...f,
                      startTiming: next,
                      startDate: next === "date" ? f.startDate : "",
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
                  disabled={Boolean(editing && user.role !== "admin")}
                >
                  <option value="asap">ASAP</option>
                  <option value="date">Pick a date</option>
                  <option value="none">No start date</option>
                </select>
                {form.startTiming === "date" ? (
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                    disabled={Boolean(editing && user.role !== "admin")}
                  />
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50">Ad end date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  disabled={Boolean(editing && user.role !== "admin")}
                />
                <label className="mt-2 block text-xs font-medium text-white/50">End time</label>
                <select
                  value={form.endTimeMode}
                  onChange={(e) => {
                    const next = e.target.value as TeamEndTimeMode;
                    setForm((f) => ({
                      ...f,
                      endTimeMode: next,
                      endTimeCustom: next === "custom" ? f.endTimeCustom : "",
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
                  disabled={Boolean(editing && user.role !== "admin")}
                >
                  <option value="none">No end time</option>
                  {TEAM_END_TIME_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.hint})
                    </option>
                  ))}
                  <option value="custom">Pick exact time</option>
                </select>
                {form.endTimeMode === "custom" ? (
                  <input
                    type="time"
                    value={form.endTimeCustom}
                    onChange={(e) => setForm((f) => ({ ...f, endTimeCustom: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                    disabled={Boolean(editing && user.role !== "admin")}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60"
              >
                Cancel
              </button>
              {(!editing || user.role === "admin") && (
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Create task"}
                </button>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
