import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProject } from './useProject'
import { useAuth } from './useAuth'
import { calculateTotal } from '@/lib/calc'
import { uid, type LocalExpense } from '@/lib/localStore'
import type { Expense, ExpenseFormData, ExpenseStatus } from '@/lib/types'

interface ExpenseFilters {
  roomId?: string
  categoryId?: string
  status?: ExpenseStatus
  supplier?: string
  search?: string
  includeDeleted?: boolean
}

function toExpense(e: LocalExpense, project: { rooms: { id: string; name: string }[]; categories: { id: string; name: string }[] }): Expense {
  return {
    ...e,
    project_id: '',
    room: project.rooms.find((r) => r.id === e.room_id) as Expense['room'],
    category: project.categories.find((c) => c.id === e.category_id) as Expense['category'],
  }
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const { rawProject, setRawProject } = useProject()
  const { user, displayName } = useAuth()

  const expenses = useMemo(() => {
    if (!rawProject) return []
    let list = rawProject.expenses.map((e) => toExpense(e, rawProject))
    if (!filters.includeDeleted) list = list.filter((e) => !e.deleted_at)
    if (filters.roomId) list = list.filter((e) => e.room_id === filters.roomId)
    if (filters.categoryId) list = list.filter((e) => e.category_id === filters.categoryId)
    if (filters.status) list = list.filter((e) => e.status === filters.status)
    if (filters.supplier) {
      const s = filters.supplier.toLowerCase()
      list = list.filter((e) => e.supplier?.toLowerCase().includes(s))
    }
    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(s) ||
          e.supplier?.toLowerCase().includes(s) ||
          e.notes?.toLowerCase().includes(s),
      )
    }
    return list.sort((a, b) => (b.expense_date ?? '').localeCompare(a.expense_date ?? ''))
  }, [rawProject, filters])

  const pushActivity = (project: NonNullable<typeof rawProject>, summary: string, event_type: string) => {
    project.activity.unshift({
      id: uid(),
      actor_id: user?.id ?? null,
      actor_name: displayName ?? 'Noen',
      event_type,
      summary,
      created_at: new Date().toISOString(),
    })
    project.activity = project.activity.slice(0, 100)
  }

  const createExpense = useMutation({
    mutationFn: async (form: ExpenseFormData) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      const total = calculateTotal(form)
      const now = new Date().toISOString()
      const expense: LocalExpense = {
        id: uid(),
        description: form.description.trim() || 'Uten tittel',
        room_id: form.room_id,
        category_id: form.category_id,
        quantity: form.quantity,
        unit: form.unit || 'stk',
        unit_price: form.unit_price,
        total_override: form.total_override,
        discount_percent: form.discount_percent,
        discount_amount: form.discount_amount,
        supplier: form.supplier?.trim() || null,
        expense_date: form.expense_date || now.slice(0, 10),
        status: form.status,
        who_paid: form.who_paid || null,
        notes: form.notes?.trim() || null,
        deleted_at: null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        created_at: now,
        updated_at: now,
        total,
      }
      const next = {
        ...rawProject,
        expenses: [expense, ...rawProject.expenses],
      }
      pushActivity(
        next,
        `${displayName ?? 'Noen'} la til ${expense.description} — ${total.toLocaleString('nb-NO')} kr`,
        'expense_created',
      )
      await setRawProject(next)
      return expense
    },
  })

  const updateExpense = useMutation({
    mutationFn: async ({
      id,
      form,
      quiet,
    }: {
      id: string
      form: ExpenseFormData
      quiet?: boolean
    }) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      const total = calculateTotal(form)
      const prev = rawProject.expenses.find((e) => e.id === id)
      const next = {
        ...rawProject,
        expenses: rawProject.expenses.map((e) =>
          e.id === id
            ? {
                ...e,
                description: form.description.trim() || e.description || 'Uten tittel',
                room_id: form.room_id,
                category_id: form.category_id,
                quantity: form.quantity,
                unit: form.unit || 'stk',
                unit_price: form.unit_price,
                total_override: form.total_override,
                discount_percent: form.discount_percent,
                discount_amount: form.discount_amount,
                supplier: form.supplier?.trim() || null,
                expense_date: form.expense_date,
                status: form.status,
                who_paid: form.who_paid || null,
                notes: form.notes?.trim() || null,
                total,
                updated_by: user?.id ?? null,
                updated_at: new Date().toISOString(),
              }
            : e,
        ),
      }
      if (!quiet || (prev && prev.status !== form.status)) {
        pushActivity(
          next,
          `${displayName ?? 'Noen'} oppdaterte ${form.description.trim() || 'utgift'}`,
          'expense_updated',
        )
      }
      await setRawProject(next)
    },
  })

  const softDeleteExpense = useMutation({
    mutationFn: async (input: string | { id: string; quiet?: boolean }) => {
      const opts = typeof input === 'string' ? { id: input, quiet: false } : input
      if (!rawProject) throw new Error('Ingen prosjekt')
      const projectId = rawProject.id
      const expense = rawProject.expenses.find((e) => e.id === opts.id)
      const next = {
        ...rawProject,
        expenses: rawProject.expenses.map((e) =>
          e.id === opts.id
            ? { ...e, deleted_at: new Date().toISOString(), updated_by: user?.id ?? null }
            : e,
        ),
      }
      if (!opts.quiet) {
        pushActivity(
          next,
          `${displayName ?? 'Noen'} slettet ${expense?.description ?? 'utgift'}`,
          'expense_deleted',
        )
      }
      await setRawProject(next)
      return { id: opts.id, projectId, quiet: !!opts.quiet }
    },
    onSuccess: ({ id, projectId, quiet }) => {
      if (quiet) return
      toast('Utgift slettet', {
        action: {
          label: 'Angre',
          onClick: async () => {
            const { loadProject } = await import('@/lib/localStore')
            const current = await loadProject(projectId)
            if (!current) return
            current.expenses = current.expenses.map((e) =>
              e.id === id ? { ...e, deleted_at: null } : e,
            )
            await setRawProject(current)
            toast.success('Utgift gjenopprettet')
          },
        },
        duration: 5000,
      })
    },
  })

  const duplicateExpense = useMutation({
    mutationFn: async (expense: Expense) => {
      if (!rawProject) throw new Error('Ingen prosjekt')
      const total = calculateTotal(expense)
      const now = new Date().toISOString()
      const copy: LocalExpense = {
        id: uid(),
        description: `${expense.description} (kopi)`,
        room_id: expense.room_id,
        category_id: expense.category_id,
        quantity: expense.quantity,
        unit: expense.unit || 'stk',
        unit_price: expense.unit_price,
        total_override: expense.total_override,
        discount_percent: expense.discount_percent,
        discount_amount: expense.discount_amount,
        supplier: expense.supplier,
        expense_date: expense.expense_date || now.slice(0, 10),
        status: 'planned',
        who_paid: expense.who_paid,
        notes: expense.notes,
        deleted_at: null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        created_at: now,
        updated_at: now,
        total,
      }
      await setRawProject({
        ...rawProject,
        expenses: [copy, ...rawProject.expenses],
      })
      toast.success('Utgift duplisert')
      return copy
    },
  })

  return {
    data: expenses,
    expenses,
    isLoading: false,
    createExpense,
    updateExpense,
    softDeleteExpense,
    duplicateExpense,
  }
}

export async function uploadReceipt(_expenseId: string, _file: File, _projectId: string, _userId?: string) {
  // Receipts: store as data URL in notes for local-first MVP is too heavy;
  // silently no-op with toast from caller if needed.
  toast.message('Kvitteringsopplasting lagres lokalt i neste versjon')
  return null
}

export function getReceiptUrl(_filePath: string) {
  return ''
}
