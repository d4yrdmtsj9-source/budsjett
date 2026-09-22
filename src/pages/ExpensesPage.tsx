import { FinancialOverview } from '@/components/budget/FinancialOverview'
import { useProject } from '@/hooks/useProject'
import { paymentDueRows } from '@/lib/workflow'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Download, CalendarDays } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import { useCategories } from '@/hooks/useCategories'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import {
  financials,
  included,
  isPlanned,
  knownPrice,
  outstanding,
  paidAmount,
  pendingRefund,
  roomPortion,
  settlement,
} from '@/lib/finance'
import { formatNOK } from '@/lib/format'
import { exportCSV } from '@/lib/export'
const tabs = [
  { key: 'all', label: 'Alle' },
  { key: 'planned', label: 'Planlagt' },
  { key: 'ordered', label: 'Bestilt' },
  { key: 'bought', label: 'Kjøpt' },
  { key: 'paid', label: 'Betalt' },
  { key: 'delivery', label: 'Leveranser' },
  { key: 'refund', label: 'Refusjoner' },
  { key: 'due', label: 'Betalinger' },
  { key: 'alternatives', label: 'Alternativer' },
  { key: 'missing', label: 'Uten pris' },
]
export function ExpensesPage() {
  const [params, setParams] = useSearchParams()
  const filter = params.get('filter') ?? 'all'
  const [search, setSearch] = useState('')
  const room = params.get('rom') ?? ''
  const setRoom = (value: string) => setParams({ filter, ...(value ? { rom: value } : {}) })
  const { project, members } = useProject()
  const { expenses: allExpenses } = useExpenses()
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('recent')
  const { expenses } = useExpenses({
    search,
    roomId: room || undefined,
    categoryId: category || undefined,
  })
  const { data: rooms } = useRooms()
  const { data: categories } = useCategories()
  const { openNew } = useExpenseSheet()
  const shown = expenses
    .filter(
      (e) =>
        filter === 'all' ||
        (filter === 'paid' && included(e) && paidAmount(e) > 0) ||
        (filter === 'refund' && included(e) && pendingRefund(e) > 0) ||
        (filter === 'delivery' && included(e) && !isPlanned(e) && e.delivery_status !== 'received' && e.delivery_status !== 'not_required') ||
        (filter === 'planned' && included(e) && isPlanned(e)) ||
        (filter === 'ordered' && included(e) && e.status === 'ordered') ||
        (filter === 'bought' &&
          included(e) &&
          (e.status === 'purchased' || e.status === 'paid')) ||
        (filter === 'alternatives' && e.budget_included === false) ||
        (filter === 'missing' && included(e) && !knownPrice(e)) ||
        (filter === 'due' &&
          included(e) &&
          !isPlanned(e) &&
          outstanding(e) > 0),
    )
    .sort((a, b) =>
      sort === 'amount'
        ? b.total - a.total
        : sort === 'name'
          ? a.description.localeCompare(b.description, 'nb')
          : b.updated_at.localeCompare(a.updated_at),
    )
  const f = financials(room ? shown.flatMap(e => { const part = roomPortion(e, room); return part ? [part] : [] }) : shown)
  const months = new Map<string, number>()
  if (filter === 'due')
    for (const e of shown) {
      const scoped = room ? roomPortion(e, room) : e
      if (!scoped) continue
      for (const row of paymentDueRows(scoped)) {
        const month = row.date?.slice(0, 7) || 'Uten dato'
        months.set(month, (months.get(month) ?? 0) + row.amount)
      }
    }
  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <h1>Økonomi</h1>
        </div>
        <Button onClick={() => openNew()}>
          <Plus size={17} />
          Ny post
        </Button>
      </header>
      <FinancialOverview expenses={allExpenses} budget={project?.total_budget ?? 0} reserve={project?.reserve_amount} />
      <div className="purchase-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Søk i poster"
            placeholder="Søk etter kjøp, butikk eller notat …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Romfilter"
          value={room}
          options={[
            { value: '', label: 'Alle rom' },
            ...(rooms ?? []).map((r) => ({ value: r.id, label: r.name })),
          ]}
          onChange={(e) => setRoom(e.target.value)}
        />
        <Select
          label="Kategori"
          value={category}
          options={[
            { value: '', label: 'Alle kategorier' },
            ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Select
          label="Sortering"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={[
            { value: 'recent', label: 'Sist endret' },
            { value: 'amount', label: 'Høyeste beløp' },
            { value: 'name', label: 'Navn A–Å' },
          ]}
        />
      </div>
      <Select label="Vis poster" value={filter} options={tabs.map(t => ({ value: t.key, label: t.label }))} onChange={e => setParams({filter: e.target.value, ...(room ? {rom: room} : {})})} />
      {filter === 'due' && (
        <div className="payment-months">
          {[...months.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => (
              <div key={month}>
                <CalendarDays size={20} />
                <span>
                  {month === 'Uten dato'
                    ? month
                    : new Date(`${month}-01T12:00:00`).toLocaleDateString(
                        'nb-NO',
                        { month: 'long', year: 'numeric' },
                      )}
                </span>
                <strong>{formatNOK(amount)}</strong>
              </div>
            ))}
          <p className="text-xs text-muted">
            Betalinger fordeles mot tidligste forfall. Rest uten betalingsplan vises uten dato.
          </p>
        </div>
      )}
      <div className="list-summary">
        <p>
          <strong>{shown.length}</strong> poster <span>·</span>{' '}
          {filter === 'paid' ? `${formatNOK(f.paid)} betalt netto` : filter === 'refund' ? `${formatNOK(f.refund)} til gode` : filter === 'due'
            ? `${formatNOK(f.ordered)} gjenstår`
            : `${formatNOK(f.projected)} med i budsjettet`}
        </p>
        <button className="text-link" onClick={() => exportCSV(shown)}>
          <Download size={15} />
          Excel / CSV
        </button>
      </div>
      {!!room && <p className="text-xs text-muted">Summen viser rommets andel. Hver post viser hele kjøpet.</p>}
      <ExpenseList
        expenses={shown}
        emptyMessage={
          expenses.length
            ? 'Ingen poster passer filteret. Prøv et annet søk.'
            : 'Ingen poster ennå. Legg til den første planen eller kjøpet ditt.'
        }
      />
      {members.length === 2 && <details className="work-section"><summary>Private utlegg</summary>
        {settlement(allExpenses, members.map(m => ({id: m.id, name: m.display_name ?? 'Deltaker'})), project?.cost_shares ?? {}).map(m => <div className="work-row" key={m.id}><strong>{m.name}</strong><span>{formatNOK(m.paid)} betalt · {formatNOK(Math.abs(m.balance))} {m.balance >= 0 ? 'til gode' : 'å betale'}</span></div>)}
        <p className="text-xs text-muted mt-3">Felleskonto er holdt utenfor. Fordelingen endres i innstillinger.</p>
      </details>}
    </div>
  )
}
