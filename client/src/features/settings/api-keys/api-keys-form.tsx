import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { settingsApi } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'

const apiKeysSchema = z.object({
  firecrawl_api_key: z.string().optional(),
  dataforseo_username: z.string().optional(),
  dataforseo_password: z.string().optional(),
})

type ApiKeysFormValues = z.infer<typeof apiKeysSchema>

export function ApiKeysForm() {
  const queryClient = useQueryClient()
  const [showFirecrawl, setShowFirecrawl] = useState(false)
  const [showDataForSeoPassword, setShowDataForSeoPassword] = useState(false)
  const [testingFirecrawl, setTestingFirecrawl] = useState(false)
  const [testingDataForSeo, setTestingDataForSeo] = useState(false)

  // Fetch current settings status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['settings', 'status'],
    queryFn: () => settingsApi.getStatus(),
  })

  // Fetch current settings (masked values)
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll(),
  })

  const form = useForm<ApiKeysFormValues>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      firecrawl_api_key: '',
      dataforseo_username: '',
      dataforseo_password: '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('API settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      form.reset()
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    },
  })

  function onSubmit(data: ApiKeysFormValues) {
    const updates: Partial<ApiKeysFormValues> = {}
    if (data.firecrawl_api_key) updates.firecrawl_api_key = data.firecrawl_api_key
    if (data.dataforseo_username) updates.dataforseo_username = data.dataforseo_username
    if (data.dataforseo_password) updates.dataforseo_password = data.dataforseo_password

    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save')
      return
    }

    updateMutation.mutate(updates)
  }

  async function testFirecrawl() {
    setTestingFirecrawl(true)
    try {
      const result = await settingsApi.testFirecrawl()
      if (result.success) {
        toast.success(result.message || 'Firecrawl API connection successful!')
      } else {
        toast.error(result.error || 'Firecrawl API test failed')
      }
    } catch (error) {
      toast.error('Failed to test Firecrawl API: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTestingFirecrawl(false)
    }
  }

  async function testDataForSeo() {
    setTestingDataForSeo(true)
    try {
      const result = await settingsApi.testDataForSeo()
      if (result.success) {
        toast.success(result.message || 'DataForSEO API connection successful!')
      } else {
        toast.error(result.error || 'DataForSEO API test failed')
      }
    } catch (error) {
      toast.error('Failed to test DataForSEO API: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTestingDataForSeo(false)
    }
  }

  const isLoading = statusLoading || settingsLoading

  return (
    <div className='space-y-6'>
      {/* Status Overview */}
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='flex items-center gap-3 rounded-lg border p-4'>
          {isLoading ? (
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          ) : status?.firecrawl_configured ? (
            <CheckCircle2 className='h-5 w-5 text-green-500' />
          ) : (
            <XCircle className='h-5 w-5 text-red-500' />
          )}
          <div>
            <p className='font-medium'>Firecrawl API</p>
            <p className='text-sm text-muted-foreground'>
              {status?.firecrawl_configured ? 'Configured' : 'Not configured'}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-3 rounded-lg border p-4'>
          {isLoading ? (
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          ) : status?.dataforseo_configured ? (
            <CheckCircle2 className='h-5 w-5 text-green-500' />
          ) : (
            <XCircle className='h-5 w-5 text-red-500' />
          )}
          <div>
            <p className='font-medium'>DataForSEO API</p>
            <p className='text-sm text-muted-foreground'>
              {status?.dataforseo_configured ? 'Configured' : 'Not configured'}
            </p>
          </div>
        </div>
      </div>

      {!status?.all_configured && !isLoading && (
        <Alert>
          <AlertDescription>
            Configure your API keys below to start running SEO audits. Both Firecrawl and DataForSEO APIs are required.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          {/* Firecrawl API Key */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Firecrawl API</h3>
            <p className='text-sm text-muted-foreground'>
              Used for discovering pages on a website. Get your API key from{' '}
              <a
                href='https://firecrawl.dev'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline'
              >
                firecrawl.dev
              </a>
            </p>
            <FormField
              control={form.control}
              name='firecrawl_api_key'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          type={showFirecrawl ? 'text' : 'password'}
                          placeholder={settings?.firecrawl_api_key || 'fc-xxxxxxxxxxxxxxxx'}
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                          onClick={() => setShowFirecrawl(!showFirecrawl)}
                        >
                          {showFirecrawl ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={testFirecrawl}
                        disabled={testingFirecrawl || !status?.firecrawl_configured}
                        title={status?.firecrawl_configured ? 'Test connection' : 'Save API key first'}
                      >
                        {testingFirecrawl ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <>
                            <Zap className='mr-1 h-4 w-4' />
                            Test
                          </>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {settings?.firecrawl_api_key_configured === 'true'
                      ? 'A key is already saved. Enter a new key to replace it.'
                      : 'Enter your Firecrawl API key to enable page discovery.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* DataForSEO Credentials */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>DataForSEO API</h3>
            <p className='text-sm text-muted-foreground'>
              Used for on-page SEO analysis. Get your credentials from{' '}
              <a
                href='https://dataforseo.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline'
              >
                dataforseo.com
              </a>
            </p>
            <FormField
              control={form.control}
              name='dataforseo_username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username / Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder={settings?.dataforseo_username || 'your-email@example.com'}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {settings?.dataforseo_username_configured === 'true'
                      ? 'A username is already saved. Enter a new one to replace it.'
                      : 'Enter your DataForSEO account email.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='dataforseo_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Password</FormLabel>
                  <FormControl>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          type={showDataForSeoPassword ? 'text' : 'password'}
                          placeholder={settings?.dataforseo_password || 'Your API password'}
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                          onClick={() => setShowDataForSeoPassword(!showDataForSeoPassword)}
                        >
                          {showDataForSeoPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={testDataForSeo}
                        disabled={testingDataForSeo || !status?.dataforseo_configured}
                        title={status?.dataforseo_configured ? 'Test connection' : 'Save credentials first'}
                      >
                        {testingDataForSeo ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <>
                            <Zap className='mr-1 h-4 w-4' />
                            Test
                          </>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {settings?.dataforseo_password_configured === 'true'
                      ? 'A password is already saved. Enter a new one to replace it.'
                      : 'Enter your DataForSEO API password (not your account password).'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type='submit' disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save API Keys
          </Button>
        </form>
      </Form>
    </div>
  )
}
