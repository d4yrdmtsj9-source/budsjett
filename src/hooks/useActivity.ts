import { useMemo } from 'react'
import { useProject } from './useProject'
import type { ActivityEvent } from '@/lib/types'

export function useActivity(limit = 20) {
  const { rawProject } = useProject()

  const data = useMemo(() => {
    if (!rawProject) return []
    return rawProject.activity.slice(0, limit).map(
      (a): ActivityEvent => ({
        id: a.id,
        project_id: rawProject.id,
        user_id: a.actor_id,
        event_type: a.event_type,
        summary: a.summary,
        payload: {},
        created_at: a.created_at,
        profile: { id: a.actor_id ?? '', display_name: a.actor_name },
      }),
    )
  }, [rawProject, limit])

  return { data, isLoading: false }
}

export function formatActivityMessage(event: ActivityEvent): string {
  if (event.summary) return event.summary
  return event.event_type?.replace(/_/g, ' ') ?? 'Aktivitet'
}
