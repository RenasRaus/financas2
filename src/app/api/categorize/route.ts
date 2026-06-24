import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const CATEGORIES_PROMPT = `Você é um assistente de finanças pessoais brasileiro. Categorize a transação bancária abaixo em UMA das categorias:

- Moradia: aluguel, condomínio, energia elétrica, gás, água, internet, manutenção, móveis e melhorias
- Financeiro: empréstimos, financiamentos, juros, tarifas bancárias, impostos, multas e encargos
- Mercado: supermercado e conveniência
- Tecnologia: celulares, assinaturas digitais (Netflix, Spotify, Adobe, AWS), IA, softwares, eletrônicos e acessórios
- Saúde: plano de saúde, farmácia, consultas médicas, exames e tratamentos
- Alimentação Fora: lanchonetes, padarias, restaurantes fast food, iFood, refeições do trabalho
- Lazer: restaurantes por lazer, bares, cinema, teatro, viagens, passeios e hobbies
- Transporte: combustível, manutenção de veículo, seguro auto, licenciamento, estacionamento, Uber, 99, pedágios
- Despesas Pessoais: roupas, calçados, academia, estética, salão, acessórios e cuidados pessoais
- Presentes: presentes, flores, lembranças, contribuições para festas e datas comemorativas
- Educação: escola, faculdade, cursos, livros, treinamentos e materiais de estudo
- Outras Despesas: gastos ocasionais, não recorrentes ou que não se encaixam nas categorias acima

Responda APENAS com JSON válido, sem texto adicional:
{"category": "<nome exato da categoria>", "confidence": "<alta|media|baixa>"}

Confiança:
- alta: categoria evidente pela descrição
- media: provável mas a descrição é genérica
- baixa: descrição ambígua ou insuficiente para determinar`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { category: 'Outras Despesas', confidence: 'baixa' },
      { status: 200 },
    )
  }

  try {
    const { description, amount } = await req.json()

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: `${CATEGORIES_PROMPT}\n\nTransação:\nDescrição: ${description}\nValor: R$ ${Number(amount).toFixed(2)}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const result = JSON.parse(jsonMatch[0])

    const validCategories = [
      'Moradia', 'Financeiro', 'Mercado', 'Tecnologia', 'Saúde',
      'Alimentação Fora', 'Lazer', 'Transporte', 'Despesas Pessoais',
      'Presentes', 'Educação', 'Outras Despesas',
    ]
    const validConfidences = ['alta', 'media', 'baixa']

    if (!validCategories.includes(result.category) || !validConfidences.includes(result.confidence)) {
      throw new Error('Invalid response values')
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ category: 'Outras Despesas', confidence: 'baixa' })
  }
}
