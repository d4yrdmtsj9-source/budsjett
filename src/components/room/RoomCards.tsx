import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CookingPot,
  Bath,
  Sofa,
  Trees,
  BedDouble,
  House,
} from 'lucide-react'
import { useRooms } from '@/hooks/useRooms'
import { useExpenses } from '@/hooks/useExpenses'
import { financials, roomPortion } from '@/lib/finance'
import { formatNOK } from '@/lib/format'
export function RoomCards({ limit }: { limit?: number }) {
  const { data: rooms } = useRooms()
  const { expenses } = useExpenses()
  return (
    <div className="room-grid">
      {(rooms ?? []).slice(0, limit).map((room, i) => {
        const portions = expenses.flatMap((e) => {
          const part = roomPortion(e, room.id)
          return part ? [part] : []
        })
        const f = financials(portions, room.budget)
        const Icon = /kjøkken/i.test(room.name)
          ? CookingPot
          : /bad/i.test(room.name)
            ? Bath
            : /stue/i.test(room.name)
              ? Sofa
              : /ute|hage|terrasse/i.test(room.name)
                ? Trees
                : /soverom/i.test(room.name)
                  ? BedDouble
                  : House
        return (
          <Link to={`/rom/${room.id}`} key={room.id} className="room-card">
            <div className="flex justify-between items-start">
              <span className={`room-icon tone-${i % 4}`}>
                <Icon size={23} />
              </span>
              <ArrowUpRight size={19} className="text-muted" />
            </div>
            <h3>{room.name}</h3>
            <div className="room-card-amount">
              <strong>{formatNOK(f.projected)}</strong>
              <span>
                {room.budget > 0
                  ? `av ${formatNOK(room.budget)}`
                  : 'Ingen ramme satt'}
              </span>
            </div>
            <div className="room-progress">
              <span
                style={{
                  width: `${room.budget > 0 ? Math.min(100, (f.projected / room.budget) * 100) : 0}%`,
                  background:
                    f.remaining < 0 ? 'var(--color-destructive)' : undefined,
                }}
              />
            </div>
            <div className="room-card-bottom">
              <span>
                {f.count} poster{f.missing ? ` · ${f.missing} uten pris` : ''}
              </span>
              <span
                className={
                  f.remaining < 0 ? 'text-destructive' : 'text-primary'
                }
              >
                {room.budget > 0
                  ? `${formatNOK(Math.abs(f.remaining))} ${f.remaining < 0 ? 'over' : 'igjen'}`
                  : 'Sett budsjett'}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
