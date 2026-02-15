import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUp, ArrowDown, Minus, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import {
  type RankedKeyword,
  getTrendColor,
  getIntentColor,
  formatTraffic,
} from '@/types/seo'

function PositionBadge({ position, trend }: { position: number; trend: string }) {
  let bgColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  if (position <= 3) bgColor = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  else if (position <= 10) bgColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  else if (position <= 20) bgColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  else if (position <= 50) bgColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'

  const TrendIcon = trend === 'up' ? ArrowUp
    : trend === 'down' ? ArrowDown
    : trend === 'new' ? Sparkles
    : trend === 'lost' ? X
    : Minus

  const trendColor = trend === 'up' ? 'text-green-500'
    : trend === 'down' ? 'text-red-500'
    : trend === 'new' ? 'text-blue-500'
    : trend === 'lost' ? 'text-gray-400'
    : 'text-gray-400'

  return (
    <div className='flex items-center gap-1.5'>
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${bgColor}`}>
        {position}
      </span>
      <TrendIcon className={`h-3 w-3 ${trendColor}`} />
    </div>
  )
}

function CompetitionBadge({ level }: { level: string }) {
  const color = level === 'LOW'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    : level === 'MEDIUM'
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {level}
    </span>
  )
}

export const rankedKeywordsColumns: ColumnDef<RankedKeyword>[] = [
  {
    accessorKey: 'keyword',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Keyword' />,
    cell: ({ row }) => (
      <span className='font-medium text-sm max-w-[250px] truncate block'>
        {row.getValue('keyword')}
      </span>
    ),
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'position',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Position' />,
    cell: ({ row }) => (
      <PositionBadge position={row.getValue('position')} trend={row.original.trend} />
    ),
    filterFn: (row, _id, filterValues: string[]) => {
      const pos = row.original.position
      return filterValues.some((v) => {
        if (v === '1-3') return pos >= 1 && pos <= 3
        if (v === '4-10') return pos >= 4 && pos <= 10
        if (v === '11-20') return pos >= 11 && pos <= 20
        if (v === '21-50') return pos >= 21 && pos <= 50
        if (v === '51-100') return pos >= 51 && pos <= 100
        return false
      })
    },
  },
  {
    accessorKey: 'search_volume',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Volume' />,
    cell: ({ row }) => (
      <span className='text-sm tabular-nums'>
        {formatTraffic(row.getValue('search_volume'))}
      </span>
    ),
  },
  {
    accessorKey: 'cpc',
    header: ({ column }) => <DataTableColumnHeader column={column} title='CPC' />,
    cell: ({ row }) => (
      <span className='text-sm tabular-nums'>${(row.getValue('cpc') as number).toFixed(2)}</span>
    ),
  },
  {
    accessorKey: 'etv',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Traffic' />,
    cell: ({ row }) => (
      <span className='text-sm tabular-nums'>
        {formatTraffic(row.getValue('etv'))}
      </span>
    ),
  },
  {
    accessorKey: 'url',
    header: ({ column }) => <DataTableColumnHeader column={column} title='URL' />,
    cell: ({ row }) => {
      const url = row.getValue('url') as string
      let displayUrl = url
      try {
        const parsed = new URL(url)
        displayUrl = parsed.pathname + parsed.search
      } catch {
        // keep as is
      }
      return (
        <a
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          className='text-xs text-blue-500 hover:underline max-w-[200px] truncate block'
          title={url}
        >
          {displayUrl}
        </a>
      )
    },
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'search_intent',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Intent' />,
    cell: ({ row }) => {
      const intent = row.getValue('search_intent') as string | null
      if (!intent) return <span className='text-xs text-muted-foreground'>-</span>
      return (
        <Badge variant='outline' className={`text-[10px] ${getIntentColor(intent as RankedKeyword['search_intent'])}`}>
          {intent}
        </Badge>
      )
    },
    filterFn: (row, _id, filterValues: string[]) => {
      const intent = row.original.search_intent
      return filterValues.includes(intent || '')
    },
  },
  {
    accessorKey: 'competition_level',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Competition' />,
    cell: ({ row }) => <CompetitionBadge level={row.getValue('competition_level') || 'LOW'} />,
    filterFn: (row, _id, filterValues: string[]) => {
      return filterValues.includes(row.original.competition_level)
    },
  },
  {
    accessorKey: 'trend',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Trend' />,
    cell: ({ row }) => {
      const trend = row.getValue('trend') as string
      return (
        <Badge variant='outline' className={`text-[10px] ${getTrendColor(trend as RankedKeyword['trend'])}`}>
          {trend}
        </Badge>
      )
    },
    filterFn: (row, _id, filterValues: string[]) => {
      return filterValues.includes(row.original.trend)
    },
  },
]
