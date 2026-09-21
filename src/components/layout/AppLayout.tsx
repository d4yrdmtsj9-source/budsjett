import { Outlet, Link } from 'react-router-dom'
import { House, Check, CloudOff } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { ExpenseSheet } from '@/components/expense/ExpenseSheet'
import { useProject } from '@/hooks/useProject'
import { useCloudSync } from '@/hooks/useCloudSync'
import { pushCloudProject } from '@/lib/cloudStore'
import { useAuth } from '@/hooks/useAuth'
export function AppLayout() {
  const { project, rawProject } = useProject()
  const { signOut } = useAuth()
  const sync = useCloudSync()
  const demo = project?.invite_code.startsWith('DEMO-')
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Hopp til innhold
      </a>
      <BottomNav />
      <div className="app-body">
        <header className="app-topbar">
          <Link to="/" className="mobile-brand">
            <House size={20} />
            Renover
          </Link>
          <span className="desktop-project">{project?.name}</span>
          <span className="sync-status" role="status">
            {sync.status === 'ok' ? (
              <Check size={14} />
            ) : (
              <CloudOff size={14} />
            )}
            {demo
              ? 'Eksempel · kun på denne enheten'
              : sync.status === 'ok'
                ? 'Prosjektdata synkronisert'
                : sync.status === 'pending'
                  ? 'Synkroniserer …'
                  : 'Lagret på enheten'}
          </span>
          {!demo && sync.status === 'local-only' && rawProject && <button className="text-link" onClick={() => void pushCloudProject(rawProject)}>Prøv synkronisering</button>}
        </header>
        {demo && (
          <div className="demo-banner">
            Du utforsker et eksempel med fiktive tall.
            <button onClick={() => void signOut()}>Avslutt eksempel</button>
          </div>
        )}
        <main id="main-content" className="app-main">
          <Outlet />
        </main>
      </div>
      <ExpenseSheet />
    </div>
  )
}
