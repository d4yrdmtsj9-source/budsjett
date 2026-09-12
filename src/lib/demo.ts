import {
  emptyProject,
  uid,
  saveProject,
  saveSession,
  getOrCreateDeviceKey,
} from './localStore'
import type { LocalExpense } from './localStore'
import { defaultExpenseForm } from './calc'
import { todayISO } from './format'
export async function startDemo() {
  const code = `DEMO-${uid()}`
  const p = emptyProject('Hjemme hos oss', 600000, code)
  p.id = `demo-${uid()}`
  p.reserve_amount = 60000
  const deviceKey = getOrCreateDeviceKey()
  p.members = [
    { id: 'demo-a', display_name: 'Alex', device_keys: [deviceKey] },
    { id: 'demo-b', display_name: 'Robin', device_keys: [] },
  ]
  p.rooms = [
    { id: 'kitchen', name: 'Kjøkken', budget: 280000 },
    { id: 'bath', name: 'Bad', budget: 180000 },
    { id: 'living', name: 'Stue', budget: 65000 },
    { id: 'outdoor', name: 'Uteområde', budget: 15000 },
  ].map((r, i) => ({ ...r, sort_order: i, archived: false, deleted_at: null }))
  p.categories = ['Materialer', 'Arbeid', 'Hvitevarer', 'Belysning'].map(
    (name, i) => ({ id: `cat-${i}`, name, budget: 0 }),
  )
  const now = new Date().toISOString()
  const create = (
    description: string,
    room_id: string,
    total: number,
    status: LocalExpense['status'],
    paid: number,
    extras: Partial<LocalExpense> = {},
  ): LocalExpense => ({
    ...defaultExpenseForm(),
    id: uid(),
    description,
    room_id,
    total,
    total_override: total,
    price_known: total > 0,
    status,
    unit: 'stk',
    expense_date: todayISO(),
    supplier: null,
    who_paid: paid ? 'demo-a' : null,
    notes: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: 'demo-a',
    updated_by: 'demo-a',
    payments: paid
      ? [
          {
            id: uid(),
            amount: paid,
            paid_by: 'demo-a',
            kind: 'payment',
            date: todayISO(),
          },
        ]
      : [],
    budget_included: true,
    ...extras,
  })
  const due = new Date()
  due.setDate(due.getDate() + 7)
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
  p.expenses = [
    create('Kjøkkeninnredning', 'kitchen', 154000, 'ordered', 30000, {
      supplier: 'Kjøkkenleverandøren',
      original_estimate: 150000,
      due_date: dueDate,
    }),
    create('Keramisk benkeplate', 'kitchen', 42000, 'quoted', 0, {
      supplier: 'Steinverkstedet',
    }),
    create('Hvitevarepakke', 'kitchen', 51000, 'planned', 0),
    create('Baderomsarbeid', 'bath', 130000, 'ordered', 60000, {
      supplier: 'Lokalt byggfirma',
    }),
    create('Fliser og fug', 'bath', 26500, 'purchased', 26500, {
      supplier: 'Flisbutikken',
      payments: [
        {
          id: uid(),
          amount: 26500,
          kind: 'payment',
          paid_by: 'demo-b',
          date: todayISO(),
        },
      ],
    }),
    create('Armatur og dusj', 'bath', 18000, 'planned', 0),
    create('Eikegulv', 'living', 31800, 'purchased', 31800, {
      supplier: 'Gulvbutikken',
      original_estimate: 34000,
    }),
    create('Maling og verktøy', 'living', 8600, 'purchased', 8600, {
      payments: [
        {
          id: uid(),
          amount: 8600,
          kind: 'payment',
          paid_by: 'demo-b',
          date: todayISO(),
        },
      ],
    }),
    create('Belysning', 'living', 12500, 'planned', 0),
    create('Singel til gårdsplassen', 'outdoor', 9500, 'planned', 0),
    create('Frakt på benkeplate', 'kitchen', 0, 'planned', 0),
    create('Elektriker', 'living', 0, 'planned', 0),
  ]
  p.activity = [
    {
      id: uid(),
      actor_id: 'demo-a',
      actor_name: 'Alex',
      event_type: 'expense_updated',
      summary: 'Alex registrerte forskudd på kjøkkenet',
      created_at: now,
    },
    {
      id: uid(),
      actor_id: 'demo-b',
      actor_name: 'Robin',
      event_type: 'expense_updated',
      summary: 'Robin la til fliser til badet',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ]
  await saveProject(p)
  await saveSession({
    deviceKey,
    displayName: 'Alex',
    memberId: 'demo-a',
    projectId: p.id,
    inviteCode: code,
  })
  window.location.reload()
}
