import { useEffect, useState } from 'react'

/**
 * iOS/Safari often overlays the software keyboard without resizing layout.
 * visualViewport tells us how much of the bottom is covered so fixed UI can lift.
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
    const update = () => {
      if (!vv) {
        setOffset(0)
        setViewportHeight(window.innerHeight)
        return
      }
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setOffset(covered)
      setViewportHeight(vv.height)
    }

    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return { offset, viewportHeight, keyboardOpen: offset > 80 }
}
