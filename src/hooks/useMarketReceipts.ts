'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MarketReceipt, Transaction } from '@/types'

export function useMarketReceipts(transactionIds: string[]) {
  const [receipts, setReceipts] = useState<Map<string, MarketReceipt>>(new Map())
  const [loading, setLoading] = useState(false)
  const idsKey = useMemo(() => [...transactionIds].sort().join(','), [transactionIds])
  const prevIdsKeyRef = useRef<string>('')

  const fetchReceipts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setReceipts(new Map())
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: receiptRows } = await supabase
        .from('market_receipts')
        .select('id, transaction_id, imagem_url, total_identificado, created_at')
        .in('transaction_id', ids)

      if (!receiptRows || receiptRows.length === 0) {
        setReceipts(new Map())
        return
      }

      const receiptIds = receiptRows.map(r => r.id)
      const { data: itemRows } = await supabase
        .from('receipt_items')
        .select('id, receipt_id, descricao, valor, subcategoria')
        .in('receipt_id', receiptIds)

      const itemsByReceiptId = new Map<string, typeof itemRows>()
      for (const item of itemRows ?? []) {
        const arr = itemsByReceiptId.get(item.receipt_id) ?? []
        arr.push(item)
        itemsByReceiptId.set(item.receipt_id, arr)
      }

      const map = new Map<string, MarketReceipt>()
      for (const r of receiptRows) {
        map.set(r.transaction_id, {
          id: r.id,
          transaction_id: r.transaction_id,
          imagem_url: r.imagem_url,
          total_identificado: r.total_identificado,
          created_at: r.created_at,
          items: (itemsByReceiptId.get(r.id) ?? []) as MarketReceipt['items'],
        })
      }
      setReceipts(map)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (idsKey === prevIdsKeyRef.current) return
    prevIdsKeyRef.current = idsKey
    void fetchReceipts(transactionIds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, fetchReceipts])

  const attachReceipt = useCallback(async (transactionId: string, file: File): Promise<MarketReceipt | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        // dataUrl = "data:image/jpeg;base64,XXXX..."
        const commaIdx = dataUrl.indexOf(',')
        const base64 = dataUrl.slice(commaIdx + 1)
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/)
        const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

        try {
          const res = await fetch('/api/ocr-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction_id: transactionId, image_base64: base64, mime_type: mimeType }),
          })
          if (!res.ok) {
            resolve(null)
            return
          }
          const data = await res.json() as MarketReceipt
          setReceipts(prev => {
            const next = new Map(prev)
            next.set(transactionId, data)
            return next
          })
          resolve(data)
        } catch {
          resolve(null)
        }
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
  }, [])

  const fetchMercadoWithoutReceipt = useCallback(async (): Promise<Transaction[]> => {
    const supabase = createClient()

    const { data: withReceipt } = await supabase
      .from('market_receipts')
      .select('transaction_id')

    const excludeIds = (withReceipt ?? []).map(r => r.transaction_id)

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('category', 'Mercado')
      .eq('type', 'despesa')
      .order('date', { ascending: false })

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data } = await query
    return (data ?? []) as Transaction[]
  }, [])

  const refetch = useCallback(() => {
    void fetchReceipts(transactionIds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, fetchReceipts])

  return { receipts, loading, attachReceipt, fetchMercadoWithoutReceipt, refetch }
}
