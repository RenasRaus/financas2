-- Migration Step 5: Renomear categoria "Outros" por tipo de transação
-- Execute no SQL Editor do Supabase

-- Receitas com "Outros" → "Outras Receitas"
UPDATE transactions SET category = 'Outras Receitas'
  WHERE category = 'Outros' AND type = 'receita';

-- Despesas com "Outros" → "Outras Despesas"
UPDATE transactions SET category = 'Outras Despesas'
  WHERE category = 'Outros' AND type = 'despesa';

-- Atualizar constraint com os novos nomes
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN (
    'PMSC', 'Outras Receitas',
    'Moradia', 'Financeiro', 'Mercado', 'Tecnologia', 'Saúde',
    'Alimentação Fora', 'Lazer', 'Transporte', 'Despesas Pessoais',
    'Presentes', 'Educação', 'Outras Despesas'
  ));
