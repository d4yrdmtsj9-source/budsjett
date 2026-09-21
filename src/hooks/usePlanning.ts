import { validateTask, taskBlockers } from '@/lib/workflow'
import type { Expense } from '@/lib/types'
import { useProject } from './useProject'
import type { ProjectTask } from '@/lib/planning'
export function usePlanning() {
  const { rawProject, setRawProject } = useProject()
  const ideas = (rawProject?.inspirations ?? []).filter((i) => !i.deleted_at)
  const tasks = (rawProject?.tasks ?? []).filter((t) => !t.deleted_at)
  async function saveTask(task: ProjectTask) {
    if (!task.title.trim()) throw new Error('Gi oppgaven et navn.')
    await setRawProject((p) => {
      const latest = p.tasks?.find(t => t.id === task.id)
      if (latest && latest.updated_at !== task.updated_at) throw new Error('Oppgaven er endret. Lukk og åpne den igjen før du lagrer.')
      const issue = validateTask(task, p.tasks ?? [])
      if (issue) throw new Error(issue)
      if ((task.status === 'doing' || task.status === 'done') && taskBlockers(task, p.tasks ?? [], p.expenses as Expense[]).length) throw new Error('Avklar avhengigheter og leveranser før oppgaven startes eller fullføres.')
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
    await setRawProject((p) => {
      const current = p.tasks?.find(t => t.id === id)
      if (current && (patch.status === 'doing' || patch.status === 'done') && taskBlockers(current, p.tasks ?? [], p.expenses as Expense[]).length) throw new Error('Oppgaven er blokkert. Avklar avhengigheter eller rediger oppgaven først.')
      return {
      ...p,
      tasks: (p.tasks ?? []).map((t) =>
        t.id === id && !t.deleted_at
          ? { ...t, ...patch, updated_at: new Date().toISOString() }
          : t,
      ),
    }})
  }
  return {
    ideas,
    tasks,
    saveTask,
    patchTask,
  }
}
