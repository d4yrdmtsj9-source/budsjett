import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyProject,
  deleteProjectCategory,
  normalizeProject,
} from '../src/lib/localStore.ts'
import type { LocalExpense } from '../src/lib/localStore.ts'
import { defaultExpenseForm } from '../src/lib/calc.ts'
import { mergeProjects } from '../src/lib/mergeProjects.ts'

function fixture() {
  const p = emptyProject('Test', 10000, 'TEST')
  p.categories = [{ id: 'c', name: 'Materialer', budget: 1000 }]
  p.expenses = [
    {
      ...defaultExpenseForm(),
      id: 'e',
      category_id: 'c',
      total: 1000,
      payments: [
        {
          id: 'pay',
          amount: 250,
          kind: 'payment',
          paid_by: null,
          date: '2026-09-13',
        },
      ],
      updated_at: '2026-09-12T10:00:00Z',
      deleted_at: null,
    } as LocalExpense,
  ]
  return p
}
test('deleting a used category preserves every purchase field except category and is idempotent', () => {
  const p = fixture()
  const result = deleteProjectCategory(p, 'c')
  assert.ok(result.categories[0].deleted_at)
  assert.deepEqual(result.expenses, [{ ...p.expenses[0], category_id: null }])
  assert.deepEqual(deleteProjectCategory(result, 'c'), result)
  assert.equal(p.expenses[0].category_id, 'c')
})
test('offline edits cannot resurrect deleted categories or reattach a purchase', () => {
  const old = fixture()
  const deleted = deleteProjectCategory(old, 'c')
  const offline = structuredClone(old)
  offline.categories[0].updated_at = '2099-01-01T00:00:00Z'
  offline.expenses[0].updated_at = '2099-01-01T00:00:00Z'
  offline.expenses[0].notes = 'Keep this later edit'
  for (const result of [
    mergeProjects(deleted, offline),
    mergeProjects(offline, deleted),
  ]) {
    assert.ok(result.categories[0].deleted_at)
    assert.equal(result.expenses[0].category_id, null)
    assert.equal(result.expenses[0].notes, 'Keep this later edit')
    assert.equal(result.expenses[0].total, 1000)
  }
  assert.equal(
    normalizeProject({ ...deleted, expenses: old.expenses }).expenses[0]
      .category_id,
    null,
  )
})
