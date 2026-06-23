-- Tabela de transações
create table transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount      numeric(12, 2) not null check (amount > 0),
  date        date not null,
  type        text not null check (type in ('receita', 'despesa')),
  category    text not null check (category in (
    'Alimentação','Transporte','Moradia','Lazer','Saúde',
    'Educação','Salário','Freelance','Outros'
  )),
  created_at  timestamptz default now()
);

-- Índices para performance
create index transactions_user_date on transactions (user_id, date desc);

-- Row Level Security
alter table transactions enable row level security;

-- Políticas: usuário acessa apenas as próprias transações
create policy "select own" on transactions
  for select using (auth.uid() = user_id);

create policy "insert own" on transactions
  for insert with check (auth.uid() = user_id);

create policy "update own" on transactions
  for update using (auth.uid() = user_id);

create policy "delete own" on transactions
  for delete using (auth.uid() = user_id);
