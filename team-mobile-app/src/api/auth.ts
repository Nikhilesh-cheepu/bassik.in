/**
 * Authentication API
 */

import { apiRequest, tokenManager } from './client';
import { API_ENDPOINTS } from '../config/api';
import type { TeamSession } from '../types/team';

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: TeamSession;
}

export interface SessionResponse {
  user: TeamSession;
}

export const authApi = {
  /**
   * Login with password
   */
  async login(password: string): Promise<LoginResponse | null> {
    const response = await apiRequest<LoginResponse>(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      data: { password },
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    return response.data;
  },

  /**
   * Get current session
   */
  async getSession(): Promise<TeamSession | null> {
    const response = await apiRequest<SessionResponse>(API_ENDPOINTS.SESSION, {
      method: 'GET',
    });

    if (response.error || !response.data) {
      return null;
    }

    return response.data.user;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await apiRequest(API_ENDPOINTS.LOGOUT, {
      method: 'DELETE',
    });
    await tokenManager.removeToken();
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  },
};
