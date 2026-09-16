import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roomMoodboard } from '../src/lib/moodboard.ts'
import { emptyProject, type LocalRoom } from '../src/lib/localStore.ts'
import { mergeProjects } from '../src/lib/mergeProjects.ts'
import type { Inspiration } from '../src/lib/planning.ts'
const room: LocalRoom = {
  id: 'room',
  name: 'Kjøkken',
  budget: 0,
  archived: false,
  deleted_at: null,
  sort_order: 0,
}
const idea = (
  id: string,
  status: Inspiration['status'],
  date: string,
): Inspiration => ({
  id,
  title: 'Bilde',
  room_id: room.id,
  image_id: id,
  before_image_id: null,
  notes: '',
  link: '',
  palette: [],
  price: null,
  status,
  votes: {},
  deleted_at: null,
  updated_at: date,
})
const images = [
  idea('latest', 'idea', '2026-09-16'),
  idea('main', 'chosen', '2026-09-15'),
]
test('one legacy image per room, preferring chosen, with explicit replacement and removal', () => {
  assert.equal(roomMoodboard(room, images), 'main')
  assert.equal(roomMoodboard({ ...room, id: 'other' }, images), null)
  assert.equal(
    roomMoodboard({ ...room, moodboard_image_id: 'replacement' }, images),
    'replacement',
  )
  assert.equal(
    roomMoodboard({ ...room, moodboard_image_id: null }, images),
    null,
  )
  assert.equal(
    roomMoodboard(
      room,
      images.map((i) => ({ ...i, status: 'idea' })),
    ),
    'latest',
  )
})
test('a synced removal stays empty instead of resurfacing an old inspiration', () => {
  const p = emptyProject('Test', 0, 'TEST')
  p.rooms = [
    { ...room, moodboard_image_id: 'old', updated_at: '2026-09-15T10:00:00Z' },
  ]
  p.inspirations = images
  const removed = {
    ...p,
    rooms: [
      { ...room, moodboard_image_id: null, updated_at: '2026-09-16T10:00:00Z' },
    ],
  }
  for (const merged of [mergeProjects(p, removed), mergeProjects(removed, p)]) {
    assert.equal(roomMoodboard(merged.rooms[0], merged.inspirations), null)
  }
})
