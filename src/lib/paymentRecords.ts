import type { Payment } from './financeTypes.ts'
export function stampPayments(next: Payment[], previous: Payment[], now: string): Payment[] {
  const content = (p: Payment) => JSON.stringify([p.amount, p.kind, p.paid_by, p.date, !!p.deleted_at])
  const rows = next.map(p => {
    const old = previous.find(o => o.id === p.id)
    return { ...p, updated_at: old && content(old) === content(p) ? old.updated_at ?? now : now }
  })
  for (const old of previous) if (!rows.some(p => p.id === old.id)) rows.push({ ...old, deleted_at: old.deleted_at ?? now, updated_at: old.deleted_at ? old.updated_at ?? now : now })
  return rows
}
export function mergePayments(a: Payment[], b: Payment[], aStamp: string, bStamp: string): Payment[] {
  const result = new Map<string, Payment>()
  for (const [rows, fallback] of [[a, aStamp], [b, bStamp]] as const) for (const raw of rows) {
    const p = { ...raw, updated_at: raw.updated_at ?? fallback }
    const old = result.get(p.id)
    if (!old || p.updated_at > (old.updated_at ?? '') || (p.updated_at === old.updated_at && !!p.deleted_at)) result.set(p.id, p)
  }
  return [...result.values()]
}
