export type TransactionType = 'receita' | 'despesa'

export type Category =
  | 'Alimentação'
  | 'Transporte'
  | 'Moradia'
  | 'Lazer'
  | 'Saúde'
  | 'Educação'
  | 'Salário'
  | 'Freelance'
  | 'Outros'

export type TransactionOrigin = 'manual' | 'ofx'

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  type: TransactionType
  category: Category
  origem: TransactionOrigin
  created_at: string
}

export interface OFXImportResult {
  imported: number
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
