'use client'

import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { SummaryCards } from './SummaryCards'
import { CategoryPieChart } from './CategoryPieChart'
import { TopExpenses } from './TopExpenses'
import { BudgetProgressSection } from './BudgetProgressSection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES, DESPESA_CATEGORIES, MONTHS, RECEITA_CATEGORIES } from '@/lib/constants'
import { getCurrentMonth, getCurrentYear } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Category } from '@/types'

type PeriodMode = 'mes' | 'ano' | 'tudo'
type FilterType = 'all' | 'receita' | 'despesa'

const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - i)

export function DashboardView() {
  const { transactions, loading } = useTransactions()

  // Period filter
  const [periodMode, setPeriodMode] = useState<PeriodMode>('mes')
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())

  // Type + category filters
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterCategory, setFilterCategory] = useState('all')

  // Period-only filter — used by BudgetProgressSection (unaffected by type/category)
  const filteredByPeriod = useMemo(() => {
    return transactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number)
      if (periodMode === 'mes') return y === year && m === month
      if (periodMode === 'ano') return y === getCurrentYear() && m <= getCurrentMonth()
      return true
    })
  }, [transactions, periodMode, month, year])

  // Full filter — used by SummaryCards, CategoryPieChart, TopExpenses
  const filtered = useMemo(() => {
    return filteredByPeriod.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      return true
    })
  }, [filteredByPeriod, filterType, filterCategory])

  const summary = useMemo(() => {
    const totalReceitas = filtered.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0)
    const totalDespesas = filtered.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0)
    return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas }
  }, [filtered])

  const categoryOptions: Category[] =
    filterType === 'receita' ? RECEITA_CATEGORIES :
    filterType === 'despesa' ? DESPESA_CATEGORIES :
    CATEGORIES

  function handleTypeChange(newType: FilterType) {
    setFilterType(newType)
    setFilterCategory('all')
  }

  const periodLabel =
    periodMode === 'tudo' ? 'todos os registros' :
    periodMode === 'ano' ? `janeiro–${MONTHS[getCurrentMonth() - 1].toLowerCase()} ${getCurrentYear()}` :
    `${MONTHS[month - 1]} ${year}`

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground capitalize">{periodLabel}</p>
          </div>

          {/* Period controls */}
          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Type + category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(['all', 'receita', 'despesa'] as FilterType[]).map(ft => (
              <button
                key={ft}
                onClick={() => handleTypeChange(ft)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  filterType === ft
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {ft === 'all' ? 'Todos' : ft === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>

          <Select value={filterCategory} onValueChange={v => { if (v != null) setFilterCategory(v) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categoryOptions.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SummaryCards summary={summary} loading={loading} />

      <BudgetProgressSection
        transactions={filteredByPeriod}
        periodMode={periodMode}
        month={month}
        year={year}
        transactionsLoading={loading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart transactions={filtered} loading={loading} filterType={filterType} />
        <TopExpenses transactions={filtered} loading={loading} />
      </div>
    </div>
  )
}
