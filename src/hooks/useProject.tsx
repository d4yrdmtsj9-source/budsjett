import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth, createDeviceKey } from './useAuth'
import {
  emptyProject,
  generateInviteCode,
  loadProject,
  normalizeName,
  normalizeMember,
  saveProject,
  subscribeProject,
  uid,
  type LocalProject,
  type LocalMember,
} from '@/lib/localStore'
import { startProjectSync, publishProject, fetchProjectByInvite } from '@/lib/sync'
import { mergeCloudProject, pushCloudProject, scheduleCloudPush } from '@/lib/cloudStore'

export interface ProjectMemberView {
  id: string
  project_id: string
  user_id: string
  display_name?: string | null
  joined_at: string
  profile?: { id: string; display_name: string | null }
}

export interface RenovationProjectView {
  id: string
  name: string
  invite_code: string
  total_budget: number
  created_at: string
}

interface ProjectContextValue {
  project: RenovationProjectView | null
  rawProject: LocalProject | null
  members: ProjectMemberView[]
  loading: boolean
  hasProject: boolean
  createProject: (name: string, budget: number, displayName: string) => Promise<{ error: string | null }>
  /** Look up a project by invite (for join UI) without creating a session yet */
  lookupProject: (inviteCode: string) => Promise<{ project: LocalProject | null; error: string | null }>
  /** Continue as an existing member, or add a new person if memberId is null */
  joinAs: (
    inviteCode: string,
    opts: { memberId?: string; displayName: string },
  ) => Promise<{ error: string | null }>
  /** @deprecated use joinAs — kept for compatibility */
  joinProject: (inviteCode: string, displayName: string) => Promise<{ error: string | null }>
  addMember: (displayName: string) => Promise<{ error: string | null; member?: LocalMember }>
  updateProject: (updates: Partial<Pick<RenovationProjectView, 'name' | 'total_budget'>>) => Promise<{ error: string | null }>
  refreshProject: () => void
  setRawProject: (p: LocalProject) => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

function toView(p: LocalProject): RenovationProjectView {
  return {
    id: p.id,
    name: p.name,
    invite_code: p.invite_code,
    total_budget: p.total_budget,
    created_at: p.created_at,
  }
}

function toMembers(p: LocalProject): ProjectMemberView[] {
  return p.members.map((m) => ({
    id: m.id,
    project_id: p.id,
    user_id: m.id,
    display_name: m.display_name,
    joined_at: p.created_at,
    profile: { id: m.id, display_name: m.display_name },
  }))
}

function attachDevice(member: LocalMember, deviceKey: string): LocalMember {
  const normalized = normalizeMember(member)
  if (!normalized.device_keys.includes(deviceKey)) {
    normalized.device_keys = [...normalized.device_keys, deviceKey]
  }
  normalized.device_key = normalized.device_keys[0]
  return normalized
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { session, setSession } = useAuth()
  const [rawProject, setRaw] = useState<LocalProject | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProject = async () => {
    if (!session?.projectId) {
      setRaw(null)
      setLoading(false)
      return
    }
    const local = await loadProject(session.projectId)
    const newer = await mergeCloudProject(local, session.inviteCode)
    if (newer && newer !== local) {
      await saveProject(newer, { touch: false })
    }
    setRaw(newer)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    refreshProject()
  }, [session?.projectId, session?.inviteCode])

  useEffect(() => {
    if (!session?.inviteCode || !session.projectId) return

    const syncFromCloud = async () => {
      if (document.visibilityState === 'hidden') return
      const local = await loadProject(session.projectId)
      const newer = await mergeCloudProject(local, session.inviteCode)
      if (newer && local && new Date(newer.updated_at) > new Date(local.updated_at)) {
        await saveProject(newer, { touch: false })
        setRaw(newer)
      }
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') void syncFromCloud()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    const id = window.setInterval(() => void syncFromCloud(), 15_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
      window.clearInterval(id)
    }
  }, [session?.inviteCode, session?.projectId])

  useEffect(() => {
    const unsub = subscribeProject((p) => {
      if (p.id === session?.projectId) setRaw(p)
    })
    return () => {
      unsub()
    }
  }, [session?.projectId])

  useEffect(() => {
    if (!session?.inviteCode || !session.projectId) return
    return startProjectSync(session.inviteCode, session.projectId, setRaw)
  }, [session?.inviteCode, session?.projectId])

  const setRawProject = async (p: LocalProject) => {
    const saved = await saveProject(p)
    setRaw(saved)
    publishProject(saved)
    scheduleCloudPush(saved)
  }

  const createProject = async (name: string, budget: number, displayName: string) => {
    try {
      const deviceKey = session?.deviceKey ?? createDeviceKey()
      const memberId = uid()
      const invite = generateInviteCode()
      const member: LocalMember = {
        id: memberId,
        display_name: displayName.trim(),
        device_keys: [deviceKey],
        device_key: deviceKey,
      }
      const project = emptyProject(name.trim() || 'Vår renovering', budget || 0, invite)
      project.members = [member]
      project.categories = [
        { id: uid(), name: 'Materialer', budget: 0 },
        { id: uid(), name: 'Arbeid', budget: 0 },
        { id: uid(), name: 'Apparater', budget: 0 },
        { id: uid(), name: 'Møbler', budget: 0 },
        { id: uid(), name: 'Annet', budget: 0 },
      ]
      project.activity = [
        {
          id: uid(),
          actor_id: memberId,
          actor_name: member.display_name,
          event_type: 'project_created',
          summary: `${member.display_name} opprettet prosjektet`,
          created_at: new Date().toISOString(),
        },
      ]
      const saved = await saveProject(project)
      await setSession({
        deviceKey,
        displayName: member.display_name,
        memberId,
        projectId: saved.id,
        inviteCode: invite,
      })
      setRaw(saved)
      try {
        publishProject(saved)
        void pushCloudProject(saved)
      } catch {
        // Sync is best-effort
      }
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Kunne ikke opprette' }
    }
  }

