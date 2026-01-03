import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { useAudit, AuditTable, AuditSummaryCards } from '@/features/seo-audit'
import { auditApi } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/audits/$auditId')({
  component: AuditDetailPage,
})

function AuditDetailPage() {
  const { auditId } = Route.useParams()
  const navigate = useNavigate()
  const { data: audit, isLoading, error } = useAudit(auditId)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!audit) return
    setIsRegenerating(true)
    try {
      const newAudit = await auditApi.regenerate(auditId)
      toast.success('Audit regeneration started')
      navigate({ to: `/audits/${newAudit.id}/processing` })
    } catch (err) {
      console.error('Failed to regenerate:', err)
      toast.error('Failed to regenerate audit')
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header fixed>
          <div className='flex w-full items-center gap-4'>
            <Button variant='ghost' size='sm' asChild>
              <Link to='/audits'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <h1 className='text-lg font-semibold'>Loading...</h1>
          </div>
        </Header>
        <Main>
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        </Main>
      </>
    )
  }

  if (error || !audit) {
    return (
      <>
        <Header fixed>
          <div className='flex w-full items-center gap-4'>
            <Button variant='ghost' size='sm' asChild>
              <Link to='/audits'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <h1 className='text-lg font-semibold'>Error</h1>
          </div>
        </Header>
        <Main>
          <div className='text-center py-12'>
            <p className='text-red-500'>Failed to load audit. Please try again.</p>
            <Button className='mt-4' asChild>
              <Link to='/audits'>Back to Audits</Link>
            </Button>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2 sm:gap-4 min-w-0'>
            <Button variant='ghost' size='sm' asChild className='shrink-0'>
              <Link to='/audits'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <div className='min-w-0'>
              <h1 className='text-base sm:text-lg font-semibold'>Audit Results</h1>
              <p className='text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none'>{audit.url}</p>
            </div>
          </div>
          <div className='flex gap-1.5 sm:gap-2 ml-auto sm:ml-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className='text-xs sm:text-sm px-2 sm:px-3'
            >
              {isRegenerating ? (
                <Loader2 className='h-4 w-4 animate-spin sm:mr-2' />
              ) : (
                <RefreshCw className='h-4 w-4 sm:mr-2' />
              )}
              <span className='hidden sm:inline'>Regenerate</span>
            </Button>
            <Button variant='outline' size='sm' asChild className='text-xs sm:text-sm px-2 sm:px-3'>
              <a href={auditApi.exportCsv(auditId)} download>
                <Download className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>CSV</span>
              </a>
            </Button>
            <Button variant='outline' size='sm' asChild className='text-xs sm:text-sm px-2 sm:px-3'>
              <a href={auditApi.exportJson(auditId)} download>
                <Download className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>JSON</span>
              </a>
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <div className='space-y-4 sm:space-y-6'>
          {/* Summary Cards */}
          <AuditSummaryCards audit={audit} />

          {/* Results Table */}
          <div>
            <h2 className='mb-3 sm:mb-4 text-lg sm:text-xl font-semibold'>Page Analysis</h2>
            <AuditTable data={audit.pages || []} />
          </div>
        </div>
      </Main>
    </>
  )
}
