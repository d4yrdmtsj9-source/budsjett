import { useEffect, useState } from 'react'

/** True when the software keyboard covers a meaningful part of the screen. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    const update = () => {
      if (!vv) {
        setOpen(false)
        return
      }
      setOpen(window.innerHeight - vv.height > 80)
    }
    update()
    vv?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return open
}

/** @deprecated use useKeyboardOpen */
export function useKeyboardOffset(enabled = true) {
  const open = useKeyboardOpen()
  return {
    offset: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    keyboardOpen: enabled && open,
  }
}
