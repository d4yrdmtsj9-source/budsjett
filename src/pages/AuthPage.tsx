import { useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { LocalProject } from '@/lib/localStore'

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { hasProject, loading: projectLoading } = useProject()

  if (authLoading || projectLoading) return <LoadingSpinner className="h-full" />
  if (!session?.projectId || !hasProject) return <OnboardingPage />
  return <div className="h-full">{children}</div>
}

function OnboardingPage() {
  const { createProject, lookupProject, joinAs } = useProject()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [step, setStep] = useState<'form' | 'who'>('form')
  const [displayName, setDisplayName] = useState('')
  const [projectName, setProjectName] = useState('Vår renovering')
  const [budget, setBudget] = useState('500000')
  const [inviteCode, setInviteCode] = useState('')
  const [foundProject, setFoundProject] = useState<LocalProject | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetJoin = () => {
    setStep('form')
    setFoundProject(null)
    setError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Skriv inn navnet ditt')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await createProject(
        projectName,
        parseFloat(budget) || 0,
        displayName,
      )
      if (err) setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFindProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!inviteCode.trim()) {
      setError('Skriv inn invitasjonskoden')
      return
    }
    setLoading(true)
    try {
      const { project, error: err } = await lookupProject(inviteCode)
      if (err || !project) {
        setError(err ?? 'Fant ikke prosjektet')
        return
      }
      setFoundProject(project)
      setStep('who')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueAs = async (memberId: string, name: string) => {
    setError('')
    setLoading(true)
    try {
      const { error: err } = await joinAs(inviteCode, {
        memberId,
        displayName: name,
      })
      if (err) setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNewPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Skriv inn navnet ditt')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await joinAs(inviteCode, { displayName })
      if (err) setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary">Renover</h1>
          <p className="text-muted text-sm mt-2">
            Ingen konto — bruk invitasjonskode for å åpne prosjektet på flere enheter.
          </p>
        </div>

        <Card>
          {step === 'form' && (
            <>
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={mode === 'create' ? 'primary' : 'secondary'}
                  className="flex-1"
                  onClick={() => {
                    setMode('create')
                    setError('')
                  }}
                >
                  Nytt prosjekt
                </Button>
                <Button
                  type="button"
                  variant={mode === 'join' ? 'primary' : 'secondary'}
                  className="flex-1"
                  onClick={() => {
                    setMode('join')
                    setError('')
                  }}
                >
                  Åpne / bli med
                </Button>
              </div>

              {mode === 'create' ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input
                    label="Ditt navn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="f.eks. Zuzanna"
                    required
                    autoFocus
                  />
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
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? 'Venter...' : 'Start prosjekt'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleFindProject} className="space-y-4">
                  <Input
                    label="Invitasjonskode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABCD12"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted">
                    Samme kode som under Innstillinger. På ny PC: velg deg selv i neste steg —
                    ikke lag en ny person.
                  </p>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? 'Henter prosjekt...' : 'Fortsett'}
                  </Button>
                </form>
              )}
            </>
          )}

          {step === 'who' && foundProject && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted">Prosjekt</p>
                <h2 className="font-display text-xl font-semibold">{foundProject.name}</h2>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Hvem er du?</p>
                <div className="space-y-2">
                  {foundProject.members.map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      variant="secondary"
                      className="w-full justify-start"
                      disabled={loading}
                      onClick={() => handleContinueAs(m.id, m.display_name)}
                    >
                      Fortsett som {m.display_name}
                    </Button>
                  ))}
                </div>
              </div>

              {foundProject.members.length < 2 && (
                <form onSubmit={handleAddNewPerson} className="space-y-3 pt-2 border-t border-border">
                  <p className="text-sm font-medium">Eller legg til ny person</p>
                  <Input
                    label="Navn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Partnerens navn"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Venter...' : 'Bli med som ny person'}
                  </Button>
                </form>
              )}

              {foundProject.members.length >= 2 && (
                <p className="text-xs text-muted">
                  Begge plassene er tatt. Velg deg selv over for å åpne prosjektet på denne
                  enheten.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="button" variant="ghost" className="w-full" onClick={resetJoin}>
                Tilbake
              </Button>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted mt-6">
          Ny PC? Velg «Åpne / bli med», skriv koden, og trykk «Fortsett som [ditt navn]».
        </p>
      </div>
    </div>
  )
}

/** @deprecated AuthPage kept as named export for compatibility */
export function AuthPage() {
  return <OnboardingPage />
}
