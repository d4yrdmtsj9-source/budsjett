import type { LocalProject } from '@/lib/localStore'
import { mergeProjects, projectFingerprint } from '@/lib/mergeProjects'

const NS = 'renover-budsjett-0a6e'
const KEY = (import.meta.env.VITE_MANTLE_KEY as string | undefined) ?? ''

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

export async function pullCloudProject(inviteCode: string): Promise<LocalProject | null> {
  const code = inviteCode.trim().toUpperCase()
  if (!code) return null
  try {
    const res = await fetch(entryUrl(code), {
      headers: headers(),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as LocalProject
    if (!data?.id || !data.invite_code) return null
    data.invite_code = String(data.invite_code).toUpperCase()
    return data
  } catch {
    return null
  }
}

export async function pushCloudProject(project: LocalProject): Promise<void> {
  if (!KEY || !project.invite_code) return
  const code = project.invite_code.toUpperCase()
  const body = slim(project)
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
    }
  } catch {
    // Cloud persist is best-effort
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleCloudPush(project: LocalProject) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void pushCloudProject(project)
  }, 600)
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
    return local
  }
  if (!local) return cloud
  if (local.id !== cloud.id) {
    const newer = new Date(cloud.updated_at) >= new Date(local.updated_at) ? cloud : local
    if (newer === local) void pushCloudProject(local)
    return newer
  }
  const merged = mergeProjects(local, cloud)
  if (projectFingerprint(merged) !== projectFingerprint(cloud)) {
    void pushCloudProject(merged)
  }
  return merged
}
