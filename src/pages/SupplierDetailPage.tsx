import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { useSupplier } from '@/hooks/useSuppliers'
import { formatNOK } from '@/lib/format'

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

  const paidPct =
    supplier.totalAmount > 0 ? (supplier.paidAmount / supplier.totalAmount) * 100 : 0

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

      <Card padding="lg">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted">Totalt</p>
            <p className="font-display text-lg font-semibold">
              {formatNOK(supplier.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Betalt</p>
            <p className="font-display text-lg font-semibold">
              {formatNOK(supplier.paidAmount)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted mb-1">Betalt andel</p>
            <ProgressBar value={paidPct} max={100} size="sm" />
          </div>
        </div>
      </Card>

      <h2 className="font-display font-semibold">Utgifter</h2>
      <ExpenseList expenses={supplier.expenses} showRoom />
    </div>
  )
}
