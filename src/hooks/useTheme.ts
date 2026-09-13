import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
const subscribe = (callback: () => void) => {
  window.addEventListener('renover-theme-updated', callback)
  return () => window.removeEventListener('renover-theme-updated', callback)
}
const getPreference = () =>
  (document.documentElement.dataset.themePreference ??
    'system') as ThemePreference
const getResolved = (): 'light' | 'dark' =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getPreference)
  const resolved = useSyncExternalStore(subscribe, getResolved)
  const setPreference = (value: ThemePreference) => {
    window.dispatchEvent(
      new CustomEvent('renover-theme-change', { detail: value }),
    )
  }
  return { preference, resolved, setPreference }
}
