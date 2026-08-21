import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Sheet } from '@/components/ui/Sheet'
import { ExpenseList } from '@/components/expense/ExpenseRow'
import { useRoom, useRooms } from '@/hooks/useRooms'
import { useExpenses } from '@/hooks/useExpenses'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { getExpenseTotal } from '@/lib/calc'
import { formatNOK } from '@/lib/format'

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { data: room, isLoading } = useRoom(roomId)
  const { updateRoom } = useRooms()
  const { expenses } = useExpenses({ roomId })
  const { openNew } = useExpenseSheet()
  const [showEdit, setShowEdit] = useState(false)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)

  const roomExpenses = expenses.filter((e) => e.room_id === roomId)
  const spent = roomExpenses.reduce((s, e) => s + getExpenseTotal(e), 0)
  const paid = roomExpenses
    .filter((e) => e.status === 'paid')
    .reduce((s, e) => s + getExpenseTotal(e), 0)

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
        <Link to="/rom" className="inline-flex items-center gap-1 text-sm text-muted mb-2">
          <ArrowLeft className="h-4 w-4" />
          Rom
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

      <Card padding="lg">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted">Budsjett</p>
            <p className="font-display text-lg font-semibold">{formatNOK(room.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Projisert</p>
            <p className="font-display text-lg font-semibold">{formatNOK(spent)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Betalt</p>
            <p className="font-display text-lg font-semibold">{formatNOK(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Gjenstår</p>
            <p className="font-display text-lg font-semibold">
              {formatNOK(room.budget - spent)}
            </p>
          </div>
        </div>
        <ProgressBar
          value={spent}
          max={room.budget}
          showLabel
        />
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="font-display font-semibold">Utgifter</h2>
        <Button size="sm" onClick={() => openNew(roomId)}>
          Legg til
        </Button>
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
        </form>
      </Sheet>
    </div>
  )
}
