import { Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
export function FAB() {
  const { openNew, isOpen } = useExpenseSheet()
  const { pathname } = useLocation()
  return isOpen || ['/moodboard', '/planlegg'].includes(pathname) ? null : (
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
