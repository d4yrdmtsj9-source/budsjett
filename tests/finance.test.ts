import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  financials,
  validateExpense,
  roomPortion,
  settlement,
  materialQuantity,
  netCost,
  outstanding,
  pendingRefund,
} from '../src/lib/finance.ts'
import { normalizeProject, normalizeExpense } from '../src/lib/localStore.ts'
import { calculateTotal, defaultExpenseForm } from '../src/lib/calc.ts'
import type { Expense, ExpenseFormData } from '../src/lib/types'
import type { LocalProject, LocalExpense } from '../src/lib/localStore'
const expense = (patch: Partial<Expense> = {}): Expense => ({
  ...defaultExpenseForm(),
  id: 'one',
  project_id: 'project',
  total: 1000,
  unit_price: 1000,
  status: 'planned',
  price_known: true,
  deleted_at: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...patch,
})
const payment = (amount: number, paid_by = 'a') => ({
  id: String(amount),
  amount,
  paid_by,
  date: '2026-09-12',
  kind: 'payment' as const,
})
test('deposit + commitment + plan counted once', () => {
  const f = financials(
    [
      expense({ total: 150000, status: 'ordered', payments: [payment(30000)] }),
      expense({ id: 'two', total: 40000 }),
    ],
    250000,
    25000,
  )
  assert.equal(f.paid, 30000)
  assert.equal(f.ordered, 120000)
  assert.equal(f.planned, 40000)
  assert.equal(f.projected, 190000)
  assert.equal(f.available, 35000)
  assert.equal(f.reserveLeft, 25000)
})
test('reserve inside total budget', () => {
  const f = financials([expense({ total: 950 })], 1000, 100)
  assert.equal(f.remaining, 50)
  assert.equal(f.reserveUsed, 50)
  assert.equal(f.reserveLeft, 50)
  assert.equal(
    financials([expense({ total: 1100 })], 1000, 100).remaining,
    -100,
  )
})
test('free vs missing; excluded alternatives and deleted rows do not count', () => {
  const f = financials([
    expense({ total: 0, total_override: 0, price_known: true }),
    expense({ id: 'missing', total: 0, total_override: 0, price_known: false }),
    expense({ id: 'quote', budget_included: false }),
    expense({ id: 'deleted', deleted_at: '2026-09-12' }),
  ])
  assert.equal(f.missing, 1)
  assert.equal(f.projected, 0)
  assert.equal(f.count, 2)
})
test('legacy purchases retain money paid; estimates not invented', () => {
  for (const status of ['purchased', 'paid'] as const) {
    const e = normalizeExpense(
      expense({
        status,
        price_known: undefined,
        payments: undefined,
      }) as LocalExpense,
    )
    assert.equal(e.status, status)
    assert.equal(e.original_estimate, null)
    assert.equal(financials([e as Expense]).paid, 1000)
  }
  assert.equal(
    normalizeExpense(expense({ status: 'ordered' }) as LocalExpense).status,
    'ordered',
  )
})
test('pending and received refunds do not double count', () => {
  const e = expense({
    status: 'purchased',
    payments: [payment(1000)],
    return_amount: 200,
  })
  assert.equal(netCost(e), 800)
  assert.equal(pendingRefund(e), 200)
  assert.equal(outstanding(e), 0)
  const f = financials([e])
  assert.equal(f.paid, 1000)
  assert.equal(f.projected, 800)
  const refunded = {
    ...e,
    payments: [...e.payments!, { ...payment(200), kind: 'refund' as const }],
  }
  assert.equal(financials([refunded]).paid, 800)
  assert.equal(pendingRefund(refunded), 0)
  assert.equal(financials([refunded]).projected, 800)
})
test('room allocations preserve total and deposit', () => {
  const e = expense({
    total: 10000,
    status: 'ordered',
    payments: [payment(3000)],
    original_estimate: 9000,
    allocations: [
      { room_id: 'kitchen', percent: 60 },
      { room_id: 'living', percent: 40 },
    ],
  })
  const a = roomPortion(e, 'kitchen')!,
    b = roomPortion(e, 'living')!
  assert.equal(financials([a]).projected, 6000)
  assert.equal(financials([b]).projected, 4000)
  assert.equal(a.original_estimate, 5400)
  assert.equal(financials([a, b]).paid, 3000)
  assert.equal(roomPortion(e, 'other'), null)
})
test('50/50 settlement is half the difference, shared account excluded', () => {
  const e = expense({
    payments: [payment(1000, 'a'), payment(400, 'b'), payment(9999, 'common')],
  })
  const rows = settlement(
    [e],
    [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
  )
  assert.equal(rows[0].balance, 300)
  assert.equal(rows[1].balance, -300)
  assert.equal(
    settlement(
      [e],
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { a: 70, b: 30 },
    )[0].balance,
    20,
  )
})
test('material needs rounded to complete packs', () =>
  assert.deepEqual(materialQuantity(23, 10, 2.2), {
    required: 25.3,
    packs: 12,
    purchased: 26.4,
  }))
test('reject misleading financial input', () => {
  const f: ExpenseFormData = {
    ...defaultExpenseForm(),
    description: 'Kitchen',
    unit_price: 1000,
    price_known: true,
  }
  assert.equal(validateExpense(f), null)
  assert.match(validateExpense({ ...f, discount_percent: 101 })!, /Rabatt/)
  assert.match(validateExpense({ ...f, payments: [payment(100)] })!, /Bestilt/)
  assert.match(
    validateExpense({ ...f, status: 'ordered', payments: [payment(1001)] })!,
    /overstige/,
  )
  assert.match(validateExpense({ ...f, return_amount: 1001 })!, /Returbeløpet/)
  assert.match(
    validateExpense({ ...f, allocations: [{ room_id: 'a', percent: 90 }] })!,
    /100/,
  )
  assert.match(validateExpense({ ...f, unit_price: Infinity })!, /gyldige/)
  assert.match(
    validateExpense({ ...f, product_url: 'javascript:alert(1)' })!,
    /https/,
  )
})
test('explicit zero and decimal currency', () => {
  assert.equal(
    calculateTotal({
      quantity: 2,
      unit_price: 100,
      total_override: 0,
      discount_percent: null,
      discount_amount: null,
    }),
    0,
  )
  assert.equal(
    financials([expense({ total: 0.1 }), expense({ total: 0.2 })]).projected,
    0.3,
  )
})
test('idempotent migration preserves v2 fields', () => {
  const p = {
    id: 'p',
    members: [],
    rooms: [],
    categories: [],
    expenses: [
      expense({
        original_estimate: 800,
        payments: [payment(100)],
        status: 'ordered',
      }),
    ],
    activity: [],
    reserve_amount: 500,
  } as unknown as LocalProject
  const n = normalizeProject(p)
  assert.deepEqual(normalizeProject(n), n)
  assert.equal(n.expenses[0].original_estimate, 800)
  assert.equal(n.reserve_amount, 500)
})

test('penny allocation totals exactly across three rooms', () => {
  const e = expense({
    total: 1,
    allocations: [
      { room_id: 'a', percent: 33.33 },
      { room_id: 'b', percent: 33.33 },
      { room_id: 'c', percent: 33.34 },
    ],
  })
  assert.equal(
    financials(['a', 'b', 'c'].map((id) => roomPortion(e, id)!)).projected,
    1,
  )
})
test('free legacy purchase does not create a zero-value payment', () => {
  assert.deepEqual(
    normalizeExpense(
      expense({
        status: 'purchased',
        total: 0,
        payments: undefined,
      }) as LocalExpense,
    ).payments,
    [],
  )
})
