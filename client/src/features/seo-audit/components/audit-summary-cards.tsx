import { FileText, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuditWithResults } from '@/types/seo'

interface AuditSummaryCardsProps {
  audit: AuditWithResults
}

export function AuditSummaryCards({ audit }: AuditSummaryCardsProps) {
  const { pages, summary } = audit

  const cards = [
    {
      title: 'Total Pages',
      value: pages.length,
      icon: FileText,
      description: 'Pages analyzed',
      color: 'text-blue-500',
    },
    {
      title: 'Average Score',
      value: summary?.average_score?.toFixed(1) || '0',
      icon: BarChart3,
      description: 'SEO score average',
      color:
        (summary?.average_score || 0) >= 70 ? 'text-green-500' : 'text-yellow-500',
    },
    {
      title: 'Pages with Issues',
      value: summary?.pages_with_issues || 0,
      icon: AlertTriangle,
      description: 'Need attention',
      color:
        (summary?.pages_with_issues || 0) > 0 ? 'text-red-500' : 'text-green-500',
    },
    {
      title: 'Passing CWV',
      value: summary?.passing_core_web_vitals || 0,
      icon: CheckCircle2,
      description: 'Core Web Vitals',
      color: 'text-green-500',
    },
  ]

  return (
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
    </div>
  )
}
