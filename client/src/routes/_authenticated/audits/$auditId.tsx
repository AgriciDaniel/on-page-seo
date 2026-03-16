import { useState, useRef, useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, Loader2, RefreshCw, Key } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAudit,
  AuditTable,
  AuditSummaryCards,
  RankedKeywordsSummaryCards,
  RankedKeywordsTable,
} from '@/features/seo-audit'
import { auditApi } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/audits/$auditId')({
  component: AuditDetailPage,
})

function AuditDetailPage() {
  const { auditId } = Route.useParams()
  const navigate = useNavigate()
  const { data: audit, isLoading, error, refetch } = useAudit(auditId)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isAnalyzingKeywords, setIsAnalyzingKeywords] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevSummaryRef = useRef<string | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Stop polling when keywords summary arrives after deletion
  useEffect(() => {
    if (!isAnalyzingKeywords) return
    const hasSummary = !!audit?.ranked_keywords_summary

    if (prevSummaryRef.current === '__waiting__' && !hasSummary) {
      // Summary was deleted, waiting for new data
      prevSummaryRef.current = '__deleted__'
    } else if (
      (prevSummaryRef.current === '__deleted__' && hasSummary) ||
      (prevSummaryRef.current === '__waiting__' && hasSummary)
    ) {
      // New summary arrived
      setIsAnalyzingKeywords(false)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      prevSummaryRef.current = null
      const count = audit?.ranked_keywords?.length || 0
      if (count > 0) {
        toast.success(`Found ${count} ranked keywords!`)
      } else {
        toast.info('No ranked keywords found for this domain.')
      }
    }
  }, [audit?.ranked_keywords_summary, audit?.ranked_keywords?.length, isAnalyzingKeywords])

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

  const handleRefetchKeywords = async () => {
    setIsAnalyzingKeywords(true)
    prevSummaryRef.current = '__waiting__'
    try {
      await auditApi.refetchKeywords(auditId)
      toast.info('Keyword analysis started...')

      // Poll every 3 seconds until results appear, max 60 seconds
      let elapsed = 0
      pollingRef.current = setInterval(() => {
        elapsed += 3000
        refetch()
        if (elapsed >= 60000) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          pollingRef.current = null
          setIsAnalyzingKeywords(false)
          toast.error('Keyword analysis timed out. Try again later.')
        }
      }, 3000)
    } catch (err) {
      console.error('Failed to refetch keywords:', err)
      toast.error('Failed to start keyword analysis')
      setIsAnalyzingKeywords(false)
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

  const keywordCount = audit.ranked_keywords?.length || 0
  const pageCount = audit.pages?.length || 0

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
        <Tabs defaultValue='pages' className='space-y-4 sm:space-y-6'>
          <TabsList>
            <TabsTrigger value='pages'>
              Page Analysis ({pageCount})
            </TabsTrigger>
            <TabsTrigger value='keywords'>
              Ranked Keywords ({keywordCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='pages'>
            <div className='space-y-4 sm:space-y-6'>
              <AuditSummaryCards audit={audit} />
              <AuditTable data={audit.pages || []} />
            </div>
          </TabsContent>

          <TabsContent value='keywords'>
            <div className='space-y-4 sm:space-y-6'>
              {audit.ranked_keywords_summary && !isAnalyzingKeywords && (
                <RankedKeywordsSummaryCards summary={audit.ranked_keywords_summary} />
              )}

              {isAnalyzingKeywords ? (
                <div className='text-center py-12 space-y-4'>
                  <div className='mx-auto rounded-full bg-primary/10 p-4 w-fit'>
                    <Loader2 className='h-12 w-12 animate-spin text-primary' />
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold'>Analyzing Keywords...</h3>
                    <p className='text-sm text-muted-foreground mt-1'>
                      Fetching ranked keywords from DataForSEO. This may take a few seconds.
                    </p>
                  </div>
                </div>
              ) : keywordCount > 0 ? (
                <>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg sm:text-xl font-semibold'>Keywords</h2>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleRefetchKeywords}
                        disabled={isAnalyzingKeywords}
                      >
                        <RefreshCw className='h-4 w-4 mr-2' />
                        Re-analyze
                      </Button>
                      <Button variant='outline' size='sm' asChild>
                        <a href={auditApi.exportKeywordsCsv(auditId)} download>
                          <Download className='h-4 w-4 mr-2' />
                          Export CSV
                        </a>
                      </Button>
                    </div>
                  </div>
                  <RankedKeywordsTable data={audit.ranked_keywords || []} />
                </>
              ) : (
                <div className='text-center py-12 space-y-4'>
                  <Key className='h-12 w-12 mx-auto text-muted-foreground' />
                  <div>
                    <h3 className='text-lg font-semibold'>No Keywords Data</h3>
                    <p className='text-sm text-muted-foreground mt-1'>
                      {audit.ranked_keywords_summary
                        ? 'No ranked keywords found for this domain in the selected location.'
                        : 'Click the button below to analyze ranked keywords for this domain.'}
                    </p>
                  </div>
                  <Button onClick={handleRefetchKeywords}>
                    <Key className='h-4 w-4 mr-2' />
                    Analyze Keywords
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
