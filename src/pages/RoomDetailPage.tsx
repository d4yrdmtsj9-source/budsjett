import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Sheet } from '@/components/ui/Sheet'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { BudgetQuad } from '@/components/budget/BudgetQuad'
import { useRoom, useRooms } from '@/hooks/useRooms'
import { useExpenses } from '@/hooks/useExpenses'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { overPlanSentence, sumPaidExpenses, sumPlannedExpenses } from '@/lib/calc'

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

  const roomExpenses = expenses.filter((e) => e.room_id === roomId)
  const planned = sumPlannedExpenses(roomExpenses)
  const bought = sumPaidExpenses(roomExpenses)
  const projected = bought + planned
  const warning = room
    ? overPlanSentence({ name: room.name, budget: room.budget, projected })
    : null

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
        <Link to="/" className="text-primary text-sm mt-2 inline-block">
          Tilbake til hjem
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted mb-2">
          <ArrowLeft className="h-4 w-4" />
          Hjem
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{room.name}</h1>
            <p className="text-sm text-muted">{roomExpenses.length} utgifter</p>
          </div>
          <Button variant="ghost" size="icon" onClick={openEditSheet}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <BudgetQuad
        budget={room.budget}
        bought={bought}
        planned={planned}
        footer={
          warning ? (
            <p className="mt-3 text-sm text-destructive">{warning}</p>
          ) : room.budget <= 0 ? (
            <p className="text-xs text-muted mt-3">Ingen rombudsjett — sett det under rediger</p>
          ) : null
        }
      />

      <div className="flex justify-between items-center gap-2">
        <h2 className="font-display font-semibold">Utgifter</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openNew({ roomId, status: 'planned' })}
          >
            Planlegg
          </Button>
          <Button
            size="sm"
            onClick={() => openNew({ roomId, status: 'purchased' })}
          >
            Kjøp
          </Button>
        </div>
      </div>

      <ExpenseList
        expenses={roomExpenses}
        showRoom={false}
        emptyMessage="Ingen utgifter i dette rommet"
      />

      <Sheet open={showEdit} onClose={() => setShowEdit(false)} title="Rediger rom">
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
                toast.error(err instanceof Error ? err.message : 'Kunne ikke fjerne rom')
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
