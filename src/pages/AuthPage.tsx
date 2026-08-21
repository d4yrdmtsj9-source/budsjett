import { useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { hasProject, loading: projectLoading } = useProject()

  if (authLoading || projectLoading) return <LoadingSpinner />
  if (!session?.projectId || !hasProject) return <OnboardingPage />
  return <>{children}</>
}

function OnboardingPage() {
  const { createProject, joinProject } = useProject()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [displayName, setDisplayName] = useState('')
  const [projectName, setProjectName] = useState('Vår renovering')
  const [budget, setBudget] = useState('500000')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Skriv inn navnet ditt')
      return
    }
    setLoading(true)
    try {
      if (mode === 'create') {
        const { error: err } = await createProject(
          projectName,
          parseFloat(budget) || 0,
          displayName,
        )
        if (err) setError(err)
      } else {
        const { error: err } = await joinProject(inviteCode, displayName)
        if (err) setError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary">Renover</h1>
          <p className="text-muted text-sm mt-2">
            Ingen konto eller e-post — bare skriv navnet ditt og start.
          </p>
        </div>

        <Card>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={mode === 'create' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('create')}
            >
              Nytt prosjekt
            </Button>
            <Button
              type="button"
              variant={mode === 'join' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('join')}
            >
              Bli med
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Ditt navn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="f.eks. Zuzanna"
              required
              autoFocus
            />

            {mode === 'create' ? (
              <>
                <Input
                  label="Prosjektnavn"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Vår renovering"
                />
                <Input
                  label="Totalt budsjett (NOK)"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="500000"
                />
              </>
            ) : (
              <Input
                label="Invitasjonskode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                required
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Venter...' : mode === 'create' ? 'Start prosjekt' : 'Bli med'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted mt-6">
          Etter start: del invitasjonskoden under Innstillinger med partneren din.
        </p>
      </div>
    </div>
  )
}

/** @deprecated AuthPage kept as named export for compatibility */
export function AuthPage() {
  return <OnboardingPage />
}
