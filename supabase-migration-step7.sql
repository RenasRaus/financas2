-- Migration step 7: Add descricao_amigavel column to transactions
-- Allows users to set a human-readable alias for raw bank descriptions
ALTER TABLE transactions ADD COLUMN descricao_amigavel text null;
