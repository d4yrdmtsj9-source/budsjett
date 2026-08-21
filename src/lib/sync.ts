import { getSupabase } from '@/lib/supabase'
import {
  loadProject,
  loadProjectByInvite,
  saveProject,
  type LocalProject,
} from '@/lib/localStore'
import { pullCloudProject, pushCloudProject } from '@/lib/cloudStore'

type Handler = (project: LocalProject) => void

const JOIN_WAIT_MS = 6_000
const CLOUD_RETRY_MS = 500
const CLOUD_RETRY_ATTEMPTS = 4

async function pullCloudWithRetry(code: string): Promise<LocalProject | null> {
  for (let i = 0; i < CLOUD_RETRY_ATTEMPTS; i++) {
    const cloud = await pullCloudProject(code)
    if (cloud) return cloud
    if (i < CLOUD_RETRY_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, CLOUD_RETRY_MS))
    }
  }
  return null
}

function channelNameFor(inviteCode: string) {
  return `renover:${inviteCode.toUpperCase()}`
}

/**
 * Sync project state between devices via Supabase Realtime broadcast.
 * Invite code is the channel secret — no auth required.
 */
export function startProjectSync(
  inviteCode: string,
  projectId: string,
  onUpdate: Handler,
) {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channel = supabase.channel(channelNameFor(inviteCode), {
    config: { broadcast: { self: false } },
  })

  channel
    .on('broadcast', { event: 'project' }, async ({ payload }) => {
      const incoming = payload as LocalProject
      if (!incoming?.id || !incoming.invite_code) return
      if (projectId !== 'pending' && incoming.id !== projectId) return

      const local = await loadProject(incoming.id)
      if (!local || new Date(incoming.updated_at) >= new Date(local.updated_at)) {
        await saveProject(incoming, { touch: false })
        void pushCloudProject(incoming)
        onUpdate(incoming)
      }
    })
    .on('broadcast', { event: 'sync_request' }, async () => {
      if (projectId === 'pending') return
      const local = await loadProject(projectId)
      if (local) {
        void channel.send({
          type: 'broadcast',
          event: 'project',
          payload: local,
        })
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && projectId !== 'pending') {
        const local = await loadProject(projectId)
        if (local) {
          void channel.send({
            type: 'broadcast',
            event: 'project',
            payload: local,
          })
        }
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function publishProject(project: LocalProject) {
  const supabase = getSupabase()
  if (!supabase) return

  const channel = supabase.channel(channelNameFor(project.invite_code))
  void channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void channel.send({
        type: 'broadcast',
        event: 'project',
        payload: project,
      })
      setTimeout(() => {
        void supabase.removeChannel(channel)
      }, 1500)
    }
  })
}

/**
 * Load project by invite: cloud snapshot first, then live peers, then local cache.
 */
export async function fetchProjectByInvite(
  inviteCode: string,
  waitMs = JOIN_WAIT_MS,
): Promise<LocalProject | null> {
  const code = inviteCode.trim().toUpperCase()

  const cloud = await pullCloudWithRetry(code)
  if (cloud) {
    await saveProject(cloud, { touch: false })
    return cloud
  }

  const cached = await loadProjectByInvite(code)
  if (cached) return cached

  const supabase = getSupabase()
  if (!supabase) return null

  return new Promise((resolve) => {
    let settled = false
    const channel = supabase.channel(channelNameFor(code), {
      config: { broadcast: { self: false } },
    })

    const finish = (p: LocalProject | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void supabase.removeChannel(channel)
      resolve(p)
    }

    channel
      .on('broadcast', { event: 'project' }, async ({ payload }) => {
        const incoming = payload as LocalProject
        if (!incoming?.id || incoming.invite_code !== code) return
        await saveProject(incoming, { touch: false })
        void pushCloudProject(incoming)
        finish(incoming)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          void channel.send({
            type: 'broadcast',
            event: 'sync_request',
            payload: { t: Date.now() },
          })
        }
      })

    const timer = setTimeout(async () => {
      const again = (await pullCloudProject(code)) ?? (await loadProjectByInvite(code))
      if (again) await saveProject(again, { touch: false })
      finish(again)
    }, waitMs)
  })
}
