import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, generateInviteCode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { RenovationProject, ProjectMember } from '@/lib/types'

interface ProjectContextValue {
  project: RenovationProject | null
  members: ProjectMember[]
  loading: boolean
  hasProject: boolean
  createProject: (name: string, budget: number) => Promise<{ error: string | null }>
  joinProject: (inviteCode: string) => Promise<{ error: string | null }>
  updateProject: (updates: Partial<Pick<RenovationProject, 'name' | 'total_budget'>>) => Promise<{ error: string | null }>
  refreshProject: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

async function fetchUserProject(userId: string) {
  const { data: membership } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (!membership) return { project: null, members: [] as ProjectMember[] }

  const { data: project } = await supabase
    .from('renovation_projects')
    .select('*')
    .eq('id', membership.project_id)
    .single()

  const { data: members } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', membership.project_id)

  const memberProfiles = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', m.user_id)
        .maybeSingle()
      return { ...m, profile: profile ?? undefined }
    }),
  )

  return { project, members: memberProfiles }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [ready, setReady] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['project', user?.id],
    queryFn: () => fetchUserProject(user!.id),
    enabled: !!user,
  })

  useEffect(() => {
    if (!user) {
      setReady(true)
      return
    }
    if (!isLoading) setReady(true)
  }, [user, isLoading])

  useEffect(() => {
    if (!data?.project) return

    const channel = supabase
      .channel('project-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'renovation_projects', filter: `id=eq.${data.project.id}` },
        () => refetch(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${data.project.id}` },
        () => refetch(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [data?.project?.id, refetch])

  const createProject = async (name: string, budget: number) => {
    if (!user) return { error: 'Ikke innlogget' }

    const inviteCode = generateInviteCode()
    const { data: project, error } = await supabase
      .from('renovation_projects')
      .insert({
        name,
        total_budget: budget,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
    })

    if (memberError) return { error: memberError.message }

    await queryClient.invalidateQueries({ queryKey: ['project'] })
    return { error: null }
  }

  const joinProject = async (inviteCode: string) => {
    if (!user) return { error: 'Ikke innlogget' }

    const { data: project, error: findError } = await supabase
      .from('renovation_projects')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle()

    if (findError || !project) return { error: 'Ugyldig invitasjonskode' }

    const { count } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)

    if ((count ?? 0) >= 2) return { error: 'Prosjektet har allerede maks 2 medlemmer' }

    const { data: existing } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) return { error: 'Du er allerede medlem av dette prosjektet' }

    const { error: joinError } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
    })

    if (joinError) return { error: joinError.message }

    await queryClient.invalidateQueries({ queryKey: ['project'] })
    return { error: null }
  }

  const updateProject = async (
    updates: Partial<Pick<RenovationProject, 'name' | 'total_budget'>>,
  ) => {
    if (!data?.project) return { error: 'Ingen prosjekt' }

    const { error } = await supabase
      .from('renovation_projects')
      .update(updates)
      .eq('id', data.project.id)

    if (error) return { error: error.message }

    await queryClient.invalidateQueries({ queryKey: ['project'] })
    return { error: null }
  }

  return (
    <ProjectContext.Provider
      value={{
        project: data?.project ?? null,
        members: data?.members ?? [],
        loading: !ready || isLoading,
        hasProject: !!data?.project,
        createProject,
        joinProject,
        updateProject,
        refreshProject: () => refetch(),
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
