'use client'

import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { Category, Transaction } from '@/types'
import { RECEITA_CATEGORIES, DESPESA_CATEGORIES, CATEGORY_DESCRIPTIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null
  const map = {
    alta: 'bg-emerald-100 text-emerald-700',
    media: 'bg-amber-100 text-amber-700',
    baixa: 'bg-rose-100 text-rose-700',
  }
  const labels = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
  return (
    <Badge variant="secondary" className={cn('text-xs', map[confidence as keyof typeof map])}>
      Confiança {labels[confidence as keyof typeof labels]}
    </Badge>
  )
}

function ReviewCard({
  transaction,
  onApprove,
}: {
  transaction: Transaction
  onApprove: (id: string, category: Category) => Promise<void>
}) {
  const validCategories = transaction.type === 'receita' ? RECEITA_CATEGORIES : DESPESA_CATEGORIES
  const [selected, setSelected] = useState<Category>(transaction.category)
  const [saving, setSaving] = useState(false)

  async function handleApprove() {
    setSaving(true)
    await onApprove(transaction.id, selected)
    setSaving(false)
  }

  return (
    <Card className="border-amber-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Informações da transação */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate max-w-xs">
                {transaction.description}
              </span>
              <ConfidenceBadge confidence={transaction.confianca} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{formatDate(transaction.date)}</span>
              <span
                className={cn(
                  'font-semibold',
                  transaction.type === 'receita' ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sugerida: <span className="font-medium text-foreground">{transaction.category}</span>
              {transaction.category && CATEGORY_DESCRIPTIONS[transaction.category] && (
                <> — {CATEGORY_DESCRIPTIONS[transaction.category]}</>
              )}
            </p>
          </div>

          {/* Seletor de categoria + botão */}
          <div className="flex items-center gap-2 shrink-0">
            <Select value={selected} onValueChange={v => { if (v) setSelected(v as Category) }}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {validCategories.map(c => (
                  <SelectItem key={c} value={c}>
                    <div>
                      <span className="font-medium">{c}</span>
                      <span className="block text-xs text-muted-foreground">
                        {CATEGORY_DESCRIPTIONS[c]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1.5" onClick={handleApprove} disabled={saving}>
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {saving ? '' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReviewView() {
  const { transactions, loading, approveReview } = useTransactions()

  const pending = transactions.filter(t => t.needs_review)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fila de Revisão</h1>
        <p className="text-sm text-muted-foreground">
          Transações com categorização automática de baixa confiança aguardando sua confirmação
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" />
          Carregando...
        </div>
      ) : pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="size-10 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium">Nenhuma transação pendente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as categorias já foram confirmadas. Bom trabalho!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="size-4 text-amber-600" />
                {pending.length} transaç{pending.length !== 1 ? 'ões' : 'ão'} aguardando revisão
              </CardTitle>
              <CardDescription>
                Confirme ou corrija a categoria sugerida para cada transação
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-2">
            {pending.map(t => (
              <ReviewCard key={t.id} transaction={t} onApprove={approveReview} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
