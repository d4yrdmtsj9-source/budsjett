import { Plus } from 'lucide-react'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset'

export function FAB() {
  const { openNew } = useExpenseSheet()
  const { keyboardOpen } = useKeyboardOffset(true)

  if (keyboardOpen) return null

  return (
    <button
      type="button"
      onClick={() => openNew()}
      className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 flex items-center justify-center hover:bg-primary-dark active:scale-95 transition-all"
      aria-label="Legg til utgift"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  )
}
