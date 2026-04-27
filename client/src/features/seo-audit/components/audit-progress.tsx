import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, XCircle, Loader2, Globe, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuditProgress } from '../hooks/use-audit'

interface AuditProgressProps {
  auditId: string
}

export function AuditProgress({ auditId }: AuditProgressProps) {
  const navigate = useNavigate()
  const { progress, isConnected, error } = useAuditProgress(auditId, true)

  const progressPercentage =
    progress && progress.total_pages > 0
      ? Math.round((progress.completed_pages / progress.total_pages) * 100)
      : 0

  // Navigate to results when completed
  useEffect(() => {
    if (progress?.status === 'completed') {
      const timer = setTimeout(() => {
        navigate({ to: '/audits/$auditId', params: { auditId } })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [progress?.status, auditId, navigate])

  return (
    <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center p-4'>
      <Card className='w-full max-w-lg'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4'>
            {progress?.status === 'completed' ? (
              <div className='rounded-full bg-green-100 p-4 dark:bg-green-900'>
                <CheckCircle2 className='h-12 w-12 text-green-600 dark:text-green-400' />
              </div>
            ) : progress?.status === 'failed' ? (
              <div className='rounded-full bg-red-100 p-4 dark:bg-red-900'>
                <XCircle className='h-12 w-12 text-red-600 dark:text-red-400' />
              </div>
            ) : (
              <div className='rounded-full bg-primary/10 p-4'>
                <Loader2 className='h-12 w-12 animate-spin text-primary' />
              </div>
            )}
          </div>
          <CardTitle className='text-2xl'>
            {progress?.status === 'completed'
              ? 'Audit Complete!'
              : progress?.status === 'failed'
                ? 'Audit Failed'
                : 'Analyzing Website...'}
          </CardTitle>
          <CardDescription>
            {progress?.status === 'completed'
              ? `Successfully analyzed ${progress.total_pages} pages`
              : progress?.status === 'failed'
                ? progress.error || 'An error occurred during the audit'
                : 'Please wait while we analyze your website'}
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          {/* Progress Bar */}
          {progress?.status !== 'failed' && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Progress</span>
                <span className='font-medium'>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className='h-3' />
              <div className='flex justify-between text-sm text-muted-foreground'>
                <span>
                  {progress?.completed_pages || 0} of {progress?.total_pages || 0} pages
                </span>
                {progress?.total_pages && progress.total_pages > 0 && (
                  <span>
                    ~{Math.ceil(((progress.total_pages - progress.completed_pages) * 1.5) / 60)} min remaining
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Current URL */}
          {progress?.current_url && progress.status === 'processing' && (
            <div className='rounded-lg border bg-muted/50 p-4'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Globe className='h-4 w-4' />
                <span>Currently analyzing:</span>
              </div>
              <p className='mt-1 truncate text-sm font-medium'>{progress.current_url}</p>
            </div>
          )}

          {/* Keyword Analysis Status */}
          {progress?.keyword_status === 'fetching' && (
            <div className='rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4'>
              <div className='flex items-center gap-2 text-sm'>
                <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                <span className='font-medium text-blue-700 dark:text-blue-400'>Analyzing Keywords</span>
              </div>
              {progress.keyword_progress && (
                <p className='mt-1 text-xs text-blue-600 dark:text-blue-300'>{progress.keyword_progress}</p>
              )}
            </div>
          )}

          {progress?.keyword_status === 'completed' && (
            <div className='rounded-lg border bg-green-50 dark:bg-green-950/30 p-4'>
              <div className='flex items-center gap-2 text-sm'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                <span className='font-medium text-green-700 dark:text-green-400'>
                  {progress.keyword_progress || 'Keyword analysis complete'}
                </span>
              </div>
            </div>
          )}

          {progress?.keyword_status === 'failed' && (
            <div className='rounded-lg border bg-yellow-50 dark:bg-yellow-950/30 p-4'>
              <div className='flex items-center gap-2 text-sm'>
                <AlertCircle className='h-4 w-4 text-yellow-500' />
                <span className='font-medium text-yellow-700 dark:text-yellow-400'>Keyword analysis failed</span>
              </div>
              {progress.keyword_progress && (
                <p className='mt-1 text-xs text-yellow-600 dark:text-yellow-300'>{progress.keyword_progress}</p>
              )}
              <p className='mt-1 text-xs text-muted-foreground'>The page audit completed successfully. You can re-run keywords later.</p>
            </div>
          )}

          {/* Connection Status */}
          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isConnected && !error && progress?.status === 'processing' && (
            <Alert>
              <Loader2 className='h-4 w-4 animate-spin' />
              <AlertDescription>Connecting to server...</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className='flex gap-4'>
            {progress?.status === 'completed' && (
              <Button
                className='w-full'
                onClick={() => navigate({ to: '/audits/$auditId', params: { auditId } })}
              >
                View Results
              </Button>
            )}

            {progress?.status === 'failed' && (
              <>
                <Button variant='outline' className='flex-1' onClick={() => navigate({ to: '/' })}>
                  Try Again
                </Button>
                <Button
                  variant='outline'
                  className='flex-1'
                  onClick={() => navigate({ to: '/audits' })}
                >
                  View History
                </Button>
              </>
            )}

            {progress?.status === 'processing' && (
              <div className='flex gap-3 w-full'>
                {progress.completed_pages > 0 && (
                  <Button
                    className='flex-1'
                    onClick={() => navigate({ to: '/audits/$auditId', params: { auditId } })}
                  >
                    View Results ({progress.completed_pages})
                  </Button>
                )}
                <Button
                  variant='outline'
                  className='flex-1'
                  onClick={() => navigate({ to: '/audits' })}
                >
                  Run in Background
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
