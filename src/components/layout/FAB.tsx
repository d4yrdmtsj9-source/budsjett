import { ClipboardList, ShoppingBag } from 'lucide-react'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset'
import { cn } from '@/lib/utils'

export function FAB() {
  const { openNew } = useExpenseSheet()
  const { keyboardOpen } = useKeyboardOffset(true)

  if (keyboardOpen) return null

  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col gap-2 items-end">
      <button
        type="button"
        onClick={() => openNew({ status: 'planned' })}
        className={cn(
          'h-12 pl-4 pr-4 rounded-2xl bg-white text-primary border border-primary/20',
          'shadow-lg flex items-center gap-2 font-medium text-sm',
          'hover:bg-primary/5 active:scale-95 transition-all',
        )}
        aria-label="Ny planlagt utgift"
      >
        <ClipboardList className="h-5 w-5" />
        Planlagt
      </button>
      <button
        type="button"
        onClick={() => openNew({ status: 'purchased' })}
        className={cn(
          'h-14 pl-4 pr-5 rounded-2xl bg-primary text-white',
          'shadow-lg shadow-primary/25 flex items-center gap-2 font-medium',
          'hover:bg-primary-dark active:scale-95 transition-all',
        )}
        aria-label="Ny kjøpt utgift"
      >
        <ShoppingBag className="h-5 w-5" />
        Kjøpt
      </button>
    </div>
  )
}
