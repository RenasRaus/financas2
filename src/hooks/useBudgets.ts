'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Budget, Category } from '@/types'
import { getCurrentYM } from '@/lib/format'
import { toast } from 'sonner'

function getPrevYM(ym: string): string {
  let [y, m] = ym.split('-').map(Number)
  m--
  if (m < 1) { m = 12; y-- }
  return `${y}-${String(m).padStart(2, '0')}`
}

function addMonth(ym: string): string {
  let [y, m] = ym.split('-').map(Number)
  m++
  if (m > 12) { m = 1; y++ }
  return `${y}-${String(m).padStart(2, '0')}`
}

function ymToDateRange(ym: string): { start: string; end: string } {
  const start = `${ym}-01`
  const end = `${addMonth(ym)}-01`
  return { start, end }
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spentThisMonth, setSpentThisMonth] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const currentYM = getCurrentYM()
    const prevYM = getPrevYM(currentYM)

    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .order('category')

    if (budgetError) {
      toast.error('Erro ao carregar orçamentos')
      setLoading(false)
      return
    }

    const rawBudgets = (budgetData ?? []) as Budget[]
    const updatedBudgets: Budget[] = []

    for (const b of rawBudgets) {
      const lastRM = b.last_rollover_month

      // Already up to date (processed through previous month)
      if (lastRM && lastRM >= prevYM) {
        updatedBudgets.push(b)
        continue
      }

      // Determine which completed months to process
      const startFrom = lastRM ? addMonth(lastRM) : prevYM
      const monthsToProcess: string[] = []
      let cursor = startFrom
      while (cursor <= prevYM) {
        monthsToProcess.push(cursor)
        cursor = addMonth(cursor)
      }

      if (monthsToProcess.length === 0) {
        updatedBudgets.push(b)
        continue
      }

      // Apply rollover for each completed month
      let balance = b.accumulated_balance
      for (const ym of monthsToProcess) {
        const { start, end } = ymToDateRange(ym)
        const { data: txData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category', b.category)
          .eq('type', 'despesa')
          .gte('date', start)
          .lt('date', end)

        const spent = (txData ?? []).reduce(
          (sum: number, t: { amount: number }) => sum + Number(t.amount),
          0,
        )
        const available = b.monthly_limit + balance
        balance = available - spent
      }

      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          accumulated_balance: balance,
          last_rollover_month: prevYM,
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.id)

      updatedBudgets.push(
        updateError
          ? b
          : { ...b, accumulated_balance: balance, last_rollover_month: prevYM },
      )
    }

    // Fetch spending for current month (single query, all categories)
    const { start: monthStart, end: monthEnd } = ymToDateRange(currentYM)
    const { data: currentSpending } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('type', 'despesa')
      .gte('date', monthStart)
      .lt('date', monthEnd)

    const spentMap: Record<string, number> = {}
    for (const t of currentSpending ?? []) {
      spentMap[t.category] = (spentMap[t.category] ?? 0) + Number(t.amount)
    }

    setBudgets(updatedBudgets)
    setSpentThisMonth(spentMap)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const overBudgetCategories = useMemo(() => {
    const over = new Set<Category>()
    for (const b of budgets) {
      const available = b.monthly_limit + b.accumulated_balance
      const spent = spentThisMonth[b.category] ?? 0
      if (spent > available) over.add(b.category as Category)
    }
    return over
  }, [budgets, spentThisMonth])

  async function upsertBudget(
    category: Category,
    monthlyLimit: number,
    existingId?: string,
  ): Promise<boolean> {
    const supabase = createClient()

    if (existingId) {
      const { error } = await supabase
        .from('budgets')
        .update({ monthly_limit: monthlyLimit, updated_at: new Date().toISOString() })
        .eq('id', existingId)
      if (error) { toast.error('Erro ao atualizar limite'); return false }
      toast.success('Limite atualizado!')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const currentYM = getCurrentYM()
      const prevYM = getPrevYM(currentYM)

      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category,
        monthly_limit: monthlyLimit,
        accumulated_balance: 0,
        last_rollover_month: prevYM,
      })
      if (error) { toast.error('Erro ao criar orçamento'); return false }
      toast.success('Orçamento definido!')
    }

    await fetchBudgets()
    return true
  }

  async function resetRollover(budgetId: string): Promise<void> {
    const supabase = createClient()
    const prevYM = getPrevYM(getCurrentYM())

    const { error } = await supabase
      .from('budgets')
      .update({
        accumulated_balance: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
        last_rollover_month: prevYM,
        updated_at: new Date().toISOString(),
      })
      .eq('id', budgetId)

    if (error) {
      toast.error('Erro ao resetar rollover')
    } else {
      toast.success('Rollover resetado!')
      await fetchBudgets()
    }
  }

  async function deleteBudget(budgetId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('budgets').delete().eq('id', budgetId)
    if (error) {
      toast.error('Erro ao remover limite')
    } else {
      toast.success('Limite removido!')
      await fetchBudgets()
    }
  }

  async function simulateRollover(): Promise<void> {
    if (budgets.length === 0) {
      toast.info('Nenhum orçamento definido para simular')
      return
    }
    const supabase = createClient()
    const currentYM = getCurrentYM()
    const { start, end } = ymToDateRange(currentYM)

    let processed = 0
    for (const b of budgets) {
      const { data: txData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category', b.category)
        .eq('type', 'despesa')
        .gte('date', start)
        .lt('date', end)

      const spent = (txData ?? []).reduce(
        (sum: number, t: { amount: number }) => sum + Number(t.amount),
        0,
      )
      const available = b.monthly_limit + b.accumulated_balance
      const newBalance = available - spent

      const { error } = await supabase
        .from('budgets')
        .update({
          accumulated_balance: newBalance,
          last_rollover_month: currentYM,
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.id)

      if (!error) processed++
    }

    toast.success(`Rollover simulado para ${processed} categoria${processed !== 1 ? 's' : ''}`)
    await fetchBudgets()
  }

  return {
    budgets,
    spentThisMonth,
    overBudgetCategories,
    loading,
    upsertBudget,
    resetRollover,
    deleteBudget,
    simulateRollover,
    refetch: fetchBudgets,
  }
}
