import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardSummary } from '@/types'
import { formatCurrency } from '@/lib/format'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  summary: DashboardSummary
  loading: boolean
}

export function SummaryCards({ summary, loading }: Props) {
  const cards = [
    {
      title: 'Receitas',
      value: summary.totalReceitas,
      icon: TrendingUp,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      title: 'Despesas',
      value: summary.totalDespesas,
      icon: TrendingDown,
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50',
    },
    {
      title: 'Saldo',
      value: summary.saldo,
      icon: Wallet,
      colorClass: summary.saldo >= 0 ? 'text-blue-600' : 'text-rose-600',
      bgClass: summary.saldo >= 0 ? 'bg-blue-50' : 'bg-rose-50',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ title, value, icon: Icon, colorClass, bgClass }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className={cn('flex size-9 items-center justify-center rounded-full', bgClass)}>
              <Icon className={cn('size-4', colorClass)} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            ) : (
              <p className={cn('text-2xl font-bold', colorClass)}>{formatCurrency(value)}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
