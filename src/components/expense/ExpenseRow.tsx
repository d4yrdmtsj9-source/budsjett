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
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Select } from '@/components/ui/Select'
import { useProject } from '@/hooks/useProject'
import { todayISO } from '@/lib/format'
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
  const { softDeleteExpense, duplicateExpense, quickUpdate } = useExpenses()
  const { members } = useProject()
  const [payment, setPayment] = useState(false)
  const [amount, setAmount] = useState(outstanding(expense))
  const [date, setDate] = useState(todayISO())
  const [payer, setPayer] = useState('common')
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
              .join(' · ')}
          </p>
          <div className="expense-badges">
            <StatusBadge status={expense.status} />
            {expense.delivery_status === 'received' && <span className="mini-badge">Mottatt</span>}
            {paidAmount(expense) > netCost(expense) && !(expense.return_amount ?? 0) && <span className="mini-badge amber">Kontroller betalingene</span>}
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
                : ''}
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
          {(expense.status === 'planned' || expense.status === 'quoted') && <button disabled={quickUpdate.isPending} onClick={() => quickUpdate.mutate({ id: expense.id, action: 'ordered' })}>Bestilt</button>}
          {expense.delivery_status !== 'received' && expense.delivery_status !== 'not_required' && <button disabled={quickUpdate.isPending} onClick={() => quickUpdate.mutate({ id: expense.id, action: 'received' })}>Mottatt</button>}
          {knownPrice(expense) && outstanding(expense) > 0 && <button onClick={() => { setAmount(outstanding(expense)); setPayment(true); setMenu(false) }}>Registrer betaling</button>}
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
      <Sheet open={payment} onClose={() => { if (!quickUpdate.isPending) setPayment(false) }} title="Registrer betaling">
        <form className="space-y-4" onSubmit={async e => { e.preventDefault(); try { await quickUpdate.mutateAsync({ id: expense.id, action: 'payment', amount, payer, date }); setPayment(false) } catch { /* Mutation displays error */ } }}>
          <p>{expense.description} · {formatNOK(outstanding(expense))} gjenstår</p>
          <MoneyInput label="Beløp" value={amount} onChange={setAmount} />
          <Input label="Betalingsdato" type="date" required value={date} onChange={e => setDate(e.target.value)} />
          <Select label="Betalt fra" value={payer} onChange={e => setPayer(e.target.value)} options={[{ value: 'common', label: 'Felleskonto' }, ...members.map(m => ({ value: m.id, label: m.display_name ?? 'Person' }))]} />
          <Button type="submit" disabled={quickUpdate.isPending}>Lagre betaling</Button>
        </form>
      </Sheet>
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
