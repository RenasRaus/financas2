'use client'

import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { SummaryCards } from './SummaryCards'
import { CategoryPieChart } from './CategoryPieChart'
import { TopExpenses } from './TopExpenses'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MONTHS } from '@/lib/constants'
import { getCurrentMonth, getCurrentYear } from '@/lib/format'
import { cn } from '@/lib/utils'

type PeriodMode = 'mes' | 'ano' | 'tudo'

const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - i)

export function DashboardView() {
  const { transactions, loading } = useTransactions()
  const [periodMode, setPeriodMode] = useState<PeriodMode>('mes')
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number)
      if (periodMode === 'mes') return y === year && m === month
      if (periodMode === 'ano') return y === getCurrentYear() && m <= getCurrentMonth()
      return true
    })
  }, [transactions, periodMode, month, year])

  const summary = useMemo(() => {
    const totalReceitas = filtered
      .filter(t => t.type === 'receita')
      .reduce((s, t) => s + t.amount, 0)
    const totalDespesas = filtered
      .filter(t => t.type === 'despesa')
      .reduce((s, t) => s + t.amount, 0)
    return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas }
  }, [filtered])

  const periodLabel =
    periodMode === 'tudo' ? 'todos os registros' :
    periodMode === 'ano' ? `janeiro–${MONTHS[getCurrentMonth() - 1].toLowerCase()} ${getCurrentYear()}` :
    `${MONTHS[month - 1]} ${year}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{periodLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de modo */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(['mes', 'ano', 'tudo'] as PeriodMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  periodMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {mode === 'mes' ? 'Mês' : mode === 'ano' ? 'Este ano' : 'Tudo'}
              </button>
            ))}
          </div>

          {/* Seletores de mês/ano — só no modo Mês */}
          {periodMode === 'mes' && (
            <>
              <Select value={String(month)} onValueChange={v => { if (v != null) setMonth(Number(v)) }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={v => { if (v != null) setYear(Number(v)) }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      <SummaryCards summary={summary} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart transactions={filtered} loading={loading} />
        <TopExpenses transactions={filtered} loading={loading} />
      </div>
    </div>
  )
}
