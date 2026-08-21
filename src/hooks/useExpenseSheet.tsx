import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Expense, ExpenseStatus } from '@/lib/types'

export type ExpenseSheetMode = 'create' | 'edit' | 'purchase'

export interface OpenNewOptions {
  status?: 'planned' | 'purchased'
  roomId?: string
}

interface ExpenseSheetContextValue {
  isOpen: boolean
  editingExpense: Expense | null
  defaultRoomId: string | null
  defaultStatus: 'planned' | 'purchased'
  mode: ExpenseSheetMode
  focusField: 'description' | 'unit_price'
  openNew: (opts?: OpenNewOptions | string) => void
  openEdit: (expense: Expense) => void
  openPurchase: (expense: Expense) => void
  setEditingExpense: (expense: Expense | null) => void
  close: () => void
}

const ExpenseSheetContext = createContext<ExpenseSheetContextValue | null>(null)

export function ExpenseSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [defaultRoomId, setDefaultRoomId] = useState<string | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<'planned' | 'purchased'>('planned')
  const [mode, setMode] = useState<ExpenseSheetMode>('create')
  const [focusField, setFocusField] = useState<'description' | 'unit_price'>('description')

  const openNew = (opts?: OpenNewOptions | string) => {
    // Backward compat: openNew(roomId)
    const options: OpenNewOptions =
      typeof opts === 'string' ? { roomId: opts } : (opts ?? {})
    const status = options.status ?? 'planned'
    setEditingExpense(null)
    setDefaultRoomId(options.roomId ?? null)
    setDefaultStatus(status)
    setMode('create')
    setFocusField(status === 'purchased' ? 'unit_price' : 'description')
    setIsOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setDefaultRoomId(null)
    setDefaultStatus(
      expense.status === 'purchased' || expense.status === 'paid' ? 'purchased' : 'planned',
    )
    setMode('edit')
    setFocusField('description')
    setIsOpen(true)
  }

  const openPurchase = (expense: Expense) => {
    setEditingExpense(expense)
    setDefaultRoomId(null)
    setDefaultStatus('purchased')
    setMode('purchase')
    setFocusField('unit_price')
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setEditingExpense(null)
    setDefaultRoomId(null)
    setDefaultStatus('planned')
    setMode('create')
    setFocusField('description')
  }

  return (
    <ExpenseSheetContext.Provider
      value={{
        isOpen,
        editingExpense,
        defaultRoomId,
        defaultStatus,
        mode,
        focusField,
        openNew,
        openEdit,
        openPurchase,
        setEditingExpense,
        close,
      }}
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

/** @deprecated */
export type { ExpenseStatus }
