import { mergePayments } from './paymentRecords.ts'
import type {
  LocalCategory,
  LocalExpense,
  LocalMember,
  LocalProject,
  LocalRoom,
} from './localStore.ts'
import { normalizeMember, normalizeExpense, detachDeletedCategories } from './localStore.ts'
import { mergeRecords, mergeInspirations } from './planning.ts'

function stamp(value: string | null | undefined): number {
  if (!value) return 0
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

function mergeMembers(a: LocalMember[], b: LocalMember[]): LocalMember[] {
  const map = new Map<string, LocalMember>()
  for (const raw of [...a, ...b]) {
    const member = normalizeMember(raw)
    const prev = map.get(member.id)
    if (!prev) {
      map.set(member.id, member)
      continue
    }
    map.set(member.id, {
      ...prev,
      display_name: member.display_name || prev.display_name,
      device_keys: [...new Set([...prev.device_keys, ...member.device_keys])],
      device_key: prev.device_key ?? member.device_key,
    })
  }
  return [...map.values()]
}

function mergeRooms(
  local: LocalRoom[],
  cloud: LocalRoom[],
  preferCloud: boolean,
): LocalRoom[] {
  const map = new Map<string, LocalRoom>()
  const first = preferCloud ? cloud : local
  const second = preferCloud ? local : cloud
  for (const room of first) map.set(room.id, room)
  for (const room of second) {
    const prev = map.get(room.id)
    if (!prev) {
      map.set(room.id, room)
      continue
    }
    const prevGone = !!prev.deleted_at
    const nextGone = !!room.deleted_at
    if (nextGone !== prevGone) {
      map.set(
        room.id,
        stamp(room.deleted_at) >= stamp(prev.deleted_at) ? room : prev,
      )
      continue
    }
    map.set(
      room.id,
      stamp(room.updated_at) > stamp(prev.updated_at) ? room : prev,
    )
  }
  return [...map.values()]
}

function mergeCategories(
  local: LocalCategory[],
  cloud: LocalCategory[],
  preferCloud: boolean,
): LocalCategory[] {
  const map = new Map<string, LocalCategory>()
  const first = preferCloud ? cloud : local
  const second = preferCloud ? local : cloud
  for (const cat of first) map.set(cat.id, cat)
  for (const cat of second) {
    const prev = map.get(cat.id)
    // Deletion wins even when an offline device later renames the old category.
    if (prev && !!prev.deleted_at !== !!cat.deleted_at) {
      map.set(cat.id, cat.deleted_at ? cat : prev)
      continue
    }
    if (!prev || stamp(cat.updated_at) > stamp(prev.updated_at))
      map.set(cat.id, cat)
  }
  return [...map.values()]
}

function mergeExpenses(
  local: LocalExpense[],
  cloud: LocalExpense[],
): LocalExpense[] {
  const map = new Map<string, LocalExpense>()
  for (const expense of [...local, ...cloud]) {
    const prev = map.get(expense.id)
    if (!prev) map.set(expense.id, expense)
    else {
      const chosen = stamp(expense.updated_at) >= stamp(prev.updated_at) ? expense : prev
      map.set(expense.id, { ...chosen, payments: mergePayments(prev.payments ?? normalizeExpense(prev).payments ?? [], expense.payments ?? normalizeExpense(expense).payments ?? [], prev.updated_at, expense.updated_at) })
    }
  }
  return [...map.values()]
}

function mergeActivity(
  local: LocalProject['activity'],
  cloud: LocalProject['activity'],
) {
  const map = new Map<string, LocalProject['activity'][number]>()
  for (const item of [...cloud, ...local]) map.set(item.id, item)
  return [...map.values()]
    .sort((a, b) => stamp(b.created_at) - stamp(a.created_at))
    .slice(0, 40)
}

/** Keep both sides' rooms/expenses instead of replacing the whole snapshot. */
export function mergeProjects(
  local: LocalProject,
  cloud: LocalProject,
): LocalProject {
  const preferCloud = stamp(cloud.updated_at) >= stamp(local.updated_at)
  const base = preferCloud ? cloud : local
  const revisions = new Map<string, NonNullable<LocalProject['expense_history']>[number]>()
  for (const h of [...(local.expense_history ?? []), ...(cloud.expense_history ?? [])]) revisions.set(h.id, h)
  for (const e of local.expenses) {
    const other = cloud.expenses.find(row => row.id === e.id)
    if (other && JSON.stringify(e) !== JSON.stringify(other)) {
      for (const version of [e, other]) {
        const data = JSON.stringify(version)
        let hash = 0; for (let n = 0; n < data.length; n++) hash = ((hash << 5) - hash + data.charCodeAt(n)) | 0
        const id = `${version.id}:${version.updated_at}:${hash}`
        revisions.set(id, { id, expense: version, date: version.updated_at })
      }
    }
  }
  return detachDeletedCategories({
    ...base,
    initial_budget: base.initial_budget ?? local.initial_budget ?? cloud.initial_budget,
    budget_history: [...new Map([...(local.budget_history ?? []), ...(cloud.budget_history ?? [])].map(h => [h.id, h])).values()].sort((a,b) => a.date.localeCompare(b.date)).slice(-50),
    expense_history: [...revisions.values()].sort((a,b) => a.date.localeCompare(b.date)).slice(-100),
    inspirations: mergeInspirations(local.inspirations, cloud.inspirations),
    tasks: mergeRecords(local.tasks, cloud.tasks),
    name: base.name,
    total_budget: base.total_budget,
    members: mergeMembers(local.members, cloud.members),
    rooms: mergeRooms(local.rooms, cloud.rooms, preferCloud),
    categories: mergeCategories(
      local.categories,
      cloud.categories,
      preferCloud,
    ),
    expenses: mergeExpenses(local.expenses, cloud.expenses),
    activity: mergeActivity(local.activity ?? [], cloud.activity ?? []),
    updated_at:
      stamp(local.updated_at) >= stamp(cloud.updated_at)
        ? local.updated_at
        : cloud.updated_at,
  })
}

export function projectFingerprint(project: LocalProject): string {
  // Include payments, reserve, allocations and room/category budgets, not just IDs.
  return JSON.stringify(project)
}
