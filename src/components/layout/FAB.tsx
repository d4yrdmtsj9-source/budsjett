import { Plus } from 'lucide-react'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
export function FAB() {
  const { openNew, isOpen } = useExpenseSheet()
  return isOpen ? null : (
    <button
      className="add-fab"
      onClick={() => openNew({ status: 'purchased' })}
      aria-label="Legg til kjøp"
    >
      <Plus size={23} />
      <span>Legg til kjøp</span>
    </button>
  )
}
