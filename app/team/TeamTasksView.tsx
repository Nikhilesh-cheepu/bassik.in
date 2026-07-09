"use client";

import { useState, useEffect, useCallback } from "react";
import type { TeamTodoDto } from "@/lib/team-todos";
import type { TeamDailyChecklistDto, TeamChecklistItemDto } from "@/lib/team-checklists";
import type { TeamAdTaskStatus } from "@prisma/client";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import type { TeamMember } from "@/lib/team-members";

type TeamApiJson = Record<string, unknown>;

function teamApiError(data: TeamApiJson, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}

function teamApiArray<T>(data: TeamApiJson, key: string): T[] {
  const value = data[key];
  return Array.isArray(value) ? (value as T[]) : [];
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

type TeamTasksViewProps = {
  isAdmin: boolean;
  viewerId: string;
  members: TeamMember[];
};

type TodoForm = {
  title: string;
  description: string;
};

type ChecklistForm = {
  title: string;
  description: string;
  items: Array<{
    title: string;
    description: string;
    dayOfWeek: string;
  }>;
};

const emptyTodoForm = (): TodoForm => ({
  title: "",
  description: "",
});

const emptyChecklistForm = (): ChecklistForm => ({
  title: "",
  description: "",
  items: [{ title: "", description: "", dayOfWeek: "" }],
});

export default function TeamTasksView({
  isAdmin,
  viewerId,
  members,
}: TeamTasksViewProps) {
  const [todos, setTodos] = useState<TeamTodoDto[]>([]);
  const [checklists, setChecklists] = useState<TeamDailyChecklistDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todoForm, setTodoForm] = useState<TodoForm>(emptyTodoForm());
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [checklistForm, setChecklistForm] = useState<ChecklistForm>(emptyChecklistForm());
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("todo");

  const loadTodos = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/todos?filter=${filter}`);
      if (!res.ok) {
        const data = await readTeamApiJson(res);
        throw new Error(teamApiError(data, "Failed to load todos"));
      }
      const data = await readTeamApiJson(res);
      setTodos(teamApiArray<TeamTodoDto>(data, "todos"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos");
    }
  }, [filter]);

  const loadChecklists = useCallback(async () => {
    try {
      const qs = selectedMemberId && isAdmin ? `?manageMemberId=${selectedMemberId}` : "";
      const res = await fetch(`/api/team/checklists${qs}`);
      if (!res.ok) {
        const data = await readTeamApiJson(res);
        throw new Error(teamApiError(data, "Failed to load checklists"));
      }
      const data = await readTeamApiJson(res);
      setChecklists(teamApiArray<TeamDailyChecklistDto>(data, "checklists"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load checklists");
    }
  }, [selectedMemberId, isAdmin]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([loadTodos(), loadChecklists()]);
      setLoading(false);
    };
    void load();
  }, [loadTodos, loadChecklists]);

  const saveTodo = async () => {
    if (!todoForm.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingTodoId ? `/api/team/todos/${editingTodoId}` : "/api/team/todos";
      const res = await fetch(url, {
        method: editingTodoId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todoForm),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Save failed"));
      setShowTodoForm(false);
      setEditingTodoId(null);
      setTodoForm(emptyTodoForm());
      await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleTodo = async (todo: TeamTodoDto) => {
    try {
      const res = await fetch(`/api/team/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: todo.status === "DONE" ? "TODO" : "DONE" }),
      });
      if (res.ok) await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteTodo = async (id: string) => {
    if (!window.confirm("Delete this todo?")) return;
    try {
      const res = await fetch(`/api/team/todos/${id}`, { method: "DELETE" });
      if (res.ok) await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const saveChecklist = async () => {
    if (!checklistForm.title.trim() || !selectedMemberId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedMemberId,
          title: checklistForm.title,
          description: checklistForm.description,
          items: checklistForm.items.filter((i) => i.title.trim()),
        }),
      });
      const data = await readTeamApiJson(res);
      if (!res.ok) throw new Error(teamApiError(data, "Save failed"));
      setShowChecklistForm(false);
      setChecklistForm(emptyChecklistForm());
      setSelectedMemberId("");
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/team/checklist-items/${itemId}/complete`, {
        method: "POST",
      });
      if (res.ok) await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteChecklist = async (id: string) => {
    if (!window.confirm("Delete this checklist?")) return;
    try {
      const res = await fetch(`/api/team/checklists/${id}`, { method: "DELETE" });
      if (res.ok) await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-cyan-400" />
      </div>
    );
  }

  const todoCounts = {
    all: todos.length,
    todo: todos.filter((t) => t.status === "TODO").length,
    done: todos.filter((t) => t.status === "DONE").length,
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {error ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">My Todo List</h2>
            <button
              type="button"
              onClick={() => {
                setEditingTodoId(null);
                setTodoForm(emptyTodoForm());
                setShowTodoForm(true);
              }}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              + Add todo
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {(["all", "todo", "done"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  filter === f
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:bg-white/5"
                }`}
              >
                {f === "all" ? "All" : f === "todo" ? "To do" : "Done"} ({todoCounts[f]})
              </button>
            ))}
          </div>

          {todos.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              {filter === "done" ? "No completed todos" : "No todos yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={todo.status === "DONE"}
                      onChange={() => void toggleTodo(todo)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-white/30 bg-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-base font-medium ${
                          todo.status === "DONE"
                            ? "text-white/40 line-through"
                            : "text-white"
                        }`}
                      >
                        {todo.title}
                      </p>
                      {todo.description ? (
                        <p className="mt-1 text-sm text-white/50">{todo.description}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTodo(todo.id)}
                      className="shrink-0 text-sm text-red-300/80 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Daily Checklists</h2>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setShowChecklistForm(true)}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-semibold text-white"
              >
                + Create checklist
              </button>
            ) : null}
          </div>

          {isAdmin ? (
            <div className="mt-3 mb-4">
              <label className="block text-xs font-medium text-white/50 mb-2">
                View checklists for
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base text-white"
              >
                <option value="">My checklists</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {checklists.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              No daily checklists yet
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {checklist.title}
                      </h3>
                      {checklist.description ? (
                        <p className="mt-1 text-sm text-white/50">
                          {checklist.description}
                        </p>
                      ) : null}
                    </div>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => deleteChecklist(checklist.id)}
                        className="text-xs text-red-300/80 hover:text-red-300"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  {checklist.items.length === 0 ? (
                    <p className="text-sm text-white/40">No items for today</p>
                  ) : (
                    <div className="space-y-2">
                      {checklist.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2"
                        >
                          <input
                            type="checkbox"
                            checked={item.completedToday}
                            onChange={() => void toggleChecklistItem(item.id)}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/30 bg-white/10"
                          />
                          <div className="flex-1">
                            <p
                              className={`text-sm ${
                                item.completedToday
                                  ? "text-white/40 line-through"
                                  : "text-white/90"
                              }`}
                            >
                              {item.title}
                            </p>
                            {item.description ? (
                              <p className="mt-0.5 text-xs text-white/40">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTodoForm ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 md:items-center md:justify-center md:p-8">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0c0c12] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-[88vh] md:max-w-lg md:rounded-2xl md:shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-lg font-semibold text-white">
              {editingTodoId ? "Edit todo" : "New todo"}
            </h2>
            <label className="mt-4 block text-xs font-medium text-white/50">Title</label>
            <input
              type="text"
              value={todoForm.title}
              onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
              placeholder="What needs to be done?"
              autoFocus
            />
            <label className="mt-3 block text-xs font-medium text-white/50">
              Description (optional)
            </label>
            <textarea
              value={todoForm.description}
              onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
              placeholder="Additional details..."
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTodoForm(false);
                  setEditingTodoId(null);
                  setTodoForm(emptyTodoForm());
                }}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveTodo()}
                disabled={saving || !todoForm.title.trim()}
                className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : editingTodoId ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showChecklistForm ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 md:items-center md:justify-center md:p-8">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0c0c12] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-[88vh] md:max-w-lg md:rounded-2xl md:shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-lg font-semibold text-white">Create daily checklist</h2>
            
            <label className="mt-4 block text-xs font-medium text-white/50">Assign to</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
            >
              <option value="">Select team member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-white/50">
              Checklist title
            </label>
            <input
              type="text"
              value={checklistForm.title}
              onChange={(e) =>
                setChecklistForm({ ...checklistForm, title: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
              placeholder="e.g. Client 1, Social Media Tasks"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">
              Description (optional)
            </label>
            <textarea
              value={checklistForm.description}
              onChange={(e) =>
                setChecklistForm({ ...checklistForm, description: e.target.value })
              }
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
            />

            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-medium text-white/50">Checklist items</label>
              <button
                type="button"
                onClick={() =>
                  setChecklistForm({
                    ...checklistForm,
                    items: [
                      ...checklistForm.items,
                      { title: "", description: "", dayOfWeek: "" },
                    ],
                  })
                }
                className="text-xs font-medium text-cyan-400/90"
              >
                + Add item
              </button>
            </div>

            <div className="mt-2 space-y-3">
              {checklistForm.items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/35">
                      Item {index + 1}
                    </span>
                    {checklistForm.items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setChecklistForm({
                            ...checklistForm,
                            items: checklistForm.items.filter((_, i) => i !== index),
                          })
                        }
                        className="text-[11px] text-red-300/80"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setChecklistForm({
                        ...checklistForm,
                        items: checklistForm.items.map((it, i) =>
                          i === index ? { ...it, title: e.target.value } : it
                        ),
                      })
                    }
                    placeholder="e.g. Mon flyer - post"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                  <select
                    value={item.dayOfWeek}
                    onChange={(e) =>
                      setChecklistForm({
                        ...checklistForm,
                        items: checklistForm.items.map((it, i) =>
                          i === index ? { ...it, dayOfWeek: e.target.value } : it
                        ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Every day</option>
                    <option value="mon">Monday</option>
                    <option value="tue">Tuesday</option>
                    <option value="wed">Wednesday</option>
                    <option value="thu">Thursday</option>
                    <option value="fri">Friday</option>
                    <option value="sat">Saturday</option>
                    <option value="sun">Sunday</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowChecklistForm(false);
                  setChecklistForm(emptyChecklistForm());
                  setSelectedMemberId("");
                }}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveChecklist()}
                disabled={
                  saving ||
                  !checklistForm.title.trim() ||
                  !selectedMemberId ||
                  !checklistForm.items.some((i) => i.title.trim())
                }
                className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
