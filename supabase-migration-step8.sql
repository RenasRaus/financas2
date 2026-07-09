-- Migration step 8: market_receipts and receipt_items for cupom fiscal OCR
-- Após rodar este SQL, criar o bucket "receipts" no Dashboard Supabase:
--   Storage → New bucket → Name: receipts → Private

CREATE TABLE market_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  imagem_url text,
  total_identificado numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(transaction_id)
);
ALTER TABLE market_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own receipts" ON market_receipts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE receipt_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id uuid REFERENCES market_receipts(id) ON DELETE CASCADE NOT NULL,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL,
  subcategoria text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own receipt items" ON receipt_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM market_receipts mr
      WHERE mr.id = receipt_items.receipt_id AND mr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_receipts mr
      WHERE mr.id = receipt_items.receipt_id AND mr.user_id = auth.uid()
    )
  );
