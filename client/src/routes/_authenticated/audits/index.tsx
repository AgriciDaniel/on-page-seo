import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Eye, Download, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { auditApi } from '@/lib/api'
import { useDeleteAudit, auditKeys } from '@/features/seo-audit'
import type { Audit } from '@/types/seo'

export const Route = createFileRoute('/_authenticated/audits/')({
  component: AuditsPage,
})

function AuditsPage() {
  const { data: audits, isLoading } = useQuery({
    queryKey: auditKeys.lists(),
    queryFn: auditApi.getAll,
    refetchInterval: 5000, // Refresh every 5 seconds for status updates
  })

  const deleteAudit = useDeleteAudit()

  const handleDelete = async (id: string) => {
    try {
      await deleteAudit.mutateAsync(id)
      toast.success('Audit deleted successfully')
    } catch {
      toast.error('Failed to delete audit')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className='h-4 w-4 text-green-500' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'processing':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
      default:
        return <Clock className='h-4 w-4 text-yellow-500' />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    }
    return colors[status] || colors.pending
  }

  return (
    <>
      <Header fixed>
        <div className='flex w-full items-center justify-between'>
          <h1 className='text-lg font-semibold'>SEO Audits Dashboard</h1>
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
          <h2 className='text-2xl font-bold'>Your Audits</h2>
          <p className='text-muted-foreground'>
            View and manage all your SEO audits
          </p>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : !audits || audits.length === 0 ? (
          <Card className='text-center'>
            <CardHeader>
              <CardTitle>No Audits Yet</CardTitle>
              <CardDescription>
                Start your first SEO audit to see results here
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
          <div className='grid gap-4'>
            {audits.map((audit: Audit) => (
              <Card key={audit.id}>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <CardTitle className='flex items-center gap-2'>
                        {getStatusIcon(audit.status)}
                        <a
                          href={audit.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:underline'
                        >
                          {audit.url}
                        </a>
                      </CardTitle>
                      <CardDescription>
                        Created {new Date(audit.created_at).toLocaleString()}
                        {audit.completed_at && ` - Completed ${new Date(audit.completed_at).toLocaleString()}`}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusBadge(audit.status)}>
                      {audit.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center justify-between'>
                    <div className='text-sm text-muted-foreground'>
                      {audit.completed_pages} / {audit.total_pages || '?'} pages analyzed
                    </div>
                    <div className='flex gap-2'>
                      {audit.status === 'processing' && (
                        <Button variant='outline' size='sm' asChild>
                          <Link to='/audits/$auditId/processing' params={{ auditId: audit.id }}>
                            <Eye className='mr-2 h-4 w-4' />
                            View Progress
                          </Link>
                        </Button>
                      )}
                      {audit.status === 'completed' && (
                        <>
                          <Button variant='outline' size='sm' asChild>
                            <Link to='/audits/$auditId' params={{ auditId: audit.id }}>
                              <Eye className='mr-2 h-4 w-4' />
                              View Results
                            </Link>
                          </Button>
                          <Button variant='outline' size='sm' asChild>
                            <a href={auditApi.exportCsv(audit.id)} download>
                              <Download className='mr-2 h-4 w-4' />
                              Export CSV
                            </a>
                          </Button>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant='outline' size='sm'>
                            <Trash2 className='h-4 w-4 text-red-500' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Audit</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this audit? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(audit.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {audit.error_message && (
                    <p className='mt-2 text-sm text-red-500'>{audit.error_message}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
