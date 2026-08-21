import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Expense } from '@/lib/types'

interface ExpenseSheetContextValue {
  isOpen: boolean
  editingExpense: Expense | null
  defaultRoomId: string | null
  openNew: (roomId?: string) => void
  openEdit: (expense: Expense) => void
  close: () => void
}

const ExpenseSheetContext = createContext<ExpenseSheetContextValue | null>(null)

export function ExpenseSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [defaultRoomId, setDefaultRoomId] = useState<string | null>(null)

  const openNew = (roomId?: string) => {
    setEditingExpense(null)
    setDefaultRoomId(roomId ?? null)
    setIsOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setDefaultRoomId(null)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setEditingExpense(null)
    setDefaultRoomId(null)
  }

  return (
    <ExpenseSheetContext.Provider
      value={{ isOpen, editingExpense, defaultRoomId, openNew, openEdit, close }}
    >
      {children}
    </ExpenseSheetContext.Provider>
  )
}

export function useExpenseSheet() {
  const ctx = useContext(ExpenseSheetContext)
  if (!ctx) throw new Error('useExpenseSheet must be used within ExpenseSheetProvider')
  return ctx
}
