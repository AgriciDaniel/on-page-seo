import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback } from 'react'
import { auditApi } from '@/lib/api'
import type { Audit, AuditWithResults, ProgressEvent } from '@/types/seo'

// Query keys
export const auditKeys = {
  all: ['audits'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: string) => [...auditKeys.lists(), { filters }] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
}

// Get all audits
export function useAudits() {
  return useQuery({
    queryKey: auditKeys.lists(),
    queryFn: auditApi.getAll,
  })
}

// Get single audit with results
export function useAudit(id: string) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => auditApi.getById(id),
    enabled: !!id,
  })
}

// Create audit mutation
export function useCreateAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ url, limit }: { url: string; limit: number }) =>
      auditApi.create(url, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
    },
  })
}

// Delete audit mutation
export function useDeleteAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: auditApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
    },
  })
}

// Progress subscription hook
export function useAuditProgress(id: string, enabled: boolean = true) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const handleProgress = useCallback(
    (event: ProgressEvent) => {
      setProgress(event)

      // When audit completes or fails, invalidate queries
      if (event.status === 'completed' || event.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: auditKeys.detail(id) })
        queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
      }
    },
    [id, queryClient]
  )

  useEffect(() => {
    if (!enabled || !id) return

    let eventSource: EventSource | null = null

    try {
      eventSource = auditApi.subscribeToProgress(
        id,
        (event) => {
          setIsConnected(true)
          setError(null)
          handleProgress(event)
        },
        (err) => {
          console.error('SSE error:', err)
          setError('Connection lost. Retrying...')
          setIsConnected(false)
        }
      )
    } catch (err) {
      console.error('Failed to connect:', err)
      setError('Failed to connect to server')
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [id, enabled, handleProgress])

  return { progress, isConnected, error }
}
