import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { budgetRemaining } from '@/lib/calc'
import { formatNOK } from '@/lib/format'
import { cn } from '@/lib/utils'

export function BudgetQuad({
  budget,
  bought,
  planned,
  showBar = true,
  footer,
  compact = false,
  framed = true,
}: {
  budget?: number | null
  bought: number
  planned: number
  showBar?: boolean
  footer?: ReactNode
  compact?: boolean
  framed?: boolean
}) {
  const hasBudget = budget != null && budget > 0
  const remaining = hasBudget ? budgetRemaining(budget, bought, planned) : null
  const projected = bought + planned

  const inner = (
    <>
      <div className={cn('grid grid-cols-2', compact ? 'gap-2' : 'gap-4')}>
        {hasBudget && <Stat label="Budsjett" value={formatNOK(budget)} compact={compact} />}
        <Stat label="Kjøpt" value={formatNOK(bought)} compact={compact} />
        <Stat label="Planlagt" value={formatNOK(planned)} compact={compact} />
        {remaining != null && (
          <Stat
            label="Gjenstår"
            value={formatNOK(remaining)}
            highlight={remaining < 0}
            compact={compact}
          />
        )}
      </div>
      {showBar && hasBudget && (
        <div className={compact ? 'mt-2' : 'mt-4'}>
          <ProgressBar value={projected} max={budget} showLabel={!compact} size={compact ? 'sm' : 'md'} />
        </div>
      )}
      {footer}
    </>
  )

  if (!framed) return inner

  return (
    <Card padding={compact ? 'sm' : 'lg'} className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10">
      {inner}
    </Card>
  )
}

function Stat({
  label,
  value,
  highlight,
  compact,
}: {
  label: string
  value: string
  highlight?: boolean
  compact?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p
        className={cn(
          'font-display font-semibold',
          compact ? 'text-sm' : 'text-lg',
          highlight && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  )
}
