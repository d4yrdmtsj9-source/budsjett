import { MoreHorizontal, Copy, Trash2, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useExpenses } from '@/hooks/useExpenses'
import { getExpenseTotal } from '@/lib/calc'
import { formatNOK, formatDate } from '@/lib/format'
import type { Expense } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ExpenseRowProps {
  expense: Expense
  showRoom?: boolean
  showCategory?: boolean
}

export function ExpenseRow({ expense, showRoom = true, showCategory = true }: ExpenseRowProps) {
  const { openEdit } = useExpenseSheet()
  const { softDeleteExpense, duplicateExpense } = useExpenses()
  const [menuOpen, setMenuOpen] = useState(false)

  const total = getExpenseTotal(expense)

  return (
    <Card padding="sm" className="relative">
      <div className="flex items-start gap-3">
        <button
          onClick={() => openEdit(expense)}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{expense.description}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                {showRoom && expense.room && (
                  <span className="text-xs text-muted">{expense.room.name}</span>
                )}
                {showCategory && expense.category && (
                  <span className="text-xs text-muted">· {expense.category.name}</span>
                )}
                {expense.supplier && (
                  <span className="text-xs text-muted">· {expense.supplier}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-semibold text-sm">{formatNOK(total)}</p>
              {expense.expense_date && (
                <p className="text-xs text-muted">{formatDate(expense.expense_date)}</p>
              )}
            </div>
          </div>
          <div className="mt-2">
            <StatusBadge status={expense.status} />
          </div>
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-black/5"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl bg-white shadow-lg border border-border py-1 animate-fade-in">
                <MenuItem
                  icon={Pencil}
                  label="Rediger"
                  onClick={() => {
                    setMenuOpen(false)
                    openEdit(expense)
                  }}
                />
                <MenuItem
                  icon={Copy}
                  label="Dupliser"
                  onClick={() => {
                    setMenuOpen(false)
                    duplicateExpense.mutate(expense)
                  }}
                />
                <MenuItem
                  icon={Trash2}
                  label="Slett"
                  destructive
                  onClick={() => {
                    setMenuOpen(false)
                    softDeleteExpense.mutate(expense.id)
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-black/5 transition-colors',
        destructive && 'text-destructive',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

export function ExpenseList({
  expenses,
  showRoom = true,
  showCategory = true,
  emptyMessage = 'Ingen utgifter ennå',
}: {
  expenses: Expense[]
  showRoom?: boolean
  showCategory?: boolean
  emptyMessage?: string
}) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">{emptyMessage}</p>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          showRoom={showRoom}
          showCategory={showCategory}
        />
      ))}
    </div>
  )
}
