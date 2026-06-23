'use client'

import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { SummaryCards } from './SummaryCards'
import { CategoryPieChart } from './CategoryPieChart'
import { RecentTransactions } from './RecentTransactions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MONTHS } from '@/lib/constants'
import { getCurrentMonth, getCurrentYear } from '@/lib/format'

const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - i)

export function DashboardView() {
  const { transactions, loading } = useTransactions()
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())

  const filtered = useMemo(
    () =>
      transactions.filter(t => {
        const [y, m] = t.date.split('-').map(Number)
        return y === year && m === month
      }),
    [transactions, month, year]
  )

  const summary = useMemo(() => {
    const totalReceitas = filtered
      .filter(t => t.type === 'receita')
      .reduce((s, t) => s + t.amount, 0)
    const totalDespesas = filtered
      .filter(t => t.type === 'despesa')
      .reduce((s, t) => s + t.amount, 0)
    return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas }
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumo financeiro do período selecionado</p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <SummaryCards summary={summary} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart transactions={filtered} loading={loading} />
        <RecentTransactions transactions={filtered.slice(0, 5)} loading={loading} />
      </div>
    </div>
  )
}
