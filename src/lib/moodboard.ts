import type { LocalRoom } from './localStore.ts'
import type { Inspiration } from './planning.ts'

/** Explicit null means removed; only untouched rooms fall back to an old image. */
export function roomMoodboard(
  room: LocalRoom,
  ideas: Inspiration[] = [],
): string | null {
  if (room.moodboard_image_id !== undefined) return room.moodboard_image_id
  const legacy = ideas
    .filter(
      (i) =>
        !i.deleted_at &&
        i.room_id === room.id &&
        (i.image_id || i.before_image_id),
    )
    .sort(
      (a, b) =>
        Number(b.status === 'chosen') - Number(a.status === 'chosen') ||
        b.updated_at.localeCompare(a.updated_at) ||
        a.id.localeCompare(b.id),
    )
  return legacy[0]?.image_id ?? legacy[0]?.before_image_id ?? null
}
