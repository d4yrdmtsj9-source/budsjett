import { Link } from 'react-router-dom'
import { financials } from '@/lib/finance'
import { formatNOK } from '@/lib/format'
import type { Expense } from '@/lib/types'
export function FinancialOverview({ expenses, budget, reserve = 0, scope = 'Prosjektøkonomi', roomId }: {
  expenses: Expense[]; budget: number; reserve?: number; scope?: string; roomId?: string
}) {
  const f = financials(expenses, budget, reserve)
  const url = (filter = 'all') => `/utgifter?${new URLSearchParams({ filter, ...(roomId ? { rom: roomId } : {}) })}`
  return <section className="finance-overview" aria-label={scope}>
    <div className="section-heading"><h2>{scope}</h2><Link className="text-link" to={roomId ? `/rom/${roomId}` : '/innstillinger'}>Budsjett</Link></div>
    <div className="finance-primary">
      <div><span>Totalbudsjett</span><strong>{budget > 0 ? formatNOK(budget) : 'Ikke satt'}</strong></div>
      <Link to={url()}><span>Forventet sluttkostnad</span><strong>{formatNOK(f.projected)}</strong></Link>
      <Link to={url()} className={f.available < 0 ? 'text-destructive' : ''}><span>{f.available < 0 ? 'Over ramme etter reserve' : 'Disponibelt etter reserve'}</span><strong>{budget > 0 ? formatNOK(Math.abs(f.available)) : '—'}</strong></Link>
    </div>
    {f.missing > 0 && <Link className="work-warning" to={url('missing')}>Ufullstendig anslag: {f.missing} poster mangler pris.</Link>}
    <div className="finance-secondary">
      <Link to={url('paid')}><span>Betalt netto</span><strong>{formatNOK(f.paid)}</strong></Link>
      <Link to={url('due')}><span>Gjenstår på avtalte kjøp</span><strong>{formatNOK(f.ordered)}</strong></Link>
      <Link to={url('planned')}><span>Planlagt</span><strong>{formatNOK(f.planned)}</strong></Link>
      {reserve > 0 && <div><span>Reserve igjen</span><strong>{formatNOK(f.reserveLeft)}</strong></div>}
      {f.refund > 0 && <Link to={url('refund')}><span>Venter refusjon</span><strong>{formatNOK(f.refund)}</strong></Link>}
    </div>
    {f.refund > 0 && <p className="text-xs text-muted">Ventende refusjon er trukket fra sluttkostnaden, men er ikke mottatt betaling.</p>}
  </section>
}
