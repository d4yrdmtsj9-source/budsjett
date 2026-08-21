import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useProject } from './useProject'
import { uid, type LocalCategory } from '@/lib/localStore'

export function useCategories() {
  const { rawProject, setRawProject } = useProject()

  const categories = useMemo(() => {
    if (!rawProject) return []
    return [...rawProject.categories].sort((a, b) => a.name.localeCompare(b.name, 'nb'))
  }, [rawProject])

  const createCategory = useMutation({
    mutationFn: async (input: { name: string; budget: number }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      const existing = rawProject.categories.find(
        (c) => c.name.toLowerCase() === input.name.trim().toLowerCase(),
      )
      if (existing) return existing
      const category: LocalCategory = {
        id: uid(),
        name: input.name.trim(),
        budget: input.budget,
      }
      await setRawProject({
        ...rawProject,
        categories: [...rawProject.categories, category],
      })
      return category
    },
  })

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LocalCategory> & { id: string }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      await setRawProject({
        ...rawProject,
        categories: rawProject.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })
    },
  })

  return { data: categories, isLoading: false, createCategory, updateCategory }
}
