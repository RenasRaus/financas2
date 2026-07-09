'use client'

import { useRef, useState } from 'react'
import { OFXTransaction } from '@/lib/ofx-parser'
import { OFXImportResult } from '@/types'
import { useTransactions } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, ClipboardCheck, CreditCard, FileText, Loader2, Upload } from 'lucide-react'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function FaturaUploadSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { importOFXTransactions } = useTransactions()

  const [items, setItems] = useState<OFXTransaction[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<OFXImportResult | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setItems(null)
    setResult(null)
    setExtracting(true)

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/extract-fatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64: base64 }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erro ao extrair lançamentos do PDF')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      const data = await res.json() as { transactions: OFXTransaction[] }
      if (!data.transactions || data.transactions.length === 0) {
        toast.error('Nenhum lançamento encontrado no PDF. Verifique se é uma fatura Ourocard.')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      setItems(data.transactions)
      toast.success(`${data.transactions.length} lançamentos extraídos`)
    } catch {
      toast.error('Erro ao processar o PDF')
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setExtracting(false)
    }
  }

  async function handleImport() {
    if (!items) return
    setImporting(true)
    setProgress({ done: 0, total: items.length })

    const res = await importOFXTransactions(items, (done, total) => {
      setProgress({ done, total })
    })

    setResult(res)
    setItems(null)
    setFileName('')
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''

    if (res.imported > 0) toast.success(`${res.imported} lançamentos importados!`)
    if (res.duplicates > 0) toast.info(`${res.duplicates} duplicata${res.duplicates !== 1 ? 's' : ''} ignorada${res.duplicates !== 1 ? 's' : ''}`)
    if (res.errors > 0) toast.error(`${res.errors} lançamentos com erro`)
    setImporting(false)
  }

  function handleReset() {
    setItems(null)
    setFileName('')
    setResult(null)
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const progressPct = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="size-4" />
          Importar fatura do cartão
        </CardTitle>
        <CardDescription>
          Importe a fatura PDF do Ourocard Visa (Banco do Brasil) — os lançamentos individuais são extraídos via IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload zone */}
        {!items && !importing && (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
              extracting ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/30',
            )}
            onClick={() => !extracting && fileRef.current?.click()}
          >
            {extracting ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <Upload className="size-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-sm">
                {extracting
                  ? 'Extraindo lançamentos via IA...'
                  : 'Clique para selecionar a fatura em PDF'}
              </p>
              {fileName ? (
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <FileText className="size-3" /> {fileName}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .pdf</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Categorization progress */}
        {importing && progress && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {progress.done < progress.total
                    ? `Categorizando lançamento ${progress.done + 1} de ${progress.total}...`
                    : 'Finalizando importação...'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Classificando automaticamente via Claude AI
                </p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{progressPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Import result */}
        {result && !importing && (
          <div className="flex items-center gap-4">
            {result.errors === 0 ? (
              <CheckCircle2 className="size-8 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="size-8 text-amber-500 shrink-0" />
            )}
            <div>
              <p className="font-semibold">Importação concluída</p>
              <p className="text-sm text-muted-foreground">
                {result.imported} importado{result.imported !== 1 ? 's' : ''}
                {result.duplicates > 0 && ` · ${result.duplicates} duplicata${result.duplicates !== 1 ? 's' : ''} ignorada${result.duplicates !== 1 ? 's' : ''}`}
                {result.errors > 0 && ` · ${result.errors} com erro`}
              </p>
              {result.imported > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ClipboardCheck className="size-3" />
                  Verifique a fila de Revisão para lançamentos com baixa confiança
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={handleReset}>
              Nova fatura
            </Button>
          </div>
        )}

        {/* Preview table */}
        {items && !importing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">{items.length} lançamentos encontrados</p>
                <p className="text-xs text-muted-foreground">{fileName}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleReset}>Cancelar</Button>
                <Button size="sm" onClick={handleImport} className="gap-2">
                  Importar {items.length} lançamentos
                </Button>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                          {formatDate(t.date)}
                        </TableCell>
                        <TableCell className="max-w-64 truncate text-xs">{t.description}</TableCell>
                        <TableCell className="text-right font-semibold text-rose-600 text-xs whitespace-nowrap">
                          -{formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total extraído: <span className="font-semibold text-foreground">{formatCurrency(items.reduce((s, t) => s + t.amount, 0))}</span></span>
              <Badge variant="secondary" className="gap-1">
                <CreditCard className="size-3" />
                Ourocard Visa
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
