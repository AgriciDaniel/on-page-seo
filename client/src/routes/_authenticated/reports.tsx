import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Eye, Loader2, FileText } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { auditApi } from '@/lib/api'
import { auditKeys } from '@/features/seo-audit'
import { getScoreColor } from '@/types/seo'
import type { Audit, AuditWithResults } from '@/types/seo'

export const Route = createFileRoute('/_authenticated/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  const { data: audits, isLoading } = useQuery({
    queryKey: auditKeys.lists(),
    queryFn: auditApi.getAll,
  })

  // Get completed audits only
  const completedAudits = audits?.filter((a: Audit) => a.status === 'completed') || []

  return (
    <>
      <Header fixed>
        <div className='flex w-full items-center justify-between'>
          <h1 className='text-lg font-semibold'>All Reports</h1>
          <Button asChild>
            <Link to='/'>
              <Plus className='mr-2 h-4 w-4' />
              New Audit
            </Link>
          </Button>
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h2 className='text-2xl font-bold'>Reports</h2>
          <p className='text-muted-foreground'>
            Browse and access individual page reports from completed audits
          </p>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : completedAudits.length === 0 ? (
          <Card className='text-center'>
            <CardHeader>
              <CardTitle>No Reports Available</CardTitle>
              <CardDescription>
                Complete an SEO audit to generate reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to='/'>
                  <Plus className='mr-2 h-4 w-4' />
                  Start First Audit
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-6'>
            {completedAudits.map((audit: Audit) => (
              <Card key={audit.id}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='flex items-center gap-2'>
                        <FileText className='h-5 w-5' />
                        {audit.url}
                      </CardTitle>
                      <CardDescription>
                        {audit.completed_pages} pages - Completed {new Date(audit.completed_at || audit.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button variant='outline' asChild>
                      <Link to='/audits/$auditId' params={{ auditId: audit.id }}>
                        <Eye className='mr-2 h-4 w-4' />
                        View All
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
