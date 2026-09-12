import {
  Copy,
  Trash2,
  ArrowUpRight,
  MoreHorizontal,
  Paperclip,
  Split,
} from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '@/components/ui/Badge'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useExpenses } from '@/hooks/useExpenses'
import {
  paidAmount,
  outstanding,
  netCost,
  knownPrice,
  estimateDelta,
  pendingRefund,
} from '@/lib/finance'
import { formatNOK } from '@/lib/format'
import type { Expense } from '@/lib/types'
export function ExpenseRow({
  expense,
  showRoom = true,
  showCategory = true,
}: {
  expense: Expense
  showRoom?: boolean
  showCategory?: boolean
}) {
  const { openEdit } = useExpenseSheet()
  const { softDeleteExpense, duplicateExpense } = useExpenses()
  const [menu, setMenu] = useState(false)
  const delta = estimateDelta(expense)
  return (
    <div
      className={`expense-row ${expense.budget_included === false ? 'expense-alternative' : ''}`}
    >
      <button className="expense-main" onClick={() => openEdit(expense)}>
        <div className="expense-description">
          <strong>{expense.description}</strong>
          <p>
            {[
              showRoom && expense.room?.name,
              expense.supplier,
              showCategory && expense.category?.name,
            ]
              .filter(Boolean)
              .join(' · ') || 'Ingen butikk eller rom valgt'}
          </p>
          <div className="expense-badges">
            <StatusBadge status={expense.status} />
            {expense.budget_included === false && (
              <span className="mini-badge">Alternativ · utenfor budsjett</span>
            )}
            {(expense.receipts?.length ?? 0) > 0 && <Paperclip size={13} />}
            {(expense.allocations?.length ?? 0) > 0 && <Split size={13} />}
            {paidAmount(expense) > 0 && outstanding(expense) > 0 && (
              <span className="mini-badge amber">Delbetalt</span>
            )}
            {pendingRefund(expense) > 0 && (
              <span className="mini-badge amber">Venter refusjon</span>
            )}
          </div>
        </div>
        <div className="expense-amount">
          <strong>
            {knownPrice(expense) ? formatNOK(netCost(expense)) : 'Pris mangler'}
          </strong>
          {delta != null && delta !== 0 ? (
            <span className={delta > 0 ? 'text-destructive' : 'text-primary'}>
              {delta > 0 ? '+' : '−'}
              {formatNOK(Math.abs(delta))} mot estimat
            </span>
          ) : (
            <span>
              {paidAmount(expense) > 0
                ? `${formatNOK(paidAmount(expense))} betalt`
                : 'Trykk for detaljer'}
            </span>
          )}
        </div>
      </button>
      <div className="expense-actions">
        <button
          aria-label={`Handlinger for ${expense.description}`}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
      {menu && (
        <div className="expense-menu">
          <button
            onClick={() => {
              setMenu(false)
              openEdit(expense)
            }}
          >
            <ArrowUpRight size={15} />
            Rediger
          </button>
          <button
            onClick={() => {
              setMenu(false)
              duplicateExpense.mutate(expense)
            }}
          >
            <Copy size={15} />
            Dupliser
          </button>
          <button
            className="text-destructive"
            onClick={() => {
              setMenu(false)
              softDeleteExpense.mutate(expense.id)
            }}
          >
            <Trash2 size={15} />
            Slett
          </button>
        </div>
      )}
    </div>
  )
}
export function ExpenseList({
  expenses,
  showRoom = true,
  showCategory = true,
  emptyMessage = 'Ingen poster å vise',
}: {
  expenses: Expense[]
  showRoom?: boolean
  showCategory?: boolean
  emptyMessage?: string
}) {
  return expenses.length ? (
    <div className="expense-list">
      {expenses.map((e) => (
        <ExpenseRow
          key={e.id}
          expense={e}
          showRoom={showRoom}
          showCategory={showCategory}
        />
      ))}
    </div>
  ) : (
    <p className="plain-empty text-sm">{emptyMessage}</p>
  )
}
