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

/** Scroll focused control into the sheet body without yanking the page. */
function scrollFieldIntoSheet(container: HTMLElement, target: HTMLElement) {
  const cRect = container.getBoundingClientRect()
  const tRect = target.getBoundingClientRect()
  const margin = 20
  // Extra room so labels + next controls stay visible above the keyboard edge
  const bottomPad = 56

  if (tRect.bottom > cRect.bottom - bottomPad) {
    container.scrollTop += tRect.bottom - cRect.bottom + bottomPad
  } else if (tRect.top < cRect.top + margin) {
    container.scrollTop -= cRect.top + margin - tRect.top
  }
}

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { offset, viewportHeight, keyboardOpen } = useKeyboardOffset(open)

  // Freeze the page under the sheet so iOS focus/keyboard can't jump the layout.
  useEffect(() => {
    if (!open) return

    const scrollY = window.scrollY
    const { body } = document
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [open])

  // Keep focused inputs visible inside the sheet when the keyboard opens or
  // when the user taps a field further down (e.g. kategori).
  useEffect(() => {
    if (!open) return
    const root = scrollRef.current
    if (!root) return

    let timer = 0
    const run = (target: HTMLElement) => {
      window.clearTimeout(timer)
      // Wait for keyboard + sheet resize to settle (iOS is slow).
      timer = window.setTimeout(() => {
        const container = scrollRef.current
        if (!container) return
        scrollFieldIntoSheet(container, target)
        window.scrollTo(0, 0)
      }, 280)
    }

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      run(target)
    }

    root.addEventListener('focusin', onFocusIn)
    return () => {
      window.clearTimeout(timer)
      root.removeEventListener('focusin', onFocusIn)
    }
  }, [open, keyboardOpen, offset, viewportHeight])

  if (!open) return null

  // Fit the sheet into the visible visual viewport (above the keyboard).
  const maxHeight = Math.max(240, Math.round(viewportHeight - (keyboardOpen ? 8 : viewportHeight * 0.08)))

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
          // When keyboard is up, use a fixed height so content scrolls inside
          // instead of the whole sheet resizing/jumping on each focus.
          height: keyboardOpen ? maxHeight : undefined,
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
        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain flex-1 px-5 py-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
