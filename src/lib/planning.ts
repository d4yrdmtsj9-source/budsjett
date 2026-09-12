export interface ProjectTask {
  id: string
  title: string
  room_id: string | null
  status: 'todo' | 'doing' | 'done'
  due_date: string
  owner_id: string | null
  milestone: boolean
  notes: string
  inspiration_id?: string
  updated_at: string
  deleted_at: string | null
}
export interface Inspiration {
  id: string
  title: string
  room_id: string | null
  notes: string
  link: string
  image_id: string | null
  before_image_id: string | null
  palette: string[]
  price: number | null
  status: 'idea' | 'chosen' | 'finished'
  votes: Record<string, { liked: boolean; updated_at: string }>
  updated_at: string
  deleted_at: string | null
}
export function mergeRecords<T extends { id: string; updated_at: string }>(
  a: T[] = [],
  b: T[] = [],
): T[] {
  const map = new Map<string, T>()
  for (const item of [...a, ...b]) {
    const old = map.get(item.id)
    if (!old || Date.parse(item.updated_at) >= Date.parse(old.updated_at))
      map.set(item.id, item)
  }
  return [...map.values()]
}
export function mergeInspirations(
  a: Inspiration[] = [],
  b: Inspiration[] = [],
) {
  return mergeRecords(a, b).map((item) => {
    const left = a.find((x) => x.id === item.id),
      right = b.find((x) => x.id === item.id)
    const votes = { ...left?.votes }
    for (const [id, vote] of Object.entries(right?.votes ?? {})) {
      if (
        !votes[id] ||
        Date.parse(vote.updated_at) >= Date.parse(votes[id].updated_at)
      )
        votes[id] = vote
    }
    return { ...item, votes }
  })
}
export function safeLink(value: string) {
  if (!value.trim()) return ''
  try {
    const u = new URL(value.trim())
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}
export function validateIdea(idea: Inspiration) {
  if (!idea.title.trim()) return 'Gi ideen et navn.'
  if (idea.price !== null && (!Number.isFinite(idea.price) || idea.price < 0))
    return 'Prisen må være et gyldig beløp eller stå tom.'
  if (safeLink(idea.link) === null)
    return 'Lenken må begynne med https:// eller http://.'
  if (!idea.palette.every((c) => /^#[0-9a-f]{6}$/i.test(c)))
    return 'Bruk gyldige fargekoder.'
  return null
}
export const palettePresets = [
  {
    name: 'Varm minimalisme',
    colors: ['#ded2bf', '#a59480', '#674936', '#292f29'],
    note: 'Rolige naturtoner, mørkt tre og myke kontraster.',
  },
  {
    name: 'Lyst & levende',
    colors: ['#eee8de', '#c7ba9f', '#87917a', '#bf785a'],
    note: 'Lys eik, grønne innslag og en varm detalj.',
  },
  {
    name: 'Mørk eleganse',
    colors: ['#504235', '#292c2a', '#b29a77', '#ded9cd'],
    note: 'Dype toner, stein og varmt metall.',
  },
]

/** Reject malformed planning records before a backup can replace a project. */
export function validPlanningData(data: {
  inspirations?: unknown
  tasks?: unknown
}) {
  const record = (x: unknown): x is Record<string, unknown> =>
    !!x && typeof x === 'object' && !Array.isArray(x)
  const base = (x: unknown): x is Record<string, unknown> =>
    record(x) &&
    typeof x.id === 'string' &&
    typeof x.title === 'string' &&
    typeof x.updated_at === 'string' &&
    Number.isFinite(Date.parse(x.updated_at)) &&
    (x.deleted_at === null || typeof x.deleted_at === 'string')
  if (
    data.inspirations !== undefined &&
    (!Array.isArray(data.inspirations) ||
      !data.inspirations.every(
        (i) =>
          base(i) &&
          typeof i.notes === 'string' &&
          typeof i.link === 'string' &&
          safeLink(i.link) !== null &&
          ['idea', 'chosen', 'finished'].includes(String(i.status)) &&
          (i.price === null ||
            (typeof i.price === 'number' &&
              Number.isFinite(i.price) &&
              i.price >= 0)) &&
          Array.isArray(i.palette) &&
          i.palette.length === 4 &&
          i.palette.every(
            (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c),
          ) &&
          (i.image_id === null || typeof i.image_id === 'string') &&
          (i.before_image_id === null ||
            typeof i.before_image_id === 'string') &&
          record(i.votes) &&
          Object.values(i.votes).every(
            (v) =>
              record(v) &&
              typeof v.liked === 'boolean' &&
              typeof v.updated_at === 'string' &&
              Number.isFinite(Date.parse(v.updated_at)),
          ),
      ))
  )
    return false
  if (
    data.tasks !== undefined &&
    (!Array.isArray(data.tasks) ||
      !data.tasks.every(
        (t) =>
          base(t) &&
          typeof t.notes === 'string' &&
          typeof t.due_date === 'string' &&
          typeof t.milestone === 'boolean' &&
          ['todo', 'doing', 'done'].includes(String(t.status)),
      ))
  )
    return false
  return true
}
