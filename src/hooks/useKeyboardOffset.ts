import { useEffect, useState } from 'react'

/**
 * How much of the layout viewport is covered by the software keyboard.
 * Ignores pinch-zoom (scale !== 1) so we don't fight Safari's zoom.
 */
export function useKeyboardOffset(enabled = true) {
  const [offset, setOffset] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0,
  )

  useEffect(() => {
    if (!enabled) {
      setOffset(0)
      return
    }

    const vv = window.visualViewport
    let frame = 0

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
          setViewportHeight(vv.height)
          return
        }
        const covered = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
        setOffset(covered)
        setViewportHeight(Math.round(vv.height))
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

  return { offset, viewportHeight, keyboardOpen: offset > 100 }
}
