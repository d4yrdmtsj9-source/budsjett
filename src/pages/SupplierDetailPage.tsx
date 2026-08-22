import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { BudgetQuad } from '@/components/budget/BudgetQuad'
import { useSupplier } from '@/hooks/useSuppliers'

export function SupplierDetailPage() {
  const { name } = useParams<{ name: string }>()
  const { supplier, isLoading } = useSupplier(name)

  if (isLoading) return <LoadingSpinner />

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Butikk ikke funnet</p>
        <Link to="/leverandorer" className="text-primary text-sm mt-2 inline-block">
          Tilbake
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <Link
          to="/leverandorer"
          className="inline-flex items-center gap-1 text-sm text-muted mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Butikker
        </Link>
        <h1 className="font-display text-2xl font-bold">{supplier.name}</h1>
        <p className="text-sm text-muted">
          {supplier.expenseCount} utgift{supplier.expenseCount !== 1 ? 'er' : ''}
        </p>
      </header>

      <BudgetQuad
        bought={supplier.paidAmount}
        planned={supplier.plannedAmount}
        showBar={false}
        footer={
          supplier.totalAmount > 0 ? (
            <p className="text-xs text-muted mt-3">
              {supplier.expenseCount} utgift{supplier.expenseCount !== 1 ? 'er' : ''} i denne butikken
            </p>
          ) : null
        }
      />

      <h2 className="font-display font-semibold">Utgifter</h2>
      <ExpenseList expenses={supplier.expenses} showRoom />
    </div>
  )
}
