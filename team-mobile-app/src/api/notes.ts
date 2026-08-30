/**
 * Notes API (Personal Notes)
 */

import { apiRequest } from './client';
import { API_ENDPOINTS } from '../config/api';
import type { TeamPersonalNote } from '../types/team';

export interface NotesResponse {
  notes: TeamPersonalNote[];
}

export interface CreateNoteRequest {
  title: string;
  content: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}

export const notesApi = {
  /**
   * Get all personal notes for current user
   */
  async getNotes(): Promise<TeamPersonalNote[]> {
    const response = await apiRequest<NotesResponse>(API_ENDPOINTS.NOTES, {
      method: 'GET',
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to load notes');
    }

    return response.data.notes;
  },

  /**
   * Create a new note
   */
  async createNote(note: CreateNoteRequest): Promise<TeamPersonalNote> {
    const response = await apiRequest<TeamPersonalNote>(API_ENDPOINTS.NOTES, {
      method: 'POST',
      data: note,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create note');
    }

    return response.data;
  },

  /**
   * Update a note
   */
  async updateNote(noteId: string, updates: UpdateNoteRequest): Promise<TeamPersonalNote> {
    const response = await apiRequest<TeamPersonalNote>(API_ENDPOINTS.NOTE_BY_ID(noteId), {
      method: 'PATCH',
      data: updates,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update note');
    }

    return response.data;
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    const response = await apiRequest(API_ENDPOINTS.NOTE_BY_ID(noteId), {
      method: 'DELETE',
    });

    if (response.error) {
      throw new Error(response.error || 'Failed to delete note');
    }
  },
};
