import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { financials } from '@/lib/finance'
import { formatNOK } from '@/lib/format'
import type { Expense } from '@/lib/types'
export function FinancialOverview({
  expenses,
  budget,
  reserve = 0,
  scope = 'HELE PROSJEKTET',
}: {
  expenses: Expense[]
  budget: number
  reserve?: number
  scope?: string
}) {
  const f = financials(expenses, budget, reserve)
  const ceiling = Math.max(
    budget,
    f.projected,
    f.paid + f.ordered + f.planned,
    1,
  )
  const segments = [
    { label: 'Betalt netto', value: f.paid, color: 'var(--chart-paid)' },
    {
      label: 'Gjenstår på bestillinger',
      value: f.ordered,
      color: 'var(--chart-ordered)',
    },
    {
      label: 'Planlagt videre',
      value: f.planned,
      color: 'var(--chart-planned)',
    },
  ]
  return (
    <section className="budget-hero" aria-label="Budsjettoversikt">
      <div className="hero-top">
        <span className="eyebrow">{scope}</span>
        <Link to="/innstillinger" className="hero-edit">
          Budsjett <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="hero-numbers">
        <div>
          <p className="hero-label">Forventet sluttkostnad</p>
          <p className="hero-total">{formatNOK(f.projected)}</p>
          <p className="hero-subtitle">
            {budget > 0
              ? `av ${formatNOK(budget)} i totalramme`
              : 'Sett en totalramme for å følge budsjettet'}
          </p>
        </div>
        <div className="hero-room">
          <span className="hero-label">
            {f.remaining < 0 ? 'Over totalrammen' : 'Ledig før reserve'}
          </span>
          <strong>{budget > 0 ? formatNOK(Math.abs(f.remaining)) : '—'}</strong>
          <span className={`budget-pill ${f.remaining < 0 ? 'warning' : ''}`}>
            {budget <= 0
              ? 'Budsjett mangler'
              : f.remaining < 0
                ? 'Trenger en justering'
                : f.reserveUsed > 0
                  ? 'Bruker av reserven'
                  : f.missing
                    ? 'Anslaget er ufullstendig'
                    : 'Innenfor rammen'}
          </span>
        </div>
      </div>
      <div
        className="budget-bar"
        aria-label={`Betalt ${formatNOK(f.paid)}, bestillinger ${formatNOK(f.ordered)}, planlagt ${formatNOK(f.planned)}`}
      >
        {segments.map((s) => (
          <span
            key={s.label}
            style={{
              width: `${(Math.max(0, s.value) / ceiling) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>
      <div className="budget-legend">
        {segments.map((s) => (
          <div key={s.label}>
            <p>
              <i style={{ background: s.color }} />
              {s.label}
            </p>
            <strong>{formatNOK(s.value)}</strong>
          </div>
        ))}
      </div>
      {budget > 0 && (
        <div className="reserve-line">
          <ShieldCheck size={19} />
          <div>
            <strong>{formatNOK(f.reserveLeft)} reserve igjen</strong>
            <span>
              {f.reserveUsed > 0
                ? `${formatNOK(f.reserveUsed)} av reserven er tatt i bruk`
                : `${formatNOK(Math.max(0, f.available))} ledig utover reserven`}
            </span>
          </div>
          {f.missing > 0 && (
            <span className="missing-pill">{f.missing} uten pris</span>
          )}
        </div>
      )}
      {f.refund > 0 && (
        <p className="hero-subtitle mt-3">
          Venter {formatNOK(f.refund)} i refusjon. Dette er allerede trukket fra
          sluttkostnaden.
        </p>
      )}
    </section>
  )
}
