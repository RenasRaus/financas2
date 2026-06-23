export interface OFXTransaction {
  date: string        // YYYY-MM-DD
  amount: number      // sempre positivo
  description: string // texto original do banco
  type: 'receita' | 'despesa'
}

// Descrições que os bancos inserem como informativas (não são transações reais)
const SKIP_DESCRIPTIONS = [
  'saldo do dia',
  'saldo anterior',
  'saldo disponivel',
  'saldo disponível',
  'saldo em',
]

function parseOFXDate(raw: string): string | null {
  // Formatos comuns: 20231201, 20231201120000, 20231201120000[-03:00]
  const digits = raw.replace(/\D.*$/, '').trim() // pega só os dígitos iniciais
  if (digits.length < 8) return null

  const year = parseInt(digits.slice(0, 4))
  const month = parseInt(digits.slice(4, 6))
  const day = parseInt(digits.slice(6, 8))

  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function extractTag(block: string, tag: string): string | null {
  // Suporte a OFX SGML (sem closing tags nos leaf elements)
  const regex = new RegExp(`<${tag}>([^<\n\r]+)`, 'i')
  const match = block.match(regex)
  return match ? match[1].trim() : null
}

function parseOFXText(text: string): OFXTransaction[] {
  const results: OFXTransaction[] = []

  // Tenta encontrar blocos <STMTTRN>...</STMTTRN>
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  const blocks = [...text.matchAll(blockRegex)]

  for (const match of blocks) {
    const block = match[1]

    const dtPosted = extractTag(block, 'DTPOSTED')
    const trnAmt = extractTag(block, 'TRNAMT')
    const memo = extractTag(block, 'MEMO')
    const name = extractTag(block, 'NAME')
    const trnType = extractTag(block, 'TRNTYPE')

    if (!dtPosted || !trnAmt) continue

    const date = parseOFXDate(dtPosted)
    if (!date) continue

    // BB usa vírgula como separador decimal em alguns extratos
    const amount = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(amount) || amount === 0) continue

    const description = (memo || name || '').trim()
    if (!description) continue

    // Ignora linhas de saldo
    const descLower = description.toLowerCase()
    if (SKIP_DESCRIPTIONS.some(s => descLower.includes(s))) continue

    const isIncome = trnType?.toUpperCase() === 'CREDIT' || amount > 0

    results.push({
      date,
      amount: Math.abs(amount),
      description,
      type: isIncome ? 'receita' : 'despesa',
    })
  }

  return results
}

/** Lê um File .ofx e retorna as transações parseadas. */
export async function readOFXFile(file: File): Promise<OFXTransaction[]> {
  const buffer = await file.arrayBuffer()

  // Banco do Brasil exporta em ISO-8859-1
  let text: string
  try {
    text = new TextDecoder('iso-8859-1').decode(buffer)
  } catch {
    text = new TextDecoder('utf-8').decode(buffer)
  }

  return parseOFXText(text)
}
