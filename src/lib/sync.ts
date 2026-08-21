import { supabase } from '@/lib/supabase'
import {
  loadProject,
  saveProject,
  type LocalProject,
} from '@/lib/localStore'

type Handler = (project: LocalProject) => void

/**
 * Sync project state between two devices via Supabase Realtime broadcast.
 * No auth required — invite code is the channel secret.
 */
export function startProjectSync(
  inviteCode: string,
  projectId: string,
  onUpdate: Handler,
) {
  const channelName = `renover:${inviteCode.toUpperCase()}`
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  })

  channel
    .on('broadcast', { event: 'project' }, async ({ payload }) => {
      const incoming = payload as LocalProject
      if (!incoming?.id || !incoming.invite_code) return
      if (projectId !== 'pending' && incoming.id !== projectId) return

      const local = await loadProject(incoming.id)
      if (!local || new Date(incoming.updated_at) >= new Date(local.updated_at)) {
        await saveProject(incoming)
        onUpdate(incoming)
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && projectId !== 'pending') {
        const local = await loadProject(projectId)
        if (local) publishProject(local)
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function publishProject(project: LocalProject) {
  const channelName = `renover:${project.invite_code.toUpperCase()}`
  const channel = supabase.channel(channelName)
  void channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void channel.send({
        type: 'broadcast',
        event: 'project',
        payload: project,
      })
      // Keep channel briefly then release
      setTimeout(() => {
        void supabase.removeChannel(channel)
      }, 1500)
    }
  })
}
