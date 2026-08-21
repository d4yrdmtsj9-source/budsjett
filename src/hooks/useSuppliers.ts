import { useMemo } from 'react'
import { useExpenses } from './useExpenses'
import { getExpenseTotal, sumPaidExpenses, sumPlannedExpenses } from '@/lib/calc'
import type { Expense } from '@/lib/types'

export interface SupplierSummary {
  name: string
  totalAmount: number
  paidAmount: number
  plannedAmount: number
  expenseCount: number
  expenses: Expense[]
}

export function useSuppliers() {
  const { expenses, isLoading } = useExpenses()

  const suppliers = useMemo(() => {
    const map = new Map<string, { display: string; list: Expense[] }>()
    for (const e of expenses) {
      if (!e.supplier?.trim()) continue
      const display = e.supplier.trim()
      const key = display.toLowerCase()
      const group = map.get(key) ?? { display, list: [] }
      group.list.push(e)
      map.set(key, group)
    }
    const result: SupplierSummary[] = []
    for (const { display, list } of map.values()) {
      result.push({
        name: display,
        expenses: list,
        expenseCount: list.length,
        totalAmount: list.reduce((s, e) => s + getExpenseTotal(e), 0),
        paidAmount: sumPaidExpenses(list),
        plannedAmount: sumPlannedExpenses(list),
      })
    }
    return result.sort((a, b) => b.paidAmount - a.paidAmount || b.totalAmount - a.totalAmount)
  }, [expenses])

  return { suppliers, data: suppliers, isLoading }
}

export function useSupplier(name: string | undefined) {
  const { suppliers, isLoading } = useSuppliers()
  const decoded = name ? decodeURIComponent(name) : ''
  const supplier =
    suppliers.find((s) => s.name === decoded) ??
    suppliers.find((s) => s.name.toLowerCase() === decoded.toLowerCase()) ??
    null
  return { supplier, isLoading }
}
