import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES, MONTHS } from '@/lib/constants'
import { getCurrentYear } from '@/lib/format'
import { Search } from 'lucide-react'

const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - i)

interface Props {
  month: number; setMonth: (v: number) => void
  year: number; setYear: (v: number) => void
  category: string; setCategory: (v: string) => void
  type: string; setType: (v: string) => void
  search: string; setSearch: (v: string) => void
}

export function TransactionFilters({ month, setMonth, year, setYear, category, setCategory, type, setType, search, setSearch }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar descrição..."
          className="pl-8 w-48"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Select value={String(month)} onValueChange={v => { if (v != null) setMonth(Number(v)) }}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(year)} onValueChange={v => { if (v != null) setYear(Number(v)) }}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={type} onValueChange={v => { if (v != null) setType(v) }}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          <SelectItem value="receita">Receitas</SelectItem>
          <SelectItem value="despesa">Despesas</SelectItem>
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={v => { if (v != null) setCategory(v) }}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {CATEGORIES.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
