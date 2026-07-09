'use client'

import { useEffect, useRef, useState } from 'react'
import { useMarketReceipts } from '@/hooks/useMarketReceipts'
import { Transaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, getDisplayName } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CheckCircle2, FileImage, Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'

export function ReceiptUploadSection() {
  const { attachReceipt, fetchMercadoWithoutReceipt } = useMarketReceipts([])
  const fileRef = useRef<HTMLInputElement>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ itemCount: number; total: number } | null>(null)

  useEffect(() => {
    fetchMercadoWithoutReceipt().then(setTransactions)
  }, [fetchMercadoWithoutReceipt])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
  }

  async function handleProcess() {
    if (!selectedId || !file) return
    setProcessing(true)
    setResult(null)
    try {
      const receipt = await attachReceipt(selectedId, file)
      if (!receipt) {
        toast.error('Não foi possível processar o cupom. Verifique a qualidade da imagem.')
        return
      }
      setResult({ itemCount: receipt.items.length, total: receipt.total_identificado })
      toast.success('Cupom processado com sucesso!')
      // Remove processed transaction from dropdown
      setTransactions(prev => prev.filter(t => t.id !== selectedId))
      setSelectedId('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="size-4" />
          Detalhar compra de Mercado
        </CardTitle>
        <CardDescription>
          Selecione uma compra de Mercado e anexe a foto do cupom fiscal para extrair as subcategorias via IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transaction dropdown */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Compra de Mercado</label>
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setResult(null) }}
            disabled={processing}
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:opacity-50',
            )}
          >
            <option value="">
              {transactions.length === 0
                ? 'Nenhuma compra de Mercado sem cupom'
                : 'Selecione uma compra...'}
            </option>
            {transactions.map(t => (
              <option key={t.id} value={t.id}>
                {formatDate(t.date)} • {getDisplayName(t)} • {formatCurrency(t.amount)}
              </option>
            ))}
          </select>
        </div>

        {/* Upload zone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Foto do cupom fiscal</label>
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
              file ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30',
              processing && 'pointer-events-none opacity-60',
            )}
            onClick={() => fileRef.current?.click()}
          >
            {processing ? (
              <Loader2 className="size-7 animate-spin text-primary" />
            ) : (
              <FileImage className="size-7 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {processing
                  ? 'Analisando cupom via IA...'
                  : file
                    ? file.name
                    : 'Clique para selecionar a foto do cupom'}
              </p>
              {!file && !processing && (
                <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG ou WebP</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Cupom processado!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
                {result.itemCount} {result.itemCount === 1 ? 'item extraído' : 'itens extraídos'} · Total identificado: {formatCurrency(result.total)}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleProcess}
          disabled={!selectedId || !file || processing}
          className="w-full gap-2"
          size="sm"
        >
          {processing && <Loader2 className="size-4 animate-spin" />}
          {processing ? 'Processando...' : 'Processar cupom'}
        </Button>
      </CardContent>
    </Card>
  )
}
