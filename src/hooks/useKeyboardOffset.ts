import { useEffect, useState } from 'react'

/**
 * How much of the layout viewport is covered by the software keyboard.
 * Ignores pinch-zoom (scale !== 1) so we don't fight Safari's zoom.
 *
 * When iOS scrolls the visual viewport on focus, we still report the gap
 * below the visible area so fixed sheets can sit above the keyboard —
 * without chasing offsetTop (that causes jumpiness).
 */
export function useKeyboardOffset(enabled = true) {
  const [offset, setOffset] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0,
  )

  useEffect(() => {
    if (!enabled) {
      setOffset(0)
      setViewportHeight(typeof window !== 'undefined' ? window.innerHeight : 0)
      return
    }

    const vv = window.visualViewport
    let frame = 0
    let lastOffset = -1
    let lastHeight = -1

    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!vv) {
          setOffset(0)
          setViewportHeight(window.innerHeight)
          return
        }
        // Pinch-zoom makes offset math wrong — don't lift UI while zoomed
        if (vv.scale > 1.01) {
          setOffset(0)
          setViewportHeight(Math.round(vv.height))
          return
        }

        // Prefer height-based coverage. Including offsetTop double-counts when
        // Safari scrolls the visual viewport to follow a focused input.
        const covered = Math.max(0, Math.round(window.innerHeight - vv.height))
        const height = Math.round(vv.height)

        // Ignore 1–2px jitter from the keyboard animation.
        if (Math.abs(covered - lastOffset) < 3 && Math.abs(height - lastHeight) < 3) {
          return
        }
        lastOffset = covered
        lastHeight = height
        setOffset(covered)
        setViewportHeight(height)

        // Undo focus-driven page scroll; sheet handles its own scrolling.
        if (window.scrollY !== 0) window.scrollTo(0, 0)
      })
    }

    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return { offset, viewportHeight, keyboardOpen: offset > 80 }
}
