import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProject } from './useProject'
import { useAuth } from './useAuth'
import { calculateTotal } from '@/lib/calc'
import {
  validateExpense,
  isPlanned,
  paymentsOf,
  knownPrice,
  applySelectedAlternative,
} from '@/lib/finance'
import { uid, type LocalExpense, type LocalProject } from '@/lib/localStore'
import { todayISO } from '@/lib/format'
import type { Expense, ExpenseFormData, ExpenseStatus } from '@/lib/types'
interface ExpenseFilters {
  roomId?: string
  categoryId?: string
  status?: ExpenseStatus
  supplier?: string
  search?: string
  includeDeleted?: boolean
}
const onError = (e: Error) => toast.error(e.message)
export function useExpenses(filters: ExpenseFilters = {}) {
  const { rawProject, setRawProject } = useProject()
  const { user, displayName } = useAuth()
  const { roomId, categoryId, status, supplier, search, includeDeleted } =
    filters
  const expenses = useMemo(() => {
    if (!rawProject) return []
    return rawProject.expenses
      .map((e) => ({
        ...e,
        project_id: rawProject.id,
        room: rawProject.rooms.find(
          (r) => r.id === e.room_id && !r.deleted_at,
        ) as Expense['room'],
        category: rawProject.categories.find(
          (c) => c.id === e.category_id && !c.deleted_at,
        ) as Expense['category'],
      }))
      .filter(
        (e) =>
          (includeDeleted || !e.deleted_at) &&
          (!roomId ||
            e.room_id === roomId ||
            e.allocations?.some((a) => a.room_id === roomId)) &&
          (!categoryId || e.category_id === categoryId) &&
          (!status || e.status === status) &&
          (!supplier ||
            e.supplier?.toLowerCase().includes(supplier.toLowerCase())) &&
          (!search ||
            [e.description, e.supplier, e.notes, e.room?.name].some((v) =>
              v?.toLowerCase().includes(search.toLowerCase()),
            )),
      )
      .sort((a, b) =>
        (b.expense_date ?? '').localeCompare(a.expense_date ?? ''),
      )
  }, [rawProject, roomId, categoryId, status, supplier, search, includeDeleted])
  const activity = (p: LocalProject, summary: string) => ({
    ...p,
    activity: [
      {
        id: uid(),
        actor_id: user?.id ?? null,
        actor_name: displayName ?? 'Noen',
        event_type: 'expense_updated',
        summary,
        created_at: new Date().toISOString(),
      },
      ...p.activity,
    ].slice(0, 100),
  })
  const saveForm = (
    form: ExpenseFormData,
    previous?: LocalExpense,
  ): LocalExpense => {
    const error = validateExpense(form)
    if (error) throw new Error(error)
    const now = new Date().toISOString()
    const total = calculateTotal(form)
    const original =
      previous?.original_estimate ??
      (previous &&
      isPlanned(previous) &&
      !isPlanned(form) &&
      (previous.price_known ?? previous.total > 0)
        ? previous.total
        : (form.original_estimate ?? null))
    return {
      ...previous,
      ...form,
      original_estimate: original,
      id: previous?.id ?? uid(),
      total,
      description: form.description.trim(),
      supplier: form.supplier.trim() || null,
      notes: form.notes.trim() || null,
      who_paid: form.who_paid || null,
      expense_date: form.expense_date || todayISO(),
      unit: form.unit || 'stk',
      deleted_at: previous?.deleted_at ?? null,
      created_by: previous?.created_by ?? user?.id ?? null,
      updated_by: user?.id ?? null,
      created_at: previous?.created_at ?? now,
      updated_at: now,
    }
  }
  const createExpense = useMutation({
    mutationFn: async (form: ExpenseFormData) => {
      const e = saveForm(form)
      await setRawProject((p) =>
        activity(
          { ...p, expenses: applySelectedAlternative([e, ...p.expenses], e) },
          `${displayName ?? 'Noen'} la til ${e.description}`,
        ),
      )
      return e
    },
    onError,
  })
  const updateExpense = useMutation({
    mutationFn: async ({
      id,
      form,
    }: {
      id: string
      form: ExpenseFormData
      quiet?: boolean
    }) => {
      await setRawProject((p) => {
        const old = p.expenses.find((e) => e.id === id)
        if (!old || old.deleted_at)
          throw new Error('Posten er fjernet. Lukk og åpne listen igjen.')
        const e = saveForm(form, old)
        // Selecting one quote excludes the other uncommitted alternatives in its group.
        const rows = applySelectedAlternative(
          p.expenses.map((row) => (row.id === id ? e : row)),
          e,
        )
        return activity(
          { ...p, expenses: rows },
          `${displayName ?? 'Noen'} oppdaterte ${e.description}`,
        )
      })
    },
    onError,
  })
  const softDeleteExpense = useMutation({
    mutationFn: async (input: string | { id: string; quiet?: boolean }) => {
      const id = typeof input === 'string' ? input : input.id
      await setRawProject((p) =>
        activity(
          {
            ...p,
            expenses: p.expenses.map((e) =>
              e.id === id
                ? {
                    ...e,
                    deleted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                : e,
            ),
          },
          'En post ble slettet',
        ),
      )
      return id
    },
    onSuccess: (id) =>
      toast('Post slettet', {
        duration: 8000,
        action: {
          label: 'Angre',
          onClick: () => {
            void setRawProject((p) => ({
              ...p,
              expenses: p.expenses.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      deleted_at: null,
                      updated_at: new Date().toISOString(),
                    }
                  : e,
              ),
            })).catch(onError)
          },
        },
      }),
    onError,
  })
  const duplicateExpense = useMutation({
    mutationFn: async (expense: Expense) => {
      const now = new Date().toISOString()
      const copy = {
        ...expense,
        unit: expense.unit ?? 'stk',
        expense_date: expense.expense_date ?? todayISO(),
        id: uid(),
        description: `${expense.description} (kopi)`,
        status: 'planned' as const,
        payments: [],
        original_estimate: null,
        receipts: [],
        return_amount: 0,
        due_date: null,
        who_paid: null,
        created_at: now,
        updated_at: now,
      }
      await setRawProject((p) => ({ ...p, expenses: [copy, ...p.expenses] }))
      return copy
    },
    onSuccess: () => toast.success('Post duplisert'),
    onError,
  })
  const setExpenseStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: ExpenseStatus
    }) => {
      await setRawProject((p) => ({
        ...p,
        expenses: p.expenses.map((e) => {
          if (e.id !== id) return e
          if (isPlanned({ status }) && paymentsOf(e as Expense).length)
            throw new Error(
              'Fjern betalingene i redigering før du setter posten tilbake til planlagt.',
            )
          return {
            ...e,
            status,
            original_estimate:
              e.original_estimate ??
              (isPlanned(e) && knownPrice(e as Expense) ? e.total : null),
            updated_at: new Date().toISOString(),
          }
        }),
      }))
    },
    onError,
  })
  return {
    data: expenses,
    expenses,
    isLoading: false,
    createExpense,
    updateExpense,
    softDeleteExpense,
    duplicateExpense,
    setExpenseStatus,
  }
}
