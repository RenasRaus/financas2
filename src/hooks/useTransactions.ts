'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OFXImportResult, Transaction, TransactionFormData } from '@/types'
import { OFXTransaction } from '@/lib/ofx-parser'
import { toast } from 'sonner'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

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

  async function deleteTransaction(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir transação')
    } else {
      toast.success('Transação excluída!')
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  async function importOFXTransactions(ofxList: OFXTransaction[]): Promise<OFXImportResult> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { imported: 0, duplicates: 0, errors: ofxList.length }

    // Busca todos os hashes já existentes do usuário em uma única query
    const { data: existingRows } = await supabase
      .from('transactions')
      .select('hash_dedup')
      .eq('user_id', user.id)
      .not('hash_dedup', 'is', null)

    const existingHashes = new Set(existingRows?.map(r => r.hash_dedup) ?? [])

    // Separa novas x duplicatas
    const toInsert = ofxList.filter(t => !existingHashes.has(t.hash_dedup))
    const duplicates = ofxList.length - toInsert.length

    let imported = 0
    let errors = 0

    for (const t of toInsert) {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        type: t.type,
        category: t.type === 'receita' ? 'Salário' : 'Outros',
        origem: 'ofx',
        hash_dedup: t.hash_dedup,
      })
      if (error) { errors++ } else { imported++ }
    }

    if (imported > 0) await fetchTransactions()
    return { imported, duplicates, errors }
  }

  return { transactions, loading, createTransaction, updateTransaction, deleteTransaction, importOFXTransactions, refetch: fetchTransactions }
}
