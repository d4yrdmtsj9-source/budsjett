import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeProjects } from '../src/lib/mergeProjects.ts'
import { emptyProject } from '../src/lib/localStore.ts'
import {
  mergeRecords,
  mergeInspirations,
  validPlanningData,
  safeLink,
  type Inspiration,
} from '../src/lib/planning.ts'
const before = '2026-09-12T10:00:00Z',
  after = '2026-09-12T11:00:00Z'
const idea = (): Inspiration => ({
  id: 'i',
  title: 'Kjøkken',
  room_id: null,
  notes: '',
  link: '',
  image_id: null,
  before_image_id: null,
  palette: ['#ffffff', '#dddddd', '#aaaaaa', '#444444'],
  price: null,
  status: 'idea',
  votes: {},
  updated_at: before,
  deleted_at: null,
})
test('different tasks survive merging and deletion does not resurrect an older record', () => {
  const a = {
    id: 'a',
    title: 'Task',
    updated_at: before,
    deleted_at: null as string | null,
  }
  const deleted = { ...a, deleted_at: after, updated_at: after }
  const rows = mergeRecords([deleted], [a, { ...a, id: 'b' }])
  assert.equal(rows.length, 2)
  assert.equal(rows.find((r) => r.id === 'a')?.deleted_at, after)
})
test('partner votes merge independently from the inspiration content', () => {
  const a = {
    ...idea(),
    title: 'Nytt kjøkken',
    updated_at: after,
    votes: { a: { liked: true, updated_at: after } },
  }
  const b = { ...idea(), votes: { b: { liked: true, updated_at: after } } }
  const merged = mergeInspirations([a], [b])[0]
  assert.equal(merged.title, 'Nytt kjøkken')
  assert.equal(Object.keys(merged.votes).length, 2)
  const unliked = {
    ...b,
    votes: { a: { liked: false, updated_at: '2026-09-12T12:00:00Z' } },
  }
  assert.equal(mergeInspirations([merged], [unliked])[0].votes.a.liked, false)
})
test('old snapshots cannot erase inspiration from a newer client', () => {
  const old = emptyProject('Test', 1000, 'TEST')
  const result = mergeProjects(
    { ...old, inspirations: [idea()] },
    { ...old, updated_at: after },
  )
  assert.equal(result.inspirations?.length, 1)
  assert.deepEqual(result.tasks, [])
})
test('planning backup accepts legacy projects and rejects malformed new fields', () => {
  assert.equal(validPlanningData({}), true)
  assert.equal(validPlanningData({ inspirations: [idea()], tasks: [] }), true)
  for (const value of [
    null,
    {},
    [null],
    [{ ...idea(), votes: [] }],
    [{ ...idea(), price: -1 }],
    [{ ...idea(), link: 'javascript:alert(1)' }],
  ])
    assert.equal(validPlanningData({ inspirations: value }), false)
  assert.equal(validPlanningData({ tasks: 'invalid' }), false)
})
test('links only accept web schemes', () => {
  assert.equal(safeLink('javascript:alert(1)'), null)
  assert.equal(safeLink('data:text/html,test'), null)
  assert.equal(safeLink('https://example.com/item'), 'https://example.com/item')
})
