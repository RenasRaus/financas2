'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction, Category } from '@/types'
import { CATEGORY_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'

interface Props {
  transactions: Transaction[]
  loading: boolean
}

export function CategoryPieChart({ transactions, loading }: Props) {
  const data = useMemo(() => {
    const totals: Partial<Record<Category, number>> = {}
    transactions
      .filter(t => t.type === 'despesa')
      .forEach(t => {
        totals[t.category] = (totals[t.category] ?? 0) + t.amount
      })
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, fill: CATEGORY_COLORS[name as Category] }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Nenhuma despesa neste período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => typeof value === 'number' ? formatCurrency(value) : ''}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
