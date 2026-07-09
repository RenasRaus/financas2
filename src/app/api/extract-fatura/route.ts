import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'

interface FaturaLancamento {
  data: string        // YYYY-MM-DD
  descricao: string
  valor: number
}

interface ClaudeResponse {
  ano_fatura?: number
  lancamentos: FaturaLancamento[]
}

const EXTRACT_PROMPT = `Você está analisando uma fatura de cartão de crédito Ourocard Visa do Banco do Brasil.

Extraia APENAS os lançamentos que são compras e despesas do titular (cobranças).

IGNORAR completamente:
- Linha "SALDO FATURA ANTERIOR"
- Todos os itens na seção "Pagamentos/Créditos" (são entradas, não cobranças)
- Linhas "IOF - COMPRA NO EXTERIOR" (já está embutido no valor da compra)
- Linhas de total, subtotal, encargos e juros

DATAS: infira o ano correto a partir do contexto da fatura (vencimento, período). Se um lançamento é de novembro mas o vencimento é dezembro/2024, a data é 2024-11-DD.

PARCELAMENTO: para lançamentos como "LOJA PARC 03/12 150,00", o valor exibido JÁ É o da parcela — registre como está (150.00). Não divida nem multiplique.

COMPRAS INTERNACIONAIS: use sempre o valor em reais (já convertido).

Responda APENAS com JSON válido, sem texto adicional:
{
  "ano_fatura": 2024,
  "lancamentos": [
    {"data": "YYYY-MM-DD", "descricao": "descrição do lançamento", "valor": 99.90},
    ...
  ]
}`

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
  }

  let body: { pdf_base64?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { pdf_base64 } = body
  if (!pdf_base64) {
    return NextResponse.json({ error: 'Campo obrigatório: pdf_base64' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })
  let claudeResult: ClaudeResponse

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: 'application/pdf' as const,
                data: pdf_base64,
              },
            },
            {
              type: 'text' as const,
              text: EXTRACT_PROMPT,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Sem JSON na resposta')
    claudeResult = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json(
      { error: 'Falha ao extrair lançamentos do PDF. Verifique se é uma fatura Ourocard válida.' },
      { status: 422 },
    )
  }

  if (!claudeResult.lancamentos || !Array.isArray(claudeResult.lancamentos)) {
    return NextResponse.json({ error: 'Formato de resposta inesperado da IA.' }, { status: 422 })
  }

  // Validate and convert to OFXTransaction shape
  const transactions = claudeResult.lancamentos
    .filter(l =>
      l.data &&
      /^\d{4}-\d{2}-\d{2}$/.test(l.data) &&
      l.descricao &&
      typeof l.valor === 'number' &&
      l.valor > 0,
    )
    .map(l => {
      const amount = Number(Math.abs(l.valor).toFixed(2))
      const description = String(l.descricao).trim().slice(0, 500)
      const date = l.data
      const hashInput = `${date}|${amount.toFixed(2)}|${description.toLowerCase().trim()}`
      return {
        date,
        amount,
        description,
        type: 'despesa' as const,
        hash_dedup: sha256(hashInput),
      }
    })

  return NextResponse.json({ transactions })
}
