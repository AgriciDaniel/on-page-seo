import axios from 'axios'
import type { Audit, AuditWithResults, PageResult, ProgressEvent } from '@/types/seo'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Discover pages response
export interface DiscoverResponse {
  url: string
  pages: string[]
  total: number
}

// Audit API
export const auditApi = {
  // Discover pages for a URL (without starting audit)
  discover: async (url: string, limit: number = 100): Promise<DiscoverResponse> => {
    const response = await api.post<DiscoverResponse>('/audits/discover', { url, limit })
    return response.data
  },

  // Create new audit (optionally with specific pages)
  create: async (url: string, limit: number = 100, pages?: string[]): Promise<Audit> => {
    const response = await api.post<Audit>('/audits', { url, limit, pages })
    return response.data
  },

  // Get all audits
  getAll: async (): Promise<Audit[]> => {
    const response = await api.get<Audit[]>('/audits')
    return response.data
  },

  // Get single audit with results
  getById: async (id: string): Promise<AuditWithResults> => {
    const response = await api.get<AuditWithResults>(`/audits/${id}`)
    return response.data
  },

  // Delete audit
  delete: async (id: string): Promise<void> => {
    await api.delete(`/audits/${id}`)
  },

  // Cancel a running audit
  cancel: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(`/audits/${id}/cancel`)
    return response.data
  },

  // Regenerate/re-run an audit
  regenerate: async (id: string): Promise<Audit> => {
    const response = await api.post<Audit>(`/audits/${id}/regenerate`)
    return response.data
  },

  // Re-fetch ranked keywords
  refetchKeywords: async (
    id: string,
    config?: { location_code?: number; language_code?: string; limit?: number }
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/audits/${id}/keywords`,
      config || {}
    )
    return response.data
  },

  // Export audit
  exportCsv: (id: string): string => `/api/audits/${id}/export?format=csv`,
  exportJson: (id: string): string => `/api/audits/${id}/export?format=json`,
  exportKeywordsCsv: (id: string): string => `/api/audits/${id}/export?format=csv&type=keywords`,
  exportKeywordsJson: (id: string): string => `/api/audits/${id}/export?format=json&type=keywords`,

  // Subscribe to progress updates (SSE)
  subscribeToProgress: (
    id: string,
    onProgress: (event: ProgressEvent) => void,
    onError?: (error: Event) => void
  ): EventSource => {
    const eventSource = new EventSource(`/api/audits/${id}/progress`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent
        onProgress(data)
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      onError?.(error)
    }

    return eventSource
  },
}

// Report API
export const reportApi = {
  // Get single page report
  getById: async (id: string): Promise<PageResult> => {
    const response = await api.get<PageResult>(`/reports/report/${id}`)
    return response.data
  },
}

// Settings API
export interface ApiSettings {
  firecrawl_api_key: string
  dataforseo_username: string
  dataforseo_password: string
  firecrawl_api_key_configured: string
  dataforseo_username_configured: string
  dataforseo_password_configured: string
}

export interface ApiSettingsStatus {
  firecrawl_configured: boolean
  dataforseo_configured: boolean
  all_configured: boolean
}

export const settingsApi = {
  // Get all settings (masked values)
  getAll: async (): Promise<ApiSettings> => {
    const response = await api.get<ApiSettings>('/settings')
    return response.data
  },

  // Get settings configuration status
  getStatus: async (): Promise<ApiSettingsStatus> => {
    const response = await api.get<ApiSettingsStatus>('/settings/status')
    return response.data
  },

  // Update settings
  update: async (settings: Partial<{
    firecrawl_api_key: string
    dataforseo_username: string
    dataforseo_password: string
  }>): Promise<{ success: boolean; message: string }> => {
    const response = await api.put<{ success: boolean; message: string }>('/settings', settings)
    return response.data
  },

  // Clear a setting
  clear: async (key: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/settings/${key}`)
    return response.data
  },

  // Test Firecrawl API connection
  testFirecrawl: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post<{ success: boolean; message?: string; error?: string }>('/settings/test/firecrawl')
    return response.data
  },

  // Test DataForSEO API connection
  testDataForSeo: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post<{ success: boolean; message?: string; error?: string }>('/settings/test/dataforseo')
    return response.data
  },
}

// Health check
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await api.get<{ status: string; timestamp: string }>('/health')
  return response.data
}

export default api