  const lookupProject = async (inviteCode: string) => {
    try {
      const code = inviteCode.trim().toUpperCase()
      if (code.length < 4) return { project: null, error: 'Skriv inn invitasjonskoden' }
      const project = await fetchProjectByInvite(code)
      if (!project) {
        return {
          project: null,
          error:
            'Fant ikke prosjektet. Sjekk koden, eller importer en sikkerhetskopi under Innstillinger.',
        }
      }
      return { project, error: null }
    } catch (e) {
      return { project: null, error: e instanceof Error ? e.message : 'Kunne ikke hente prosjekt' }
    }
  }

  const joinAs = async (
    inviteCode: string,
    opts: { memberId?: string; displayName: string },
  ) => {
    try {
      const code = inviteCode.trim().toUpperCase()
      const deviceKey = session?.deviceKey ?? createDeviceKey()
      const displayName = opts.displayName.trim()
      if (!displayName) return { error: 'Skriv inn navnet ditt' }

      let project = await fetchProjectByInvite(code)
      if (!project) {
        return {
          error:
            'Fant ikke prosjektet. Sjekk koden, eller importer en sikkerhetskopi.',
        }
      }

      project = {
        ...project,
        members: project.members.map(normalizeMember),
      }

      let member: LocalMember | undefined

      if (opts.memberId) {
        member = project.members.find((m) => m.id === opts.memberId)
        if (!member) return { error: 'Personen finnes ikke i prosjektet' }
      } else {
        // Same name = same person (continue as yourself on a new device)
        member = project.members.find(
          (m) => normalizeName(m.display_name) === normalizeName(displayName),
        )
      }

      if (member) {
        member = attachDevice(member, deviceKey)
        member.display_name = displayName || member.display_name
        project.members = project.members.map((m) => (m.id === member!.id ? member! : m))
      } else {
        if (project.members.length >= 2) {
          return {
            error:
              'Prosjektet har allerede 2 personer. Velg din egen fra listen for å åpne på denne enheten.',
          }
        }
        member = {
          id: uid(),
          display_name: displayName,
          device_keys: [deviceKey],
          device_key: deviceKey,
        }
        project.members = [...project.members, member]
        project.activity = [
          {
            id: uid(),
            actor_id: member.id,
            actor_name: displayName,
            event_type: 'member_joined',
            summary: `${displayName} ble med i prosjektet`,
            created_at: new Date().toISOString(),
          },
          ...project.activity,
        ]
      }

      const saved = await saveProject(project)
      publishProject(saved)
      void pushCloudProject(saved)
      await setSession({
        deviceKey,
        displayName: member.display_name,
        memberId: member.id,
        projectId: saved.id,
        inviteCode: code,
      })
      setRaw(saved)
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Kunne ikke bli med' }
    }
  }

  const joinProject = async (inviteCode: string, displayName: string) => {
    return joinAs(inviteCode, { displayName })
  }

  const addMember = async (displayName: string) => {
    try {
      if (!rawProject) return { error: 'Ingen prosjekt' }
      const name = displayName.trim()
      if (!name) return { error: 'Skriv inn navn' }
      if (rawProject.members.length >= 2) {
        return { error: 'Prosjektet har allerede maks 2 personer' }
      }
      if (
        rawProject.members.some((m) => normalizeName(m.display_name) === normalizeName(name))
      ) {
        return { error: 'Personen finnes allerede' }
      }
      const member: LocalMember = {
        id: uid(),
        display_name: name,
        device_keys: [],
      }
      const next: LocalProject = {
        ...rawProject,
        members: [...rawProject.members.map(normalizeMember), member],
        activity: [
          {
            id: uid(),
            actor_id: session?.memberId ?? null,
            actor_name: session?.displayName ?? 'Noen',
            event_type: 'member_added',
            summary: `${name} ble lagt til i prosjektet`,
            created_at: new Date().toISOString(),
          },
          ...rawProject.activity,
        ],
      }
      await setRawProject(next)
      return { error: null, member }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Kunne ikke legge til' }
    }
  }

  const updateProjectFields = async (
    updates: Partial<Pick<RenovationProjectView, 'name' | 'total_budget'>>,
  ) => {
    if (!rawProject) return { error: 'Ingen prosjekt' }
    const next = {
      ...rawProject,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    await setRawProject(next)
    return { error: null }
  }

  return (
    <ProjectContext.Provider
      value={{
        project: rawProject ? toView(rawProject) : null,
        rawProject,
        members: rawProject ? toMembers(rawProject) : [],
        loading,
        hasProject: !!rawProject,
        createProject,
        lookupProject,
        joinAs,
        joinProject,
        addMember,
        updateProject: updateProjectFields,
        refreshProject: () => {
          void refreshProject()
        },
        setRawProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
