import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeProjects, projectFingerprint } from '../src/lib/mergeProjects.ts'
import { applySelectedAlternative } from '../src/lib/finance.ts'
import type { LocalProject } from '../src/lib/localStore'
const now = '2026-09-12T12:00:00Z',
  later = '2026-09-12T12:01:00Z'
const project = (): LocalProject => ({
  id: 'p',
  name: 'Test',
  invite_code: 'ABCDEF',
  total_budget: 10000,
  reserve_amount: 1000,
  members: [],
  rooms: [],
  categories: [],
  expenses: [],
  activity: [],
  created_at: now,
  updated_at: now,
})
test('fingerprint notices reserve, room budgets and cost shares', () => {
  const p = project()
  assert.notEqual(
    projectFingerprint(p),
    projectFingerprint({ ...p, reserve_amount: 2000 }),
  )
  const a = {
    ...p,
    rooms: [
      {
        id: 'r',
        name: 'Room',
        budget: 1000,
        sort_order: 0,
        archived: false,
        deleted_at: null,
      },
    ],
  }
  assert.notEqual(
    projectFingerprint(a),
    projectFingerprint({ ...a, rooms: [{ ...a.rooms[0], budget: 2000 }] }),
  )
})
test('newer room update survives unrelated newer project snapshot', () => {
  const a = {
    ...project(),
    rooms: [
      {
        id: 'r',
        name: 'Room',
        budget: 2000,
        sort_order: 0,
        archived: false,
        deleted_at: null,
        updated_at: later,
      },
    ],
  }
  const b = {
    ...project(),
    updated_at: '2026-09-12T12:02:00Z',
    rooms: [{ ...a.rooms[0], budget: 1000, updated_at: now }],
  }
  assert.equal(mergeProjects(a, b).rooms[0].budget, 2000)
})
test('selecting an alternative excludes its peer but refuses to hide a commitment', () => {
  const a = {
    id: 'a',
    status: 'quoted' as const,
    deleted_at: null,
    alternative_group: 'Kitchen',
    budget_included: true,
    payments: [],
    updated_at: later,
  }
  const b = { ...a, id: 'b', alternative_group: ' kitchen ', updated_at: now }
  assert.equal(applySelectedAlternative([a, b], a)[1].budget_included, false)
  assert.throws(
    () => applySelectedAlternative([a, { ...b, status: 'ordered' }], a),
    /allerede bestilt/,
  )
})
