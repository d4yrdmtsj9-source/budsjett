import type { Expense, ExpenseFormData } from './types'
import type { Payment } from './financeTypes'
import { calculateTotal, getExpenseTotal } from './calc.ts'

export const money = (n: number) =>
  Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
export const isPlanned = (e: Pick<Expense, 'status'>) =>
  e.status === 'planned' || e.status === 'quoted'
export const included = (e: Expense) =>
  !e.deleted_at && e.budget_included !== false
export const knownPrice = (e: Expense) =>
  e.price_known ?? getExpenseTotal(e) > 0
export function paymentsOf(e: Expense): Payment[] {
  return (
    e.payments ??
    ((e.status === 'purchased' || e.status === 'paid') && getExpenseTotal(e) > 0
      ? [
          {
            id: `legacy-${e.id}`,
            amount: getExpenseTotal(e),
            kind: 'payment',
            paid_by: e.who_paid,
            date: e.expense_date ?? e.created_at.slice(0, 10),
          },
        ]
      : [])
  )
}
export const paidAmount = (e: Expense) =>
  money(
    paymentsOf(e).reduce(
      (n, p) => n + (p.kind === 'refund' ? -p.amount : p.amount),
      0,
    ),
  )
export const netCost = (e: Expense) =>
  money(Math.max(0, getExpenseTotal(e) - (e.return_amount ?? 0)))
export const outstanding = (e: Expense) =>
  knownPrice(e) ? money(Math.max(0, netCost(e) - paidAmount(e))) : 0
export const pendingRefund = (e: Expense) =>
  money(Math.max(0, paidAmount(e) - netCost(e)))
export const estimateDelta = (e: Expense) =>
  e.original_estimate == null || !knownPrice(e)
    ? null
    : money(netCost(e) - e.original_estimate)
