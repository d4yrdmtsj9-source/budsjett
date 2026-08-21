/**
 * Local-first store for Renover.
 * Data lives in IndexedDB, is mirrored to the cloud snapshot, and also
 * syncs live over Supabase Realtime broadcast when both devices are open.
 */

const DB_NAME = 'renover-db'
const DB_VERSION = 1
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as T) ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export type ExpenseStatus = 'planned' | 'quoted' | 'ordered' | 'purchased' | 'paid'

export interface LocalMember {
  id: string
  display_name: string
  /** @deprecated use device_keys — kept for older backups */
  device_key?: string
  /** All devices that have claimed this person */
  device_keys: string[]
}

export interface LocalRoom {
  id: string
  name: string
  budget: number
  sort_order: number
  archived: boolean
  deleted_at: string | null
}

export interface LocalCategory {
  id: string
  name: string
  budget: number
}

export interface LocalExpense {
  id: string
  room_id: string | null
  category_id: string | null
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_override: number | null
  discount_percent: number | null
  discount_amount: number | null
  supplier: string | null
  expense_date: string
  status: ExpenseStatus
  who_paid: string | null
  notes: string | null
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  total: number
}

export interface LocalActivity {
  id: string
  actor_id: string | null
  actor_name: string
  event_type: string
  summary: string
  created_at: string
}

export interface LocalProject {
  id: string
  name: string
  invite_code: string
  total_budget: number
  created_at: string
  members: LocalMember[]
  rooms: LocalRoom[]
  categories: LocalCategory[]
  expenses: LocalExpense[]
  activity: LocalActivity[]
  updated_at: string
}

export interface LocalSession {
  deviceKey: string
  displayName: string
  memberId: string
  projectId: string
  inviteCode: string
}

const SESSION_KEY = 'renover-session-v2'
const PROJECT_PREFIX = 'renover-project:'

export function uid() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Normalize older backups that only had device_key */
export function normalizeMember(m: LocalMember): LocalMember {
  const keys = Array.from(
    new Set(
      [...(m.device_keys ?? []), m.device_key].filter((k): k is string => !!k),
    ),
  )
  return {
    id: m.id,
    display_name: m.display_name,
    device_keys: keys,
    device_key: keys[0],
  }
}

export function normalizeProject(project: LocalProject): LocalProject {
  return {
    ...project,
    members: project.members.map(normalizeMember),
  }
}

const DEVICE_KEY_LS = 'renover-device-key'

/** Stable per-browser device id (survives sign-out) */
export function getOrCreateDeviceKey() {
  try {
    const existing = localStorage.getItem(DEVICE_KEY_LS)
    if (existing) return existing
    const next = uid()
    localStorage.setItem(DEVICE_KEY_LS, next)
    return next
  } catch {
    return uid()
  }
}

export async function loadSession(): Promise<LocalSession | null> {
  return idbGet<LocalSession>(SESSION_KEY)
}

export async function saveSession(session: LocalSession | null) {
  if (!session) {
    const db = await openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(SESSION_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
  await idbSet(SESSION_KEY, session)
}

export async function loadProject(projectId: string): Promise<LocalProject | null> {
  const p = await idbGet<LocalProject>(PROJECT_PREFIX + projectId)
  return p ? normalizeProject(p) : null
}

export async function loadProjectByInvite(code: string): Promise<LocalProject | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve(null)
        return
      }
      if (typeof cursor.key === 'string' && cursor.key.startsWith(PROJECT_PREFIX)) {
        const p = cursor.value as LocalProject
        if (p.invite_code === code.toUpperCase()) {
          resolve(normalizeProject(p))
          return
        }
      }
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveProject(project: LocalProject, opts?: { touch?: boolean }) {
  const normalized = normalizeProject(project)
  if (opts?.touch !== false) {
    normalized.updated_at = new Date().toISOString()
  }
  await idbSet(PROJECT_PREFIX + normalized.id, normalized)
  await idbSet(`renover-invite:${normalized.invite_code}`, normalized.id)
  return normalized
}

export function emptyProject(name: string, budget: number, invite: string): LocalProject {
  const now = new Date().toISOString()
  return {
    id: uid(),
    name,
    invite_code: invite,
    total_budget: budget,
    created_at: now,
    updated_at: now,
    members: [],
    rooms: [],
    categories: [],
    expenses: [],
    activity: [],
  }
}

export type ProjectListener = (project: LocalProject) => void

const listeners = new Set<ProjectListener>()

export function subscribeProject(fn: ProjectListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function notifyProject(project: LocalProject) {
  listeners.forEach((fn) => fn(project))
}

export async function updateProject(
  projectId: string,
  updater: (p: LocalProject) => LocalProject,
) {
  const current = await loadProject(projectId)
  if (!current) throw new Error('Prosjekt ikke funnet')
  const next = updater({ ...current })
  await saveProject(next)
  notifyProject(next)
  return next
}
