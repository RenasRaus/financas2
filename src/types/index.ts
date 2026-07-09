export type TransactionType = 'receita' | 'despesa'

export type Category =
  | 'PMSC'
  | 'Outras Receitas'
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
  | 'Outras Despesas'

export type Confidence = 'alta' | 'media' | 'baixa'

export type TransactionOrigin = 'manual' | 'ofx'

export interface Transaction {
  id: string
  user_id: string
  description: string
  descricao_amigavel: string | null
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
  ignored: number
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

export interface Budget {
  id: string
  user_id: string
  category: Category
  monthly_limit: number
  accumulated_balance: number
  last_reset_date: string | null
  last_rollover_month: string | null
  created_at: string
  updated_at: string
}

export type ReceiptSubcategory = 'Alimentação Doméstica' | 'Higiene Pessoal' | 'Limpeza Doméstica' | 'Saúde' | 'Lazer' | 'Outros'

export interface ReceiptItem {
  id: string
  receipt_id: string
  descricao: string
  valor: number
  subcategoria: ReceiptSubcategory
}

export interface MarketReceipt {
  id: string
  transaction_id: string
  imagem_url: string | null
  total_identificado: number
  created_at: string
  items: ReceiptItem[]
}
