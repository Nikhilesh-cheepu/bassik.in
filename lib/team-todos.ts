import type { TeamTodoItem, TeamAdTaskStatus } from "@prisma/client";

export type TeamTodoDto = {
  id: string;
  title: string;
  description: string | null;
  status: TeamAdTaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTeamTodoDto(row: TeamTodoItem): TeamTodoDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function filterTeamTodos(
  todos: TeamTodoItem[],
  filter: "all" | "todo" | "done"
): TeamTodoItem[] {
  switch (filter) {
    case "todo":
      return todos.filter((t) => t.status === "TODO");
    case "done":
      return todos.filter((t) => t.status === "DONE");
    default:
      return todos;
  }
}

export function sortTeamTodos(todos: TeamTodoItem[]): TeamTodoItem[] {
  return [...todos].sort((a, b) => {
    const statusOrder = (s: TeamAdTaskStatus) => {
      if (s === "TODO") return 0;
      if (s === "PENDING_APPROVAL") return 1;
      return 2;
    };
    const statusCmp = statusOrder(a.status) - statusOrder(b.status);
    if (statusCmp !== 0) return statusCmp;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
