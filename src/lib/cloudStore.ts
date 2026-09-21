import { loadProject, normalizeProject, type LocalProject } from '@/lib/localStore'
import { mergeProjects, projectFingerprint } from '@/lib/mergeProjects'
import { setCloudSyncStatus } from '@/lib/syncStatus'

const NS = 'renover-budsjett-0a6e'
const KEY = (import.meta.env.VITE_MANTLE_KEY as string | undefined) ?? ''

if (!KEY) setCloudSyncStatus('local-only')

function entryUrl(inviteCode: string) {
  return `https://mantledb.sh/v2/${NS}/${encodeURIComponent(inviteCode)}`
}

function visibilityUrl(inviteCode: string) {
  return `https://mantledb.sh/v2/visibility/${NS}/${encodeURIComponent(inviteCode)}`
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(KEY ? { 'X-Mantle-Key': KEY } : {}),
  }
}

function slim(project: LocalProject): LocalProject {
  return {
    ...project,
    invite_code: project.invite_code.toUpperCase(),
    activity: (project.activity ?? []).slice(0, 30),
  }
}

export async function pullCloudProject(
  inviteCode: string,
): Promise<LocalProject | null> {
  const code = inviteCode.trim().toUpperCase()
  if (
    !code ||
    code.startsWith('DEMO-') ||
    import.meta.env.VITE_LOCAL_ONLY === 'true'
  )
    return null
  try {
    const res = await fetch(entryUrl(code), {
      headers: headers(),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as LocalProject
    if (!data?.id || !data.invite_code) return null
    data.invite_code = String(data.invite_code).toUpperCase()
    return normalizeProject(data)
  } catch {
    return null
  }
}

async function pushSnapshot(
  project: LocalProject,
): Promise<boolean> {
  if (
    project.invite_code.startsWith('DEMO-') ||
    import.meta.env.VITE_LOCAL_ONLY === 'true'
  )
    return false
  if (!KEY || !project.invite_code) {
    setCloudSyncStatus('local-only')
    return false
  }
  const code = project.invite_code.toUpperCase()
  const body = slim(project)
  setCloudSyncStatus('pending')
  try {
    let res = await fetch(entryUrl(code), {
      method: 'POST',
      headers: headers(),
      cache: 'no-store',
      body: JSON.stringify(body),
    })
    if (res.status === 413) {
      res = await fetch(entryUrl(code), {
        method: 'POST',
        headers: headers(),
        cache: 'no-store',
        body: JSON.stringify({ ...body, activity: [] }),
      })
    }
    if (res.ok) {
      void fetch(visibilityUrl(code), {
        method: 'PUT',
        headers: headers(),
        cache: 'no-store',
        body: JSON.stringify({ public_read: true }),
      })
      setCloudSyncStatus(pushTimers.has(project.id) ? 'pending' : 'ok')
      return true
    }
    setCloudSyncStatus('local-only')
    return false
  } catch {
    setCloudSyncStatus('local-only')
    return false
  }
}

const pushQueues = new Map<string, Promise<boolean>>()
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>()
/** Send snapshots in order and load the latest local edit before each send. */
export function pushCloudProject(project: LocalProject): Promise<boolean> {
  const task = (pushQueues.get(project.id) ?? Promise.resolve(false))
    .catch(() => false)
    .then(async () => {
      const latest = await loadProject(project.id)
      return pushSnapshot(latest ? mergeProjects(project, latest) : project)
    })
  pushQueues.set(project.id, task)
  void task.finally(() => {
    if (pushQueues.get(project.id) === task) pushQueues.delete(project.id)
  }).catch(() => {})
  return task
}
export function scheduleCloudPush(project: LocalProject) {
  if (project.invite_code.startsWith('DEMO-') || import.meta.env.VITE_LOCAL_ONLY === 'true') return
  setCloudSyncStatus('pending')
  const timer = pushTimers.get(project.id)
  if (timer) clearTimeout(timer)
  pushTimers.set(project.id, setTimeout(() => {
    pushTimers.delete(project.id)
    void pushCloudProject(project)
  }, 600))
}

/** Merge local + cloud so two devices don't overwrite each other's rows. */
export async function mergeCloudProject(
  local: LocalProject | null,
  inviteCode: string | undefined,
): Promise<LocalProject | null> {
  const cloud = inviteCode ? await pullCloudProject(inviteCode) : null
  if (!local && !cloud) return null
  if (!cloud) {
    if (local) void pushCloudProject(local)
    else setCloudSyncStatus('local-only')
    return local
  }
  setCloudSyncStatus('ok')
  if (!local) return cloud
  if (local.id !== cloud.id) {
    const newer =
      new Date(cloud.updated_at) >= new Date(local.updated_at) ? cloud : local
    if (newer === local) void pushCloudProject(local)
    return newer
  }
  const merged = mergeProjects(local, cloud)
  if (projectFingerprint(merged) !== projectFingerprint(cloud)) {
    void pushCloudProject(merged)
  }
  return merged
}
