/**
 * Tasks API
 */

import { apiRequest } from './client';
import { API_ENDPOINTS } from '../config/api';
import type { TeamTask, TaskFilter } from '../types/team';

export interface TasksResponse {
  tasks: TeamTask[];
  filter: TaskFilter;
  assignee: string;
}

export interface CreateTaskRequest {
  outletId: string;
  assigneeId: string;
  title: string;
  description?: string;
  creativeUrl?: string;
  uploadedUrl?: string;
  uploadedName?: string;
  startDate?: string;
  endDate?: string;
  endTime?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  priority?: string;
  referenceUrls?: string[];
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  completedAt?: string;
}

export const tasksApi = {
  /**
   * Get all tasks with optional filters
   */
  async getTasks(
    filter?: TaskFilter,
    outletId?: string,
    assignee?: string
  ): Promise<TeamTask[]> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (outletId) params.append('outletId', outletId);
    if (assignee) params.append('assignee', assignee);

    const response = await apiRequest<TasksResponse>(
      `${API_ENDPOINTS.TASKS}?${params.toString()}`,
      { method: 'GET' }
    );

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to load tasks');
    }

    return response.data.tasks;
  },

  /**
   * Create a new task
   */
  async createTask(task: CreateTaskRequest): Promise<TeamTask> {
    const response = await apiRequest<TeamTask>(API_ENDPOINTS.TASKS, {
      method: 'POST',
      data: task,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create task');
    }

    return response.data;
  },

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<TeamTask> {
    const response = await apiRequest<TeamTask>(API_ENDPOINTS.TASK_BY_ID(taskId), {
      method: 'PATCH',
      data: updates,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update task');
    }

    return response.data;
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const response = await apiRequest(API_ENDPOINTS.TASK_BY_ID(taskId), {
      method: 'DELETE',
    });

    if (response.error) {
      throw new Error(response.error || 'Failed to delete task');
    }
  },

  /**
   * Mark task as complete
   */
  async completeTask(taskId: string): Promise<TeamTask> {
    return this.updateTask(taskId, {
      completedAt: new Date().toISOString(),
    });
  },

  /**
   * Mark task as incomplete
   */
  async uncompleteTask(taskId: string): Promise<TeamTask> {
    return this.updateTask(taskId, {
      completedAt: undefined,
    });
  },

  /**
   * Reorder tasks
   */
  async reorderTasks(taskIds: string[]): Promise<void> {
    const response = await apiRequest(API_ENDPOINTS.TASK_REORDER, {
      method: 'POST',
      data: { taskIds },
    });

    if (response.error) {
      throw new Error(response.error || 'Failed to reorder tasks');
    }
  },
};
