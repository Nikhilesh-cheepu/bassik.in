/**
 * AI API
 */

import { apiRequest } from './client';
import { API_ENDPOINTS } from '../config/api';
import type { AIMessage } from '../types/team';

export interface AIRequest {
  messages: AIMessage[];
}

export interface AIResponse {
  reply: string;
}

export const aiApi = {
  /**
   * Send message to team AI assistant
   */
  async sendMessage(messages: AIMessage[]): Promise<string> {
    const response = await apiRequest<AIResponse>(API_ENDPOINTS.AI, {
      method: 'POST',
      data: { messages },
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to get AI response');
    }

    return response.data.reply;
  },
};
