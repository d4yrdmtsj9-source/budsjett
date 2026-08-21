import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useProject } from './useProject'
import { useAuth } from './useAuth'
import { calculateTotal } from '@/lib/calc'
import type { Expense, ExpenseFormData, ExpenseStatus } from '@/lib/types'

interface ExpenseFilters {
  roomId?: string
  categoryId?: string
  status?: ExpenseStatus
  supplier?: string
  search?: string
  includeDeleted?: boolean
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const { project } = useProject()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['expenses', project?.id, filters],
    queryFn: async () => {
      let q = supabase
        .from('expenses')
        .select('*, room:rooms(*), category:categories(*)')
        .eq('project_id', project!.id)
        .order('expense_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (!filters.includeDeleted) {
        q = q.is('deleted_at', null)
      }
      if (filters.roomId) q = q.eq('room_id', filters.roomId)
      if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
      if (filters.status) q = q.eq('status', filters.status)
      if (filters.supplier) q = q.ilike('supplier', `%${filters.supplier}%`)

      const { data, error } = await q
      if (error) throw error
      return data as Expense[]
    },
    enabled: !!project,
  })

  const filtered = useMemo(() => {
    if (!filters.search || !query.data) return query.data ?? []
    const s = filters.search.toLowerCase()
    return query.data.filter(
      (e) =>
        e.description.toLowerCase().includes(s) ||
        e.supplier?.toLowerCase().includes(s) ||
        e.notes?.toLowerCase().includes(s),
    )
  }, [query.data, filters.search])

  useEffect(() => {
    if (!project) return

    const channel = supabase
      .channel(`expenses-${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `project_id=eq.${project.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['expenses', project.id] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.id, queryClient])

  const logActivity = async (
    action: string,
    eventType: string,
    summary: string,
    entityId?: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (!project || !user) return
    await supabase.from('activity_events').insert({
      project_id: project.id,
      actor_id: user.id,
      user_id: user.id,
      action,
      event_type: eventType,
      entity_type: 'expense',
      entity_id: entityId ?? null,
      summary,
      payload,
    })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  }

  const createExpense = useMutation({
    mutationFn: async (form: ExpenseFormData) => {
      const total = calculateTotal(form)
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          project_id: project!.id,
          description: form.description.trim(),
          room_id: form.room_id || null,
          category_id: form.category_id || null,
          quantity: form.quantity,
          unit: form.unit || 'stk',
          unit_price: form.unit_price,
          total_override: form.total_override,
          discount_percent: form.discount_percent,
          discount_amount: form.discount_amount,
          supplier: form.supplier?.trim() || null,
          expense_date: form.expense_date || null,
          status: form.status,
          who_paid: form.who_paid || null,
          notes: form.notes?.trim() || null,
          total,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single()
      if (error) throw error
      await logActivity(
        'created',
        'expense_created',
        `La til ${form.description} — ${total.toLocaleString('nb-NO')} kr`,
        data.id,
        { description: form.description, total },
      )
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const updateExpense = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: ExpenseFormData }) => {
      const total = calculateTotal(form)
      const { data, error } = await supabase
        .from('expenses')
        .update({
          description: form.description.trim(),
          room_id: form.room_id || null,
          category_id: form.category_id || null,
          quantity: form.quantity,
          unit: form.unit || 'stk',
          unit_price: form.unit_price,
          total_override: form.total_override,
          discount_percent: form.discount_percent,
          discount_amount: form.discount_amount,
          supplier: form.supplier?.trim() || null,
          expense_date: form.expense_date || null,
          status: form.status,
          who_paid: form.who_paid || null,
          notes: form.notes?.trim() || null,
          total,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await logActivity(
        'updated',
        'expense_updated',
        `Oppdaterte ${form.description}`,
        id,
        { description: form.description, total },
      )
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const softDeleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const expense = (query.data ?? []).find((e) => e.id === id)
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq('id', id)
      if (error) throw error
      await logActivity(
        'deleted',
        'expense_deleted',
        `Slettet ${expense?.description ?? 'utgift'}`,
        id,
        { description: expense?.description },
      )
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast('Utgift slettet', {
        action: {
          label: 'Angre',
          onClick: async () => {
            await supabase
              .from('expenses')
              .update({ deleted_at: null })
              .eq('id', id)
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            toast.success('Utgift gjenopprettet')
          },
        },
        duration: 5000,
      })
    },
  })

  const duplicateExpense = useMutation({
    mutationFn: async (expense: Expense) => {
      const total = calculateTotal(expense)
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          project_id: project!.id,
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
          expense_date: expense.expense_date,
          status: 'planned',
          who_paid: expense.who_paid,
          notes: expense.notes,
          total,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Utgift duplisert')
    },
  })

  return {
    ...query,
    expenses: filtered,
    createExpense,
    updateExpense,
    softDeleteExpense,
    duplicateExpense,
  }
}

export function useExpenseAttachments(expenseId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', expenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_attachments')
        .select('*')
        .eq('expense_id', expenseId!)
      if (error) throw error
      return data
    },
    enabled: !!expenseId,
  })
}

export async function uploadReceipt(
  expenseId: string,
  file: File,
  projectId: string,
  userId?: string,
) {
  const ext = file.name.split('.').pop()
  const path = `${projectId}/${expenseId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, file)

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('expense_attachments')
    .insert({
      project_id: projectId,
      expense_id: expenseId,
      storage_path: path,
      file_path: path,
      file_name: file.name,
      created_by: userId ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export function getReceiptUrl(filePath: string) {
  const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
  return data.publicUrl
}
