-- Migration Step 1: adiciona coluna origem para rastrear source das transações
-- Execute no SQL Editor do Supabase

alter table transactions
  add column if not exists origem text not null default 'manual'
    check (origem in ('ofx', 'manual'));
