import { z } from 'zod'

// Re-export all shared types
export type {
  AuditStatus,
  OverallStatus,
  CWVStatus,
  ResourceError,
  Audit,
  PageResult,
  AuditWithResults,
  ProgressEvent,
  RankedKeyword,
  RankedKeywordsSummary,
  SearchIntent,
  PositionTrend,
} from '@shared/types'

// Import types for use in this file
import type { OverallStatus, CWVStatus, PositionTrend, SearchIntent } from '@shared/types'

// Zod schemas for form validation (client-only)
export const auditFormSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .refine(
      (val) => {
        try {
          const url = val.startsWith('http') ? val : `https://${val}`
          new URL(url)
          return true
        } catch {
          return false
        }
      },
      { message: 'Please enter a valid URL' }
    ),
  limit: z.number().min(1).max(500).default(100),
})

export type AuditFormValues = z.infer<typeof auditFormSchema>

// UI Helper functions (client-only)
export function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (score >= 70) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

export function getStatusColor(status: OverallStatus): string {
  switch (status) {
    case 'excellent':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'good':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'needs_improvement':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'poor':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

export function getCWVStatusColor(status: CWVStatus): string {
  switch (status) {
    case 'good':
      return 'text-green-600 dark:text-green-400'
    case 'needs_improvement':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'poor':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// Keyword UI helpers
export function getTrendColor(trend: PositionTrend): string {
  switch (trend) {
    case 'new':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'up':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'down':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'lost':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    case 'stable':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

export function getIntentColor(intent: SearchIntent | null): string {
  switch (intent) {
    case 'informational':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'commercial':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case 'navigational':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'transactional':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

export function formatTraffic(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(0)
}
