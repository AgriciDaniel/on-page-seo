import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { reportApi } from '@/lib/api'
import { SeoReport } from '@/features/seo-report'

export const Route = createFileRoute('/_authenticated/report/$reportId')({
  component: ReportPage,
})

function ReportPage() {
  const { reportId } = Route.useParams()

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportApi.getById(reportId),
    enabled: !!reportId,
  })

  if (isLoading) {
    return (
      <>
        <Header fixed>
          <div className='flex w-full items-center gap-4'>
            <Button variant='ghost' size='sm' onClick={() => window.history.back()}>
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <h1 className='text-lg font-semibold'>Loading Report...</h1>
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

  if (error || !report) {
    return (
      <>
        <Header fixed>
          <div className='flex w-full items-center gap-4'>
            <Button variant='ghost' size='sm' onClick={() => window.history.back()}>
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <h1 className='text-lg font-semibold'>Error</h1>
          </div>
        </Header>
        <Main>
          <div className='text-center py-12'>
            <p className='text-red-500'>Failed to load report. Please try again.</p>
            <Button className='mt-4' onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex w-full items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='sm' asChild>
              <Link to='/audits/$auditId' params={{ auditId: report.audit_id }}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <div>
              <h1 className='text-lg font-semibold'>Page Report</h1>
              <p className='text-sm text-muted-foreground max-w-md truncate'>{report.url}</p>
            </div>
          </div>
          <Button variant='outline' size='sm' onClick={() => window.print()}>
            <Download className='mr-2 h-4 w-4' />
            Print Report
          </Button>
        </div>
      </Header>

      <Main>
        <SeoReport report={report} />
      </Main>
    </>
  )
}
