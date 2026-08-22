import { forwardRef, useEffect, useState } from 'react'
import { formatGroupedNOK, parseNOKInput } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MoneyInputProps {
  label?: string
  value: number
  onChange: (amount: number) => void
  autoFocus?: boolean
  className?: string
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, value, onChange, autoFocus, className }, ref) => {
    const [text, setText] = useState(() => formatGroupedNOK(value))
    const [focused, setFocused] = useState(false)

    useEffect(() => {
      if (!focused) setText(formatGroupedNOK(value))
    }, [value, focused])

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-muted-foreground">{label}</label>
        )}
        <div className="relative">
          <input
            ref={ref}
            inputMode="decimal"
            autoFocus={autoFocus}
            autoComplete="off"
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              setText(formatGroupedNOK(value))
            }}
            onChange={(e) => {
              const raw = e.target.value
              if (raw.trim() === '') {
                setText('')
                onChange(0)
                return
              }
              const n = parseNOKInput(raw)
              const stripped = raw.replace(/\s/g, '')
              if (/[.,]$/.test(stripped)) {
                const whole = formatGroupedNOK(Math.trunc(n)) || '0'
                setText(`${whole}${stripped.includes(',') ? ',' : '.'}`)
                onChange(n)
                return
              }
              setText(n ? formatGroupedNOK(n) : raw)
              onChange(n)
            }}
            placeholder="0"
            className={cn(
              'w-full h-14 px-4 pr-12 rounded-xl border border-border bg-white/80',
              'text-xl font-display font-semibold tabular-nums',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
              className,
            )}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">kr</span>
        </div>
      </div>
    )
  },
)
MoneyInput.displayName = 'MoneyInput'