export function financials(expenses: Expense[], budget = 0, reserve = 0) {
  const live = expenses.filter(included)
  const paid = money(live.reduce((n, e) => n + paidAmount(e), 0))
  const ordered = money(
    live.filter((e) => !isPlanned(e)).reduce((n, e) => n + outstanding(e), 0),
  )
  const planned = money(
    live.filter(isPlanned).reduce((n, e) => n + outstanding(e), 0),
  )
  const refund = money(live.reduce((n, e) => n + pendingRefund(e), 0))
  const projected = money(paid + ordered + planned - refund)
  const remaining = money(budget - projected)
  const reserved = Math.min(Math.max(0, reserve), Math.max(0, budget))
  const reserveLeft = money(Math.min(reserved, Math.max(0, remaining)))
  return {
    paid,
    ordered,
    planned,
    refund,
    projected,
    remaining,
    reserve: reserved,
    reserveLeft,
    reserveUsed: money(reserved - reserveLeft),
    available: money(remaining - reserved),
    missing: live.filter((e) => !knownPrice(e)).length,
    count: live.length,
  }
}
export function roomPortion(e: Expense, roomId: string): Expense | null {
  const allocations = e.allocations?.length
    ? e.allocations
    : [{ room_id: e.room_id, percent: 100 }]
  const index = allocations.findIndex((a) => a.room_id === roomId)
  if (index < 0) return null
  // Give the last room the rounding remainder so room amounts add up to the exact purchase.
  const portion = (amount: number) =>
    index === allocations.length - 1
      ? money(
          amount -
            allocations
              .slice(0, -1)
              .reduce((n, a) => n + money((amount * a.percent) / 100), 0),
        )
      : money((amount * allocations[index].percent) / 100)
  return {
    ...e,
    total: portion(getExpenseTotal(e)),
    total_override: portion(getExpenseTotal(e)),
    payments: paymentsOf(e).map((p) => ({ ...p, amount: portion(p.amount) })),
    original_estimate:
      e.original_estimate == null ? null : portion(e.original_estimate),
    return_amount: portion(e.return_amount ?? 0),
  }
}
export function materialQuantity(
  area: number,
  waste: number,
  packSize: number,
) {
  const required = money(area * (1 + waste / 100))
  const packs = packSize > 0 ? Math.ceil(required / packSize) : 0
  return { required, packs, purchased: money(packs * packSize) }
}
export function settlement(
  expenses: Expense[],
  members: { id: string; name: string }[],
  shares: Record<string, number> = {},
) {
  const totals = members.map((m) => ({
    ...m,
    paid: money(
      expenses.filter(included).reduce(
        (sum, e) =>
          sum +
          paymentsOf(e)
            .filter((p) => p.paid_by === m.id)
            .reduce(
              (n, p) => n + (p.kind === 'refund' ? -p.amount : p.amount),
              0,
            ),
        0,
      ),
    ),
  }))
  const total = money(totals.reduce((n, m) => n + m.paid, 0))
  const valid =
    members.length > 0 &&
    Math.abs(members.reduce((n, m) => n + (shares[m.id] ?? 0), 0) - 100) < 0.001
  return totals.map((m) => ({
    ...m,
    share: valid ? shares[m.id] : 100 / members.length,
    balance: money(
      m.paid - total * (valid ? shares[m.id] / 100 : 1 / members.length),
    ),
  }))
}
export function validateExpense(form: ExpenseFormData): string | null {
  if (!form.description.trim()) return 'Skriv hva posten gjelder.'
  const vals = [
    form.quantity,
    form.unit_price,
    form.discount_amount ?? 0,
    form.discount_percent ?? 0,
    form.return_amount ?? 0,
    form.total_override ?? 0,
  ]
  if (vals.some((n) => !Number.isFinite(n) || n < 0))
    return 'Beløp og mengder må være gyldige, positive tall.'
  if ((form.discount_percent ?? 0) > 100)
    return 'Rabatten kan ikke være over 100 %.'
  const total = calculateTotal(form)
  if ((form.return_amount ?? 0) > total)
    return 'Returbeløpet kan ikke være større enn kjøpet.'
  const payments = form.payments ?? []
  if (
    payments.some(
      (p) =>
        !Number.isFinite(p.amount) ||
        p.amount <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(p.date),
    )
  )
    return 'Fyll inn beløp og dato for alle betalinger.'
  const netPaid = money(
    payments.reduce(
      (n, p) => n + (p.kind === 'refund' ? -p.amount : p.amount),
      0,
    ),
  )
  if (netPaid < 0) return 'Refusjon kan ikke overstige innbetalt beløp.'
  if (
    payments
      .filter((p) => p.kind === 'refund')
      .reduce((n, p) => n + p.amount, 0) > (form.return_amount ?? 0)
  )
    return 'Registrer returbeløpet før refusjonen.'
  if (payments.some((p) => p.kind === 'payment') && form.price_known === false)
    return 'Legg inn kjøpsprisen før du registrerer betaling.'
  if (netPaid > total) return 'Betalt beløp kan ikke overstige kjøpsprisen.'
  if (
    payments.length &&
    (form.status === 'planned' || form.status === 'quoted')
  )
    return 'Velg Bestilt eller Kjøpt for en post med betalinger.'
  if (form.budget_included === false && (payments.length || !isPlanned(form)))
    return 'Et alternativ med bestilling eller betaling må være med i budsjettet.'
  if (
    form.allocations &&
    new Set(form.allocations.map((a) => a.room_id)).size !==
      form.allocations.length
  )
    return 'Et rom kan bare forekomme én gang i fordelingen.'
  if (
    form.original_estimate != null &&
    (!Number.isFinite(form.original_estimate) || form.original_estimate < 0)
  )
    return 'Estimatet må være et gyldig positivt tall.'
  if (
    form.allocations?.length &&
    (form.allocations.some(
      (a) => !Number.isFinite(a.percent) || a.percent <= 0,
    ) ||
      Math.abs(form.allocations.reduce((n, a) => n + a.percent, 0) - 100) >
        0.001)
  )
    return 'Romfordelingen må bli nøyaktig 100 %.'
  if (form.product_url && !/^https?:\/\//i.test(form.product_url))
    return 'Produktlenken må begynne med https:// eller http://.'
  return null
}

export function applySelectedAlternative<
  T extends {
    id: string
    status: Expense['status']
    deleted_at: string | null
    alternative_group?: string | null
    budget_included?: boolean
    payments?: Payment[]
    updated_at: string
  },
>(rows: T[], selected: T): T[] {
  const key = selected.alternative_group?.trim().toLocaleLowerCase('nb')
  if (!key || selected.budget_included === false) return rows
  return rows.map((row) => {
    if (
      row.id === selected.id ||
      row.deleted_at ||
      row.alternative_group?.trim().toLocaleLowerCase('nb') !== key
    )
      return row
    if (!isPlanned(row) || row.payments?.length)
      throw new Error(
        'Et annet tilbud i gruppen er allerede bestilt eller betalt. Endre gruppen eller behold posten som alternativ.',
      )
    return { ...row, budget_included: false, updated_at: selected.updated_at }
  })
}
