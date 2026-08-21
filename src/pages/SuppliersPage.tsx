import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner'
import { useSuppliers } from '@/hooks/useSuppliers'
import { formatNOK } from '@/lib/format'

export function SuppliersPage() {
  const { suppliers, isLoading } = useSuppliers()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Leverandører</h1>
        <p className="text-sm text-muted">
          {suppliers.length} leverandør{suppliers.length !== 1 ? 'er' : ''}
        </p>
      </header>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Ingen leverandører ennå"
          description="Leverandører vises automatisk når du legger til utgifter med leverandørnavn"
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => {
            const paidPct =
              supplier.totalAmount > 0
                ? (supplier.paidAmount / supplier.totalAmount) * 100
                : 0

            return (
              <Link
                key={supplier.name}
                to={`/leverandorer/${encodeURIComponent(supplier.name)}`}
              >
                <Card>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-display font-semibold">{supplier.name}</h3>
                      <p className="text-sm text-muted">
                        {supplier.expenseCount} utgift
                        {supplier.expenseCount !== 1 ? 'er' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold">
                        {formatNOK(supplier.totalAmount)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatNOK(supplier.paidAmount)} betalt
                      </p>
                    </div>
                  </div>
                  <ProgressBar value={paidPct} max={100} size="sm" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
