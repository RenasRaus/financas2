'use client'

import { useState } from 'react'
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
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { CATEGORY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

interface Props {
  transactions: Transaction[]
  loading: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => Promise<void>
}

export function TransactionTable({ transactions, loading, onEdit, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

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
            {transactions.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.description}</TableCell>
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
            ))}
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
