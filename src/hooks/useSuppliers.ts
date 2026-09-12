import { useMemo } from 'react'
import { useExpenses } from './useExpenses'
import { financials } from '@/lib/finance'
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
      const f = financials(list)
      result.push({
        name: display,
        expenses: list,
        expenseCount: list.length,
        totalAmount: f.projected,
        paidAmount: f.paid,
        plannedAmount: f.planned + f.ordered,
      })
    }
    return result.sort(
      (a, b) =>
        b.plannedAmount - a.plannedAmount || b.paidAmount - a.paidAmount,
    )
  }, [expenses])

  return { suppliers, data: suppliers, isLoading }
}

export function useSupplier(name: string | undefined) {
  const { suppliers, isLoading } = useSuppliers()
  const decoded = name ?? ''
  const supplier =
    suppliers.find((s) => s.name === decoded) ??
    suppliers.find((s) => s.name.toLowerCase() === decoded.toLowerCase()) ??
    null
  return { supplier, isLoading }
}
