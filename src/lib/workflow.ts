import type { ProjectTask } from './planning.ts'
import type { Expense } from './types.ts'
import { money, netCost, outstanding, included, isPlanned } from './finance.ts'

export function taskBlockers(task: ProjectTask, tasks: ProjectTask[], expenses: Expense[]): string[] {
  const reasons: string[] = []
  if (task.status === 'blocked') reasons.push(task.blocked_reason?.trim() || 'Manuelt blokkert')
  for (const id of task.depends_on ?? []) {
    const dep = tasks.find(t => t.id === id && !t.deleted_at)
    if (!dep) reasons.push('En forutgående oppgave er fjernet')
    else if (dep.status !== 'done') reasons.push(dep.title)
  }
  for (const id of task.expense_ids ?? []) {
    const e = expenses.find(e => e.id === id && !e.deleted_at)
    if (!e) reasons.push('Et nødvendig innkjøp er fjernet')
    else if (!included(e)) reasons.push(`${e.description}: alternativ er ikke valgt`)
    else if (isPlanned(e)) reasons.push(`${e.description}: ikke bestilt`)
    else if (e.delivery_status !== 'received' && e.delivery_status !== 'not_required') reasons.push(`${e.description}: ikke mottatt`)
  }
  return reasons
}
export function validateTask(task: ProjectTask, tasks: ProjectTask[]): string | null {
  if (!task.title.trim()) return 'Skriv hva som skal gjøres.'
  const graph = new Map([...tasks.filter(t => !t.deleted_at && t.id !== task.id), task].map(t => [t.id, t.depends_on ?? []]))
  const visiting = new Set<string>(), done = new Set<string>()
  function cycle(id: string): boolean {
    if (visiting.has(id)) return true
    if (done.has(id)) return false
    visiting.add(id)
    if ((graph.get(id) ?? []).some(cycle)) return true
    visiting.delete(id); done.add(id); return false
  }
  if (cycle(task.id)) return 'Oppgavene kan ikke være avhengige av hverandre i en sirkel.'
  return null
}
export function sortTasks(a: ProjectTask, b: ProjectTask) {
  return Number(!!b.priority) - Number(!!a.priority) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.id.localeCompare(b.id)
}
/** Planned installments are the full agreed payment schedule, not another cost.
 * Actual net payments are allocated to the earliest installment first. */
export function paymentDueRows(e: Expense): { date: string; amount: number; label: string }[] {
  const remaining = outstanding(e)
  if (!included(e) || isPlanned(e) || remaining <= 0) return []
  const schedule = [...(e.payment_schedule ?? [])].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  if (!schedule.length) return [{ date: e.due_date ?? '', amount: remaining, label: e.description }]
  const scheduleTotal = money(schedule.reduce((n,s) => n + s.amount, 0))
  const cost = netCost(e)
  let paid = Math.max(0, cost - remaining), left = remaining
  const result: {date: string; amount: number; label: string}[] = []
  for (const row of schedule) {
    const consumed = Math.min(paid, row.amount); paid = money(paid - consumed)
    const amount = money(Math.min(left, Math.max(0, row.amount - consumed)))
    if (amount) result.push({ date: row.date, amount, label: row.label || e.description })
    left = money(left - amount)
  }
  if (left > 0) result.push({ date: '', amount: left, label: scheduleTotal < cost ? 'Ikke fordelt på forfall' : e.description })
  return result
}
