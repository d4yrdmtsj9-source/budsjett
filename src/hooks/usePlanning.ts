import { useProject } from './useProject'
import { useAuth } from './useAuth'
import { uid } from '@/lib/localStore'
import {
  safeLink,
  validateIdea,
  type Inspiration,
  type ProjectTask,
} from '@/lib/planning'
export function usePlanning() {
  const { rawProject, setRawProject } = useProject()
  const { memberId } = useAuth()
  const ideas = (rawProject?.inspirations ?? []).filter((i) => !i.deleted_at)
  const tasks = (rawProject?.tasks ?? []).filter((t) => !t.deleted_at)
  async function saveIdea(idea: Inspiration) {
    const error = validateIdea(idea)
    if (error) throw new Error(error)
    await setRawProject((p) => {
      const old = p.inspirations?.find((i) => i.id === idea.id)
      if (old?.deleted_at)
        throw new Error('Ideen er fjernet på en annen enhet.')
      const next = {
        ...idea,
        title: idea.title.trim(),
        link: safeLink(idea.link)!,
        votes: old?.votes ?? idea.votes,
        updated_at: new Date().toISOString(),
      }
      return {
        ...p,
        inspirations: [
          ...(p.inspirations ?? []).filter((i) => i.id !== next.id),
          next,
        ],
      }
    })
  }
  async function removeIdea(id: string) {
    await setRawProject((p) => ({
      ...p,
      inspirations: (p.inspirations ?? []).map((i) =>
        i.id === id
          ? {
              ...i,
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : i,
      ),
    }))
  }
  async function toggleVote(id: string) {
    if (!memberId) return
    await setRawProject((p) => ({
      ...p,
      inspirations: (p.inspirations ?? []).map((i) =>
        i.id === id
          ? {
              ...i,
              votes: {
                ...i.votes,
                [memberId]: {
                  liked: !i.votes[memberId]?.liked,
                  updated_at: new Date().toISOString(),
                },
              },
            }
          : i,
      ),
    }))
  }
  async function saveTask(task: ProjectTask) {
    if (!task.title.trim()) throw new Error('Gi oppgaven et navn.')
    await setRawProject((p) => {
      if (p.tasks?.find((t) => t.id === task.id)?.deleted_at)
        throw new Error('Oppgaven er fjernet på en annen enhet.')
      return {
        ...p,
        tasks: [
          ...(p.tasks ?? []).filter((t) => t.id !== task.id),
          {
            ...task,
            title: task.title.trim(),
            updated_at: new Date().toISOString(),
          },
        ],
      }
    })
  }
  async function patchTask(
    id: string,
    patch: Partial<Pick<ProjectTask, 'status' | 'deleted_at'>>,
  ) {
    await setRawProject((p) => ({
      ...p,
      tasks: (p.tasks ?? []).map((t) =>
        t.id === id && !t.deleted_at
          ? { ...t, ...patch, updated_at: new Date().toISOString() }
          : t,
      ),
    }))
  }
  async function planIdea(idea: Inspiration) {
    await setRawProject((p) => {
      if (p.tasks?.some((t) => !t.deleted_at && t.inspiration_id === idea.id))
        return p
      const task: ProjectTask = {
        id: uid(),
        title: `Avklar ${idea.title}`,
        room_id: idea.room_id,
        status: 'todo',
        due_date: '',
        owner_id: null,
        milestone: false,
        notes: idea.notes,
        inspiration_id: idea.id,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
      return { ...p, tasks: [...(p.tasks ?? []), task] }
    })
  }
  return {
    ideas,
    tasks,
    saveIdea,
    removeIdea,
    toggleVote,
    saveTask,
    patchTask,
    planIdea,
  }
}
