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

function scrollFieldIntoSheet(container: HTMLElement, target: HTMLElement) {
  const cRect = container.getBoundingClientRect()
  const tRect = target.getBoundingClientRect()
  // Keep the active field in the upper part of the sheet — on iOS the keyboard
  // often covers the lower half before visualViewport has updated.
  const desiredTop = cRect.top + Math.min(72, Math.max(24, cRect.height * 0.2))
  container.scrollTop += tRect.top - desiredTop
}

/**
 * Pin the sheet to the iOS/Android *visual* viewport.
 * `position: fixed` is relative to the layout viewport on iOS — without
 * setting top/height from visualViewport, the sheet sits under the keyboard.
 */
function useVisualViewportSheet(
  open: boolean,
  panelRef: React.RefObject<HTMLDivElement | null>,
  rootRef: React.RefObject<HTMLDivElement | null>,
) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setKeyboardOpen(false)
      return
    }

    const vv = window.visualViewport
    let frame = 0
    let lastKb = false
    let focused = false

    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const panel = panelRef.current
        const root = rootRef.current
        if (!panel) return

        const layoutH = window.innerHeight
        const vvH = vv ? vv.height : layoutH
        const vvTop = vv ? vv.offsetTop : 0
        const heightShrink = Math.max(0, layoutH - vvH)
        // iOS sometimes keeps vv.height full but scrolls offsetTop; treat either as keyboard.
        const kb = focused || heightShrink > 60 || vvTop > 40

        if (root) {
          // Keep overlay + sheet inside the visible visual viewport.
          root.style.top = `${Math.round(vvTop)}px`
          root.style.height = `${Math.round(vvH)}px`
          root.style.bottom = 'auto'
          root.style.left = '0'
          root.style.right = '0'
        }

        if (kb) {
          // Fill the root (already = visual viewport). Do NOT add vvTop again.
          panel.style.top = '0'
          panel.style.bottom = 'auto'
          panel.style.height = '100%'
          panel.style.maxHeight = '100%'
        } else {
          panel.style.top = 'auto'
          panel.style.bottom = '0'
          panel.style.height = ''
          panel.style.maxHeight = '92%'
        }

        if (kb !== lastKb) {
          lastKb = kb
          setKeyboardOpen(kb)
        }
      })
    }

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      focused = true
      apply()
      // Keyboard animation is slow on iOS — re-apply while it settles.
      window.setTimeout(apply, 50)
      window.setTimeout(apply, 200)
      window.setTimeout(apply, 400)
      window.setTimeout(() => {
        apply()
        const scroll = panelRef.current?.querySelector<HTMLElement>('[data-sheet-scroll]')
        if (scroll) scrollFieldIntoSheet(scroll, t)
      }, 450)
    }

    const onFocusOut = () => {
      // Delay: focus may move to another field.
      window.setTimeout(() => {
        const active = document.activeElement
        const still =
          active instanceof HTMLElement &&
          !!panelRef.current?.contains(active) &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
        focused = still
        apply()
      }, 100)
    }

    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [open, panelRef, rootRef])

  return keyboardOpen
}

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const keyboardOpen = useVisualViewportSheet(open, panelRef, rootRef)

  // Lock background scroll without position:fixed on body (that breaks iOS vv).
  useEffect(() => {
    if (!open) return
    const { body, documentElement } = document
    const prevBody = body.style.overflow
    const prevHtml = documentElement.style.overflow
    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prevBody
      documentElement.style.overflow = prevHtml
    }
  }, [open])

  if (!open) return null

  return (
    <div ref={rootRef} className="fixed inset-0 z-50">
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
          data-sheet-scroll
          className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 min-h-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
