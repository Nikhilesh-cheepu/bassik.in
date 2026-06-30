/**
 * Reminders API
 */

import { apiRequest } from './client';
import { API_ENDPOINTS } from '../config/api';
import type { TeamReminder } from '../types/team';

export interface RemindersResponse {
  reminders: TeamReminder[];
}

export interface CreateReminderRequest {
  text: string;
  dueDate?: string;
}

export interface UpdateReminderRequest {
  text?: string;
  dueDate?: string;
  completedAt?: string;
}

export const remindersApi = {
  /**
   * Get all reminders for current user
   */
  async getReminders(): Promise<TeamReminder[]> {
    const response = await apiRequest<RemindersResponse>(API_ENDPOINTS.REMINDERS, {
      method: 'GET',
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to load reminders');
    }

    return response.data.reminders;
  },

  /**
   * Create a new reminder
   */
  async createReminder(reminder: CreateReminderRequest): Promise<TeamReminder> {
    const response = await apiRequest<TeamReminder>(API_ENDPOINTS.REMINDERS, {
      method: 'POST',
      data: reminder,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create reminder');
    }

    return response.data;
  },

  /**
   * Update a reminder
   */
  async updateReminder(
    reminderId: string,
    updates: UpdateReminderRequest
  ): Promise<TeamReminder> {
    const response = await apiRequest<TeamReminder>(
      API_ENDPOINTS.REMINDER_BY_ID(reminderId),
      {
        method: 'PATCH',
        data: updates,
      }
    );

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update reminder');
    }

    return response.data;
  },

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string): Promise<void> {
    const response = await apiRequest(API_ENDPOINTS.REMINDER_BY_ID(reminderId), {
      method: 'DELETE',
    });

    if (response.error) {
      throw new Error(response.error || 'Failed to delete reminder');
    }
  },

  /**
   * Mark reminder as complete
   */
  async completeReminder(reminderId: string): Promise<TeamReminder> {
    return this.updateReminder(reminderId, {
      completedAt: new Date().toISOString(),
    });
  },

  /**
   * Mark reminder as incomplete
   */
  async uncompleteReminder(reminderId: string): Promise<TeamReminder> {
    return this.updateReminder(reminderId, {
      completedAt: undefined,
    });
  },
};
