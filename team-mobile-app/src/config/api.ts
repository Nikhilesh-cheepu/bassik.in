/**
 * API Configuration
 * Update BASE_URL to point to your production API or local development server
 */

// For development: use your computer's local IP or ngrok URL
// For production: use your deployed website URL
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bassik.in';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/team/auth',
  LOGOUT: '/api/team/auth',
  SESSION: '/api/team/auth',
  
  // Tasks
  TASKS: '/api/team/tasks',
  TASK_BY_ID: (id: string) => `/api/team/tasks/${id}`,
  TASK_REORDER: '/api/team/tasks/reorder',
  MEMBER_RECORD: '/api/team/tasks/member-record',
  
  // Planning
  PLANNING: '/api/team/planning',
  PLANNING_BY_ID: (id: string) => `/api/team/planning/${id}`,
  
  // Notes
  NOTES: '/api/team/notes',
  NOTE_BY_ID: (id: string) => `/api/team/notes/${id}`,
  
  // Reminders
  REMINDERS: '/api/team/reminders',
  REMINDER_BY_ID: (id: string) => `/api/team/reminders/${id}`,
  
  // Reports
  WHATSAPP_REPORT: '/api/team/whatsapp-report',
  DONE_REPORT: '/api/team/done-report',
  MEMBER_DONE_REPORT: '/api/team/member-done-report',
  
  // AI
  AI: '/api/team/ai',
  
  // Members
  MEMBERS: '/api/team/members',
  
  // Upload
  UPLOAD: '/api/team/upload',
  
  // Export
  EXPORT: '/api/team/export',
} as const;
