'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category, OFXImportResult, Transaction, TransactionFormData } from '@/types'
import { OFXTransaction } from '@/lib/ofx-parser'
import { categorizeTransaction, shouldIgnoreTransaction } from '@/lib/categorization'
import { logImportError } from '@/components/preferences/PreferencesDialog'
import { toast } from 'sonner'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingReviewCount, setPendingReviewCount] = useState(0)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar transações')
    } else {
      setTransactions(data ?? [])
      setPendingReviewCount((data ?? []).filter(t => t.needs_review).length)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  async function createTransaction(data: TransactionFormData): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      description: data.description,
      amount: parseFloat(data.amount),
      date: data.date,
      type: data.type,
      category: data.category,
      origem: 'manual',
      confianca: 'alta',
      needs_review: false,
    })

    if (error) {
      toast.error('Erro ao criar transação')
      return false
    }
    toast.success('Transação criada!')
    await fetchTransactions()
    return true
  }

  async function updateTransaction(id: string, data: TransactionFormData): Promise<boolean> {
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({
        description: data.description,
        amount: parseFloat(data.amount),
        date: data.date,
        type: data.type,
        category: data.category,
        needs_review: false,
        confianca: 'alta',
      })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao atualizar transação')
      return false
    }
    toast.success('Transação atualizada!')
    await fetchTransactions()
    return true
  }

  async function updateFriendlyDescription(id: string, value: string | null): Promise<boolean> {
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ descricao_amigavel: value })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao salvar descrição')
      return false
    }
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, descricao_amigavel: value } : t)),
    )
    return true
  }

  async function deleteTransaction(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir transação')
    } else {
      toast.success('Transação excluída!')
      setTransactions(prev => prev.filter(t => t.id !== id))
      setPendingReviewCount(prev => Math.max(0, prev - 1))
    }
  }

  async function approveReview(id: string, category: Category): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ category, needs_review: false, confianca: 'alta' })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao salvar categoria')
    } else {
      toast.success('Categoria confirmada!')
      await fetchTransactions()
    }
  }

  async function previewOFXImport(
    ofxList: OFXTransaction[],
  ): Promise<{ newCount: number; duplicateCount: number; ignoredCount: number }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { newCount: 0, duplicateCount: 0, ignoredCount: ofxList.length }

    const afterIgnore = ofxList.filter(t => !shouldIgnoreTransaction(t.description))
    const ignored = ofxList.length - afterIgnore.length

    const { data: existingRows } = await supabase
      .from('transactions')
      .select('hash_dedup, date, amount, description')
      .eq('user_id', user.id)

    const existingHashes = new Set<string>()
    const existingFingerprints = new Set<string>()
    for (const row of existingRows ?? []) {
      if (row.hash_dedup) existingHashes.add(row.hash_dedup)
      const fp = `${row.date}|${Number(row.amount).toFixed(2)}|${String(row.description).toLowerCase().trim()}`
      existingFingerprints.add(fp)
    }

    const seenInFile = new Set<string>()
    let newCount = 0
    let duplicateCount = 0
    for (const t of afterIgnore) {
      const fp = `${t.date}|${t.amount.toFixed(2)}|${t.description.toLowerCase().trim()}`
      if (existingHashes.has(t.hash_dedup) || existingFingerprints.has(fp) || seenInFile.has(t.hash_dedup)) {
        duplicateCount++
      } else {
        seenInFile.add(t.hash_dedup)
        newCount++
      }
    }

    return { newCount, duplicateCount, ignoredCount: ignored }
  }

  async function importOFXTransactions(
    ofxList: OFXTransaction[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<OFXImportResult> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { imported: 0, duplicates: 0, ignored: 0, errors: ofxList.length }

    // REGRA 0: Filtrar transferências entre contas próprias antes de qualquer processamento
    const afterIgnore = ofxList.filter(t => !shouldIgnoreTransaction(t.description))
    const ignored = ofxList.length - afterIgnore.length

    // Deduplicação: hash + fingerprint de conteúdo (para rows pré-migration sem hash)
    const { data: existingRows, error: fetchError } = await supabase
      .from('transactions')
      .select('hash_dedup, date, amount, description')
      .eq('user_id', user.id)

    if (fetchError) return { imported: 0, duplicates: 0, ignored, errors: afterIgnore.length }

    const existingHashes = new Set<string>()
    const existingFingerprints = new Set<string>()

    for (const row of existingRows ?? []) {
      if (row.hash_dedup) existingHashes.add(row.hash_dedup)
      const fp = `${row.date}|${Number(row.amount).toFixed(2)}|${String(row.description).toLowerCase().trim()}`
      existingFingerprints.add(fp)
    }

    // Deduplica contra o banco E contra o próprio arquivo (ex: UNIMED aparece 2x no OFX)
    const seenHashesInFile = new Set<string>()
    const toInsert = afterIgnore.filter(t => {
      if (existingHashes.has(t.hash_dedup)) return false
      const fp = `${t.date}|${t.amount.toFixed(2)}|${t.description.toLowerCase().trim()}`
      if (existingFingerprints.has(fp)) return false
      if (seenHashesInFile.has(t.hash_dedup)) return false
      seenHashesInFile.add(t.hash_dedup)
      return true
    })
    const duplicates = afterIgnore.length - toInsert.length

    let imported = 0
    let errors = 0

    for (let i = 0; i < toInsert.length; i++) {
      const t = toInsert[i]
      onProgress?.(i, toInsert.length)

      // Categorização: receitas por regras fixas (sem API), despesas via Claude API
      const { category, confidence } = await categorizeTransaction(t.description, t.amount, t.type)
      const needsReview = confidence === 'baixa'

      const payload = {
        user_id: user.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        type: t.type,
        category,
        confianca: confidence,
        needs_review: needsReview,
        origem: 'ofx',
        hash_dedup: t.hash_dedup,
      }

      const { error } = await supabase.from('transactions').insert(payload)

      if (error) {
        const entry =
          `[${new Date().toLocaleString('pt-BR')}] ${t.description}\n` +
          `  ${t.date} | R$ ${t.amount} | ${t.type} | ${category}\n` +
          `  code: ${error.code} — ${error.message}`
        console.error('[OFX Import] Erro ao inserir transação:\n' + entry)
        logImportError(entry)
        errors++
      } else {
        imported++
      }
    }

    onProgress?.(toInsert.length, toInsert.length)

    if (imported > 0) await fetchTransactions()
    return { imported, duplicates, ignored, errors }
  }

  return {
    transactions,
    loading,
    pendingReviewCount,
    createTransaction,
    updateTransaction,
    updateFriendlyDescription,
    deleteTransaction,
    approveReview,
    previewOFXImport,
    importOFXTransactions,
    refetch: fetchTransactions,
  }
}
