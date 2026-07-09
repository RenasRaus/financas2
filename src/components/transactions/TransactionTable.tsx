'use client'

import { useRef, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Category, MarketReceipt, Transaction } from '@/types'
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear, getDisplayName } from '@/lib/format'
import { CATEGORY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MoreHorizontal, Pencil, Receipt, Trash2 } from 'lucide-react'

interface Props {
  transactions: Transaction[]
  loading: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => Promise<void>
  onUpdateFriendlyDescription: (id: string, value: string | null) => Promise<boolean>
  overBudgetCategories?: Set<Category>
  viewingMonth?: number
  viewingYear?: number
  receipts?: Map<string, MarketReceipt>
  onOpenReceiptModal?: (t: Transaction) => void
}

export function TransactionTable({
  transactions,
  loading,
  onEdit,
  onDelete,
  onUpdateFriendlyDescription,
  overBudgetCategories,
  viewingMonth,
  viewingYear,
  receipts,
  onOpenReceiptModal,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Inline description edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const skipSaveRef = useRef(false)

  const currentMonth = getCurrentMonth()
  const currentYear = getCurrentYear()
  const isCurrentMonth =
    (viewingMonth ?? currentMonth) === currentMonth &&
    (viewingYear ?? currentYear) === currentYear

  function startEdit(t: Transaction) {
    setEditingId(t.id)
    setEditValue(t.descricao_amigavel ?? '')
    skipSaveRef.current = false
  }

  function cancelEdit() {
    skipSaveRef.current = true
    setEditingId(null)
  }

  async function saveEdit(t: Transaction) {
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    const value = editValue.trim() || null
    setEditingId(null)
    await onUpdateFriendlyDescription(t.id, value)
  }

  async function handleDelete() {
    if (!confirmId) return
    setDeletingId(confirmId)
    await onDelete(confirmId)
    setDeletingId(null)
    setConfirmId(null)
  }

  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou adicione uma nova transação</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(t => {
              const isOverBudget =
                isCurrentMonth &&
                t.type === 'despesa' &&
                overBudgetCategories?.has(t.category)
              const hasFriendlyName = !!t.descricao_amigavel?.trim()
              return (
                <TableRow
                  key={t.id}
                  className={cn(isOverBudget && 'bg-rose-50 dark:bg-rose-950/20')}
                >
                  <TableCell className="font-medium">
                    {editingId === t.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { void saveEdit(t) }
                          if (e.key === 'Escape') { cancelEdit() }
                        }}
                        onBlur={() => void saveEdit(t)}
                        placeholder={t.description}
                        className="w-full min-w-[12rem] rounded border border-input bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <div className="group/desc flex items-center gap-1.5">
                        <span className="truncate max-w-xs" title={hasFriendlyName ? t.description : undefined}>
                          {getDisplayName(t)}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); startEdit(t) }}
                          title={hasFriendlyName ? `Editar apelido • original: ${t.description}` : 'Adicionar apelido'}
                          className={cn(
                            'shrink-0 rounded p-0.5 transition-opacity focus:outline-none',
                            hasFriendlyName
                              ? 'text-primary opacity-50 hover:opacity-100'
                              : 'text-muted-foreground opacity-0 group-hover/desc:opacity-50 hover:!opacity-100',
                          )}
                        >
                          <Pencil className="size-3" />
                        </button>
                        {t.category === 'Mercado' && onOpenReceiptModal && (
                          <button
                            onClick={e => { e.stopPropagation(); onOpenReceiptModal(t) }}
                            title={receipts?.has(t.id) ? 'Ver detalhamento do cupom' : 'Anexar cupom fiscal'}
                            className={cn(
                              'shrink-0 rounded p-0.5 transition-opacity focus:outline-none',
                              receipts?.has(t.id)
                                ? 'text-orange-500 opacity-70 hover:opacity-100'
                                : 'text-muted-foreground opacity-0 group-hover/desc:opacity-50 hover:!opacity-100',
                            )}
                          >
                            <Receipt className="size-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(t.date)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant="outline"
                      style={{ borderColor: CATEGORY_COLORS[t.category], color: CATEGORY_COLORS[t.category] }}
                    >
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        t.type === 'receita'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      {t.type === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-right font-semibold', t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600')}>
                    {t.type === 'receita' ? '+' : '-'}{formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" className="size-8" />}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(t)} className="gap-2">
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmId(t.id)}
                          className="gap-2 text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="size-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirmId} onOpenChange={open => !open && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A transação será permanentemente excluída.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deletingId === confirmId}
              onClick={handleDelete}
            >
              {deletingId === confirmId ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
