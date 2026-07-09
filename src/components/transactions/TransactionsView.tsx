'use client'

import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useMarketReceipts } from '@/hooks/useMarketReceipts'
import { TransactionDialog } from './TransactionDialog'
import { TransactionFilters } from './TransactionFilters'
import { TransactionTable } from './TransactionTable'
import { MarketReceiptModal } from '@/components/receipts/MarketReceiptModal'
import { Button } from '@/components/ui/button'
import { Transaction } from '@/types'
import { exportToCSV, formatCurrency, getCurrentMonth, getCurrentYear, getDisplayName } from '@/lib/format'
import { Download, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function TransactionsView() {
  const { transactions, loading, createTransaction, updateTransaction, updateFriendlyDescription, deleteTransaction } = useTransactions()
  const { overBudgetCategories } = useBudgets()

  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null)

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number)
      if (y !== year || m !== month) return false
      if (category !== 'all' && t.category !== category) return false
      if (type !== 'all' && t.type !== type) return false
      if (search) {
        const q = search.toLowerCase()
        const matchDesc = t.description.toLowerCase().includes(q)
        const matchFriendly = t.descricao_amigavel?.toLowerCase().includes(q) ?? false
        if (!matchDesc && !matchFriendly) return false
      }
      return true
    })
  }, [transactions, month, year, category, type, search])

  const mercadoIds = useMemo(
    () => filtered.filter(t => t.category === 'Mercado').map(t => t.id),
    [filtered]
  )
  const { receipts, attachReceipt } = useMarketReceipts(mercadoIds)

  async function handleAttachReceipt(file: File): Promise<void> {
    if (!receiptModalTx) return
    await attachReceipt(receiptModalTx.id, file)
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setDialogOpen(true)
  }

  function handleExport() {
    if (filtered.length === 0) {
      toast.info('Nenhuma transação para exportar')
      return
    }
    const rows = filtered.map(t => ({
      Data: t.date,
      Descrição: getDisplayName(t),
      'Descrição original': t.descricao_amigavel ? t.description : '',
      Tipo: t.type === 'receita' ? 'Receita' : 'Despesa',
      Categoria: t.category,
      Valor: formatCurrency(t.amount),
    }))
    exportToCSV(rows, `transacoes-${year}-${String(month).padStart(2, '0')}`)
    toast.success(`${filtered.length} transações exportadas`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="size-4" />
            Nova transação
          </Button>
        </div>
      </div>

      <TransactionFilters
        month={month} setMonth={setMonth}
        year={year} setYear={setYear}
        category={category} setCategory={setCategory}
        type={type} setType={setType}
        search={search} setSearch={setSearch}
      />

      <TransactionTable
        transactions={filtered}
        loading={loading}
        onEdit={openEdit}
        onDelete={deleteTransaction}
        onUpdateFriendlyDescription={updateFriendlyDescription}
        overBudgetCategories={overBudgetCategories}
        viewingMonth={month}
        viewingYear={year}
        receipts={receipts}
        onOpenReceiptModal={setReceiptModalTx}
      />

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onCreate={createTransaction}
        onUpdate={updateTransaction}
      />

      <MarketReceiptModal
        open={!!receiptModalTx}
        onOpenChange={open => { if (!open) setReceiptModalTx(null) }}
        transaction={receiptModalTx}
        receipt={receiptModalTx ? (receipts.get(receiptModalTx.id) ?? null) : null}
        onAttach={handleAttachReceipt}
      />
    </div>
  )
}
