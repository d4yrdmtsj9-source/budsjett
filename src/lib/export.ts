import type { Expense } from './types'
import type { LocalProject } from './localStore'
import { readReceipt, saveReceipt, normalizeProject } from './localStore'
import {
  financials,
  knownPrice,
  netCost,
  paidAmount,
  outstanding,
} from './finance'
import { EXPENSE_STATUS_LABELS } from './types'
export function downloadFile(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export function csvCell(value: unknown) {
  const text = String(value ?? '')
  const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}
export function exportCSV(expenses: Expense[]) {
  const rows = [
    [
      'Post',
      'Rom',
      'Butikk',
      'Status',
      'Med i budsjett',
      'Opprinnelig estimat',
      'Forventet kostnad',
      'Betalt netto',
      'Restbeløp',
      'Forfall',
      'Notater',
    ],
    ...expenses.map((e) => [
      e.description,
      e.room?.name,
      e.supplier,
      EXPENSE_STATUS_LABELS[e.status],
      e.budget_included === false ? 'Nei' : 'Ja',
      e.original_estimate,
      knownPrice(e) ? netCost(e) : 'Pris mangler',
      paidAmount(e),
      outstanding(e),
      e.due_date,
      e.notes,
    ]),
  ]
  downloadFile(
    'renover-budsjett.csv',
    '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n'),
    'text/csv;charset=utf-8',
  )
}
export async function exportBackup(project: LocalProject) {
  const files: Record<string, string> = {}
  for (const expense of project.expenses)
    for (const ref of expense.receipts ?? []) {
      const blob = await readReceipt(ref.id)
      if (blob)
        files[ref.id] = await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result))
          r.onerror = reject
          r.readAsDataURL(blob)
        })
    }
  downloadFile(
    'renover-sikkerhetskopi.json',
    JSON.stringify({ ...project, local_receipt_files: files }),
    'application/json',
  )
}
export async function parseBackup(
  text: string,
  expectedProject?: { id: string; invite_code: string },
): Promise<LocalProject> {
  const data = JSON.parse(text)
  if (
    expectedProject &&
    (data?.id !== expectedProject.id ||
      data?.invite_code !== expectedProject.invite_code)
  )
    throw new Error('Denne sikkerhetskopien tilhører et annet prosjekt.')
  if (
    !data ||
    typeof data.id !== 'string' ||
    typeof data.invite_code !== 'string' ||
    typeof data.name !== 'string' ||
    !Number.isFinite(data.total_budget) ||
    data.total_budget < 0 ||
    !['members', 'rooms', 'categories', 'expenses', 'activity'].every((k) =>
      Array.isArray(data[k]),
    )
  )
    throw new Error('Ugyldig sikkerhetskopi.')
  if (
    data.expenses.some(
      (e: Expense) =>
        typeof e.id !== 'string' ||
        typeof e.description !== 'string' ||
        !Number.isFinite(e.total) ||
        e.total < 0 ||
        !Number.isFinite(e.quantity) ||
        !Number.isFinite(e.unit_price) ||
        !['planned', 'quoted', 'ordered', 'purchased', 'paid'].includes(
          e.status,
        ),
    )
  )
    throw new Error('Sikkerhetskopien inneholder ugyldige poster.')
  if (
    data.members.some(
      (m: { id: string; display_name: string }) =>
        typeof m.id !== 'string' || typeof m.display_name !== 'string',
    ) ||
    data.rooms.some(
      (r: { id: string; name: string; budget: number }) =>
        typeof r.id !== 'string' ||
        typeof r.name !== 'string' ||
        !Number.isFinite(r.budget),
    )
  )
    throw new Error('Sikkerhetskopien har ugyldige rom eller personer.')
  const allowedIds = new Set<string>(
    data.expenses.flatMap((e: Expense) => (e.receipts ?? []).map((r) => r.id)),
  )
  for (const [id, value] of Object.entries(data.local_receipt_files ?? {})) {
    if (
      !allowedIds.has(id) ||
      typeof value !== 'string' ||
      value.length > 15 * 1024 * 1024 ||
      !/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(value)
    )
      continue
    const [header, base64] = value.split(',')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    await saveReceipt(
      id,
      new Blob([bytes], { type: header.slice(5).split(';')[0] }),
    )
  }
  delete data.local_receipt_files
  return normalizeProject(data)
}
export function printBudget(project: LocalProject, expenses: Expense[]) {
  const win = window.open('', '_blank')
  if (!win)
    throw new Error('Tillat popup-vindu for å skrive ut eller lagre PDF.')
  const f = financials(expenses, project.total_budget, project.reserve_amount)
  const doc = win.document
  doc.title = `${project.name} – budsjett`
  const style = doc.createElement('style')
  style.textContent =
    'body{font:13px system-ui;margin:36px;color:#193d33}h1{font-size:30px}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{padding:10px 6px;border-bottom:1px solid #ddd;text-align:left}th{font-size:11px}tr{break-inside:avoid}button{padding:12px;margin:15px 0}@media print{button{display:none}}'
  doc.head.append(style)
  const h = doc.createElement('h1')
  h.textContent = project.name
  doc.body.append(h)
  const p = doc.createElement('p')
  p.textContent = `Totalramme: ${project.total_budget.toLocaleString('nb-NO')} kr · Forventet: ${f.projected.toLocaleString('nb-NO')} kr · Reserve igjen: ${f.reserveLeft.toLocaleString('nb-NO')} kr${f.missing ? ` · ${f.missing} poster mangler pris` : ''}`
  doc.body.append(p)
  const button = doc.createElement('button')
  button.textContent = 'Skriv ut / lagre som PDF'
  button.onclick = () => win.print()
  doc.body.append(button)
  const table = doc.createElement('table')
  const head = doc.createElement('thead')
  const tr = doc.createElement('tr')
  ;['Post', 'Rom', 'Status', 'Kostnad', 'Betalt'].forEach((v) => {
    const th = doc.createElement('th')
    th.textContent = v
    tr.append(th)
  })
  head.append(tr)
  table.append(head)
  const body = doc.createElement('tbody')
  expenses
    .filter((e) => e.budget_included !== false)
    .forEach((e) => {
      const row = doc.createElement('tr')
      ;[
        e.description,
        e.room?.name ?? 'Felles',
        EXPENSE_STATUS_LABELS[e.status],
        knownPrice(e)
          ? netCost(e).toLocaleString('nb-NO') + ' kr'
          : 'Pris mangler',
        paidAmount(e).toLocaleString('nb-NO') + ' kr',
      ].forEach((v) => {
        const td = doc.createElement('td')
        td.textContent = v
        row.append(td)
      })
      body.append(row)
    })
  table.append(body)
  doc.body.append(table)
}
