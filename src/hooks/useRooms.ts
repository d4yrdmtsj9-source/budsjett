import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProject } from './useProject'
import type { Room } from '@/lib/types'

export function useRooms(includeArchived = false) {
  const { project } = useProject()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['rooms', project?.id, includeArchived],
    queryFn: async () => {
      let q = supabase
        .from('rooms')
        .select('*')
        .eq('project_id', project!.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (!includeArchived) {
        q = q.eq('archived', false)
      }

      const { data, error } = await q
      if (error) throw error
      return data as Room[]
    },
    enabled: !!project,
  })

  useEffect(() => {
    if (!project) return

    const channel = supabase
      .channel(`rooms-${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `project_id=eq.${project.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['rooms', project.id] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.id, queryClient])

  const createRoom = useMutation({
    mutationFn: async (input: { name: string; budget: number }) => {
      const maxOrder = (query.data ?? []).reduce((max, r) => Math.max(max, r.sort_order), -1)
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          project_id: project!.id,
          name: input.name,
          budget: input.budget,
          sort_order: maxOrder + 1,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const updateRoom = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rooms')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })

  return { ...query, createRoom, updateRoom, deleteRoom }
}

export function useRoom(roomId: string | undefined) {
  const { project } = useProject()

  return useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId!)
        .single()
      if (error) throw error
      return data as Room
    },
    enabled: !!project && !!roomId,
  })
}
