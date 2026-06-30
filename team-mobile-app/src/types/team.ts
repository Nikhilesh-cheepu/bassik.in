/**
 * Team Types
 * Matches the backend API types
 */

export type TeamRole = 'admin' | 'member' | 'viewer' | 'poc';

export interface TeamSession {
  username: string;
  role: TeamRole;
  memberId?: string;
}

export type TaskPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type TaskStatus = 'todo' | 'done';
export type TaskFilter = 'all' | 'todo' | 'done' | 'pending';

export interface TeamTask {
  id: string;
  outletId: string;
  assigneeId: string;
  title: string;
  description: string;
  creativeUrl?: string;
  uploadedUrl?: string;
  uploadedName?: string;
  startDate?: string;
  endDate?: string;
  endTime?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  priority: TaskPriority;
  referenceUrls: string[];
  completedAt?: string;
  completedDay?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamOutlet {
  id: string;
  name: string;
  displayName?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  kind?: 'member' | 'poc';
}

export interface TeamReminder {
  id: string;
  memberId: string;
  text: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPlanningNote {
  id: string;
  outletId: string;
  title: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPersonalNote {
  id: string;
  memberId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WhatsAppReportRequest {
  outletId?: string;
  filter?: string;
  assignee?: string;
  dateRange?: string;
}
