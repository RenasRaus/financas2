import { Category, Confidence } from '@/types'

export interface CategorizationResult {
  category: Category
  confidence: Confidence
}

const SUPERMARKET_KEYWORDS = [
  'giassi', 'angeloni', 'bistek', 'fort atacadista', 'combo atacadista',
  'atacadao', 'atacadista', 'assai', 'assaí', 'carrefour',
  'extra hiper', 'pao de acucar', 'pão de açúcar', 'walmart', 'makro',
  'sonda', 'condor', 'zaffari', 'cotrisel', 'nacional', 'pague menos',
  'ultra popular', 'super popular',
]

export function isSupermarket(description: string): boolean {
  const lower = description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return SUPERMARKET_KEYWORDS.some(kw => {
    const kwNorm = kw.normalize('NFD').replace(/[̀-ͯ]/g, '')
    return lower.includes(kwNorm)
  })
}

export async function categorizeTransaction(
  description: string,
  amount: number,
): Promise<CategorizationResult> {
  // Supermercados conhecidos: classificação local sem chamar API
  if (isSupermarket(description)) {
    return { category: 'Mercado', confidence: 'alta' }
  }

  try {
    const res = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount }),
    })

    if (!res.ok) throw new Error('API error')

    const data = await res.json()
    return {
      category: data.category as Category,
      confidence: data.confidence as Confidence,
    }
  } catch {
    // Se a API falhar, retorna Outros com confiança baixa para revisão manual
    return { category: 'Outros', confidence: 'baixa' }
  }
}
