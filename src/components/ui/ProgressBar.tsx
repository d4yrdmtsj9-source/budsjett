import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, max = 100, className, showLabel, size = 'md' }: ProgressBarProps) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  const isOver = pct > 100

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
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted mt-1">{Math.round(pct)} % brukt</p>
      )}
    </div>
  )
}
