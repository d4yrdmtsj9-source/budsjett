import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  House,
  ReceiptText,
  Ellipsis,
  ArrowUpRight,
  CalendarCheck,
  Sparkles,
} from 'lucide-react'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
const items = [
  { to: '/', icon: LayoutDashboard, label: 'Oversikt' },
  { to: '/planlegg', icon: CalendarCheck, label: 'Planlegg' },
  { to: '/utgifter', icon: ReceiptText, label: 'Kjøp' },
  { to: '/moodboard', icon: Sparkles, label: 'Moodboard' },
  { to: '/innstillinger', icon: Ellipsis, label: 'Mer' },
]
export function BottomNav() {
  const { isOpen } = useExpenseSheet()
  return (
    <nav
      aria-label="Hovedmeny"
      className={`app-nav ${isOpen ? 'nav-behind-dialog' : ''}`}
    >
      <div className="nav-brand">
        <span className="brand-mark">
          <House size={22} />
        </span>
        <span>
          Renover<span className="brand-caption">ROM FOR MULIGHETER</span>
        </span>
      </div>
      <div className="nav-items">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <div className="nav-note">
        <span className="eyebrow">HJEMMET DITT. PLANEN DIN.</span>
        <p>
          Små valg.
          <br />
          Stor forandring.
        </p>
        <ArrowUpRight size={20} />
      </div>
    </nav>
  )
}
