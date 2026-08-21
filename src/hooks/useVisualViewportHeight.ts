import { useEffect } from 'react'

/**
 * Keep `--vvh` in sync with the *visual* viewport height (resize only).
 * Do not listen to visualViewport.scroll or write offsetTop — that fights
 * Safari and makes the whole app jump.
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport

    const apply = () => {
      const h = Math.round(vv?.height ?? window.innerHeight)
      document.documentElement.style.setProperty('--vvh', `${h}px`)
    }

    apply()
    vv?.addEventListener('resize', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])
}
