import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Link2,
  Image,
  Code2,
  Globe,
  Share2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  type PageResult,
  getScoreColor,
  getStatusColor,
  getCWVStatusColor,
  formatBytes,
  formatDuration,
} from '@/types/seo'

interface SeoReportProps {
  report: PageResult
}

// Score Overview Card
function ScoreCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color || ''}`}>{value}</div>
        {subtitle && <p className='text-xs text-muted-foreground'>{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

// Check Item Component
function CheckItem({ label, passed, value }: { label: string; passed: boolean; value?: string }) {
  return (
    <div className='flex items-center justify-between py-2'>
      <div className='flex items-center gap-2'>
        {passed ? (
          <CheckCircle2 className='h-5 w-5 text-green-500' />
        ) : (
          <XCircle className='h-5 w-5 text-red-500' />
        )}
        <span>{label}</span>
      </div>
      {value && <span className='text-sm text-muted-foreground'>{value}</span>}
    </div>
  )
}

// CWV Metric Card
function CWVCard({ title, value, status, threshold, unit }: { title: string; value: number; status: string; threshold: string; unit: string }) {
  const statusColor = getCWVStatusColor(status as any)
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${statusColor}`}>
          {value?.toFixed(title === 'CLS' ? 3 : 0)}{unit}
        </div>
        <p className='text-xs text-muted-foreground'>Target: {threshold}</p>
        <Badge className={`mt-2 ${status === 'good' ? 'bg-green-100 text-green-800' : status === 'needs_improvement' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          {status?.replace('_', ' ')}
        </Badge>
      </CardContent>
    </Card>
  )
}

export function SeoReport({ report }: SeoReportProps) {
  const pageSizeMB = (report.page_size / 1024 / 1024).toFixed(2)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <Globe className='h-6 w-6 text-primary' />
          <h1 className='text-2xl font-bold'>SEO Audit Report</h1>
        </div>
        <a
          href={report.url}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-1 text-blue-600 hover:underline'
        >
          {report.url}
          <ExternalLink className='h-4 w-4' />
        </a>
        <p className='text-sm text-muted-foreground'>
          Generated on {new Date(report.created_at).toLocaleString()}
        </p>
      </div>

      {/* Score Overview */}
      <div className='grid gap-4 md:grid-cols-4'>
        <ScoreCard
          title='Overall Score'
          value={report.onpage_score?.toFixed(1) || '0'}
          subtitle={report.overall_status?.replace('_', ' ')}
          color={report.onpage_score >= 70 ? 'text-green-600' : report.onpage_score >= 50 ? 'text-yellow-600' : 'text-red-600'}
        />
        <ScoreCard
          title='Word Count'
          value={report.word_count?.toLocaleString() || '0'}
          subtitle={report.word_count < 300 ? 'Low content' : 'Good content'}
        />
        <ScoreCard
          title='Load Time'
          value={formatDuration(report.time_to_interactive)}
          subtitle={report.time_to_interactive > 3000 ? 'Slow' : 'Fast'}
          color={report.time_to_interactive > 3000 ? 'text-red-600' : 'text-green-600'}
        />
        <ScoreCard
          title='Page Size'
          value={`${pageSizeMB} MB`}
          subtitle={parseFloat(pageSizeMB) > 3 ? 'Large' : 'Optimal'}
        />
      </div>

      {/* Core Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='h-5 w-5' />
            Core Web Vitals
            <Badge className={report.passes_core_web_vitals ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {report.passes_core_web_vitals ? 'Passed' : 'Failed'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Key metrics that affect user experience and search rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-3'>
            <CWVCard
              title='LCP (Largest Contentful Paint)'
              value={report.lcp}
              status={report.lcp_status}
              threshold='<= 2.5s'
              unit='ms'
            />
            <CWVCard
              title='FID (First Input Delay)'
              value={report.fid}
              status={report.fid_status}
              threshold='<= 100ms'
              unit='ms'
            />
            <CWVCard
              title='CLS (Cumulative Layout Shift)'
              value={report.cls}
              status={report.cls_status}
              threshold='<= 0.1'
              unit=''
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority Action */}
      {report.priority_fix !== 'All good' && (
        <Card className='border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-yellow-800 dark:text-yellow-200'>
              <AlertCircle className='h-5 w-5' />
              Priority Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-yellow-800 dark:text-yellow-200'>{report.priority_fix}</p>
            <p className='mt-2 text-sm text-yellow-700 dark:text-yellow-300'>
              {report.issues_count} issue(s) found on this page
            </p>
          </CardContent>
        </Card>
      )}

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* SEO Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5' />
              SEO Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className='divide-y'>
            <CheckItem label='Page Title' passed={report.has_title} value={report.meta_title_length ? `${report.meta_title_length} chars` : ''} />
            <CheckItem label='Meta Description' passed={report.has_description} value={report.meta_description_length ? `${report.meta_description_length} chars` : ''} />
            <CheckItem label='H1 Heading' passed={report.has_h1} value={report.h1_count ? `${report.h1_count} found` : ''} />
            <CheckItem label='Canonical URL' passed={report.has_canonical} />
            <CheckItem label='HTTPS' passed={report.is_https} />
            <CheckItem label='SEO-Friendly URL' passed={report.seo_friendly_url} />
            <CheckItem label='No Broken Links' passed={!report.broken_links} />
            <CheckItem label='Image ALT Tags' passed={!report.no_image_alt} />
          </CardContent>
        </Card>

        {/* Page Resources */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Code2 className='h-5 w-5' />
              Page Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-muted-foreground' />
                  <span>Total Page Size</span>
                </div>
                <span className='font-medium'>{formatBytes(report.page_size)}</span>
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Code2 className='h-4 w-4 text-muted-foreground' />
                  <span>JavaScript</span>
                </div>
                <span className='font-medium'>{report.scripts_count} files ({formatBytes(report.scripts_size)})</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-muted-foreground' />
                  <span>CSS</span>
                </div>
                <span className='font-medium'>{report.stylesheets_count} files ({formatBytes(report.stylesheets_size)})</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Image className='h-4 w-4 text-muted-foreground' />
                  <span>Images</span>
                </div>
                <span className='font-medium'>{report.images_count} files ({formatBytes(report.images_size)})</span>
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Render Blocking</span>
                <span className='font-medium'>{report.render_blocking_scripts + report.render_blocking_stylesheets} resources</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Links Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Link2 className='h-5 w-5' />
              Links Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span>Internal Links</span>
                <Badge variant='secondary'>{report.internal_links}</Badge>
              </div>
              <div className='flex items-center justify-between'>
                <span>External Links</span>
                <Badge variant='secondary'>{report.external_links}</Badge>
              </div>
              <div className='flex items-center justify-between'>
                <span>Total Links</span>
                <Badge>{report.internal_links + report.external_links}</Badge>
              </div>
              {report.broken_links && (
                <div className='rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200'>
                  <p className='flex items-center gap-2'>
                    <XCircle className='h-4 w-4' />
                    Broken links detected
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meta Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              Meta Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Page Title</p>
              <p className='mt-1'>{report.meta_title || <span className='text-red-500'>Missing</span>}</p>
              {report.meta_title_length && (
                <Badge variant='outline' className='mt-1'>
                  {report.meta_title_length} characters
                  {report.meta_title_length > 60 && ' (too long)'}
                  {report.meta_title_length < 30 && ' (too short)'}
                </Badge>
              )}
            </div>
            <Separator />
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Meta Description</p>
              <p className='mt-1 text-sm'>{report.meta_description || <span className='text-red-500'>Missing</span>}</p>
              {report.meta_description_length && (
                <Badge variant='outline' className='mt-1'>
                  {report.meta_description_length} characters
                  {report.meta_description_length > 160 && ' (too long)'}
                  {report.meta_description_length < 70 && ' (too short)'}
                </Badge>
              )}
            </div>
            <Separator />
            <div>
              <p className='text-sm font-medium text-muted-foreground'>H1 Heading</p>
              <p className='mt-1'>{report.h1 || <span className='text-red-500'>Missing</span>}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Media Tags */}
      {(report.og_title || report.og_description || report.twitter_card) && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Share2 className='h-5 w-5' />
              Social Media Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Open Graph Title</p>
                <p className='mt-1'>{report.og_title || <span className='text-muted-foreground'>Not set</span>}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Open Graph Description</p>
                <p className='mt-1 text-sm'>{report.og_description || <span className='text-muted-foreground'>Not set</span>}</p>
              </div>
              {report.og_image && (
                <div className='md:col-span-2'>
                  <p className='text-sm font-medium text-muted-foreground'>Open Graph Image</p>
                  <a href={report.og_image} target='_blank' rel='noopener noreferrer' className='mt-1 text-sm text-blue-600 hover:underline'>
                    {report.og_image}
                  </a>
                </div>
              )}
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Twitter Card</p>
                <p className='mt-1'>{report.twitter_card || <span className='text-muted-foreground'>Not set</span>}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Content Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-4'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Word Count</p>
              <p className='text-2xl font-bold'>{report.word_count?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Readability Score</p>
              <p className='text-2xl font-bold'>{report.readability_score?.toFixed(1) || 0}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Content Rate</p>
              <p className='text-2xl font-bold'>{((report.content_rate || 0) * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Misspellings</p>
              <p className={`text-2xl font-bold ${report.misspelled_count > 10 ? 'text-red-600' : ''}`}>
                {report.misspelled_count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
