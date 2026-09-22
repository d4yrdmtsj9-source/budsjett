import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paymentDueRows, taskBlockers, validateTask } from '../src/lib/workflow.ts'
import { mergePayments, stampPayments } from '../src/lib/paymentRecords.ts'
import { defaultExpenseForm } from '../src/lib/calc.ts'
import { financials } from '../src/lib/finance.ts'
import type { Expense } from '../src/lib/types.ts'
import type { ProjectTask } from '../src/lib/planning.ts'
const expense = (patch: Partial<Expense> = {}): Expense => ({ ...defaultExpenseForm(), id: 'e', project_id: 'p', total: 1000, unit_price: 1000, price_known: true, status: 'ordered', deleted_at: null, created_by: null, updated_by: null, created_at: '2026-09-01', updated_at: '2026-09-01', ...patch })
const task = (patch: Partial<ProjectTask> = {}): ProjectTask => ({ id: 't', title: 'Gulv', room_id: null, status: 'todo', due_date: '', owner_id: null, milestone: false, notes: '', updated_at: '2026-09-01', deleted_at: null, ...patch })
const payment = (id: string, amount: number) => ({ id, amount, kind: 'payment' as const, paid_by: 'a', date: '2026-09-01', updated_at: '2026-09-01' })
const schedule = [{ id: 'a', date: '2026-09-01', amount: 400, label: '' }, { id: 'b', date: '2026-10-01', amount: 600, label: '' }]
test('deposit consumes earliest installments without adding costs', () => {
 const e = expense({ payments: [payment('p', 500)], payment_schedule: schedule })
 assert.deepEqual(paymentDueRows(e).map(r => [r.date, r.amount]), [['2026-10-01', 500]])
 assert.equal(financials([e]).projected, 1000)
})
test('partial schedule exposes unallocated rest and returns cap remaining installments', () => {
 assert.deepEqual(paymentDueRows(expense({payment_schedule: schedule.slice(0,1)})).map(r => [r.date,r.amount]), [['2026-09-01',400],['',600]])
 assert.equal(paymentDueRows(expense({ payments: [payment('p', 500)], return_amount: 300, payment_schedule: schedule })).reduce((n,r) => n+r.amount,0),200)
 assert.deepEqual(paymentDueRows(expense({status:'planned',payment_schedule:schedule})),[])
})
test('task waits for dependencies and actual delivery, not payment', () => {
 const t = task({ depends_on: ['before'], expense_ids: ['e'] })
 const dep = task({id:'before',status:'done'})
 assert.equal(taskBlockers(t,[dep], [expense({payments:[payment('p',1000)]})]).length,1)
 assert.deepEqual(taskBlockers(t,[dep],[expense({delivery_status:'received'})]),[])
 assert.equal(taskBlockers(t,[],[]).length,2)
})
test('dependency cycles are rejected, valid chains accepted', () => {
 assert.ok(validateTask(task({depends_on:['t']}),[]))
 assert.ok(validateTask(task({depends_on:['b']}),[task({id:'b',depends_on:['t']})]))
 assert.equal(validateTask(task({depends_on:['b']}),[task({id:'b'})]),null)
})
test('independent device payments survive merge without duplicate counting', () => {
 const a = [payment('first',200)], b = [payment('second',300)]
 const merged = mergePayments(a,b,'2026-09-01','2026-09-02')
 assert.equal(financials([expense({payments:merged})]).paid,500)
 assert.equal(mergePayments(merged,merged,'2026-09-02','2026-09-02').length,2)
})
test('deleted payment stays deleted against stale device and unrelated edit', () => {
 const old = [payment('p',100)]
 const removed = stampPayments([],old,'2026-09-03')
 const merged = mergePayments(removed,old,'2026-09-03','2026-09-04')
 assert.equal(financials([expense({payments:merged})]).paid,0)
 assert.equal(stampPayments(removed,removed,'2026-09-05')[0].updated_at,'2026-09-03')
})
