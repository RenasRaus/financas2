import { Category, Confidence } from '@/types'

export interface CategorizationResult {
  category: Category
  confidence: Confidence
}

// REGRA 0: Transferências entre contas próprias — ignorar completamente na importação
// Aplicar tanto para receitas quanto despesas
const IGNORE_PATTERNS = ['renato raupp', 'eloiza']

export function shouldIgnoreTransaction(description: string): boolean {
  const lower = description.toLowerCase()
  return IGNORE_PATTERNS.some(p => lower.includes(p))
}

const SUPERMARKET_KEYWORDS = [
  'giassi', 'angeloni', 'bistek', 'fort atacadista', 'combo atacadista',
  'atacadao', 'atacadista', 'assai', 'assaí', 'carrefour',
  'extra hiper', 'pao de acucar', 'pão de açúcar', 'walmart', 'makro',
  'sonda', 'condor', 'zaffari', 'cotrisel', 'nacional', 'pague menos',
  'ultra popular', 'super popular',
]

function isSupermarket(description: string): boolean {
  const lower = description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return SUPERMARKET_KEYWORDS.some(kw => {
    const kwNorm = kw.normalize('NFD').replace(/[̀-ͯ]/g, '')
    return lower.includes(kwNorm)
  })
}

// REGRA 1 e 2: Receitas não chamam a API — regras fixas locais
function categorizeIncome(description: string): CategorizationResult {
  const lower = description.toLowerCase()
  if (lower.includes('policia militar') || lower.includes('polícia militar')) {
    return { category: 'PMSC', confidence: 'alta' }
  }
  return { category: 'Outros', confidence: 'alta' }
}

export async function categorizeTransaction(
  description: string,
  amount: number,
  type: 'receita' | 'despesa',
): Promise<CategorizationResult> {
  // Receitas: regras fixas, sem chamada de API, nunca vão para revisão
  if (type === 'receita') {
    return categorizeIncome(description)
  }

  // Despesas: supermercados localmente, demais via Claude API
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
    return { category: 'Outros', confidence: 'baixa' }
  }
}
