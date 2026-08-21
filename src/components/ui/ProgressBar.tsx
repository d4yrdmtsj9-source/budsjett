import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, max = 100, className, showLabel, size = 'md' }: ProgressBarProps) {
  const rawPct = max > 0 ? (value / max) * 100 : value > 0 ? 100 : 0
  const isOver = max > 0 ? value > max : value > 0 && max === 0
  const pct = Math.min(100, rawPct)

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full rounded-full bg-black/5 overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isOver ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className={cn('text-xs mt-1', isOver ? 'text-destructive' : 'text-muted')}>
          {Math.round(rawPct)} % brukt
        </p>
      )}
    </div>
  )
}
