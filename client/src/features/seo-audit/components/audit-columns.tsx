import { useState } from 'react'
import { type ColumnDef, type Row } from '@tanstack/react-table'
import { ExternalLink, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle, Copy, Check, Pin, PinOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DataTableColumnHeader } from '@/components/data-table'
import { type PageResult, type ResourceError, getScoreColor, getStatusColor, formatBytes, formatDuration } from '@/types/seo'

// Helper component for boolean display
function BooleanIndicator({ value, showBad = false }: { value: boolean; showBad?: boolean }) {
  const isGood = showBad ? !value : value
  return isGood ? (
    <CheckCircle2 className='h-4 w-4 text-green-500 shrink-0' />
  ) : (
    <XCircle className='h-4 w-4 text-red-500 shrink-0' />
  )
}

// Helper component for stat rows
function StatRow({ label, value, warn, good }: { label: string; value: React.ReactNode; warn?: boolean; good?: boolean }) {
  return (
    <div className='flex justify-between items-center gap-2 text-[11px] py-0.5'>
      <span className='text-muted-foreground whitespace-nowrap'>{label}</span>
      <span className={`font-medium text-right ${warn ? 'text-red-400' : good ? 'text-green-400' : ''}`}>{value}</span>
    </div>
  )
}

// CWV Badge helper
function CWVBadge({ value, status, unit = '' }: { value: string | number; status: string; unit?: string }) {
  const color = status === 'good' ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : status === 'needs_improvement' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${color}`}>
      {value}{unit}
    </span>
  )
}

// Error/Warning detail tooltip with hover, click-to-lock, and copy functionality
function ErrorDetailPopover({
  count,
  items,
  type
}: {
  count: number
  items: ResourceError[]
  type: 'error' | 'warning'
}) {
  const [isLocked, setIsLocked] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyAll = async () => {
    const allText = items.map((item, i) =>
      `${i + 1}. ${item.message || 'No message'}${item.line ? ` (Line ${item.line}${item.column ? `:${item.column}` : ''})` : ''}${item.resource ? `\n   Resource: ${item.resource}` : ''}`
    ).join('\n\n')
    try {
      await navigator.clipboard.writeText(allText)
      setCopiedIndex(-1)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // If no items, just show the count
  if (!items || items.length === 0) {
    return (
      <span className={count > 0 ? 'text-red-400' : ''}>
        {count}
      </span>
    )
  }

  const colorClass = type === 'error' ? 'text-red-400' : 'text-yellow-400'
  const bgClass = type === 'error' ? 'bg-red-500/10' : 'bg-yellow-500/10'
  const borderClass = type === 'error' ? 'border-red-500/20' : 'border-yellow-500/20'

  return (
    <Popover open={isLocked ? true : undefined} onOpenChange={(open) => !open && setIsLocked(false)}>
      <PopoverTrigger asChild>
        <button
          className={`font-medium cursor-pointer hover:underline ${count > 0 ? colorClass : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setIsLocked(!isLocked)
          }}
        >
          {count}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`w-80 max-h-64 overflow-auto p-0 ${bgClass} border ${borderClass}`}
        onClick={(e) => e.stopPropagation()}
        side='top'
        align='start'
      >
        <div className='sticky top-0 flex items-center justify-between p-2 border-b border-border/30 bg-background'>
          <span className={`text-xs font-semibold uppercase ${colorClass}`}>
            {type === 'error' ? 'Errors' : 'Warnings'} ({count})
          </span>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={copyAll}
              title='Copy all'
            >
              {copiedIndex === -1 ? <Check className='h-3 w-3 text-green-400' /> : <Copy className='h-3 w-3' />}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={() => setIsLocked(!isLocked)}
              title={isLocked ? 'Unpin' : 'Pin open'}
            >
              {isLocked ? <PinOff className='h-3 w-3 text-primary' /> : <Pin className='h-3 w-3' />}
            </Button>
          </div>
        </div>
        <div className='p-2 space-y-2'>
          {items.map((item, index) => (
            <div
              key={index}
              className='text-[10px] p-2 rounded border border-border/20 bg-card/50 group relative'
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='flex-1 min-w-0'>
                  <p className='text-foreground break-words'>{item.message || 'No message'}</p>
                  {(item.line || item.column) && (
                    <p className='text-muted-foreground mt-0.5'>
                      Line {item.line}{item.column ? `:${item.column}` : ''}
                    </p>
                  )}
                  {item.resource && (
                    <p className='text-muted-foreground mt-0.5 truncate' title={item.resource}>
                      Resource: {item.resource}
                    </p>
                  )}
                  {item.status_code && (
                    <p className='text-muted-foreground mt-0.5'>
                      Status: {item.status_code}
                    </p>
                  )}
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'
                  onClick={() => copyToClipboard(
                    `${item.message || ''}${item.line ? ` (Line ${item.line}${item.column ? `:${item.column}` : ''})` : ''}${item.resource ? ` - ${item.resource}` : ''}`,
                    index
                  )}
                  title='Copy'
                >
                  {copiedIndex === index ? <Check className='h-2.5 w-2.5 text-green-400' /> : <Copy className='h-2.5 w-2.5' />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Interactive stat row that can show error details
function InteractiveStatRow({
  label,
  value,
  warn,
  good,
  errorItems,
  errorType
}: {
  label: string
  value: React.ReactNode
  warn?: boolean
  good?: boolean
  errorItems?: ResourceError[]
  errorType?: 'error' | 'warning'
}) {
  // If we have error items, show the popover
  if (errorItems && errorType && typeof value === 'number' && value > 0) {
    return (
      <div className='flex justify-between items-center gap-2 text-[11px] py-0.5'>
        <span className='text-muted-foreground whitespace-nowrap'>{label}</span>
        <ErrorDetailPopover count={value} items={errorItems} type={errorType} />
      </div>
    )
  }

  return (
    <div className='flex justify-between items-center gap-2 text-[11px] py-0.5'>
      <span className='text-muted-foreground whitespace-nowrap'>{label}</span>
      <span className={`font-medium text-right ${warn ? 'text-red-400' : good ? 'text-green-400' : ''}`}>{value}</span>
    </div>
  )
}

// Misspellings popover component
function MisspellingsPopover({
  count,
  words
}: {
  count: number
  words: string[]
}) {
  const [isLocked, setIsLocked] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyAll = async () => {
    const allText = words.join(', ')
    try {
      await navigator.clipboard.writeText(allText)
      setCopiedIndex(-1)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!words || words.length === 0) {
    return (
      <span className={count > 0 ? 'text-red-400' : ''}>
        {count}
      </span>
    )
  }

  return (
    <Popover open={isLocked ? true : undefined} onOpenChange={(open) => !open && setIsLocked(false)}>
      <PopoverTrigger asChild>
        <button
          className={`font-medium cursor-pointer hover:underline ${count > 0 ? 'text-red-400' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setIsLocked(!isLocked)
          }}
        >
          {count}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='w-72 max-h-64 overflow-auto p-0 bg-orange-500/10 border border-orange-500/20'
        onClick={(e) => e.stopPropagation()}
        side='top'
        align='start'
      >
        <div className='sticky top-0 flex items-center justify-between p-2 border-b border-border/30 bg-background'>
          <span className='text-xs font-semibold uppercase text-orange-400'>
            Misspelled Words ({count})
          </span>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={copyAll}
              title='Copy all'
            >
              {copiedIndex === -1 ? <Check className='h-3 w-3 text-green-400' /> : <Copy className='h-3 w-3' />}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={() => setIsLocked(!isLocked)}
              title={isLocked ? 'Unpin' : 'Pin open'}
            >
              {isLocked ? <PinOff className='h-3 w-3 text-primary' /> : <Pin className='h-3 w-3' />}
            </Button>
          </div>
        </div>
        <div className='p-2'>
          <div className='flex flex-wrap gap-1'>
            {words.map((word, index) => (
              <span
                key={index}
                className='inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 cursor-pointer hover:bg-orange-500/30 group'
                onClick={() => copyToClipboard(word, index)}
                title='Click to copy'
              >
                {word}
                {copiedIndex === index && <Check className='h-2.5 w-2.5 text-green-400' />}
              </span>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Expandable row detail component
export function ExpandedRowContent({ row }: { row: Row<PageResult> }) {
  const data = row.original

  return (
    <div className='p-2 sm:p-3 bg-muted/5 border-t border-border/40 w-full min-w-0'>
      {/* Meta Information - Full width stacked */}
      <div className='space-y-2 mb-3 w-full'>
        {/* Title */}
        <div className='rounded border border-border/30 bg-card/30 p-2 w-full'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-[10px] font-semibold text-cyan-400 uppercase'>Title</span>
            <span className='text-[9px] text-muted-foreground'>({data.meta_title_length} chars)</span>
            {data.has_title ? <CheckCircle2 className='h-3 w-3 text-green-500' /> : <XCircle className='h-3 w-3 text-red-500' />}
          </div>
          <p className='text-[11px] text-foreground whitespace-pre-wrap' style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {data.meta_title || <span className='text-red-400'>Missing</span>}
          </p>
        </div>

        {/* Description */}
        <div className='rounded border border-border/30 bg-card/30 p-2 w-full'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-[10px] font-semibold text-cyan-400 uppercase'>Description</span>
            <span className='text-[9px] text-muted-foreground'>({data.meta_description_length} chars)</span>
            {data.has_description ? <CheckCircle2 className='h-3 w-3 text-green-500' /> : <XCircle className='h-3 w-3 text-red-500' />}
          </div>
          <p className='text-[11px] text-foreground whitespace-pre-wrap' style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {data.meta_description || <span className='text-red-400'>Missing</span>}
          </p>
        </div>

        {/* H1 */}
        <div className='rounded border border-border/30 bg-card/30 p-2 w-full'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-[10px] font-semibold text-cyan-400 uppercase'>H1</span>
            {data.has_h1 ? <CheckCircle2 className='h-3 w-3 text-green-500' /> : <XCircle className='h-3 w-3 text-red-500' />}
          </div>
          <p className='text-[11px] text-foreground whitespace-pre-wrap' style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {data.h1 || <span className='text-red-400'>Missing</span>}
          </p>
        </div>
      </div>

      {/* Stats Grid - 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3'>
        {/* Content */}
        <div className='rounded border border-border/30 bg-card/30 p-2'>
          <h4 className='text-[10px] font-semibold text-blue-400 uppercase mb-1'>Content</h4>
          <StatRow label='Words' value={data.word_count?.toLocaleString() || '0'} />
          <StatRow label='Readability' value={data.readability_score?.toFixed(1) || 'N/A'} />
          <div className='flex justify-between items-center gap-2 text-[11px] py-0.5'>
            <span className='text-muted-foreground whitespace-nowrap'>Misspellings</span>
            <MisspellingsPopover count={data.misspelled_count || 0} words={data.misspelled_words || []} />
          </div>
          <StatRow label='H1/H2/H3' value={`${data.h1_count}/${data.h2_count}/${data.h3_count}`} />
          <StatRow label='Int Links' value={data.internal_links || 0} />
          <StatRow label='Ext Links' value={data.external_links || 0} />
        </div>

        {/* Performance */}
        <div className='rounded border border-border/30 bg-card/30 p-2'>
          <h4 className='text-[10px] font-semibold text-purple-400 uppercase mb-1'>Performance</h4>
          <StatRow label='Size' value={formatBytes(data.page_size)} />
          <StatRow label='Encoded' value={formatBytes(data.encoded_size)} />
          <StatRow label='TTI' value={formatDuration(data.time_to_interactive)} warn={data.time_to_interactive > 3000} />
          <StatRow label='DOM' value={formatDuration(data.dom_complete)} />
          <StatRow label='Scripts' value={data.scripts_count || 0} />
          <StatRow label='Images' value={data.images_count || 0} />
        </div>

        {/* Technical */}
        <div className='rounded border border-border/30 bg-card/30 p-2'>
          <h4 className='text-[10px] font-semibold text-orange-400 uppercase mb-1'>Technical</h4>
          <StatRow label='Status' value={data.status_code || 'N/A'} good={data.status_code === 200} warn={data.status_code !== 200} />
          <InteractiveStatRow
            label='Errors'
            value={data.html_errors_count || 0}
            warn={data.html_errors_count > 0}
            errorItems={data.html_errors}
            errorType='error'
          />
          <InteractiveStatRow
            label='Warnings'
            value={data.html_warnings_count || 0}
            warn={data.html_warnings_count > 0}
            errorItems={data.html_warnings}
            errorType='warning'
          />
          <StatRow label='Block CSS' value={data.render_blocking_stylesheets || 0} warn={data.render_blocking_stylesheets > 0} />
          <StatRow label='Block JS' value={data.render_blocking_scripts || 0} warn={data.render_blocking_scripts > 0} />
          <StatRow label='Doctype' value={data.has_html_doctype ? 'Yes' : 'No'} good={data.has_html_doctype} warn={!data.has_html_doctype} />
        </div>

        {/* Core Web Vitals */}
        <div className='rounded border border-border/30 bg-card/30 p-2'>
          <h4 className='text-[10px] font-semibold text-green-400 uppercase mb-1'>Web Vitals</h4>
          <div className='space-y-1'>
            <div className='flex justify-between items-center text-[10px]'>
              <span className='text-muted-foreground'>LCP</span>
              <CWVBadge value={formatDuration(data.lcp)} status={data.lcp_status} />
            </div>
            <div className='flex justify-between items-center text-[10px]'>
              <span className='text-muted-foreground'>FID</span>
              <CWVBadge value={data.fid} status={data.fid_status} unit='ms' />
            </div>
            <div className='flex justify-between items-center text-[10px]'>
              <span className='text-muted-foreground'>CLS</span>
              <CWVBadge value={data.cls?.toFixed(3)} status={data.cls_status} />
            </div>
            <div className='flex justify-between items-center text-[10px] pt-1 border-t border-border/20'>
              <span className='text-muted-foreground'>Pass</span>
              {data.passes_core_web_vitals ? <CheckCircle2 className='h-3.5 w-3.5 text-green-500' /> : <XCircle className='h-3.5 w-3.5 text-red-500' />}
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className='rounded border border-border/30 bg-card/30 p-2'>
          <h4 className='text-[10px] font-semibold text-pink-400 uppercase mb-1'>Social</h4>
          <StatRow label='OG Title' value={data.og_title ? '✓' : '✗'} good={!!data.og_title} warn={!data.og_title} />
          <StatRow label='OG Desc' value={data.og_description ? '✓' : '✗'} good={!!data.og_description} warn={!data.og_description} />
          <StatRow label='OG Image' value={data.og_image ? '✓' : '✗'} good={!!data.og_image} warn={!data.og_image} />
          <StatRow label='Twitter' value={data.twitter_card ? '✓' : '✗'} good={!!data.twitter_card} warn={!data.twitter_card} />
          <StatRow label='Canonical' value={data.has_canonical ? '✓' : '✗'} good={data.has_canonical} warn={!data.has_canonical} />
          <StatRow label='SEO URL' value={data.seo_friendly_url ? '✓' : '✗'} good={data.seo_friendly_url} warn={!data.seo_friendly_url} />
        </div>
      </div>

      {/* SEO Checks - Compact pills */}
      <div className='rounded border border-border/30 bg-card/30 p-2 mb-2'>
        <h4 className='text-[10px] font-semibold text-muted-foreground uppercase mb-1.5'>SEO Checks</h4>
        <div className='flex flex-wrap gap-1'>
          {[
            { label: 'H1', value: data.has_h1 },
            { label: 'Title', value: data.has_title },
            { label: 'Description', value: data.has_description },
            { label: 'Canonical', value: data.has_canonical },
            { label: 'HTTPS', value: data.is_https },
            { label: 'Image Alt', value: !data.no_image_alt },
            { label: 'No Broken Links', value: !data.broken_links },
            { label: 'Unique Content', value: !data.duplicate_content },
          ].map((check) => (
            <span
              key={check.label}
              className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded ${
                check.value ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
              }`}
            >
              {check.value ? <CheckCircle2 className='h-2.5 w-2.5' /> : <XCircle className='h-2.5 w-2.5' />}
              {check.label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Priority + URL */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        {data.priority_fix && data.priority_fix !== 'All good' ? (
          <div className='flex items-center gap-1.5 text-yellow-400'>
            <AlertCircle className='h-3.5 w-3.5 shrink-0' />
            <span className='text-[10px] font-medium'>Priority: {data.priority_fix}</span>
          </div>
        ) : (
          <div className='flex items-center gap-1.5 text-green-400'>
            <CheckCircle2 className='h-3.5 w-3.5 shrink-0' />
            <span className='text-[10px] font-medium'>All checks passed</span>
          </div>
        )}
        <a
          href={data.url}
          target='_blank'
          rel='noopener noreferrer'
          className='text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 break-all'
          onClick={(e) => e.stopPropagation()}
        >
          <span className='sm:truncate sm:max-w-xs'>{data.url}</span>
          <ExternalLink className='h-3 w-3 shrink-0' />
        </a>
      </div>
    </div>
  )
}

// Helper to extract a readable title from URL if meta_title is missing
function getPageTitle(metaTitle: string | null, url: string): string {
  if (metaTitle) return metaTitle
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    if (path === '/' || path === '') return urlObj.hostname
    // Convert path like "/about-us" to "About Us"
    const lastSegment = path.split('/').filter(Boolean).pop() || ''
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\.(html|php|aspx?)$/i, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {
    return url
  }
}

// Columns order: Score | Title (URL) | Status | Expand
export const auditColumns: ColumnDef<PageResult>[] = [
  {
    accessorKey: 'onpage_score',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Score' />,
    cell: ({ row }) => {
      const score = row.getValue('onpage_score') as number
      return (
        <Badge className={getScoreColor(score)}>
          {score?.toFixed(1) || '0'}
        </Badge>
      )
    },
    size: 80,
  },
  {
    accessorKey: 'url',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Page' />,
    cell: ({ row }) => {
      const url = row.getValue('url') as string
      const metaTitle = row.original.meta_title
      const title = getPageTitle(metaTitle, url)
      return (
        <div className='min-w-0 max-w-[300px] flex items-center gap-2'>
          <span className='truncate text-foreground text-sm' title={url}>
            {title}
          </span>
          <a
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:text-primary shrink-0'
            title='Open in new tab'
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className='h-3.5 w-3.5' />
          </a>
        </div>
      )
    },
    meta: {
      className: 'min-w-[200px] max-w-[300px]',
    },
  },
  {
    accessorKey: 'overall_status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
    cell: ({ row }) => {
      const status = row.getValue('overall_status') as string
      return (
        <Badge className={getStatusColor(status as any)} variant='outline'>
          {status?.replace('_', ' ') || 'N/A'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    size: 140,
  },
  {
    id: 'expander',
    header: () => null,
    cell: ({ row }) => (
      <Button
        variant='ghost'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={(e) => {
          e.stopPropagation()
          row.toggleExpanded()
        }}
      >
        {row.getIsExpanded() ? (
          <ChevronDown className='h-4 w-4 text-primary' />
        ) : (
          <ChevronRight className='h-4 w-4 text-muted-foreground' />
        )}
      </Button>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
]
