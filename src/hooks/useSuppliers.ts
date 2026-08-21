import { useMemo } from 'react'
import { useExpenses } from './useExpenses'
import { getExpenseTotal, sumPaidExpenses } from '@/lib/calc'
import type { Expense } from '@/lib/types'

export interface SupplierSummary {
  name: string
  totalAmount: number
  paidAmount: number
  expenseCount: number
  expenses: Expense[]
}

export function useSuppliers() {
  const { expenses, isLoading } = useExpenses()

  const suppliers = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of expenses) {
      if (!e.supplier?.trim()) continue
      const name = e.supplier.trim()
      const list = map.get(name) ?? []
      list.push(e)
      map.set(name, list)
    }
    const result: SupplierSummary[] = []
    for (const [name, list] of map) {
      result.push({
        name,
        expenses: list,
        expenseCount: list.length,
        totalAmount: list.reduce((s, e) => s + getExpenseTotal(e), 0),
        paidAmount: sumPaidExpenses(list),
      })
    }
    return result.sort((a, b) => b.totalAmount - a.totalAmount)
  }, [expenses])

  return { suppliers, data: suppliers, isLoading }
}

export function useSupplier(name: string | undefined) {
  const { suppliers, isLoading } = useSuppliers()
  const decoded = name ? decodeURIComponent(name) : ''
  const supplier = suppliers.find((s) => s.name === decoded) ?? null
  return { supplier, isLoading }
}
