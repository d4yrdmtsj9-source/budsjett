import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const script = readFileSync(
  new URL('../public/theme.js', import.meta.url),
  'utf8',
)
function boot(saved: string | null, dark: boolean, blocked = false) {
  const listeners: Record<
    string,
    ((e: {
      key?: string | null
      newValue?: string | null
      detail?: string
    }) => void)[]
  > = {}
  const root = {
    dataset: {} as Record<string, string>,
    style: { colorScheme: '' },
  }
  const meta = { content: '' }
  let stored = saved
  let mediaChange = () => {}
  const media = {
    matches: dark,
    addEventListener: (_: string, cb: () => void) => {
      mediaChange = cb
    },
  }
  const emit = (name: string, e = {}) => listeners[name]?.forEach((cb) => cb(e))
  runInNewContext(script, {
    document: {
      documentElement: root,
      querySelector: () => meta,
      addEventListener: () => {},
    },
    localStorage: {
      getItem: () => {
        if (blocked) throw Error('blocked')
        return stored
      },
      setItem: (_: string, value: string) => {
        if (blocked) throw Error('blocked')
        stored = value
      },
    },
    Event: class {
      type: string
      constructor(type: string) {
        this.type = type
      }
    },
    window: {
      matchMedia: () => media,
      addEventListener: (
        name: string,
        cb: (typeof listeners)[string][number],
      ) => {
        ;(listeners[name] ??= []).push(cb)
      },
      dispatchEvent: (e: { type: string }) => emit(e.type),
    },
  })
  return {
    root,
    meta,
    emit,
    stored: () => stored,
    system: (dark: boolean) => {
      media.matches = dark
      mediaChange()
    },
  }
}

test('system mode tracks OS changes while an explicit choice survives them and reloads', () => {
  const app = boot(null, true)
  assert.equal(app.root.dataset.theme, 'dark')
  assert.equal(app.meta.content, '#111c18')
  app.system(false)
  assert.equal(app.root.dataset.theme, 'light')
  app.emit('renover-theme-change', { detail: 'dark' })
  app.system(false)
  assert.equal(app.root.dataset.theme, 'dark')
  assert.equal(boot(app.stored(), false).root.dataset.theme, 'dark')
  app.emit('renover-theme-change', { detail: 'system' })
  assert.equal(app.root.dataset.theme, 'light')
})

test('other tabs update the theme and clearing storage restores system mode', () => {
  const app = boot('light', true)
  app.emit('storage', { key: 'renover-theme', newValue: 'dark' })
  assert.equal(app.root.dataset.theme, 'dark')
  app.emit('storage', { key: null, newValue: null })
  assert.equal(app.root.dataset.themePreference, 'system')
  app.system(false)
  assert.equal(app.root.dataset.theme, 'light')
})

test('unavailable storage and invalid preferences do not prevent startup or switching', () => {
  assert.equal(boot('invalid', true).root.dataset.theme, 'dark')
  const app = boot(null, false, true)
  app.emit('renover-theme-change', { detail: 'dark' })
  assert.equal(app.root.dataset.theme, 'dark')
})
