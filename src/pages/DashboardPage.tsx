import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PiggyBank, ArrowRight, Plus, Home, ClipboardList } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { AddRoomSheet } from '@/components/room/AddRoomSheet'
import { BudgetQuad } from '@/components/budget/BudgetQuad'
import { useProject } from '@/hooks/useProject'
import { useExpenses } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useAuth } from '@/hooks/useAuth'
import {
  getExpenseTotal,
  isBoughtStatus,
  sumPaidExpenses,
  sumPlannedExpenses,
  sumProjectedExpenses,
  overPlanSentence,
} from '@/lib/calc'
import { formatNOK } from '@/lib/format'
import type { Expense } from '@/lib/types'

export function DashboardPage() {
  const { project, members } = useProject()
  const { memberId } = useAuth()
  const sync = useCloudSync()
  const { expenses, isLoading } = useExpenses()
  const { data: rooms } = useRooms()
  const { openNew } = useExpenseSheet()
  const [showAddRoom, setShowAddRoom] = useState(false)

  const me = members.find((m) => m.id === memberId)
  const partner = members.find((m) => m.id !== memberId)

  const stats = useMemo(() => {
    const totalBudget = project?.total_budget ?? 0
    const projected = sumProjectedExpenses(expenses)
    const bought = sumPaidExpenses(expenses)
    const planned = sumPlannedExpenses(expenses)
    const underBudget = totalBudget - projected
    const warning = overPlanSentence({
      name: project?.name || 'Prosjektet',
      budget: totalBudget,
      projected,
    })
    const discountSavings = expenses.reduce((sum, e) => {
      const subtotal = e.quantity * e.unit_price
      if (e.discount_amount && e.discount_amount > 0) return sum + e.discount_amount
      if (e.discount_percent && e.discount_percent > 0) return sum + subtotal * (e.discount_percent / 100)
      return sum
    }, 0)

    return { totalBudget, projected, bought, planned, underBudget, warning, discountSavings }
  }, [project, expenses])

  const byRoom = useMemo(() => {
    return (rooms ?? []).map((room) => {
      const roomExpenses = expenses.filter((e) => e.room_id === room.id)
      const bought = sumPaidExpenses(roomExpenses)
      const planned = sumPlannedExpenses(roomExpenses)
      const projected = bought + planned
      return { room, bought, planned, projected }
    })
  }, [rooms, expenses])

  const paidByPerson = useMemo(() => {
    const purchases = expenses.filter((e) => isBoughtStatus(e.status))
    if (members.length < 2 || purchases.length === 0) return null
    const rows = members.map((m) => ({
      id: m.id,
      name: m.profile?.display_name ?? m.display_name ?? 'Ukjent',
      amount: purchases
        .filter((e) => e.who_paid === m.id)
        .reduce((s, e) => s + getExpenseTotal(e), 0),
    }))
    const unassigned = purchases
      .filter((e) => !e.who_paid)
      .reduce((s, e) => s + getExpenseTotal(e), 0)
    const max = Math.max(...rows.map((r) => r.amount))
    const min = Math.min(...rows.map((r) => r.amount))
    const leader = rows.find((r) => r.amount === max)
    const diff = max - min
    return { rows, unassigned, leader, diff }
  }, [expenses, members])

  const recentPurchases = useMemo(
    () =>
      [...expenses]
        .filter((e) => isBoughtStatus(e.status))
        .sort((a, b) => {
          const da = a.expense_date ?? a.created_at
          const db = b.expense_date ?? b.created_at
          return db.localeCompare(da)
        })
        .slice(0, 5),
    [expenses],
  )

  const buyList = useMemo(() => {
    const planned = expenses.filter((e) => !isBoughtStatus(e.status))
    const groups: { key: string; title: string; roomId: string | null; items: Expense[] }[] = []
    for (const room of rooms ?? []) {
      const items = planned.filter((e) => e.room_id === room.id)
      if (items.length) groups.push({ key: room.id, title: room.name, roomId: room.id, items })
    }
    const unassigned = planned.filter((e) => !e.room_id)
    if (unassigned.length) {
      groups.push({ key: 'none', title: 'Uten rom', roomId: null, items: unassigned })
    }
    return groups
  }, [expenses, rooms])

  const plannedCount = buyList.reduce((n, g) => n + g.items.length, 0)

  if (isLoading) return <LoadingSpinner />

  const firstRoom = rooms?.[0]

  return (
    <div className="space-y-6 pb-4">
      <header>
        <p className="text-sm text-muted">
          {me?.profile?.display_name ?? me?.display_name ?? 'Deg'}
          {partner ? ` · ${partner.profile?.display_name ?? partner.display_name}` : ''}
        </p>
        <h1 className="font-display text-2xl font-bold">{project?.name}</h1>
        <p className="text-xs text-muted mt-1">{sync.label}</p>
      </header>

      <BudgetQuad
        budget={stats.totalBudget}
        bought={stats.bought}
        planned={stats.planned}
        footer={
          <>
            {stats.totalBudget <= 0 && stats.projected > 0 && (
              <p className="text-xs text-muted mt-3">Sett totalbudsjett under Innstillinger</p>
            )}
            {stats.warning ? (
              <p className="mt-3 text-sm text-destructive">{stats.warning}</p>
            ) : stats.underBudget > 0 && stats.totalBudget > 0 ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                <PiggyBank className="h-4 w-4" />
                <span>{formatNOK(stats.underBudget)} under budsjett hvis dere kjøper alt planlagt</span>
              </div>
            ) : stats.totalBudget > 0 && stats.planned === 0 && stats.bought === 0 ? (
              <p className="mt-3 text-sm text-muted">Planlegg det dere tror dere skal kjøpe — så ser dere om det får plass.</p>
            ) : null}
            {stats.discountSavings > 0 && (
              <p className="mt-2 text-sm text-muted">
                Spart {formatNOK(stats.discountSavings)} i rabatter
              </p>
            )}
          </>
        }
      />

      <section>
        <SectionHeader title="Å kjøpe" to="/utgifter" />
        {plannedCount === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={firstRoom ? `Planlegg første ting i ${firstRoom.name.toLowerCase()}` : 'Ingenting planlagt ennå'}
            description="Legg inn det dere tror dere skal kjøpe, i riktig rom, med et grovt estimat."
            action={
              <button
                type="button"
                onClick={() =>
                  openNew({
                    status: 'planned',
                    roomId: firstRoom?.id,
                  })
                }
                className="text-sm font-medium text-primary"
              >
                Planlegg første ting
              </button>
            }
          />
        ) : (
          <div className="space-y-5">
            {buyList.map((group) => (
              <div key={group.key}>
                {group.roomId ? (
                  <Link
                    to={`/rom/${group.roomId}`}
                    className="font-display font-semibold text-sm mb-2 inline-flex items-center gap-1"
                  >
                    {group.title}
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  </Link>
                ) : (
                  <p className="font-display font-semibold text-sm mb-2">{group.title}</p>
                )}
                <ExpenseList expenses={group.items} showRoom={false} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <CardHeader>
          <CardTitle className="text-base">Per rom</CardTitle>
          <button
            type="button"
            onClick={() => setShowAddRoom(true)}
            className="text-sm text-primary flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Nytt rom
          </button>
        </CardHeader>
        {byRoom.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Ingen rom ennå"
            description="Del opp i rom, så planlegger dere hva som skal kjøpes i hvert."
            action={
              <button
                type="button"
                onClick={() => setShowAddRoom(true)}
                className="text-sm font-medium text-primary"
              >
                Opprett første rom
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {byRoom.map(({ room, bought, planned, projected }) => {
              const warning = overPlanSentence({
                name: room.name,
                budget: room.budget,
                projected,
              })
              return (
                <Link key={room.id} to={`/rom/${room.id}`} className="block">
                  <Card padding="sm">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-sm">{room.name}</p>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted">Planlagt</p>
                        <p className="font-display font-semibold text-sm">
                          {planned > 0 ? formatNOK(planned) : '—'}
                        </p>
                      </div>
                    </div>
                    <BudgetQuad
                      budget={room.budget}
                      bought={bought}
                      planned={planned}
                      compact
                      framed={false}
                    />
                    {warning ? (
                      <p className="mt-2 text-xs text-destructive">{warning}</p>
                    ) : room.budget > 0 ? (
                      <p className="mt-2 text-xs text-muted">
                        {formatNOK(room.budget - projected)} gjenstår hvis dere kjøper alt planlagt
                      </p>
                    ) : planned === 0 && bought === 0 ? (
                      <p className="mt-2 text-xs text-muted">Planlegg første ting her</p>
                    ) : bought > 0 ? (
                      <p className="mt-2 text-xs text-muted">{formatNOK(bought)} kjøpt</p>
                    ) : null}
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <AddRoomSheet open={showAddRoom} onClose={() => setShowAddRoom(false)} />

      {paidByPerson && (
        <Card padding="sm">
          <p className="text-xs text-muted mb-2">Hvem har lagt ut</p>
          <div className="space-y-1.5">
            {paidByPerson.rows.map((row) => (
              <div key={row.id} className="flex justify-between text-sm">
                <span>{row.name}</span>
                <span className="font-medium">{formatNOK(row.amount)}</span>
              </div>
            ))}
            {paidByPerson.unassigned > 0 && (
              <div className="flex justify-between text-xs text-muted">
                <span>Uten betaler</span>
                <span>{formatNOK(paidByPerson.unassigned)}</span>
              </div>
            )}
          </div>
          {paidByPerson.diff > 0 && paidByPerson.leader && (
            <p className="text-xs text-muted mt-2">
              {paidByPerson.leader.name} har lagt ut {formatNOK(paidByPerson.diff)} mer
            </p>
          )}
        </Card>
      )}

      {recentPurchases.length > 0 && (
        <section>
          <SectionHeader title="Siste kjøp" to="/utgifter" />
          <ExpenseList expenses={recentPurchases} />
        </section>
      )}
    </div>
  )
}

function SectionHeader({
  title,
  to,
}: {
  title: string
  to?: string
}) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        {title}
      </CardTitle>
      {to && (
        <Link to={to} className="text-sm text-primary flex items-center gap-1">
          Se alle <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </CardHeader>
  )
}
