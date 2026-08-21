import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { offset, viewportHeight, keyboardOpen } = useKeyboardOffset(open)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const maxHeight = keyboardOpen
    ? Math.max(240, viewportHeight - 8)
    : Math.min(viewportHeight * 0.92, window.innerHeight * 0.92)

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute left-0 right-0 overflow-hidden',
          'bg-surface-elevated rounded-t-3xl shadow-2xl',
          open && !keyboardOpen && 'animate-slide-up',
          'flex flex-col',
          !keyboardOpen && 'safe-bottom',
        )}
        style={{
          bottom: offset,
          maxHeight,
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
