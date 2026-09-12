import { useState } from 'react'
import { Plus, House } from 'lucide-react'
import { useRooms } from '@/hooks/useRooms'
import { RoomCards } from '@/components/room/RoomCards'
import { AddRoomSheet } from '@/components/room/AddRoomSheet'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/LoadingSpinner'
export function RoomsPage() {
  const { data: rooms } = useRooms()
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-7">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ETT ROM AV GANGEN</p>
          <h1>Hjemmet tar form.</h1>
          <p>Del opp prosjektet. Behold hele oversikten.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} />
          Nytt rom
        </Button>
      </header>
      {rooms?.length ? (
        <RoomCards />
      ) : (
        <EmptyState
          icon={House}
          title="Hvor vil du begynne?"
          description="Kjøkken, bad eller hele uteområdet. Gi hver del sin egen ramme."
          action={
            <Button onClick={() => setOpen(true)}>Legg til første rom</Button>
          }
        />
      )}
      <AddRoomSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
