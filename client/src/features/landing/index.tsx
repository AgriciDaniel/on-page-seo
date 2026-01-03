import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Search,
  Loader2,
  CheckCircle2,
  Square,
  CheckSquare,
  StopCircle,
  Play,
  Download,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { auditFormSchema, type AuditFormValues, type ProgressEvent } from '@/types/seo'
import { auditApi } from '@/lib/api'
import { InteractiveAvatar } from '@/components/ui/interactive-avatar'

type Step = 'input' | 'discovering' | 'select' | 'processing' | 'completed'

export function Landing() {
  const [step, setStep] = useState<Step>('input')
  const [discoveredPages, setDiscoveredPages] = useState<string[]>([])
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [siteUrl, setSiteUrl] = useState('')

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      url: '',
      limit: 100,
    },
  })

  // Filter pages by search query
  const filteredPages = discoveredPages.filter((page) =>
    page.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Select/Deselect all visible pages
  const toggleSelectAll = () => {
    if (selectedPages.size === filteredPages.length) {
      setSelectedPages(new Set())
    } else {
      setSelectedPages(new Set(filteredPages))
    }
  }

  // Toggle single page selection
  const togglePage = (page: string) => {
    const newSelected = new Set(selectedPages)
    if (newSelected.has(page)) {
      newSelected.delete(page)
    } else {
      newSelected.add(page)
    }
    setSelectedPages(newSelected)
  }

  // Discover pages
  async function onDiscover(values: AuditFormValues) {
    setStep('discovering')
    setSiteUrl(values.url)
    try {
      const result = await auditApi.discover(values.url, values.limit)
      setDiscoveredPages(result.pages)
      setSelectedPages(new Set(result.pages)) // Select all by default
      setStep('select')
      toast.success(`Discovered ${result.total} pages`)
    } catch (error) {
      console.error('Failed to discover pages:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to discover pages: ${errorMessage}`)
      setStep('input')
    }
  }

  // Start processing selected pages
  async function startProcessing() {
    if (selectedPages.size === 0) {
      toast.error('Please select at least one page')
      return
    }

    setStep('processing')
    try {
      const audit = await auditApi.create(siteUrl, selectedPages.size, Array.from(selectedPages))
      setCurrentAuditId(audit.id)
      toast.success('Processing started')
    } catch (error) {
      console.error('Failed to start processing:', error)
      toast.error('Failed to start processing')
      setStep('select')
    }
  }

  // Cancel processing
  async function cancelProcessing() {
    if (!currentAuditId) return

    try {
      await auditApi.cancel(currentAuditId)
      toast.info('Cancellation requested')
    } catch (error) {
      console.error('Failed to cancel:', error)
      toast.error('Failed to cancel')
    }
  }

  // Subscribe to progress updates
  useEffect(() => {
    if (step !== 'processing' || !currentAuditId) return

    const eventSource = auditApi.subscribeToProgress(
      currentAuditId,
      (event) => {
        setProgress(event)
        if (event.status === 'completed') {
          setStep('completed')
          toast.success('Audit completed!')
        } else if (event.status === 'failed') {
          if (event.error?.includes('cancelled')) {
            setStep('select')
            toast.info('Audit cancelled')
          } else {
            setStep('select')
            toast.error(`Audit failed: ${event.error}`)
          }
        }
      },
      () => {
        // SSE error
      }
    )

    return () => {
      eventSource.close()
    }
  }, [step, currentAuditId])

  // Reset to start
  const reset = useCallback(() => {
    setStep('input')
    setDiscoveredPages([])
    setSelectedPages(new Set())
    setSearchQuery('')
    setCurrentAuditId(null)
    setProgress(null)
    setSiteUrl('')
    form.reset()
  }, [form])

  // Progress percentage
  const progressPercent = progress
    ? Math.round((progress.completed_pages / progress.total_pages) * 100) || 0
    : 0

  return (
    <div className='mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6'>
      {/* Header */}
      <div className='mb-4 sm:mb-6 text-center'>
        <div className='mb-2 flex justify-center'>
          <InteractiveAvatar />
        </div>
        <h1 className='mb-1 text-2xl sm:text-3xl font-bold tracking-tight'>
          OnPage<span className='text-orange-500'>SEO</span>
        </h1>
        <p className='text-sm sm:text-base text-muted-foreground'>
          Discover pages, select which to analyze, and get comprehensive SEO insights
        </p>
      </div>

      {/* Step 1: URL Input */}
      {step === 'input' && (
        <Card>
          <CardHeader className='pb-3 sm:pb-6'>
            <CardTitle className='text-lg sm:text-xl'>Step 1: Enter Website URL</CardTitle>
            <CardDescription>
              We'll discover all pages on your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onDiscover)} className='space-y-3 sm:space-y-4'>
                <FormField
                  control={form.control}
                  name='url'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm'>Website URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='example.com or https://example.com'
                          className='text-sm sm:text-base'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className='text-xs sm:text-sm'>
                        Enter the domain or full URL to analyze
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='limit'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm'>Page Limit</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className='text-sm sm:text-base'>
                            <SelectValue placeholder='Select page limit' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='10'>10 pages</SelectItem>
                          <SelectItem value='25'>25 pages</SelectItem>
                          <SelectItem value='50'>50 pages</SelectItem>
                          <SelectItem value='100'>100 pages</SelectItem>
                          <SelectItem value='200'>200 pages</SelectItem>
                          <SelectItem value='500'>500 pages</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className='text-xs sm:text-sm'>
                        Maximum number of pages to discover
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type='submit' className='w-full' size='lg'>
                  <Search className='mr-2 h-4 w-4' />
                  Discover Pages
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 1b: Discovering */}
      {step === 'discovering' && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-8 sm:py-12'>
            <Logo className='h-16 w-16 sm:h-20 sm:w-20 mb-3 sm:mb-4' animate />
            <h3 className='mb-2 text-base sm:text-lg font-semibold'>Discovering Pages...</h3>
            <p className='text-sm sm:text-base text-muted-foreground text-center px-4'>
              Scanning sitemap for {siteUrl}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Pages */}
      {step === 'select' && (
        <Card>
          <CardHeader className='pb-3 sm:pb-6'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
              <div>
                <CardTitle className='text-lg sm:text-xl'>Step 2: Select Pages to Analyze</CardTitle>
                <CardDescription>
                  {selectedPages.size} of {discoveredPages.length} pages selected
                </CardDescription>
              </div>
              <Button variant='outline' size='sm' onClick={reset} className='w-fit'>
                Start Over
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-3 sm:space-y-4'>
            {/* Search and Select All */}
            <div className='flex flex-col sm:flex-row gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Search pages...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9'
                />
              </div>
              <Button variant='outline' onClick={toggleSelectAll} className='shrink-0'>
                {selectedPages.size === filteredPages.length ? (
                  <>
                    <Square className='mr-2 h-4 w-4' />
                    <span className='hidden sm:inline'>Deselect All</span>
                    <span className='sm:hidden'>Deselect</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className='mr-2 h-4 w-4' />
                    <span className='hidden sm:inline'>Select All</span>
                    <span className='sm:hidden'>Select</span>
                  </>
                )}
              </Button>
            </div>

            {/* Page List */}
            <ScrollArea className='h-[250px] sm:h-[300px] rounded-md border'>
              <div className='p-2 sm:p-4 space-y-1 sm:space-y-2'>
                {filteredPages.map((page) => (
                  <div
                    key={page}
                    className='flex items-center gap-2 sm:gap-3 rounded-lg p-2 hover:bg-muted cursor-pointer'
                    onClick={() => togglePage(page)}
                  >
                    <Checkbox
                      checked={selectedPages.has(page)}
                      onCheckedChange={() => togglePage(page)}
                    />
                    <span className='text-xs sm:text-sm truncate flex-1'>{page}</span>
                  </div>
                ))}
                {filteredPages.length === 0 && (
                  <p className='text-center text-muted-foreground py-8 text-sm'>
                    No pages match your search
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className='flex gap-2'>
              <Button
                onClick={startProcessing}
                className='flex-1'
                size='lg'
                disabled={selectedPages.size === 0}
              >
                <Play className='mr-2 h-4 w-4' />
                Process {selectedPages.size} Pages
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && progress && (
        <Card>
          <CardHeader className='pb-3 sm:pb-6'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
              <div>
                <CardTitle className='text-lg sm:text-xl'>Step 3: Processing Pages</CardTitle>
                <CardDescription>
                  Analyzing SEO metrics for each page
                </CardDescription>
              </div>
              <Button variant='destructive' size='sm' onClick={cancelProcessing} className='w-fit'>
                <StopCircle className='mr-2 h-4 w-4' />
                Stop
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4 sm:space-y-6'>
            {/* Progress Bar */}
            <div className='space-y-2'>
              <div className='flex justify-between text-xs sm:text-sm'>
                <span>Progress</span>
                <span className='font-medium'>{progress.completed_pages} / {progress.total_pages} pages</span>
              </div>
              <Progress value={progressPercent} className='h-2 sm:h-3 [&>div]:bg-primary' />
              <p className='text-xs sm:text-sm text-muted-foreground text-center'>
                {progressPercent}% complete
              </p>
            </div>

            {/* Current URL */}
            {progress.current_url && (
              <div className='rounded-lg bg-muted p-3 sm:p-4'>
                <p className='text-[10px] sm:text-xs text-muted-foreground mb-1'>Currently analyzing:</p>
                <p className='text-xs sm:text-sm font-mono truncate'>{progress.current_url}</p>
              </div>
            )}

            {/* Animated Logo */}
            <div className='flex justify-center'>
              <Logo className='h-12 w-12 sm:h-16 sm:w-16' animate />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Completed */}
      {step === 'completed' && progress && (
        <Card>
          <CardHeader className='pb-3 sm:pb-6'>
            <div className='flex items-center gap-3 sm:gap-4'>
              <CheckCircle2 className='h-8 w-8 sm:h-10 sm:w-10 text-green-500 shrink-0' />
              <div>
                <CardTitle className='text-lg sm:text-xl'>Audit Complete!</CardTitle>
                <CardDescription>
                  Analyzed {progress.completed_pages} pages successfully
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Action Buttons */}
            <div className='grid gap-2 grid-cols-1 sm:grid-cols-3'>
              <Button
                onClick={() => window.location.href = `/audits/${currentAuditId}`}
                className='w-full'
              >
                View Results
              </Button>
              <Button
                variant='outline'
                onClick={() => window.open(auditApi.exportCsv(currentAuditId!), '_blank')}
                className='w-full'
              >
                <Download className='mr-2 h-4 w-4' />
                Export CSV
              </Button>
              <Button variant='outline' onClick={reset} className='w-full'>
                New Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
