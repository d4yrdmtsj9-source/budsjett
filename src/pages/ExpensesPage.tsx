import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { useExpenses } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import { useCategories } from '@/hooks/useCategories'
import { getExpenseTotal } from '@/lib/calc'
import { formatNOK } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Expense } from '@/lib/types'

type SortKey = 'date' | 'amount' | 'description'
type StatusFilter = '' | 'planned' | 'bought'

export function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [showFilters, setShowFilters] = useState(false)

  const { expenses: allExpenses, isLoading } = useExpenses({
    roomId: roomFilter || undefined,
    categoryId: categoryFilter || undefined,
    status: statusFilter === 'planned' ? 'planned' : undefined,
    search,
  })

  const expenses = useMemo(() => {
    if (statusFilter !== 'bought') return allExpenses
    return allExpenses.filter((e) => e.status === 'purchased' || e.status === 'paid')
  }, [allExpenses, statusFilter])

  const { data: rooms } = useRooms()
  const { data: categories } = useCategories()

  const sorted = useMemo(() => {
    const list = [...expenses]
    switch (sortBy) {
      case 'amount':
        return list.sort((a, b) => getExpenseTotal(b) - getExpenseTotal(a))
      case 'description':
        return list.sort((a, b) => a.description.localeCompare(b.description, 'nb'))
      case 'date':
      default:
        return list.sort((a, b) => {
          const da = a.expense_date ?? a.created_at
          const db = b.expense_date ?? b.created_at
          return db.localeCompare(da)
        })
    }
  }, [expenses, sortBy])

  const groups = useMemo(() => {
    const byId = new Map<string, { name: string; expenses: Expense[] }>()
    for (const cat of categories ?? []) {
      byId.set(cat.id, { name: cat.name, expenses: [] })
    }
    const uncategorized: Expense[] = []
    for (const expense of sorted) {
      const group = expense.category_id ? byId.get(expense.category_id) : undefined
      if (group) group.expenses.push(expense)
      else uncategorized.push(expense)
    }
    const listed = [...byId.values()].filter((g) => g.expenses.length > 0)
    listed.sort((a, b) => a.name.localeCompare(b.name, 'nb'))
    if (uncategorized.length > 0) {
      listed.push({ name: 'Uten kategori', expenses: uncategorized })
    }
    return listed
  }, [sorted, categories])

  const statusOptions = [
    { value: '', label: 'Alle' },
    { value: 'planned', label: 'Planlagt' },
    { value: 'bought', label: 'Kjøpt' },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Utgifter</h1>
        <p className="text-sm text-muted">{expenses.length} utgifter</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="search"
          placeholder="Søk utgifter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-12 rounded-xl border border-border bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center',
            showFilters ? 'bg-primary/10 text-primary' : 'hover:bg-black/5',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showFilters && (
        <div className="space-y-3 p-4 rounded-xl bg-white/50 border border-border animate-fade-in">
          <Select
            label="Rom"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            options={[
              { value: '', label: 'Alle rom' },
              ...(rooms ?? []).map((r) => ({ value: r.id, label: r.name })),
            ]}
          />
          <Select
            label="Kategori"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'Alle kategorier' },
              ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={statusOptions}
          />
          <Select
            label="Sorter etter"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            options={[
              { value: 'date', label: 'Dato' },
              { value: 'amount', label: 'Beløp' },
              { value: 'description', label: 'Beskrivelse' },
            ]}
          />
        </div>
      )}

      {groups.length === 0 ? (
        <ExpenseList expenses={[]} emptyMessage="Ingen utgifter funnet" />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const total = group.expenses.reduce((sum, e) => sum + getExpenseTotal(e), 0)
            return (
              <section key={group.name}>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h2 className="font-display font-semibold">{group.name}</h2>
                  <p className="text-sm text-muted shrink-0">
                    {formatNOK(total)}
                    <span className="text-xs"> · {group.expenses.length}</span>
                  </p>
                </div>
                <ExpenseList expenses={group.expenses} showCategory={false} />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
