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
      const maxOrder = rooms.reduce((m, r) => Math.max(m, r.sort_order), -1)
      const room: LocalRoom = {
        id: uid(),
        name: input.name,
        budget: input.budget,
        sort_order: maxOrder + 1,
        archived: false,
        deleted_at: null,
      }
      await setRawProject({
        ...rawProject,
        rooms: [...rawProject.rooms, room],
      })
      return room
    },
  })

  const updateRoom = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LocalRoom> & { id: string }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      await setRawProject({
        ...rawProject,
        rooms: rawProject.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      })
    },
  })

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      await setRawProject({
        ...rawProject,
        rooms: rawProject.rooms.map((r) =>
          r.id === id ? { ...r, deleted_at: new Date().toISOString() } : r,
        ),
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
  const room = rawProject?.rooms.find((r) => r.id === roomId && !r.deleted_at) ?? null
  return { data: room, isLoading: false }
}
