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
        <h1 className="font-display text-2xl font-bold">Butikker</h1>
        <p className="text-sm text-muted">
          {suppliers.length} butikk{suppliers.length !== 1 ? 'er' : ''}
        </p>
      </header>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Ingen butikker ennå"
          description="Butikker vises automatisk når du legger inn butikknavn på plan eller kjøp"
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
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
                      {formatNOK(supplier.paidAmount)}
                    </p>
                    <p className="text-xs text-muted">Kjøpt</p>
                  </div>
                </div>
                {supplier.plannedAmount > 0 && (
                  <p className="text-xs text-muted mb-2">
                    {formatNOK(supplier.plannedAmount)} planlagt
                  </p>
                )}
                {supplier.totalAmount > 0 && (
                  <ProgressBar
                    value={supplier.paidAmount}
                    max={supplier.totalAmount}
                    size="sm"
                  />
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
