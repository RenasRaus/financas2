export type TransactionType = 'receita' | 'despesa'

export type Category =
  | 'Moradia'
  | 'Financeiro'
  | 'Mercado'
  | 'Tecnologia'
  | 'Saúde'
  | 'Alimentação Fora'
  | 'Lazer'
  | 'Transporte'
  | 'Despesas Pessoais'
  | 'Presentes'
  | 'Educação'
  | 'Outros'

export type Confidence = 'alta' | 'media' | 'baixa'

export type TransactionOrigin = 'manual' | 'ofx'

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  type: TransactionType
  category: Category
  subcategoria: string | null
  confianca: Confidence | null
  needs_review: boolean
  origem: TransactionOrigin
  created_at: string
}

export interface OFXImportResult {
  imported: number
  duplicates: number
  errors: number
}

export interface TransactionFormData {
  description: string
  amount: string
  date: string
  type: TransactionType
  category: Category
}

export interface DashboardSummary {
  totalReceitas: number
  totalDespesas: number
  saldo: number
}

export interface CategoryData {
  name: Category
  value: number
  fill: string
}
