import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}

/**
 * Full-screen layer that *is* the scroll container.
 * Do not nest another overflow-y-auto or pin a footer — iOS will then
 * show the footer over the page while the fields sit under the keyboard.
 */
export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-surface-elevated"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <div className="mx-auto max-w-lg min-h-full flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 safe-top">
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
        <div className={cn('px-4 py-4 pb-10')}>{children}</div>
      </div>
    </div>
  )
}
