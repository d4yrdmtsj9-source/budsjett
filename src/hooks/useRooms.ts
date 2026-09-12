import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useProject } from './useProject'
import { uid, type LocalRoom } from '@/lib/localStore'

export function useRooms(includeArchived = false) {
  const { rawProject, setRawProject } = useProject()

  const rooms = useMemo(() => {
    if (!rawProject) return []
    return rawProject.rooms
      .filter((r) => !r.deleted_at)
      .filter((r) => includeArchived || !r.archived)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [rawProject, includeArchived])

  const createRoom = useMutation({
    mutationFn: async (input: { name: string; budget: number }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      if (
        !input.name.trim() ||
        !Number.isFinite(input.budget) ||
        input.budget < 0
      )
        throw new Error('Oppgi romnavn og et gyldig budsjett.')
      const maxOrder = rooms.reduce((m, r) => Math.max(m, r.sort_order), -1)
      const room: LocalRoom = {
        id: uid(),
        updated_at: new Date().toISOString(),
        name: input.name.trim(),
        budget: input.budget,
        sort_order: maxOrder + 1,
        archived: false,
        deleted_at: null,
      }
      await setRawProject((p) => ({ ...p, rooms: [...p.rooms, room] }))
      return room
    },
  })

  const updateRoom = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<LocalRoom> & { id: string }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      if (updates.name !== undefined && !updates.name.trim())
        throw new Error('Skriv inn romnavn.')
      if (
        updates.budget !== undefined &&
        (!Number.isFinite(updates.budget) || updates.budget < 0)
      )
        throw new Error('Budsjettet må være et positivt beløp eller null.')
      await setRawProject((p) => ({
        ...p,
        rooms: p.rooms.map((r) =>
          r.id === id
            ? { ...r, ...updates, updated_at: new Date().toISOString() }
            : r,
        ),
      }))
    },
  })

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      const now = new Date().toISOString()
      await setRawProject((p) => {
        if (
          p.expenses.some(
            (e) =>
              !e.deleted_at && e.allocations?.some((a) => a.room_id === id),
          )
        )
          throw new Error(
            'Rommet har fordelte kjøp. Endre romfordelingen på disse før du fjerner rommet.',
          )
        return {
          ...p,
          rooms: p.rooms.map((r) =>
            r.id === id ? { ...r, deleted_at: now, updated_at: now } : r,
          ),
          expenses: p.expenses.map((e) =>
            e.room_id === id ? { ...e, room_id: null, updated_at: now } : e,
          ),
        }
      })
    },
  })

  return {
    data: rooms,
    isLoading: false,
    createRoom,
    updateRoom,
    deleteRoom,
  }
}

export function useRoom(roomId: string | undefined) {
  const { rawProject } = useProject()
  const room =
    rawProject?.rooms.find((r) => r.id === roomId && !r.deleted_at) ?? null
  return { data: room, isLoading: false }
}
