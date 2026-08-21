import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
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

  // Scroll only inside the sheet — avoid page-level scrollIntoView (causes iOS jump/zoom feel)
  useEffect(() => {
    if (!open) return
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (!target.matches('input, textarea, select')) return
      const scroller = bodyRef.current
      if (!scroller || !scroller.contains(target)) return
      window.setTimeout(() => {
        const scrollerRect = scroller.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const delta =
          targetRect.top - scrollerRect.top - scrollerRect.height / 2 + targetRect.height / 2
        scroller.scrollTop += delta
      }, 50)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
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
          // No CSS transition on bottom — transitions + keyboard = jumpy iOS UX
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div ref={bodyRef} className="overflow-y-auto overscroll-contain flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
