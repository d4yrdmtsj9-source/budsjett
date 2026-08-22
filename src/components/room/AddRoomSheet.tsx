import { useState } from 'react'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRooms } from '@/hooks/useRooms'

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

export function AddRoomSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: rooms, createRoom } = useRooms()
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
      setName('')
      setBudget('')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunne ikke opprette rom')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nytt rom">
      <form onSubmit={handleCreate} className="space-y-4 pb-6">
        <Input
          label="Romnavn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="F.eks. Stue"
          required
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
  )
}
