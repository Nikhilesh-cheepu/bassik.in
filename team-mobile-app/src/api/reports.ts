/**
 * Reports API
 */

import { apiRequest } from './client';
import { API_ENDPOINTS } from '../config/api';

export interface WhatsAppReportRequest {
  outletId?: string;
  filter?: string;
  assignee?: string;
  dateRange?: string;
}

export interface WhatsAppReportResponse {
  message: string;
  success: boolean;
}

export interface DoneReportResponse {
  report: string;
  stats: {
    total: number;
    byOutlet: Record<string, number>;
    byMember: Record<string, number>;
  };
}

export const reportsApi = {
  /**
   * Generate and send WhatsApp report
   */
  async generateWhatsAppReport(
    request: WhatsAppReportRequest
  ): Promise<WhatsAppReportResponse> {
    const response = await apiRequest<WhatsAppReportResponse>(
      API_ENDPOINTS.WHATSAPP_REPORT,
      {
        method: 'POST',
        data: request,
      }
    );

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to generate WhatsApp report');
    }

    return response.data;
  },

  /**
   * Get done report
   */
  async getDoneReport(dateRange?: string): Promise<DoneReportResponse> {
    const params = dateRange ? `?dateRange=${dateRange}` : '';
    const response = await apiRequest<DoneReportResponse>(
      `${API_ENDPOINTS.DONE_REPORT}${params}`,
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to get done report');
    }

    return response.data;
  },

  /**
   * Get member done report
   */
  async getMemberDoneReport(memberId: string, dateRange?: string): Promise<DoneReportResponse> {
    const params = new URLSearchParams();
    if (dateRange) params.append('dateRange', dateRange);
    params.append('memberId', memberId);

    const response = await apiRequest<DoneReportResponse>(
      `${API_ENDPOINTS.MEMBER_DONE_REPORT}?${params.toString()}`,
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to get member done report');
    }

    return response.data;
  },
};
