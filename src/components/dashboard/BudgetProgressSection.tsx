'use client'

import { useMemo } from 'react'
import { useBudgets } from '@/hooks/useBudgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction } from '@/types'
import { CATEGORY_COLORS, MONTHS } from '@/lib/constants'
import { formatCurrency, getCurrentMonth, getCurrentYear } from '@/lib/format'
import { cn } from '@/lib/utils'

type PeriodMode = 'mes' | 'ano' | 'tudo'

interface Props {
  transactions: Transaction[]
  periodMode: PeriodMode
  month: number
  year: number
  transactionsLoading: boolean
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color = pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function BudgetProgressSection({
  transactions,
  periodMode,
  month,
  year,
  transactionsLoading,
}: Props) {
  const { budgets, loading: budgetsLoading } = useBudgets()

  const isLoading = transactionsLoading || budgetsLoading

  const monthsCount = useMemo(() => {
    if (periodMode === 'mes') return 1
    if (periodMode === 'ano') return getCurrentMonth()
    // 'tudo': count months from first despesa transaction to now
    const despesas = transactions.filter(t => t.type === 'despesa')
    if (despesas.length === 0) return 1
    const earliest = despesas.reduce((min, t) => (t.date < min ? t.date : min), despesas[0].date)
    const [ey, em] = earliest.split('-').map(Number)
    const cy = getCurrentYear()
    const cm = getCurrentMonth()
    return Math.max(1, (cy - ey) * 12 + (cm - em) + 1)
  }, [periodMode, transactions])

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter(t => t.type === 'despesa')
      .forEach(t => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return map
  }, [transactions])

  // Only show categories that have a budget defined
  const activeBudgets = budgets

  if (!isLoading && activeBudgets.length === 0) return null

  const periodLabel =
    periodMode === 'mes'
      ? `${MONTHS[month - 1]} ${year}`
      : periodMode === 'ano'
      ? `Jan–${MONTHS[getCurrentMonth() - 1]} ${getCurrentYear()}`
      : `${monthsCount} ${monthsCount === 1 ? 'mês' : 'meses'}`

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Orçamento por Categoria</CardTitle>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>
        {periodMode !== 'mes' && (
          <p className="text-xs text-muted-foreground">
            {periodMode === 'ano'
              ? 'Disponível = limite base × meses (sem rollover)'
              : 'Disponível = limite base × total de meses (sem rollover)'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-1.5 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {activeBudgets.map(b => {
              const cat = b.category
              const spent = spentByCategory[cat] ?? 0
              const available =
                periodMode === 'mes'
                  ? b.monthly_limit + b.accumulated_balance
                  : b.monthly_limit * monthsCount
              const pct = available > 0 ? (spent / available) * 100 : 0
              const isOver = spent > available
              const remaining = available - spent

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                      <span className="font-medium">{cat}</span>
                      {periodMode === 'mes' && b.accumulated_balance !== 0 && (
                        <span
                          className={cn(
                            'text-xs',
                            b.accumulated_balance > 0 ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        >
                          rollover {b.accumulated_balance > 0 ? '+' : ''}
                          {formatCurrency(b.accumulated_balance)}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        isOver ? 'font-semibold text-rose-600' : 'text-muted-foreground',
                      )}
                    >
                      {formatCurrency(spent)} / {formatCurrency(available)}
                    </span>
                  </div>
                  <ProgressBar pct={pct} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}%</span>
                    <span className={cn(remaining < 0 && 'font-medium text-rose-600')}>
                      {remaining >= 0
                        ? `Restam ${formatCurrency(remaining)}`
                        : `Excedido em ${formatCurrency(Math.abs(remaining))}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
