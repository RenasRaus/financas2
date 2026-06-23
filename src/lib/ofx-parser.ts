export interface OFXTransaction {
  date: string        // YYYY-MM-DD
  amount: number      // sempre positivo
  description: string // texto original do banco
  type: 'receita' | 'despesa'
  hash_dedup: string  // SHA256 de "date|amount|description"
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
  const digits = raw.replace(/\D.*$/, '').trim()
  if (digits.length < 8) return null

  const year = parseInt(digits.slice(0, 4))
  const month = parseInt(digits.slice(4, 6))
  const day = parseInt(digits.slice(6, 8))

  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function extractTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<\n\r]+)`, 'i')
  const match = block.match(regex)
  return match ? match[1].trim() : null
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function parseOFXText(text: string): Promise<OFXTransaction[]> {
  const results: OFXTransaction[] = []

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

    const amount = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(amount) || amount === 0) continue

    const description = (memo || name || '').trim()
    if (!description) continue

    const descLower = description.toLowerCase()
    if (SKIP_DESCRIPTIONS.some(s => descLower.includes(s))) continue

    const isIncome = trnType?.toUpperCase() === 'CREDIT' || amount > 0
    const absAmount = Math.abs(amount)

    // Hash determinístico: mesma transação sempre produz o mesmo hash
    const hashInput = `${date}|${absAmount.toFixed(2)}|${description.toLowerCase().trim()}`
    const hash_dedup = await sha256(hashInput)

    results.push({
      date,
      amount: absAmount,
      description,
      type: isIncome ? 'receita' : 'despesa',
      hash_dedup,
    })
  }

  return results
}

/** Lê um File .ofx, faz o parse e gera os hashes SHA256 de cada transação. */
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
