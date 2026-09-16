import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Plus,
  CalendarDays,
  CircleAlert,
  ReceiptText,
  Check,
  Clock3,
  House,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useProject } from '@/hooks/useProject'
import { useExpenses } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { FinancialOverview } from '@/components/budget/FinancialOverview'
import { RoomCards } from '@/components/room/RoomCards'
import { AddRoomSheet } from '@/components/room/AddRoomSheet'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { Button } from '@/components/ui/Button'
import {
  financials,
  included,
  outstanding,
  isPlanned,
  settlement,
  paymentsOf,
} from '@/lib/finance'
import {
  formatNOK,
  formatDate,
  formatRelativeDate,
  todayISO,
} from '@/lib/format'
export function DashboardPage() {
  const { project, rawProject, members } = useProject()
  const { expenses } = useExpenses()
  const { data: rooms } = useRooms()
  const { openNew, openEdit } = useExpenseSheet()
  const [addRoom, setAddRoom] = useState(false)
  const f = financials(expenses, project?.total_budget, project?.reserve_amount)
  const planned = expenses
    .filter((e) => included(e) && isPlanned(e))
    .slice(0, 3)
  const upcoming = expenses
    .filter(
      (e) => included(e) && !isPlanned(e) && outstanding(e) > 0 && e.due_date,
    )
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
  const people = settlement(
    expenses,
    members.map((m) => ({ id: m.id, name: m.display_name ?? 'Person' })),
    project?.cost_shares,
  )
  const unassigned = expenses
    .filter(included)
    .some((e) => paymentsOf(e).some((p) => !p.paid_by))
  const creditor = people.find((p) => p.balance > 0)
  return (
    <div className="space-y-8">
      <header className="page-heading">
        <div>
          <p className="eyebrow">EN GOD PLAN FOR HJEMMET</p>
          <h1>Fra planer til hjem.</h1>
          <p>
            {project?.name} <span className="heading-dot">·</span>{' '}
            {rooms?.length ?? 0} rom og områder
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => openNew({ status: 'planned' })}
        >
          <Plus size={17} />
          Planlegg noe nytt
        </Button>
      </header>
      <section className="discovery-banner">
        <Sparkles size={26} />
        <div>
          <strong>Hva drømmer dere om nå?</strong>
          <span>Ett moodboard for hvert rom.</span>
        </div>
        <div className="discovery-links">
          <Link to="/moodboard">
            Se moodboard <ArrowUpRight size={16} />
          </Link>
          <Link to="/planlegg">
            Se planen <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <div className="dashboard-top">
        <FinancialOverview
          expenses={expenses}
          budget={project?.total_budget ?? 0}
          reserve={project?.reserve_amount}
        />
        <aside className="attention-card">
          <div className="section-heading">
            <h2>Neste steg</h2>
            <span className="round-icon">
              <ArrowUpRight size={17} />
            </span>
          </div>
          {f.missing > 0 && (
            <Link to="/utgifter?filter=missing" className="attention-item">
              <span className="attention-icon amber">
                <CircleAlert size={19} />
              </span>
              <div>
                <strong>{f.missing} poster mangler pris</strong>
                <p>Gjør anslaget mer komplett</p>
              </div>
              <ArrowUpRight size={15} />
            </Link>
          )}
          {f.remaining < 0 && (
            <Link to="/rom" className="attention-item">
              <span className="attention-icon amber">
                <CircleAlert size={19} />
              </span>
              <div>
                <strong>{formatNOK(-f.remaining)} over rammen</strong>
                <p>Se hvilke rom som trenger justering</p>
              </div>
            </Link>
          )}
          {upcoming.slice(0, 2).map((e) => (
            <button
              key={e.id}
              className="attention-item text-left"
              onClick={() => openEdit(e)}
            >
              <span
                className={`attention-icon ${e.due_date! < todayISO() ? 'amber' : ''}`}
              >
                <CalendarDays size={19} />
              </span>
              <div>
                <strong>{e.description}</strong>
                <p>
                  {formatNOK(outstanding(e))} ·{' '}
                  {e.due_date! < todayISO() ? 'Forfalt' : 'Forfall'}{' '}
                  {formatDate(e.due_date)}
                </p>
              </div>
            </button>
          ))}
          {!f.missing && !upcoming.length && f.remaining >= 0 && (
            <div className="attention-empty">
              <span className="round-icon">
                <Check size={24} />
              </span>
              <h3>{f.count ? 'God oversikt.' : 'En ny begynnelse.'}</h3>
              <p>
                {f.count
                  ? 'Ingen registrerte forfall eller manglende priser.'
                  : 'Legg til et rom og de første planene deres.'}
              </p>
            </div>
          )}
          <Link to="/utgifter?filter=due" className="attention-footer">
            Se betalingsoversikten <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
      <section>
        <div className="section-heading mb-4">
          <div>
            <p className="eyebrow">DELENE SOM BLIR HELHETEN</p>
            <h2>Rom og områder</h2>
          </div>
          <button className="text-link" onClick={() => setAddRoom(true)}>
            <Plus size={16} />
            Nytt rom
          </button>
        </div>
        {rooms?.length ? (
          <RoomCards limit={4} />
        ) : (
          <button className="empty-room" onClick={() => setAddRoom(true)}>
            <House size={28} />
            <strong>Start med ditt første rom</strong>
            <span>Kjøkken, bad, stue eller uteområdet</span>
            <Plus size={22} />
          </button>
        )}
        {(rooms?.length ?? 0) > 4 && (
          <Link to="/rom" className="text-link mt-4">
            Se alle rom <ArrowUpRight size={16} />
          </Link>
        )}
      </section>
      <div className="dashboard-bottom">
        <section>
          <div className="section-heading mb-4">
            <h2>På ønskelisten</h2>
            <Link to="/utgifter?filter=planned" className="text-link">
              Se alle <ArrowUpRight size={16} />
            </Link>
          </div>
          {planned.length ? (
            <ExpenseList expenses={planned} />
          ) : (
            <div className="plain-empty">
              <ReceiptText size={25} />
              <p>Det neste prosjektet starter med en idé.</p>
              <button className="text-link" onClick={() => openNew()}>
                Legg til en plan <Plus size={15} />
              </button>
            </div>
          )}
        </section>
        <section className="activity-card">
          <div className="section-heading">
            <h2>Sist i prosjektet</h2>
            <Clock3 size={19} className="text-muted" />
          </div>
          {(rawProject?.activity ?? []).slice(0, 4).map((a) => (
            <div className="activity-row" key={a.id}>
              <span className="activity-dot" />
              <div>
                <p>{a.summary}</p>
                <span>{formatRelativeDate(a.created_at)}</span>
              </div>
            </div>
          ))}
          {!rawProject?.activity.length && (
            <p className="text-sm text-muted mt-4">
              Endringene deres vises her.
            </p>
          )}
          {people.length > 1 && (
            <div className="settlement-summary">
              <p className="eyebrow">UTLEGG MELLOM DERE</p>
              {people.map((p) => (
                <div key={p.id} className="flex justify-between text-sm mt-2">
                  <span>{p.name}</span>
                  <strong>{formatNOK(p.paid)}</strong>
                </div>
              ))}
              <p className="text-xs text-muted mt-3">
                {creditor
                  ? `${creditor.name} har ${formatNOK(creditor.balance)} til gode ved valgt fordeling.`
                  : 'Utleggene er i balanse.'}{' '}
                Felleskonto er holdt utenfor.
                {unassigned ? ' Noen betalinger mangler betaler.' : ''}
              </p>
              <Link to="/innstillinger" className="text-link mt-3">
                Endre fordeling <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>
      <AddRoomSheet open={addRoom} onClose={() => setAddRoom(false)} />
    </div>
  )
}
