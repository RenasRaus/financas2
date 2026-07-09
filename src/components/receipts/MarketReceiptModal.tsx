'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MarketReceipt, ReceiptSubcategory, Transaction } from '@/types'
import { formatCurrency } from '@/lib/format'
import { AlertTriangle, Loader2, Receipt, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SUBCATEGORY_COLORS: Record<ReceiptSubcategory, string> = {
  'Alimentação Doméstica': '#f97316',
  'Higiene Pessoal': '#a855f7',
  'Limpeza Doméstica': '#8b5cf6',
  'Saúde': '#10b981',
  'Lazer': '#ec4899',
  'Outros': '#6b7280',
}

const SUBCATEGORY_ORDER: ReceiptSubcategory[] = [
  'Alimentação Doméstica',
  'Higiene Pessoal',
  'Limpeza Doméstica',
  'Saúde',
  'Lazer',
  'Outros',
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  receipt: MarketReceipt | null
  onAttach: (file: File) => Promise<void>
}

interface SubcategoryGroup {
  subcategoria: ReceiptSubcategory
  total: number
  items: MarketReceipt['items']
}

function groupBySubcategory(items: MarketReceipt['items']): SubcategoryGroup[] {
  const map = new Map<ReceiptSubcategory, MarketReceipt['items']>()
  for (const item of items) {
    const arr = map.get(item.subcategoria) ?? []
    arr.push(item)
    map.set(item.subcategoria, arr)
  }
  return SUBCATEGORY_ORDER
    .filter(sub => map.has(sub))
    .map(sub => {
      const groupItems = map.get(sub)!
      return {
        subcategoria: sub,
        total: groupItems.reduce((s, i) => s + i.valor, 0),
        items: groupItems,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function MarketReceiptModal({ open, onOpenChange, transaction, receipt, onAttach }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''

    setProcessing(true)
    try {
      await onAttach(file)
      toast.success('Cupom processado com sucesso!')
    } catch {
      toast.error('Erro ao processar o cupom. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  const amount = transaction?.amount ?? 0
  const groups = receipt ? groupBySubcategory(receipt.items) : []
  const divergence = receipt
    ? Math.abs(receipt.total_identificado - amount) / Math.max(amount, 0.01)
    : 0
  const hasDivergence = divergence > 0.1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-orange-500" />
            Cupom fiscal
          </DialogTitle>
          {transaction && (
            <p className="text-sm text-muted-foreground truncate">{transaction.descricao_amigavel ?? transaction.description}</p>
          )}
        </DialogHeader>

        {processing ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analisando cupom via IA...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
          </div>
        ) : receipt ? (
          <div className="space-y-4">
            {/* Value comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Valor da transação</p>
                <p className="text-base font-semibold">{formatCurrency(amount)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total no cupom</p>
                <p className={cn('text-base font-semibold', hasDivergence && 'text-amber-600')}>{formatCurrency(receipt.total_identificado)}</p>
              </div>
            </div>

            {hasDivergence && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <p className="text-xs">
                  O total do cupom difere da transação em {(divergence * 100).toFixed(0)}%. Pode haver itens não lidos ou cupom de outra compra.
                </p>
              </div>
            )}

            {/* Breakdown by subcategory */}
            <div className="space-y-3">
              {groups.map(group => {
                const pct = amount > 0 ? (group.total / amount) * 100 : 0
                const color = SUBCATEGORY_COLORS[group.subcategoria]
                return (
                  <div key={group.subcategoria} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium" style={{ color }}>{group.subcategoria}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatCurrency(group.total)} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="space-y-0.5 pl-1">
                      {group.items.map(item => (
                        <div key={item.id} className="flex items-baseline justify-between text-xs text-muted-foreground">
                          <span className="truncate mr-2">{item.descricao}</span>
                          <span className="shrink-0 tabular-nums">{formatCurrency(item.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Nenhum cupom anexado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fotografe o cupom fiscal para detalhar a compra por subcategoria
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {receipt ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              className="gap-2"
            >
              <Upload className="size-4" />
              Substituir cupom
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              className="gap-2"
            >
              <Upload className="size-4" />
              Anexar cupom fiscal
            </Button>
          )}
        </DialogFooter>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </DialogContent>
    </Dialog>
  )
}
