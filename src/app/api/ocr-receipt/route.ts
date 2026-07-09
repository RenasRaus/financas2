import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type ValidMime = typeof VALID_MIME_TYPES[number]

const VALID_SUBCATEGORIES = ['Alimentação Doméstica', 'Higiene Pessoal', 'Limpeza Doméstica', 'Saúde', 'Lazer', 'Outros'] as const

const OCR_PROMPT = `Você é um assistente de análise de cupons fiscais brasileiros. Analise a imagem do cupom fiscal e extraia todos os itens comprados.

Para cada item, identifique:
- descricao: nome do produto (simplificado, legível)
- valor: valor total do item (quantity × unit price), como número
- subcategoria: uma das categorias abaixo

Categorias disponíveis:
- Alimentação Doméstica: alimentos, bebidas, temperos, laticínios, carnes, grãos, massas, snacks, água, sucos, iogurte, queijo
- Higiene Pessoal: shampoo, condicionador, sabonete, desodorante, absorvente, gilete, creme dental, escova de dentes, fio dental, creme para cabelo, produtos de beleza pessoal
- Limpeza Doméstica: sabão em pó, sabão líquido, detergente, desinfetante, amaciante, água sanitária, papel higiênico, papel toalha, esponja, pano de chão, multiuso, cera, removedor
- Saúde: medicamentos, vitaminas, suplementos, itens de primeiros socorros, termômetro, band-aid
- Lazer: bebidas alcoólicas (cerveja, vinho, destilados), petiscos para festa, salgadinhos, refrigerante em festa, revistas, itens de entretenimento
- Outros: qualquer item que não se encaixe nas categorias acima

Responda APENAS com JSON válido, sem texto adicional:
{
  "items": [
    {"descricao": "...", "valor": 0.00, "subcategoria": "..."},
    ...
  ],
  "total_identificado": 0.00
}

O total_identificado deve ser a soma de todos os itens extraídos (ou o total impresso no cupom se estiver legível).
Se não conseguir ler algum item, ignore-o. Foque nos itens legíveis.`

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mime] ?? 'jpg'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
  }

  let body: { transaction_id?: string; image_base64?: string; mime_type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { transaction_id, image_base64, mime_type } = body

  if (!transaction_id || !image_base64 || !mime_type) {
    return NextResponse.json({ error: 'Campos obrigatórios: transaction_id, image_base64, mime_type' }, { status: 400 })
  }

  if (!VALID_MIME_TYPES.includes(mime_type as ValidMime)) {
    return NextResponse.json({ error: 'Tipo de imagem não suportado. Use JPEG, PNG ou WebP.' }, { status: 400 })
  }

  // Confirm transaction belongs to user and is Mercado category
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('id, category')
    .eq('id', transaction_id)
    .eq('user_id', user.id)
    .single()

  if (txError || !transaction) {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  // Call Claude Vision
  const client = new Anthropic({ apiKey })
  let ocrResult: { items: { descricao: string; valor: number; subcategoria: string }[]; total_identificado: number }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mime_type as ValidMime,
                data: image_base64,
              },
            },
            {
              type: 'text',
              text: OCR_PROMPT,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Sem JSON na resposta')
    ocrResult = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Falha ao processar o cupom via IA. Tente novamente.' }, { status: 422 })
  }

  if (!ocrResult.items || !Array.isArray(ocrResult.items) || ocrResult.items.length === 0) {
    return NextResponse.json({ error: 'Não foi possível extrair itens do cupom. Verifique a qualidade da imagem.' }, { status: 422 })
  }

  // Validate and clean items
  const validItems = ocrResult.items
    .filter(item =>
      item.descricao &&
      typeof item.valor === 'number' &&
      item.valor > 0 &&
      VALID_SUBCATEGORIES.includes(item.subcategoria as typeof VALID_SUBCATEGORIES[number])
    )
    .map(item => ({
      descricao: String(item.descricao).slice(0, 255),
      valor: Number(item.valor.toFixed(2)),
      subcategoria: item.subcategoria as typeof VALID_SUBCATEGORIES[number],
    }))

  if (validItems.length === 0) {
    return NextResponse.json({ error: 'Itens do cupom com dados inválidos. Verifique a qualidade da imagem.' }, { status: 422 })
  }

  const totalIdentificado = typeof ocrResult.total_identificado === 'number' && ocrResult.total_identificado > 0
    ? Number(ocrResult.total_identificado.toFixed(2))
    : validItems.reduce((sum, i) => sum + i.valor, 0)

  // Try to upload image to Storage (non-blocking)
  let imagem_url: string | null = null
  try {
    const ext = mimeToExt(mime_type)
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const imageBuffer = Buffer.from(image_base64, 'base64')
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, imageBuffer, { contentType: mime_type, upsert: false })
    if (!uploadError) {
      imagem_url = path
    }
  } catch {
    // Storage not available — continue without image
  }

  // Delete existing receipt for this transaction (substitution flow)
  await supabase
    .from('market_receipts')
    .delete()
    .eq('transaction_id', transaction_id)
    .eq('user_id', user.id)

  // Insert new receipt
  const { data: receipt, error: receiptError } = await supabase
    .from('market_receipts')
    .insert({
      user_id: user.id,
      transaction_id,
      imagem_url,
      total_identificado: totalIdentificado,
    })
    .select('id, transaction_id, imagem_url, total_identificado, created_at')
    .single()

  if (receiptError || !receipt) {
    return NextResponse.json({ error: 'Erro ao salvar o recibo no banco de dados.' }, { status: 500 })
  }

  // Insert items
  const itemsToInsert = validItems.map(item => ({
    receipt_id: receipt.id,
    descricao: item.descricao,
    valor: item.valor,
    subcategoria: item.subcategoria,
  }))

  const { data: items, error: itemsError } = await supabase
    .from('receipt_items')
    .insert(itemsToInsert)
    .select('id, receipt_id, descricao, valor, subcategoria')

  if (itemsError || !items) {
    return NextResponse.json({ error: 'Erro ao salvar os itens do recibo.' }, { status: 500 })
  }

  return NextResponse.json({
    ...receipt,
    items,
  })
}
