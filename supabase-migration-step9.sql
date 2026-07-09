-- Migration step 9: split "Higiene e Limpeza" into "Higiene Pessoal" and "Limpeza Doméstica"
-- Itens existentes migram para "Outros" — reprocessar cupons afetados manualmente se necessário
UPDATE receipt_items SET subcategoria = 'Outros' WHERE subcategoria = 'Higiene e Limpeza';
