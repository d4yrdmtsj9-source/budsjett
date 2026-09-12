import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useState, useRef, useId, type ReactNode } from 'react'

function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setInset(hidden)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}

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
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: SheetProps) {
  const keyboardInset = useKeyboardInset()
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const nodes = [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
        ) ?? []),
      ].filter((el) => el.offsetParent !== null)
      const first = nodes[0],
        last = nodes[nodes.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      before?.focus()
    }
  }, [open])
  if (!open) return null

  return (
    <div
      ref={panel}
      tabIndex={-1}
      className="sheet-layer fixed inset-0 z-50 overflow-y-auto bg-surface-elevated"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="sheet-panel mx-auto max-w-lg min-h-full flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 safe-top">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-xl font-semibold truncate"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted mt-0.5">{subtitle}</p>
            )}
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
        <div
          className={cn('px-4 py-4')}
          style={{
            paddingBottom: `calc(2.5rem + ${keyboardInset}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
