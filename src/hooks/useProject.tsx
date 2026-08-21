import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth, createDeviceKey } from './useAuth'
import {
  emptyProject,
  generateInviteCode,
  loadProject,
  loadProjectByInvite,
  saveProject,
  subscribeProject,
  uid,
  type LocalProject,
  type LocalMember,
} from '@/lib/localStore'
import { startProjectSync, publishProject } from '@/lib/sync'

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
  joinProject: (inviteCode: string, displayName: string) => Promise<{ error: string | null }>
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
    const p = await loadProject(session.projectId)
    setRaw(p)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    refreshProject()
  }, [session?.projectId])

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
    await saveProject(p)
    setRaw(p)
    publishProject(p)
  }

  const createProject = async (name: string, budget: number, displayName: string) => {
    try {
      const deviceKey = session?.deviceKey ?? createDeviceKey()
      const memberId = uid()
      const invite = generateInviteCode()
      const member: LocalMember = {
        id: memberId,
        display_name: displayName.trim(),
        device_key: deviceKey,
      }
      const project = emptyProject(name.trim() || 'Vår renovering', budget || 0, invite)
      project.members = [member]
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
      await saveProject(project)
      await setSession({
        deviceKey,
        displayName: member.display_name,
        memberId,
        projectId: project.id,
        inviteCode: invite,
      })
      setRaw(project)
      publishProject(project)
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Kunne ikke opprette' }
    }
  }

  const joinProject = async (inviteCode: string, displayName: string) => {
    try {
      const code = inviteCode.trim().toUpperCase()
      const deviceKey = session?.deviceKey ?? createDeviceKey()

      // Prefer live sync snapshot from broadcast buffer / local
      let project = await loadProjectByInvite(code)
      if (!project) {
        // Wait briefly for sync packet if partner is online
        project = await new Promise<LocalProject | null>((resolve) => {
          const stop = startProjectSync(code, 'pending', (p) => {
            if (p.invite_code === code) {
              stop()
              resolve(p)
            }
          })
          setTimeout(() => {
            stop()
            resolve(null)
          }, 2500)
        })
      }

      if (!project) {
        return {
          error:
            'Fant ikke prosjektet. Be partneren åpne appen (så synken er aktiv), eller importer en sikkerhetskopi.',
        }
      }

      const existing = project.members.find((m) => m.device_key === deviceKey)
      let memberId = existing?.id
      if (!existing) {
        if (project.members.length >= 2) {
          return { error: 'Prosjektet har allerede maks 2 medlemmer' }
        }
        memberId = uid()
        project.members.push({
          id: memberId,
          display_name: displayName.trim(),
          device_key: deviceKey,
        })
        project.activity.unshift({
          id: uid(),
          actor_id: memberId,
          actor_name: displayName.trim(),
          event_type: 'member_joined',
          summary: `${displayName.trim()} ble med i prosjektet`,
          created_at: new Date().toISOString(),
        })
        await saveProject(project)
        publishProject(project)
      }

      await setSession({
        deviceKey,
        displayName: displayName.trim(),
        memberId: memberId!,
        projectId: project.id,
        inviteCode: code,
      })
      setRaw(project)
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Kunne ikke bli med' }
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
        joinProject,
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
