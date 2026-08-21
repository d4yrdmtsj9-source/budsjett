import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, DoorOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner'
import { Sheet } from '@/components/ui/Sheet'
import { useRooms } from '@/hooks/useRooms'
import { useExpenses } from '@/hooks/useExpenses'
import { getExpenseTotal } from '@/lib/calc'
import { formatNOK } from '@/lib/format'

const ROOM_SUGGESTIONS = [
  'Kjøkken',
  'Bad',
  'Stue',
  'Soverom',
  'Gang',
  'Vaskerom',
  'Garasje',
  'Utvendig',
  'Hele huset',
]

export function RoomsPage() {
  const { data: rooms, isLoading, createRoom } = useRooms()
  const { expenses } = useExpenses()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createRoom.mutateAsync({
        name,
        budget: parseFloat(budget) || 0,
      })
      toast.success('Rom opprettet')
      setShowAdd(false)
      setName('')
      setBudget('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunne ikke opprette rom')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Rom</h1>
          <p className="text-sm text-muted">{rooms?.length ?? 0} rom</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Nytt rom
        </Button>
      </header>

      {!rooms?.length ? (
        <EmptyState
          icon={DoorOpen}
          title="Ingen rom ennå"
          description="Legg til rom for å organisere utgiftene dine"
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Legg til rom
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const roomExpenses = expenses.filter((e) => e.room_id === room.id)
            const spent = roomExpenses.reduce((s, e) => s + getExpenseTotal(e), 0)
            return (
              <Link key={room.id} to={`/rom/${room.id}`}>
                <Card>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-display font-semibold">{room.name}</h3>
                      <p className="text-sm text-muted">
                        {roomExpenses.length} utgift{roomExpenses.length !== 1 ? 'er' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold">{formatNOK(spent)}</p>
                      <p className="text-xs text-muted">av {formatNOK(room.budget)}</p>
                    </div>
                  </div>
                  <ProgressBar value={spent} max={room.budget} size="sm" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Nytt rom">
        <form onSubmit={handleCreate} className="space-y-4 pb-6">
          <Input
            label="Romnavn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="F.eks. Stue"
            required
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {ROOM_SUGGESTIONS.filter((s) => !rooms?.some((r) => r.name === s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            label="Budsjett (NOK)"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="50000"
          />
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Oppretter...' : 'Opprett rom'}
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
