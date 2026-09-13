import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useProject } from './useProject'
import {
  uid,
  deleteProjectCategory,
  type LocalCategory,
} from '@/lib/localStore'

export function useCategories() {
  const { rawProject, setRawProject } = useProject()

  const categories = useMemo(() => {
    if (!rawProject) return []
    return rawProject.categories
      .filter((c) => !c.deleted_at)
      .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
  }, [rawProject])

  const createCategory = useMutation({
    mutationFn: async (input: { name: string; budget: number }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      let category: LocalCategory = {
        id: uid(),
        updated_at: new Date().toISOString(),
        name: input.name.trim(),
        budget: input.budget,
      }
      await setRawProject((p) => {
        const existing = p.categories.find(
          (c) =>
            !c.deleted_at &&
            c.name.toLowerCase() === category.name.toLowerCase(),
        )
        if (existing) {
          category = existing
          return p
        }
        return { ...p, categories: [...p.categories, category] }
      })
      return category
    },
  })

  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<LocalCategory> & { id: string }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      await setRawProject((p) => ({
        ...p,
        categories: p.categories.map((c) =>
          c.id === id && !c.deleted_at
            ? { ...c, ...updates, updated_at: new Date().toISOString() }
            : c,
        ),
      }))
    },
  })

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      await setRawProject((p) => deleteProjectCategory(p, id))
    },
  })

  return {
    data: categories,
    isLoading: false,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
