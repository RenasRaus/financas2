# FinançasApp — Setup

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Aguarde o banco inicializar (1-2 min).

## 2. Executar o schema SQL

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo do arquivo `supabase-schema.sql`.

Isso cria a tabela `transactions` com RLS habilitado.

## 3. Configurar variáveis de ambiente

Copie as chaves do projeto no Supabase:
- **Project URL**: Settings > API > Project URL
- **Anon Key**: Settings > API > Project API Keys > anon/public

Edite `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 4. Rodar localmente

```bash
cd financas-app
npm install
npm run dev
```

Acesse http://localhost:3000

## 5. Deploy na Vercel

1. Faça push para um repositório GitHub.
2. Importe o projeto na Vercel.
3. Adicione as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no painel da Vercel.
4. Deploy automático!

## Funcionalidades

- Login/Cadastro com Supabase Auth
- Dashboard com cards de Receita, Despesa e Saldo
- Gráfico de pizza de despesas por categoria
- CRUD completo de transações
- Filtros por mês, ano, tipo e categoria
- Busca por descrição
- Exportar transações em CSV
- Layout responsivo (mobile + desktop)
