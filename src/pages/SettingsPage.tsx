import { useState } from 'react'
import { Copy, Check, LogOut, User, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'

export function SettingsPage() {
  const { profile, signOut, updateDisplayName } = useAuth()
  const { project, members, updateProject } = useProject()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [projectName, setProjectName] = useState(project?.name ?? '')
  const [budget, setBudget] = useState(String(project?.total_budget ?? 0))
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSaveName = async () => {
    setSaving(true)
    const { error } = await updateDisplayName(name)
    if (error) toast.error(error)
    else toast.success('Navn oppdatert')
    setSaving(false)
  }

  const handleSaveProject = async () => {
    setSaving(true)
    const { error } = await updateProject({
      name: projectName,
      total_budget: parseFloat(budget) || 0,
    })
    if (error) toast.error(error)
    else toast.success('Prosjekt oppdatert')
    setSaving(false)
  }

  const copyInviteCode = async () => {
    if (!project?.invite_code) return
    await navigator.clipboard.writeText(project.invite_code)
    setCopied(true)
    toast.success('Invitasjonskode kopiert')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Du er nå logget ut')
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Innstillinger</h1>
      </header>

      <section>
        <SectionLabel icon={User} label="Profil" />
        <Card className="space-y-4">
          <Input
            label="Visningsnavn"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={handleSaveName} disabled={saving} size="sm">
            Lagre navn
          </Button>
        </Card>
      </section>

      <section>
        <SectionLabel icon={Wallet} label="Prosjekt" />
        <Card className="space-y-4">
          <Input
            label="Prosjektnavn"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <Input
            label="Totalbudsjett (NOK)"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <Button onClick={handleSaveProject} disabled={saving} size="sm">
            Lagre prosjekt
          </Button>

          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Invitasjonskode
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 h-11 flex items-center justify-center rounded-xl bg-primary/5 font-mono text-lg tracking-widest text-primary">
                {project?.invite_code}
              </code>
              <Button variant="secondary" size="icon" onClick={copyInviteCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted mt-2">
              Del denne koden med partneren din (maks 2 medlemmer)
            </p>
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel icon={Users} label="Medlemmer" />
        <Card>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {(member.profile?.display_name ?? '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {member.profile?.display_name ?? 'Ukjent'}
                  </p>
                  <p className="text-xs text-muted">
                    Medlem siden {new Date(member.joined_at).toLocaleDateString('nb-NO')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Button variant="destructive" size="lg" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Logg ut
      </Button>
    </div>
  )
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </h2>
    </div>
  )
}
