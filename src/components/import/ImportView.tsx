'use client'

import { useRef, useState } from 'react'
import { readOFXFile, OFXTransaction } from '@/lib/ofx-parser'
import { useTransactions } from '@/hooks/useTransactions'
import { OFXImportResult } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ClipboardCheck } from 'lucide-react'
import { ReceiptUploadSection } from '@/components/import/ReceiptUploadSection'
import { FaturaUploadSection } from '@/components/import/FaturaUploadSection'

export function ImportView() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<OFXTransaction[]>([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<OFXImportResult | null>(null)
  const [dedup, setDedup] = useState<{ newCount: number; duplicateCount: number; ignoredCount: number } | null>(null)
  const { importOFXTransactions, previewOFXImport } = useTransactions()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    setResult(null)
    setParsed([])
    setFileName(file.name)

    try {
      const transactions = await readOFXFile(file)
      if (transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo. Verifique se é um OFX válido.')
      } else {
        setParsed(transactions)
        const preview = await previewOFXImport(transactions)
        setDedup(preview)
        toast.success(`${transactions.length} transações lidas`)
      }
    } catch {
      toast.error('Erro ao ler o arquivo OFX')
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (parsed.length === 0) return
    setImporting(true)
    setProgress({ done: 0, total: parsed.length })

    const res = await importOFXTransactions(parsed, (done, total) => {
      setProgress({ done, total })
    })

    setResult(res)
    setParsed([])
    setFileName('')
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''

    if (res.imported > 0) {
      toast.success(`${res.imported} transações importadas com sucesso!`)
    }
    if (res.duplicates > 0) {
      toast.info(`${res.duplicates} duplicata${res.duplicates !== 1 ? 's' : ''} ignorada${res.duplicates !== 1 ? 's' : ''}`)
    }
    if (res.ignored > 0) {
      toast.info(`${res.ignored} transferência${res.ignored !== 1 ? 's' : ''} entre contas próprias ignorada${res.ignored !== 1 ? 's' : ''}`)
    }
    if (res.errors > 0) {
      toast.error(`${res.errors} transações não puderam ser importadas`)
    }
    setImporting(false)
  }

  function handleReset() {
    setParsed([])
    setFileName('')
    setResult(null)
    setProgress(null)
    setDedup(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const receitas = parsed.filter(t => t.type === 'receita')
  const despesas = parsed.filter(t => t.type === 'despesa')

  const progressPct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar arquivo</h1>
        <p className="text-sm text-muted-foreground">
          Importe arquivos .ofx exportados do seu banco (Banco do Brasil e outros)
        </p>
      </div>

      {/* Upload zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecionar arquivo</CardTitle>
          <CardDescription>Formatos suportados: .ofx — ISO-8859-1 e UTF-8</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
              'hover:border-primary/50 hover:bg-muted/30'
            )}
            onClick={() => fileRef.current?.click()}
          >
            {parsing ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <Upload className="size-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-sm">
                {parsing ? 'Lendo arquivo...' : 'Clique para selecionar ou arraste o arquivo'}
              </p>
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <FileText className="size-3" /> {fileName}
                </p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".ofx,.OFX"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Progresso de categorização */}
      {importing && progress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {progress.done < progress.total
                      ? `Categorizando transação ${progress.done + 1} de ${progress.total}...`
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
          </CardContent>
        </Card>
      )}

      {/* Resultado da importação */}
      {result && !importing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {result.errors === 0 ? (
                <CheckCircle2 className="size-8 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="size-8 text-amber-500 shrink-0" />
              )}
              <div>
                <p className="font-semibold">Importação concluída</p>
                <p className="text-sm text-muted-foreground">
                  {result.imported} importada{result.imported !== 1 ? 's' : ''}
                  {result.duplicates > 0 && ` · ${result.duplicates} duplicata${result.duplicates !== 1 ? 's' : ''} ignorada${result.duplicates !== 1 ? 's' : ''}`}
                  {result.ignored > 0 && ` · ${result.ignored} transferência${result.ignored !== 1 ? 's' : ''} própria${result.ignored !== 1 ? 's' : ''} ignorada${result.ignored !== 1 ? 's' : ''}`}
                  {result.errors > 0 && ` · ${result.errors} com erro`}
                </p>
                {result.imported > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ClipboardCheck className="size-3" />
                    Verifique a fila de Revisão para transações com baixa confiança
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={handleReset}>
                Nova importação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ReceiptUploadSection />

      <FaturaUploadSection />

      {/* Preview das transações parseadas */}
      {parsed.length > 0 && !importing && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {parsed.length} transações encontradas
              </CardTitle>
              <CardDescription className="mt-1 flex gap-3 flex-wrap">
                <span className="text-emerald-600 font-medium">{receitas.length} receitas</span>
                <span className="text-rose-600 font-medium">{despesas.length} despesas</span>
                {dedup && (
                  <>
                    <span className="text-primary font-medium">
                      {dedup.newCount} nova{dedup.newCount !== 1 ? 's' : ''} (vai categorizar via IA)
                    </span>
                    {dedup.duplicateCount > 0 && (
                      <span className="text-muted-foreground">
                        {dedup.duplicateCount} já existente{dedup.duplicateCount !== 1 ? 's' : ''} (ignorar)
                      </span>
                    )}
                    {dedup.ignoredCount > 0 && (
                      <span className="text-muted-foreground">
                        {dedup.ignoredCount} transferência{dedup.ignoredCount !== 1 ? 's' : ''} própria{dedup.ignoredCount !== 1 ? 's' : ''} (ignorar)
                      </span>
                    )}
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing} className="gap-2">
                {importing && <Loader2 className="size-4 animate-spin" />}
                {importing
                  ? 'Importando...'
                  : dedup
                    ? dedup.newCount === 0
                      ? 'Nada a importar'
                      : `Importar ${dedup.newCount} nova${dedup.newCount !== 1 ? 's' : ''}`
                    : `Importar ${parsed.length} transações`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell className="max-w-64 truncate">{t.description}</TableCell>
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
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {t.type === 'receita' ? '+' : '-'}{formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
