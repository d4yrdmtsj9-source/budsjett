import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signin') {
      const { error: err } = await signIn(email, password)
      if (err) setError(err)
    } else {
      if (!displayName.trim()) {
        setError('Visningsnavn er påkrevd')
        setLoading(false)
        return
      }
      const { error: err } = await signUp(email, password, displayName)
      if (err) setError(err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary">Renover</h1>
          <p className="text-muted text-sm mt-2">Renoveringsbudsjett for to</p>
        </div>

        <Card>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Visningsnavn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ditt navn"
                required
              />
            )}
            <Input
              label="E-post"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.no"
              required
            />
            <Input
              label="Passord"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Venter...' : mode === 'signin' ? 'Logg inn' : 'Opprett konto'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError('')
              }}
              className="text-sm text-primary font-medium hover:underline"
            >
              {mode === 'signin'
                ? 'Har du ikke konto? Registrer deg'
                : 'Har du konto? Logg inn'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProjectSetupPage() {
  const { createProject, joinProject } = useProject()
  const [projectName, setProjectName] = useState('')
  const [budget, setBudget] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (setupMode === 'create') {
      const { error: err } = await createProject(
        projectName,
        parseFloat(budget.replace(/\s/g, '')) || 0,
      )
      if (err) setError(err)
    } else {
      const { error: err } = await joinProject(inviteCode)
      if (err) setError(err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-primary">Renover</h1>
          <p className="text-muted text-sm mt-2">Opprett eller bli med i et prosjekt</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSetupMode('create')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              setupMode === 'create'
                ? 'bg-primary text-white'
                : 'bg-white/70 text-muted hover:text-foreground'
            }`}
          >
            Nytt prosjekt
          </button>
          <button
            onClick={() => setSetupMode('join')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              setupMode === 'join'
                ? 'bg-primary text-white'
                : 'bg-white/70 text-muted hover:text-foreground'
            }`}
          >
            Bli med
          </button>
        </div>

        <Card>
          <form onSubmit={handleSetup} className="space-y-4">
            {setupMode === 'create' ? (
              <>
                <Input
                  label="Prosjektnavn"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="F.eks. Leilighet Storgata"
                  required
                />
                <Input
                  label="Totalbudsjett (NOK)"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="500000"
                  required
                />
              </>
            ) : (
              <Input
                label="Invitasjonskode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                required
                className="uppercase tracking-widest text-center font-mono"
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Venter...' : setupMode === 'create' ? 'Opprett prosjekt' : 'Bli med'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { hasProject, loading: projectLoading } = useProject()

  if (authLoading || (user && projectLoading)) {
    return <LoadingSpinner className="min-h-dvh" />
  }

  if (!user) return <AuthPage />
  if (!hasProject) return <ProjectSetupPage />

  return <>{children}</>
}
