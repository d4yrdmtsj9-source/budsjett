import { Link } from 'react-router-dom'
import { Plus, ArrowUpRight } from 'lucide-react'
import { useProject } from '@/hooks/useProject'
import { useExpenses } from '@/hooks/useExpenses'
import { usePlanning } from '@/hooks/usePlanning'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { FinancialOverview } from '@/components/budget/FinancialOverview'
import { Button } from '@/components/ui/Button'
import { taskBlockers, sortTasks, paymentDueRows } from '@/lib/workflow'
import { included, knownPrice, isPlanned, paidAmount } from '@/lib/finance'
import { todayISO, formatNOK, formatDate } from '@/lib/format'
export function DashboardPage() {
  const { project } = useProject()
  const { expenses } = useExpenses()
  const { tasks } = usePlanning()
  const { openNew, openEdit } = useExpenseSheet()
  const today = todayISO()
  const next = tasks.filter(t => t.status !== 'done' && !taskBlockers(t, tasks, expenses).length).sort(sortTasks).slice(0, 5)
  const overdue = expenses.flatMap(e => paymentDueRows(e).filter(r => r.date && r.date < today).map(r => ({ e, r })))
  const late = expenses.filter(e => included(e) && !isPlanned(e) && e.delivery_status !== 'received' && e.delivery_status !== 'not_required' && e.delivery_date && e.delivery_date < today)
  const blocked = tasks.filter(t => t.status !== 'done' && taskBlockers(t, tasks, expenses).length)
  const conflicts = expenses.filter(e => included(e) && (paidAmount(e) > e.total || paidAmount(e) < 0))
  const missing = expenses.filter(e => included(e) && !knownPrice(e))
  return <div className="space-y-6">
    <header className="page-heading"><h1>Oversikt</h1><Button onClick={() => openNew()}><Plus size={17} />Ny post</Button></header>
    <FinancialOverview expenses={expenses} budget={project?.total_budget ?? 0} reserve={project?.reserve_amount} />
    <section className="work-section"><div className="section-heading"><h2>Neste oppgaver</h2><Link className="text-link" to="/planlegg">Plan <ArrowUpRight size={15}/></Link></div>
      {next.map(t => <Link className="work-row" key={t.id} to={`/planlegg?oppgave=${t.id}`}><strong>{t.title}</strong><span>{t.due_date ? formatDate(t.due_date) : t.status === 'doing' ? 'Pågår' : 'Klar til start'}</span></Link>)}
      {!next.length && <p className="text-sm text-muted mt-3">{tasks.some(t => t.status !== 'done') ? 'Åpne oppgaver venter på avklaringer.' : 'Ingen åpne oppgaver.'} <Link className="text-link" to="/planlegg">Åpne planen</Link></p>}
    </section>
    {(conflicts.length > 0 || overdue.length > 0 || late.length > 0 || blocked.length > 0 || missing.length > 0) && <section className="work-section"><h2>Krever handling</h2>
      {conflicts.map(e => <button className="work-row" key={`conflict-${e.id}`} onClick={() => openEdit(e)}><strong>{e.description}</strong><span className="text-destructive">Kontroller betalingene</span></button>)}
      {overdue.map(({e, r}, i) => <button className="work-row" key={`${e.id}-${i}`} onClick={() => openEdit(e)}><strong>{e.description}</strong><span className="text-destructive">Forfalt {formatDate(r.date)} · {formatNOK(r.amount)}</span></button>)}
      {late.map(e => <button className="work-row" key={e.id} onClick={() => openEdit(e)}><strong>{e.description}</strong><span>Levering forsinket</span></button>)}
      {blocked.map(t => <Link className="work-row" key={t.id} to={`/planlegg?oppgave=${t.id}`}><strong>{t.title}</strong><span>Blokkert</span></Link>)}
      {missing.length > 0 && <Link className="work-row" to="/utgifter?filter=missing"><strong>{missing.length} poster uten pris</strong><span>Fullfør kostnadsanslaget</span></Link>}
    </section>}
  </div>
}
