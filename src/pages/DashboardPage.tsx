import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowRight,
  Plus,
  Home,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { AddRoomSheet } from '@/components/room/AddRoomSheet'
import { useProject } from '@/hooks/useProject'
import { useExpenses } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import {
  getExpenseTotal,
  sumPaidExpenses,
  sumPlannedExpenses,
  sumProjectedExpenses,
  remainingBudget,
} from '@/lib/calc'
import { formatNOK } from '@/lib/format'

export function DashboardPage() {
  const { project, members } = useProject()
  const { expenses, isLoading } = useExpenses()
  const { data: rooms } = useRooms()
  const { openNew } = useExpenseSheet()
  const [showAddRoom, setShowAddRoom] = useState(false)

  const stats = useMemo(() => {
    const totalBudget = project?.total_budget ?? 0
    const projected = sumProjectedExpenses(expenses)
    const bought = sumPaidExpenses(expenses)
    const planned = sumPlannedExpenses(expenses)
    const remaining = remainingBudget(totalBudget, projected)
    const underBudget = totalBudget - projected
    const discountSavings = expenses.reduce((sum, e) => {
      const subtotal = e.quantity * e.unit_price
      if (e.discount_amount && e.discount_amount > 0) return sum + e.discount_amount
      if (e.discount_percent && e.discount_percent > 0) return sum + subtotal * (e.discount_percent / 100)
      return sum
    }, 0)

    return { totalBudget, projected, bought, planned, remaining, underBudget, discountSavings }
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
    const purchases = expenses.filter((e) => e.status === 'purchased' || e.status === 'paid')
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
        .filter((e) => e.status === 'purchased' || e.status === 'paid')
        .sort((a, b) => {
          const da = a.expense_date ?? a.created_at
          const db = b.expense_date ?? b.created_at
          return db.localeCompare(da)
        })
        .slice(0, 5),
    [expenses],
  )

  const plannedExpenses = useMemo(
    () => expenses.filter((e) => e.status === 'planned' || e.status === 'quoted' || e.status === 'ordered').slice(0, 5),
    [expenses],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 pb-4">
      <header>
        <p className="text-sm text-muted">Velkommen tilbake</p>
        <h1 className="font-display text-2xl font-bold">{project?.name}</h1>
      </header>

      <Card padding="lg" className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10">
        <div className="grid grid-cols-2 gap-4">
          <StatItem icon={Wallet} label="Budsjett" value={formatNOK(stats.totalBudget)} />
          <StatItem icon={TrendingDown} label="Kjøpt" value={formatNOK(stats.bought)} />
          <StatItem label="Planlagt" value={formatNOK(stats.planned)} />
          <StatItem
            label="Gjenstår"
            value={formatNOK(stats.remaining)}
            highlight={stats.remaining < 0}
          />
        </div>
        {stats.totalBudget > 0 ? (
          <div className="mt-4">
            <ProgressBar value={stats.projected} max={stats.totalBudget} showLabel />
          </div>
        ) : stats.projected > 0 ? (
          <p className="text-xs text-muted mt-3">Sett totalbudsjett under Innstillinger</p>
        ) : null}
        {stats.underBudget > 0 && stats.totalBudget > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <PiggyBank className="h-4 w-4" />
            <span>{formatNOK(stats.underBudget)} under budsjett hvis alt kjøpes</span>
          </div>
        )}
        {stats.underBudget < 0 && (
          <div className="mt-3 text-sm text-amber-700">
            {formatNOK(Math.abs(stats.underBudget))} over budsjett hvis alt kjøpes
          </div>
        )}
        {stats.discountSavings > 0 && (
          <div className="mt-2 text-sm text-muted">
            Spart {formatNOK(stats.discountSavings)} i rabatter
          </div>
        )}
      </Card>

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
            description="Del opp prosjektet i rom, så ser dere hva som er kjøpt og hva som gjenstår"
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
            {byRoom.map(({ room, bought, planned, projected }) => (
              <Link key={room.id} to={`/rom/${room.id}`} className="block">
                <Card padding="sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{room.name}</span>
                    <span className="text-sm text-muted">
                      {formatNOK(bought)}
                      {room.budget > 0 ? ` / ${formatNOK(room.budget)}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-2">
                    Kjøpt
                    {planned > 0 ? ` · ${formatNOK(planned)} planlagt` : ''}
                  </p>
                  {room.budget > 0 ? (
                    <ProgressBar value={projected} max={room.budget} size="sm" />
                  ) : projected > 0 ? (
                    <p className="text-xs text-muted">Ingen rombudsjett</p>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <AddRoomSheet open={showAddRoom} onClose={() => setShowAddRoom(false)} />

      <section>
        <SectionHeader title="Siste kjøp" to="/utgifter" />
        {recentPurchases.length === 0 ? (
          <p className="text-sm text-muted">
            Ingen kjøp ennå.{' '}
            <button
              type="button"
              className="text-primary font-medium"
              onClick={() => openNew({ status: 'purchased' })}
            >
              Registrer første kjøp
            </button>
          </p>
        ) : (
          <ExpenseList expenses={recentPurchases} />
        )}
      </section>

      {plannedExpenses.length > 0 && (
        <section>
          <SectionHeader title="Planlagte" to="/utgifter" />
          <ExpenseList expenses={plannedExpenses} />
        </section>
      )}
    </div>
  )
}

function StatItem({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className={`font-display text-lg font-semibold ${highlight ? 'text-destructive' : ''}`}>
        {value}
      </p>
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
