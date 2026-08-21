import { useMemo } from 'react'
import { useExpenses } from './useExpenses'
import { getExpenseTotal } from '@/lib/calc'
import type { Expense } from '@/lib/types'

export interface SupplierSummary {
  name: string
  expenseCount: number
  totalAmount: number
  paidAmount: number
  expenses: Expense[]
}

export function useSuppliers() {
  const { expenses, isLoading } = useExpenses()

  const suppliers = useMemo(() => {
    const map = new Map<string, SupplierSummary>()

    for (const expense of expenses) {
      const name = expense.supplier?.trim() || 'Ukjent leverandør'
      const existing = map.get(name) ?? {
        name,
        expenseCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        expenses: [],
      }

      const total = getExpenseTotal(expense)
      existing.expenseCount++
      existing.totalAmount += total
      if (expense.status === 'paid') existing.paidAmount += total
      existing.expenses.push(expense)
      map.set(name, existing)
    }

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [expenses])

  return { suppliers, isLoading }
}

export function useSupplier(name: string | undefined) {
  const { suppliers, isLoading } = useSuppliers()
  const supplier = suppliers.find((s) => s.name === decodeURIComponent(name ?? ''))
  return { supplier, isLoading }
}
