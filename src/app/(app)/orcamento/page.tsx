import { BudgetView } from '@/components/budget/BudgetView'

export default function OrcamentoPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orçamento</h1>
        <p className="text-sm text-muted-foreground">
          Limites mensais com rollover automático — o saldo não usado acumula para o mês seguinte
        </p>
      </div>
      <BudgetView />
    </div>
  )
}
