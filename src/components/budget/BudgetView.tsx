'use client'

import { useState } from 'react'
import { useBudgets } from '@/hooks/useBudgets'
import { BudgetEditDialog } from './BudgetEditDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { CATEGORY_COLORS, DESPESA_CATEGORIES } from '@/lib/constants'
import { Category } from '@/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FlaskConical, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'

type ConfirmAction =
  | { type: 'reset'; budgetId: string; category: string }
  | { type: 'delete'; budgetId: string; category: string }

export function BudgetView() {
  const { budgets, loading, upsertBudget, resetRollover, deleteBudget, simulateRollover } =
    useBudgets()

  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [simulating, setSimulating] = useState(false)

  const budgetMap = new Map(budgets.map(b => [b.category, b]))

  function openEdit(category: Category) {
    setEditCategory(category)
    setEditOpen(true)
  }

  async function handleSave(monthlyLimit: number): Promise<boolean> {
    if (!editCategory) return false
    const existing = budgetMap.get(editCategory)
    return upsertBudget(editCategory, monthlyLimit, existing?.id)
  }

  async function handleConfirm() {
    if (!confirm) return
    setConfirming(true)
    if (confirm.type === 'reset') {
      await resetRollover(confirm.budgetId)
    } else {
      await deleteBudget(confirm.budgetId)
    }
    setConfirming(false)
    setConfirm(null)
  }

  async function handleSimulate() {
    setSimulating(true)
    await simulateRollover()
    setSimulating(false)
  }

  const withBudget = DESPESA_CATEGORIES.filter(c => budgetMap.has(c))
  const withoutBudget = DESPESA_CATEGORIES.filter(c => !budgetMap.has(c))

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dev-only: simulate month rollover */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
          <FlaskConical className="size-4 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-700 dark:text-amber-400">
            Ambiente de desenvolvimento — simule a virada do mês para testar o rollover
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 text-xs dark:text-amber-400 dark:hover:bg-amber-950/40"
            disabled={simulating || budgets.length === 0}
            onClick={handleSimulate}
          >
            {simulating ? 'Simulando...' : 'Simular virada do mês'}
          </Button>
        </div>
      )}

      {/* Categories with budget — compact settings list */}
      {withBudget.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {withBudget.map(cat => {
              const b = budgetMap.get(cat)!
              const hasRollover = b.accumulated_balance !== 0

              return (
                <div
                  key={cat}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                    <span className="truncate text-sm font-medium">{cat}</span>
                  </div>

                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Limite</p>
                      <p className="font-medium">{formatCurrency(b.monthly_limit)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Rollover</p>
                      <p
                        className={cn(
                          'font-medium',
                          hasRollover
                            ? b.accumulated_balance > 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                            : 'text-muted-foreground',
                        )}
                      >
                        {hasRollover
                          ? `${b.accumulated_balance > 0 ? '+' : ''}${formatCurrency(b.accumulated_balance)}`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Editar limite"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'size-7',
                        hasRollover
                          ? 'text-muted-foreground hover:text-foreground'
                          : 'text-muted-foreground/40 cursor-not-allowed',
                      )}
                      title={hasRollover ? 'Resetar rollover' : 'Sem rollover acumulado'}
                      disabled={!hasRollover}
                      onClick={() =>
                        setConfirm({ type: 'reset', budgetId: b.id, category: cat })
                      }
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-rose-600"
                      title="Remover limite"
                      onClick={() =>
                        setConfirm({ type: 'delete', budgetId: b.id, category: cat })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Categories without budget */}
      {withoutBudget.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Sem limite definido</p>
          <div className="divide-y rounded-lg border">
            {withoutBudget.map(cat => (
              <div key={cat} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  <span className="text-sm">{cat}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => openEdit(cat)}
                >
                  <Plus className="size-3" />
                  Definir limite
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {withBudget.length === 0 && withoutBudget.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma categoria de despesa encontrada
        </p>
      )}

      <BudgetEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={editCategory}
        currentLimit={editCategory ? (budgetMap.get(editCategory)?.monthly_limit ?? null) : null}
        onSave={handleSave}
      />

      <Dialog open={!!confirm} onOpenChange={open => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'reset' ? 'Resetar rollover' : 'Remover limite'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.type === 'reset'
              ? `O saldo acumulado de "${confirm.category}" vai a zero. O orçamento do próximo mês voltará ao limite base. Esta ação não pode ser desfeita.`
              : `O limite mensal de "${confirm?.category}" será removido permanentemente.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={confirming} onClick={handleConfirm}>
              {confirming ? 'Aguarde...' : confirm?.type === 'reset' ? 'Resetar' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
