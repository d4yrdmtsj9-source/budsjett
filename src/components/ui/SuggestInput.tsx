import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { filterSuggestions, firstLine } from '@/lib/suggest'
import { cn } from '@/lib/utils'

export function SuggestInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  autoFocus,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  autoFocus?: boolean
  multiline?: boolean
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const query = multiline ? firstLine(value) : value
  const matches = filterSuggestions(query, suggestions)
  const show = open && matches.length > 0

  useEffect(() => {
    setActive(0)
  }, [value])

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  const pick = (item: string) => {
    if (multiline && value.includes('\n')) {
      const rest = value.slice(firstLine(value).length)
      onChange(item + rest)
    } else {
      onChange(item)
    }
    setOpen(false)
  }

  const fieldProps = {
    id,
    autoComplete: 'off' as const,
    autoCorrect: 'off' as const,
    spellCheck: false,
    autoFocus,
    value,
    placeholder,
    onFocus: () => setOpen(true),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value)
      setOpen(true)
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!show) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min(i + 1, matches.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && !multiline && matches[active]) {
        e.preventDefault()
        pick(matches[active])
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
  }

  return (
    <div ref={rootRef} className="space-y-1.5 relative">
      <label htmlFor={id} className="block text-sm font-medium text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...fieldProps}
          rows={6}
          className={cn(
            'w-full min-h-[160px] px-4 py-3 rounded-xl border border-border bg-white/80',
            'text-base placeholder:text-muted/60 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
          )}
        />
      ) : (
        <input
          {...fieldProps}
          className={cn(
            'w-full h-12 px-4 rounded-xl border border-border bg-white/80',
            'text-base placeholder:text-muted/60',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
          )}
        />
      )}
      {show && (
        <ul
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-white shadow-lg py-1"
        >
          {matches.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm',
                  index === active ? 'bg-primary/10 text-primary' : 'hover:bg-black/5',
                )}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
