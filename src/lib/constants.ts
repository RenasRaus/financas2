import { Category } from '@/types'

export const RECEITA_CATEGORIES: Category[] = ['PMSC', 'Outras Receitas']

export const DESPESA_CATEGORIES: Category[] = [
  'Moradia',
  'Financeiro',
  'Mercado',
  'Tecnologia',
  'Saúde',
  'Alimentação Fora',
  'Lazer',
  'Transporte',
  'Despesas Pessoais',
  'Presentes',
  'Educação',
  'Outras Despesas',
]

// Todas as categorias (para filtros que mostram ambos os tipos)
export const CATEGORIES: Category[] = [
  'PMSC',
  'Outras Receitas',
  'Moradia',
  'Financeiro',
  'Mercado',
  'Tecnologia',
  'Saúde',
  'Alimentação Fora',
  'Lazer',
  'Transporte',
  'Despesas Pessoais',
  'Presentes',
  'Educação',
  'Outras Despesas',
]

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  'PMSC': 'Salário da Polícia Militar de Santa Catarina',
  'Outras Receitas': 'Entradas que não se encaixam em outra categoria',
  'Moradia': 'Aluguel, condomínio, energia, internet, manutenção, móveis',
  'Financeiro': 'Empréstimos, juros, tarifas, impostos e encargos',
  'Mercado': 'Supermercado e conveniência',
  'Tecnologia': 'Celulares, assinaturas digitais, IA, softwares, eletrônicos',
  'Saúde': 'Plano de saúde, farmácia, consultas, exames',
  'Alimentação Fora': 'Refeições fora de casa no dia a dia',
  'Lazer': 'Passeios, viagens, restaurantes por lazer, entretenimento',
  'Transporte': 'Combustível, manutenção, seguro, Uber, pedágios',
  'Despesas Pessoais': 'Roupas, academia, estética, cuidados pessoais',
  'Presentes': 'Presentes, lembranças e datas comemorativas',
  'Educação': 'Escola, cursos, livros, treinamentos',
  'Outras Despesas': 'Gastos ocasionais ou sem categoria definida',
}

export const MERCADO_SUBCATEGORIES = [
  'Alimentação Doméstica',
  'Higiene Pessoal',
  'Limpeza Doméstica',
  'Saúde',
  'Lazer',
  'Outros',
] as const

export const CATEGORY_COLORS: Record<Category, string> = {
  'PMSC': '#16a34a',
  'Outras Receitas': '#86efac',
  'Moradia': '#8b5cf6',
  'Financeiro': '#ef4444',
  'Mercado': '#f97316',
  'Tecnologia': '#06b6d4',
  'Saúde': '#10b981',
  'Alimentação Fora': '#f59e0b',
  'Lazer': '#ec4899',
  'Transporte': '#3b82f6',
  'Despesas Pessoais': '#a855f7',
  'Presentes': '#e11d48',
  'Educação': '#0ea5e9',
  'Outras Despesas': '#6b7280',
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
