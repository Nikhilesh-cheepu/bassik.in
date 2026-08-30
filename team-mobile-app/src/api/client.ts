/**
 * API Client
 * Handles all HTTP requests with authentication
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../config/api';

const STORAGE_KEY = 'team_auth_token';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookie-based auth
});

// Token management
export const tokenManager = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(STORAGE_KEY);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getToken();
    if (token) {
      // Add token as cookie header for backend compatibility
      config.headers.Cookie = `team_session=${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Extract and save token from Set-Cookie header if present
    const setCookie = response.headers['set-cookie'];
    if (setCookie && Array.isArray(setCookie)) {
      const teamCookie = setCookie.find(cookie => cookie.startsWith('team_session='));
      if (teamCookie) {
        const tokenMatch = teamCookie.match(/team_session=([^;]+)/);
        if (tokenMatch && tokenMatch[1]) {
          tokenManager.saveToken(tokenMatch[1]);
        }
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token
      await tokenManager.removeToken();
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      ...options,
    });
    return { data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        error: error.response?.data?.error || error.message || 'Request failed',
      };
    }
    return { error: 'An unexpected error occurred' };
  }
}

export default apiClient;
