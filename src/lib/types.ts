export type ExpenseStatus = 'planned' | 'quoted' | 'ordered' | 'purchased' | 'paid'

export interface Profile {
  id: string
  display_name: string | null
  created_at?: string
}

export interface RenovationProject {
  id: string
  name: string
  invite_code: string
  total_budget: number
  created_by: string
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Room {
  id: string
  project_id: string
  name: string
  budget: number
  sort_order: number
  archived: boolean
  deleted_at: string | null
  created_at: string
}

export interface Category {
  id: string
  project_id: string
  name: string
  budget: number
  created_at: string
}

export interface Expense {
  id: string
  project_id: string
  room_id: string | null
  category_id: string | null
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total_override: number | null
  discount_percent: number | null
  discount_amount: number | null
  supplier: string | null
  expense_date: string | null
  status: ExpenseStatus
  who_paid: string | null
  notes: string | null
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
  total: number
  created_at: string
  updated_at: string
  room?: Room
  category?: Category
}

export interface ExpenseAttachment {
  id: string
  expense_id: string
  file_path: string
  file_name: string
  created_at: string
}

export interface ActivityEvent {
  id: string
  project_id: string
  user_id: string | null
  actor_id?: string | null
  action?: string
  entity_type?: string
  entity_id?: string | null
  summary?: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  profile?: Profile
}

export interface ExpenseFormData {
  description: string
  room_id: string | null
  category_id: string | null
  quantity: number
  unit: string
  unit_price: number
  total_override: number | null
  discount_percent: number | null
  discount_amount: number | null
  supplier: string
  expense_date: string
  status: ExpenseStatus
  who_paid: string
  notes: string
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  planned: 'Planlagt',
  quoted: 'Tilbud',
  ordered: 'Bestilt',
  purchased: 'Kjøpt',
  paid: 'Betalt',
}

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  planned: 'bg-slate-100 text-slate-700',
  quoted: 'bg-amber-100 text-amber-800',
  ordered: 'bg-blue-100 text-blue-800',
  purchased: 'bg-teal-100 text-teal-800',
  paid: 'bg-emerald-100 text-emerald-800',
}

export const DEFAULT_UNITS = ['stk', 'm', 'm²', 'm³', 'kg', 'liter', 'pakke', 'time']
