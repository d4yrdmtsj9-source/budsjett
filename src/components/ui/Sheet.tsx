import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

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
  const bottomPad = 72

  if (tRect.bottom > cRect.bottom - bottomPad) {
    container.scrollTop += tRect.bottom - cRect.bottom + bottomPad
  } else if (tRect.top < cRect.top + margin) {
    container.scrollTop -= cRect.top + margin - tRect.top
  }
}

/**
 * Position the panel inside the visual viewport via direct DOM writes.
 * Avoids React re-renders on every keyboard frame (a common source of jumpiness).
 */
function useSheetViewport(open: boolean, panelRef: React.RefObject<HTMLDivElement | null>) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setKeyboardOpen(false)
      return
    }

    const vv = window.visualViewport
    let frame = 0
    let lastKb = false

    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const panel = panelRef.current
        if (!panel) return

        const height = vv ? Math.round(vv.height) : window.innerHeight
        const offsetTop = vv ? Math.round(vv.offsetTop) : 0
        // Gap between layout viewport bottom and visual viewport bottom
        const bottomGap = Math.max(0, Math.round(window.innerHeight - height - offsetTop))
        const kb = bottomGap > 80 || (vv ? window.innerHeight - vv.height > 80 : false)

        const maxHeight = Math.max(240, kb ? height - 8 : Math.round(height * 0.92))

        panel.style.bottom = `${bottomGap}px`
        panel.style.maxHeight = `${maxHeight}px`
        panel.style.height = kb ? `${maxHeight}px` : ''

        if (kb !== lastKb) {
          lastKb = kb
          setKeyboardOpen(kb)
        }

        if (window.scrollY !== 0) window.scrollTo(0, 0)
      })
    }

    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)

    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [open, panelRef])

  return keyboardOpen
}

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const keyboardOpen = useSheetViewport(open, panelRef)

  // Freeze the page under the sheet so iOS focus/keyboard can't jump the layout.
  useEffect(() => {
    if (!open) return

    const scrollY = window.scrollY
    const { body, documentElement } = document
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      htmlOverflow: documentElement.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      documentElement.style.overflow = prev.htmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [open])

  // Keep focused inputs visible inside the sheet scroll area.
  useEffect(() => {
    if (!open) return
    const root = scrollRef.current
    if (!root) return

    const timers: number[] = []
    const run = (target: HTMLElement) => {
      for (const t of timers) window.clearTimeout(t)
      timers.length = 0
      for (const delay of [120, 380]) {
        timers.push(
          window.setTimeout(() => {
            const container = scrollRef.current
            if (!container) return
            scrollFieldIntoSheet(container, target)
            window.scrollTo(0, 0)
          }, delay),
        )
      }
    }

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      run(target)
    }

    root.addEventListener('focusin', onFocusIn)
    return () => {
      for (const t of timers) window.clearTimeout(t)
      root.removeEventListener('focusin', onFocusIn)
    }
  }, [open, keyboardOpen])

  if (!open) return null

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
          bottom: 0,
          maxHeight: '92dvh',
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
