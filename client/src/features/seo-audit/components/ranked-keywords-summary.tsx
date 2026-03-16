import { Key, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type RankedKeywordsSummary, formatTraffic, formatCurrency } from '@/types/seo'

interface RankedKeywordsSummaryCardsProps {
  summary: RankedKeywordsSummary
}

function DistributionBar({ summary }: { summary: RankedKeywordsSummary }) {
  const total = summary.total_keywords || 1
  const segments = [
    { label: '1-3', count: summary.pos_1_3, color: 'bg-green-500' },
    { label: '4-10', count: summary.pos_4_10, color: 'bg-blue-500' },
    { label: '11-20', count: summary.pos_11_20, color: 'bg-yellow-500' },
    { label: '21-50', count: summary.pos_21_50, color: 'bg-orange-500' },
    { label: '51-100', count: summary.pos_51_100, color: 'bg-gray-400' },
  ]

  return (
    <div className='space-y-1.5'>
      <div className='flex h-2.5 w-full overflow-hidden rounded-full bg-muted'>
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={seg.label}
              className={`${seg.color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`Position ${seg.label}: ${seg.count}`}
            />
          )
        })}
      </div>
      <div className='flex flex-wrap gap-x-3 gap-y-0.5'>
        {segments.map((seg) => (
          <div key={seg.label} className='flex items-center gap-1 text-[10px] text-muted-foreground'>
            <div className={`h-2 w-2 rounded-full ${seg.color}`} />
            <span>{seg.label}: {seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RankedKeywordsSummaryCards({ summary }: RankedKeywordsSummaryCardsProps) {
  const cards = [
    {
      title: 'Total Keywords',
      value: formatTraffic(summary.total_keywords),
      icon: Key,
      description: 'Ranked keywords found',
      color: 'text-blue-500',
    },
    {
      title: 'Estimated Traffic',
      value: formatTraffic(summary.estimated_traffic),
      icon: TrendingUp,
      description: 'Monthly organic visits',
      color: 'text-green-500',
    },
    {
      title: 'Traffic Value',
      value: formatCurrency(summary.traffic_value),
      icon: DollarSign,
      description: 'Estimated monthly value',
      color: 'text-purple-500',
    },
  ]

  return (
    <div className='space-y-4'>
      <div className='grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4'>
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2'>
              <CardTitle className='text-xs sm:text-sm font-medium'>{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
              <div className='text-xl sm:text-2xl font-bold'>{card.value}</div>
              <p className='text-[10px] sm:text-xs text-muted-foreground'>{card.description}</p>
            </CardContent>
          </Card>
        ))}

        {/* Distribution card */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2'>
            <CardTitle className='text-xs sm:text-sm font-medium'>Distribution</CardTitle>
            <BarChart3 className='h-4 w-4 text-orange-500' />
          </CardHeader>
          <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
            <DistributionBar summary={summary} />
          </CardContent>
        </Card>
      </div>

      {/* Trend badges */}
      <div className='flex flex-wrap gap-2'>
        {summary.new_keywords > 0 && (
          <Badge variant='outline' className='bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'>
            New: {summary.new_keywords}
          </Badge>
        )}
        {summary.improved > 0 && (
          <Badge variant='outline' className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'>
            Improved: {summary.improved}
          </Badge>
        )}
        {summary.declined > 0 && (
          <Badge variant='outline' className='bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'>
            Declined: {summary.declined}
          </Badge>
        )}
        {summary.lost > 0 && (
          <Badge variant='outline' className='bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'>
            Lost: {summary.lost}
          </Badge>
        )}
      </div>
    </div>
  )
}
