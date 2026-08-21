import { cn } from '@/lib/utils'
import type { ExpenseStatus } from '@/lib/types'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS } from '@/lib/types'

interface BadgeProps {
  status: ExpenseStatus
  className?: string
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        EXPENSE_STATUS_COLORS[status],
        className,
      )}
    >
      {EXPENSE_STATUS_LABELS[status]}
    </span>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary',
        className,
      )}
    >
      {children}
    </span>
  )
}
