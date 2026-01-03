import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Eye, Download, Clock, CheckCircle2, XCircle, Loader2, Calendar } from 'lucide-react'
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

export const Route = createFileRoute('/_authenticated/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const { data: audits, isLoading } = useQuery({
    queryKey: auditKeys.lists(),
    queryFn: auditApi.getAll,
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    }
    return colors[status] || colors.pending
  }

  // Group audits by date
  const groupedAudits = audits?.reduce((groups: Record<string, Audit[]>, audit: Audit) => {
    const date = new Date(audit.created_at).toLocaleDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(audit)
    return groups
  }, {})

  return (
    <>
      <Header fixed>
        <div className='flex w-full items-center justify-between'>
          <h1 className='text-lg font-semibold'>Audit History</h1>
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
          <h2 className='text-2xl font-bold'>History</h2>
          <p className='text-muted-foreground'>
            View all your past SEO audits organized by date
          </p>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : !audits || audits.length === 0 ? (
          <Card className='text-center'>
            <CardHeader>
              <CardTitle>No Audit History</CardTitle>
              <CardDescription>
                Start your first SEO audit to build your history
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
          <div className='space-y-8'>
            {groupedAudits && Object.entries(groupedAudits).map(([date, dateAudits]) => (
              <div key={date}>
                <div className='mb-4 flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-muted-foreground' />
                  <h3 className='font-semibold'>{date}</h3>
                  <Badge variant='secondary'>{dateAudits.length} audits</Badge>
                </div>
                <div className='space-y-3'>
                  {dateAudits.map((audit: Audit) => (
                    <Card key={audit.id}>
                      <CardContent className='flex items-center justify-between py-4'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2'>
                            <a
                              href={audit.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='font-medium hover:underline'
                            >
                              {audit.url}
                            </a>
                            <Badge className={getStatusBadge(audit.status)}>
                              {audit.status}
                            </Badge>
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            {new Date(audit.created_at).toLocaleTimeString()} - {audit.completed_pages} pages
                          </p>
                        </div>
                        <div className='flex gap-2'>
                          {audit.status === 'completed' && (
                            <>
                              <Button variant='ghost' size='sm' asChild>
                                <Link to='/audits/$auditId' params={{ auditId: audit.id }}>
                                  <Eye className='h-4 w-4' />
                                </Link>
                              </Button>
                              <Button variant='ghost' size='sm' asChild>
                                <a href={auditApi.exportCsv(audit.id)} download>
                                  <Download className='h-4 w-4' />
                                </a>
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <Trash2 className='h-4 w-4 text-red-500' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Audit</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this audit?
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
