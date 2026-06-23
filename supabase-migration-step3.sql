-- Migration Step 3: Novas categorias + categorização automática
-- Execute no SQL Editor do Supabase

-- 1. Atualizar valores antigos para novos nomes de categoria
UPDATE transactions SET category = 'Alimentação Fora' WHERE category = 'Alimentação';
UPDATE transactions SET category = 'Outros' WHERE category = 'Salário';
UPDATE transactions SET category = 'Outros' WHERE category = 'Freelance';

-- 2. Remover constraint antiga de categoria
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

-- 3. Adicionar nova constraint com as categorias atualizadas
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN (
    'Moradia', 'Financeiro', 'Mercado', 'Tecnologia', 'Saúde',
    'Alimentação Fora', 'Lazer', 'Transporte', 'Despesas Pessoais',
    'Presentes', 'Educação', 'Outros'
  ));

-- 4. Adicionar coluna de subcategoria (para detalhe futuro via cupom fiscal)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subcategoria text;

-- 5. Adicionar coluna de confiança da categorização automática
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confianca text
  CHECK (confianca IN ('alta', 'media', 'baixa'));

-- 6. Adicionar flag de revisão manual pendente
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;
