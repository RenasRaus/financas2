import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { CATEGORY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  transactions: Transaction[]
  loading: boolean
}

export function RecentTransactions({ transactions, loading }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Últimas Transações</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma transação neste período
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
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
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold',
                    t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {t.type === 'receita' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
