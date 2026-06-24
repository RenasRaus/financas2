-- Migration Step 4: Adicionar categoria PMSC para receitas
-- Execute no SQL Editor do Supabase

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN (
    'PMSC',
    'Moradia', 'Financeiro', 'Mercado', 'Tecnologia', 'Saúde',
    'Alimentação Fora', 'Lazer', 'Transporte', 'Despesas Pessoais',
    'Presentes', 'Educação', 'Outros'
  ));
