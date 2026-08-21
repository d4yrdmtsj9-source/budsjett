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

/**
 * Simple bottom sheet: lift above the keyboard with visualViewport height,
 * scroll only inside the sheet. No body/root repositioning — that made the
 * whole app feel jumpy on iOS.
 */
export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { offset, viewportHeight, keyboardOpen } = useKeyboardOffset(open)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = scrollRef.current
    if (!root) return

    let timer = 0
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      }, 250)
    }

    root.addEventListener('focusin', onFocusIn)
    return () => {
      window.clearTimeout(timer)
      root.removeEventListener('focusin', onFocusIn)
    }
  }, [open])

  if (!open) return null

  const sheetMax = keyboardOpen
    ? Math.max(240, Math.round(viewportHeight - 8))
    : undefined

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute left-0 right-0 flex flex-col overflow-hidden',
          'bg-surface-elevated rounded-t-3xl shadow-2xl',
          open && !keyboardOpen && 'animate-slide-up',
          !keyboardOpen && 'safe-bottom',
        )}
        style={{
          bottom: offset,
          maxHeight: sheetMax ?? 'min(92dvh, 100%)',
          height: sheetMax,
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
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
        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 min-h-0"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
