import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Full-screen form overlay sized to the visual viewport (`--vvh`).
 * Bottom sheets sit under the iOS keyboard; a full-screen page does not.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 flex flex-col bg-surface-elevated"
      style={{ height: 'var(--vvh, 100dvh)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0 safe-top">
        <div className="min-w-0">
          <h2 id="sheet-title" className="font-display text-xl font-semibold truncate">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors shrink-0"
          aria-label="Lukk"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">{children}</div>
      {footer && (
        <div className={cn('shrink-0 px-4 pt-3 pb-4 border-t border-border/50 bg-surface-elevated')}>
          {footer}
        </div>
      )}
    </div>
  )
}
