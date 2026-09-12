import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Sheet } from '@/components/ui/Sheet'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { FinancialOverview } from '@/components/budget/FinancialOverview'
import { roomPortion, isPlanned } from '@/lib/finance'
import { useRoom, useRooms } from '@/hooks/useRooms'
import { useExpenses } from '@/hooks/useExpenses'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { data: room, isLoading } = useRoom(roomId)
  const { updateRoom, deleteRoom } = useRooms()
  const { expenses } = useExpenses({ roomId })
  const { openNew } = useExpenseSheet()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)

  const roomExpenses = expenses
  const portions = expenses.flatMap((e) => {
    const part = roomPortion(e, roomId ?? '')
    return part ? [part] : []
  })
  const toBuy = roomExpenses.filter(isPlanned)
  const purchased = roomExpenses.filter((e) => !isPlanned(e))

  const openEditSheet = () => {
    if (room) {
      setName(room.name)
      setBudget(String(room.budget))
      setShowEdit(true)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomId) return
    setSaving(true)
    try {
      await updateRoom.mutateAsync({
        id: roomId,
        name,
        budget: parseFloat(budget) || 0,
      })
      toast.success('Rom oppdatert')
      setShowEdit(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunne ikke oppdatere')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Rom ikke funnet</p>
        <Link to="/rom" className="text-primary text-sm mt-2 inline-block">
          Tilbake til rom
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <Link
          to="/rom"
          className="inline-flex items-center gap-1 text-sm text-muted mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Rom
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{room.name}</h1>
            <p className="text-sm text-muted">
              {toBuy.length > 0
                ? `${toBuy.length} å kjøpe`
                : purchased.length > 0
                  ? `${purchased.length} kjøpt`
                  : 'Ingenting planlagt ennå'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rediger rom"
            onClick={openEditSheet}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="discovery-links">
        <Link to={`/inspo?rom=${roomId}`}>
          Inspirasjon til {room.name}{' '}
          <ArrowLeft size={14} className="rotate-180" />
        </Link>
        <Link to="/planlegg">Oppgaver og milepæler</Link>
      </div>

      <FinancialOverview
        expenses={portions}
        budget={room.budget}
        scope="ROMBUDSJETT"
      />
      {expenses.some((e) => e.allocations?.length) && (
        <p className="text-xs text-muted">
          Romoversikten viser rommets andel. Postene nedenfor viser hele kjøpet;
          redigering gjelder alle rom.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openNew({ roomId, status: 'purchased' })}
        >
          Kjøp
        </Button>
        <Button
          size="sm"
          onClick={() => openNew({ roomId, status: 'planned' })}
        >
          Planlegg
        </Button>
      </div>

      <section>
        <h2 className="font-display font-semibold mb-2">Å kjøpe</h2>
        <ExpenseList
          expenses={toBuy}
          showRoom={false}
          emptyMessage={`Ingenting planlagt i ${room.name.toLowerCase()} ennå`}
        />
        {toBuy.length === 0 && (
          <button
            type="button"
            className="block mx-auto text-sm font-medium text-primary -mt-4 mb-2"
            onClick={() => openNew({ roomId, status: 'planned' })}
          >
            Planlegg første ting i {room.name.toLowerCase()}
          </button>
        )}
      </section>

      {purchased.length > 0 && (
        <section>
          <h2 className="font-display font-semibold mb-2">Bestilt og kjøpt</h2>
          <ExpenseList expenses={purchased} showRoom={false} />
        </section>
      )}

      <Sheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Rediger rom"
      >
        <form onSubmit={handleUpdate} className="space-y-4 pb-6">
          <Input
            label="Romnavn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Budsjett (NOK)"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Lagrer...' : 'Lagre endringer'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={saving}
            onClick={async () => {
              if (!roomId) return
              const ok = window.confirm(
                roomExpenses.length > 0
                  ? 'Rommet skjules fra oversikten. Utgiftene blir liggende uten rom.'
                  : 'Fjerne dette rommet?',
              )
              if (!ok) return
              setSaving(true)
              try {
                await deleteRoom.mutateAsync(roomId)
                toast.success('Rom fjernet')
                setShowEdit(false)
                navigate('/')
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Kunne ikke fjerne rom',
                )
              } finally {
                setSaving(false)
              }
            }}
          >
            Fjern rom
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
