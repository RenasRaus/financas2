-- Migration Step 2: hash SHA256 para deduplicação de importações OFX
-- Execute no SQL Editor do Supabase

alter table transactions
  add column if not exists hash_dedup text;

-- Índice único parcial: só aplica unicidade quando o hash existe
-- (transações manuais sem hash não conflitam entre si)
create unique index if not exists transactions_hash_dedup_unique
  on transactions (user_id, hash_dedup)
  where hash_dedup is not null;
