'use client'

import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Monitor, Moon, Sun, AlertTriangle, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const THEMES = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

// Log de erros de importação — salvo no localStorage pelo hook de transações
const IMPORT_ERRORS_KEY = 'financas_import_errors'

export function logImportError(entry: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(IMPORT_ERRORS_KEY) ?? '[]') as string[]
    const updated = [entry, ...existing].slice(0, 20)
    localStorage.setItem(IMPORT_ERRORS_KEY, JSON.stringify(updated))
  } catch {}
}

export function clearImportErrors() {
  localStorage.removeItem(IMPORT_ERRORS_KEY)
}

function useImportErrors() {
  const [errors, setErrors] = useState<string[]>([])
  useEffect(() => {
    try {
      setErrors(JSON.parse(localStorage.getItem(IMPORT_ERRORS_KEY) ?? '[]'))
    } catch {}
  }, [])
  return errors
}

export function PreferencesDialog({ open, onOpenChange }: Props) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const importErrors = useImportErrors()
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Aparência */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aparência
            </h3>
            <div className="flex gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-colors',
                    theme === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Log de erros */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Log de erros de importação
              </h3>
              {importErrors.length > 0 && (
                <button
                  onClick={() => {
                    clearImportErrors()
                    window.location.reload()
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Limpar
                </button>
              )}
            </div>
            {importErrors.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0" />
                Nenhum erro registrado
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {importErrors.map((e, i) => (
                  <div key={i} className="flex gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <pre className="whitespace-pre-wrap break-all font-mono">{e}</pre>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ferramentas de desenvolvimento */}
          {isDev && (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Desenvolvimento
                </h3>
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Rota</span>
                    <span className="font-medium">{pathname}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ambiente</span>
                    <span className="text-amber-600 font-semibold">development</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Bundler</span>
                    <span>Turbopack</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Framework</span>
                    <span>Next.js 16</span>
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Sobre */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sobre
            </h3>
            <p className="text-xs text-muted-foreground">Finanças Raupps — v1.0</p>
            <p className="text-xs text-muted-foreground">
              App de finanças pessoais com importação OFX e categorização automática.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
