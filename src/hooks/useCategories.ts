import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProject } from './useProject'
import type { Category } from '@/lib/types'

export function useCategories() {
  const { project } = useProject()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['categories', project?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', project!.id)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data as Category[]
    },
    enabled: !!project,
  })

  useEffect(() => {
    if (!project) return

    const channel = supabase
      .channel(`categories-${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `project_id=eq.${project.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['categories', project.id] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.id, queryClient])

  const createCategory = useMutation({
    mutationFn: async (input: { name: string; budget: number }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ project_id: project!.id, ...input })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  return { ...query, createCategory, updateCategory }
}
