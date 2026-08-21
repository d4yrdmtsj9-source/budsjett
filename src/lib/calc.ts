import type { Expense, ExpenseFormData } from './types'

export function calculateSubtotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

export function calculateDiscount(
  subtotal: number,
  discountPercent: number | null,
  discountAmount: number | null,
): number {
  if (discountAmount != null && discountAmount > 0) {
    return Math.min(discountAmount, subtotal)
  }
  if (discountPercent != null && discountPercent > 0) {
    return subtotal * (discountPercent / 100)
  }
  return 0
}

export function calculateTotal(data: Pick<
  ExpenseFormData,
  'quantity' | 'unit_price' | 'total_override' | 'discount_percent' | 'discount_amount'
>): number {
  if (data.total_override != null && data.total_override >= 0) {
    return data.total_override
  }
  const subtotal = calculateSubtotal(data.quantity, data.unit_price)
  const discount = calculateDiscount(subtotal, data.discount_percent, data.discount_amount)
  return Math.max(0, subtotal - discount)
}

export function getExpenseTotal(expense: Pick<
  Expense,
  'total' | 'quantity' | 'unit_price' | 'total_override' | 'discount_percent' | 'discount_amount'
>): number {
  if (expense.total != null && expense.total > 0) {
    return expense.total
  }
  return calculateTotal(expense)
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + getExpenseTotal(e), 0)
}

export function sumPaidExpenses(expenses: Expense[]): number {
  return expenses
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + getExpenseTotal(e), 0)
}

export function sumProjectedExpenses(expenses: Expense[]): number {
  return expenses
    .filter((e) => !e.deleted_at)
    .reduce((sum, e) => sum + getExpenseTotal(e), 0)
}

export function budgetProgress(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0
  return Math.min(100, (spent / budget) * 100)
}

export function remainingBudget(budget: number, spent: number): number {
  return budget - spent
}

export function defaultExpenseForm(): ExpenseFormData {
  return {
    description: '',
    room_id: null,
    category_id: null,
    quantity: 1,
    unit: 'stk',
    unit_price: 0,
    total_override: null,
    discount_percent: null,
    discount_amount: null,
    supplier: '',
    expense_date: new Date().toISOString().split('T')[0],
    status: 'planned',
    who_paid: '',
    notes: '',
  }
}

export function expenseToForm(expense: Expense): ExpenseFormData {
  return {
    description: expense.description,
    room_id: expense.room_id,
    category_id: expense.category_id,
    quantity: expense.quantity,
    unit: expense.unit ?? 'stk',
    unit_price: expense.unit_price,
    total_override: expense.total_override,
    discount_percent: expense.discount_percent,
    discount_amount: expense.discount_amount,
    supplier: expense.supplier ?? '',
    expense_date: expense.expense_date ?? new Date().toISOString().split('T')[0],
    status: expense.status,
    who_paid: expense.who_paid ?? '',
    notes: expense.notes ?? '',
  }
}
