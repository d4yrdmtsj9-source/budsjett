import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { AddRoomSheet } from '@/components/room/AddRoomSheet'
import { useProject } from '@/hooks/useProject'
import { useExpenses } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import {
  getExpenseTotal,
  sumPaidExpenses,
  sumProjectedExpenses,
  budgetProgress,
  remainingBudget,
} from '@/lib/calc'
import { formatNOK } from '@/lib/format'

export function DashboardPage() {
  const { project } = useProject()
  const { expenses, isLoading } = useExpenses()
  const { data: rooms } = useRooms()
  const [showAddRoom, setShowAddRoom] = useState(false)

  const stats = useMemo(() => {
    const totalBudget = project?.total_budget ?? 0
    const projected = sumProjectedExpenses(expenses)
    const bought = sumPaidExpenses(expenses)
    const remaining = remainingBudget(totalBudget, projected)
    const progress = budgetProgress(projected, totalBudget)
    const underBudget = totalBudget - projected
    const discountSavings = expenses.reduce((sum, e) => {
      const subtotal = e.quantity * e.unit_price
      if (e.discount_amount && e.discount_amount > 0) return sum + e.discount_amount
      if (e.discount_percent && e.discount_percent > 0) return sum + subtotal * (e.discount_percent / 100)
      return sum
    }, 0)

    return { totalBudget, projected, bought, remaining, progress, underBudget, discountSavings }
  }, [project, expenses])

  const byRoom = useMemo(() => {
    return (rooms ?? []).map((room) => {
      const roomExpenses = expenses.filter((e) => e.room_id === room.id)
      const spent = roomExpenses.reduce((s, e) => s + getExpenseTotal(e), 0)
      return { room, spent, progress: budgetProgress(spent, room.budget) }
    })
  }, [rooms, expenses])

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
    () => expenses.filter((e) => e.status === 'planned').slice(0, 5),
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
          <StatItem label="Planlagt totalt" value={formatNOK(stats.projected)} />
          <StatItem
            label="Gjenstår"
            value={formatNOK(stats.remaining)}
            highlight={stats.remaining < 0}
          />
        </div>
        <div className="mt-4">
          <ProgressBar value={stats.projected} max={stats.totalBudget} showLabel />
        </div>
        {stats.underBudget > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <PiggyBank className="h-4 w-4" />
            <span>{formatNOK(stats.underBudget)} under budsjett</span>
          </div>
        )}
        {stats.underBudget < 0 && (
          <div className="mt-3 text-sm text-amber-700">
            {formatNOK(Math.abs(stats.underBudget))} over budsjett
          </div>
        )}
        {stats.discountSavings > 0 && (
          <div className="mt-2 text-sm text-muted">
            Spart {formatNOK(stats.discountSavings)} i rabatter
          </div>
        )}
      </Card>

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
          <p className="text-sm text-muted">Ingen rom ennå</p>
        ) : (
          <div className="flex flex-col gap-3">
            {byRoom.map(({ room, spent }) => (
              <Link key={room.id} to={`/rom/${room.id}`} className="block">
                <Card padding="sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{room.name}</span>
                    <span className="text-sm text-muted">
                      {formatNOK(spent)} / {formatNOK(room.budget)}
                    </span>
                  </div>
                  <ProgressBar value={spent} max={room.budget} size="sm" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <AddRoomSheet open={showAddRoom} onClose={() => setShowAddRoom(false)} />

      <section>
        <SectionHeader title="Siste kjøp" to="/utgifter" />
        <ExpenseList expenses={recentPurchases} emptyMessage="Ingen kjøp ennå" />
      </section>

      {plannedExpenses.length > 0 && (
        <section>
          <SectionHeader title="Planlagte" />
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
