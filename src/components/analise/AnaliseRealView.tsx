'use client'

import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useMarketReceipts } from '@/hooks/useMarketReceipts'
import { Budget } from '@/types'
import { CATEGORY_COLORS, MONTHS } from '@/lib/constants'
import { formatCurrency, getCurrentMonth, getCurrentYear } from '@/lib/format'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'

type PeriodMode = 'mes' | 'ano' | 'tudo'

const SUBCATEGORY_TO_GROUP: Record<string, string> = {
  'Alimentação Doméstica': 'Alimentação Doméstica',
  'Higiene Pessoal': 'Despesas Pessoais',
  'Limpeza Doméstica': 'Moradia',
  'Saúde': 'Saúde',
  'Lazer': 'Lazer',
  'Outros': 'Outras Despesas',
}

const GROUP_COLORS: Record<string, string> = {
  ...CATEGORY_COLORS,
  'Alimentação Doméstica': '#f97316',
  'Mercado não detalhado': '#94a3b8',
}

interface ConsolidatedGroup {
  name: string
  categoriaValor: number
  mercadoValor: number
  total: number
  budget?: Budget
}

const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - i)

export function AnaliseRealView() {
  const { transactions, loading } = useTransactions()
  const { budgets } = useBudgets()
  const [periodMode, setPeriodMode] = useState<PeriodMode>('mes')
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())

  const filteredDespesas = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'despesa') return false
      const [y, m] = t.date.split('-').map(Number)
      if (periodMode === 'mes') return y === year && m === month
      if (periodMode === 'ano') return y === getCurrentYear() && m <= getCurrentMonth()
      return true
    })
  }, [transactions, periodMode, month, year])

  const mercadoIds = useMemo(
    () => filteredDespesas.filter(t => t.category === 'Mercado').map(t => t.id),
    [filteredDespesas]
  )
  const { receipts } = useMarketReceipts(mercadoIds)

  const budgetMap = useMemo(() => {
    const m = new Map<string, Budget>()
    for (const b of budgets) m.set(b.category, b)
    return m
  }, [budgets])

  const monthsInPeriod = useMemo(() => {
    if (periodMode === 'mes') return 1
    if (periodMode === 'ano') return getCurrentMonth()
    if (transactions.length === 0) return 1
    const oldest = transactions.reduce((min, t) => (t.date < min ? t.date : min), transactions[0].date)
    const [oy, om] = oldest.split('-').map(Number)
    const cy = getCurrentYear()
    const cm = getCurrentMonth()
    return Math.max(1, (cy - oy) * 12 + (cm - om) + 1)
  }, [periodMode, transactions])

  function getBudgetLimit(budget: Budget): number {
    if (periodMode === 'mes') return budget.monthly_limit + budget.accumulated_balance
    return budget.monthly_limit * monthsInPeriod
  }

  const { groups, totalDespesas } = useMemo(() => {
    const groupMap = new Map<string, { categoriaValor: number; mercadoValor: number }>()

    const ensure = (name: string) => {
      if (!groupMap.has(name)) groupMap.set(name, { categoriaValor: 0, mercadoValor: 0 })
      return groupMap.get(name)!
    }

    for (const t of filteredDespesas) {
      if (t.category === 'Mercado') {
        const receipt = receipts.get(t.id)
        if (receipt) {
          for (const item of receipt.items) {
            const groupName = SUBCATEGORY_TO_GROUP[item.subcategoria] ?? 'Outras Despesas'
            ensure(groupName).mercadoValor += item.valor
          }
        } else {
          ensure('Mercado não detalhado').categoriaValor += t.amount
        }
      } else {
        ensure(t.category).categoriaValor += t.amount
      }
    }

    const total = Array.from(groupMap.values()).reduce(
      (s, g) => s + g.categoriaValor + g.mercadoValor,
      0
    )

    const result: ConsolidatedGroup[] = []
    for (const [name, vals] of groupMap.entries()) {
      const groupTotal = vals.categoriaValor + vals.mercadoValor
      if (groupTotal <= 0) continue
      const isSpecial = name === 'Mercado não detalhado' || name === 'Alimentação Doméstica'
      result.push({
        name,
        categoriaValor: vals.categoriaValor,
        mercadoValor: vals.mercadoValor,
        total: groupTotal,
        budget: isSpecial ? undefined : budgetMap.get(name),
      })
    }

    result.sort((a, b) => {
      if (a.name === 'Mercado não detalhado') return 1
      if (b.name === 'Mercado não detalhado') return -1
      return b.total - a.total
    })

    return { groups: result, totalDespesas: total }
  }, [filteredDespesas, receipts, budgetMap])

  const periodLabel =
    periodMode === 'tudo' ? 'todos os registros' :
    periodMode === 'ano' ? `janeiro–${MONTHS[getCurrentMonth() - 1].toLowerCase()} ${getCurrentYear()}` :
    `${MONTHS[month - 1]} ${year}`

  return (
    <div className="space-y-6">
      {/* Header + period controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análise Real</h1>
          <p className="text-sm text-muted-foreground capitalize">{periodLabel}</p>
        </div>

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

      {/* Total */}
      {!loading && totalDespesas > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total de despesas no período</p>
          <p className="text-2xl font-bold">{formatCurrency(totalDespesas)}</p>
        </div>
      )}

      {/* Groups */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
          <p className="text-muted-foreground">Nenhuma despesa encontrada no período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const color = GROUP_COLORS[group.name] ?? '#6b7280'
            const pct = totalDespesas > 0 ? (group.total / totalDespesas) * 100 : 0
            const budgetLimit = group.budget ? getBudgetLimit(group.budget) : 0
            const budgetPct = budgetLimit > 0 ? Math.min(100, (group.total / budgetLimit) * 100) : 0
            const isOverBudget = budgetLimit > 0 && group.total > budgetLimit

            return (
              <div key={group.name} className="rounded-lg border bg-card p-4 space-y-3">
                {/* Group header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-semibold" style={{ color }}>{group.name}</p>
                    {group.categoriaValor > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Transações: {formatCurrency(group.categoriaValor)}
                      </p>
                    )}
                    {group.mercadoValor > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Mercado (cupons): {formatCurrency(group.mercadoValor)}
                      </p>
                    )}
                    {group.name === 'Mercado não detalhado' && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <ShoppingCart className="size-3" />
                        Compras sem cupom anexado — valor não pôde ser distribuído por subcategoria
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{formatCurrency(group.total)}</p>
                    <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% do total</p>
                  </div>
                </div>

                {/* Spending proportion bar */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                  />
                </div>

                {/* Budget bar */}
                {group.budget && budgetLimit > 0 && (
                  <div className="space-y-1 pt-1 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Orçamento: {formatCurrency(budgetLimit)}
                        {periodMode !== 'mes' && (
                          <span className="ml-1 opacity-70">
                            ({formatCurrency(group.budget.monthly_limit)}/mês × {monthsInPeriod} meses)
                          </span>
                        )}
                      </span>
                      <span className={cn(
                        'font-medium',
                        isOverBudget ? 'text-rose-600' : 'text-muted-foreground'
                      )}>
                        {budgetPct.toFixed(0)}%{isOverBudget && ' ⚠'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
