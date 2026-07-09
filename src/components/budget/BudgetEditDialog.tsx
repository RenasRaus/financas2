'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Category } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  currentLimit: number | null
  onSave: (monthlyLimit: number) => Promise<boolean>
}

export function BudgetEditDialog({ open, onOpenChange, category, currentLimit, onSave }: Props) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(currentLimit != null ? String(currentLimit) : '')
    }
  }, [open, currentLimit])

  async function handleSave() {
    const parsed = parseFloat(value.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    const ok = await onSave(parsed)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  const isValid = !isNaN(parseFloat(value.replace(',', '.'))) && parseFloat(value.replace(',', '.')) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {currentLimit != null ? 'Editar limite' : 'Definir limite'}{category ? ` — ${category}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="budget-limit">Limite mensal (R$)</Label>
            <Input
              id="budget-limit"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValid && handleSave()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={saving || !isValid} onClick={handleSave}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
