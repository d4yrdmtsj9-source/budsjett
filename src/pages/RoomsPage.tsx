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
          <h1>Rom</h1>
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
          title="Ingen rom"
          description="Legg til rommene som inngår i prosjektet."
          action={
            <Button onClick={() => setOpen(true)}>Legg til første rom</Button>
          }
        />
      )}
      <AddRoomSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
