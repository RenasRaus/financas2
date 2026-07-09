import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Transaction } from '@/types'
import { formatCurrency, formatDate, getDisplayName } from '@/lib/format'
import { CATEGORY_COLORS } from '@/lib/constants'
import Link from 'next/link'

interface Props {
  transactions: Transaction[]
  loading: boolean
}

export function TopExpenses({ transactions, loading }: Props) {
  const top = [...transactions]
    .filter(t => t.type === 'despesa')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Maiores Despesas</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma despesa neste período
          </p>
        ) : (
          <div className="space-y-3">
            {top.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{getDisplayName(t)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0"
                      style={{ borderColor: CATEGORY_COLORS[t.category], color: CATEGORY_COLORS[t.category] }}
                    >
                      {t.category}
                    </Badge>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-rose-600">
                  -{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
