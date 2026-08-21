import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProject } from './useProject'
import type { ActivityEvent } from '@/lib/types'

export function useActivity(limit = 20) {
  const { project } = useProject()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['activity', project?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .eq('project_id', project!.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error

      const withProfiles = await Promise.all(
        (data ?? []).map(async (event) => {
          if (!event.user_id) return event as ActivityEvent
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', event.user_id)
            .maybeSingle()
          return { ...event, profile: profile ?? undefined } as ActivityEvent
        }),
      )

      return withProfiles
    },
    enabled: !!project,
  })

  useEffect(() => {
    if (!project) return

    const channel = supabase
      .channel(`activity-${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_events', filter: `project_id=eq.${project.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['activity', project.id] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.id, queryClient])

  return query
}

export function formatActivityMessage(event: ActivityEvent): string {
  if (event.summary) return event.summary
  const payload = event.payload ?? {}
  const name = event.profile?.display_name
  const prefix = name ? `${name} ` : ''
  switch (event.event_type) {
    case 'expense_created':
      return `${prefix}la til ${payload.description ?? 'utgift'}`
    case 'expense_updated':
      return `${prefix}oppdaterte ${payload.description ?? 'utgift'}`
    case 'expense_deleted':
      return `${prefix}slettet ${payload.description ?? 'utgift'}`
    case 'room_created':
      return `${prefix}la til rom: ${payload.name ?? 'Ukjent'}`
    case 'member_joined':
      return `${payload.display_name ?? 'Noen'} ble med i prosjektet`
    case 'budget_updated':
      return `${prefix}oppdaterte budsjett`
    default:
      return event.event_type?.replace(/_/g, ' ') ?? 'Aktivitet'
  }
}
