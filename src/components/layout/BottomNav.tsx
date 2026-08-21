import { NavLink } from 'react-router-dom'
import { Home, DoorOpen, Receipt, Truck, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useKeyboardOpen } from '@/hooks/useKeyboardOffset'

const navItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/rom', icon: DoorOpen, label: 'Rom' },
  { to: '/utgifter', icon: Receipt, label: 'Utgifter' },
  { to: '/leverandorer', icon: Truck, label: 'Butikker' },
  { to: '/innstillinger', icon: Settings, label: 'Innstillinger' },
]

export function BottomNav() {
  const keyboardOpen = useKeyboardOpen()
  if (keyboardOpen) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-auto max-w-lg">
        <div className="mx-3 mb-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-lg">
          <div className="flex items-stretch">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 min-h-[56px] transition-colors',
                    isActive ? 'text-primary' : 'text-muted hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
