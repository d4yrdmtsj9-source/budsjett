import { useEffect, useState } from 'react'

/**
 * Keyboard inset from visualViewport height only.
 * Does not touch window.scrollY — fighting page scroll made the app feel broken.
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

    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!vv || vv.scale > 1.01) {
          setOffset(0)
          setViewportHeight(Math.round(vv?.height ?? window.innerHeight))
          return
        }
        const covered = Math.max(0, Math.round(window.innerHeight - vv.height))
        setOffset(covered)
        setViewportHeight(Math.round(vv.height))
      })
    }

    update()
    vv?.addEventListener('resize', update)
    window.addEventListener('resize', update)

    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return { offset, viewportHeight, keyboardOpen: offset > 80 }
}
