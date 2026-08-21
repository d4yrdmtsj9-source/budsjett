import { useState } from 'react'
import { Copy, Check, LogOut, User, Users, Wallet, Tags, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useCategories } from '@/hooks/useCategories'
import { formatNOK } from '@/lib/format'

const CATEGORY_SUGGESTIONS = [
  'Materialer',
  'Arbeid',
  'Apparater',
  'Møbler',
  'Belysning',
  'VVS',
  'Elektro',
  'Maleri',
  'Annet',
]

export function SettingsPage() {
  const { profile, signOut, updateDisplayName, memberId } = useAuth()
  const { project, members, updateProject, rawProject, setRawProject, addMember } = useProject()
  const { data: categories, createCategory } = useCategories()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [projectName, setProjectName] = useState(project?.name ?? '')
  const [budget, setBudget] = useState(String(project?.total_budget ?? 0))
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryBudget, setCategoryBudget] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')

  const handleSaveName = async () => {
    setSaving(true)
    const { error } = await updateDisplayName(name)
    if (error) {
      toast.error(error)
      setSaving(false)
      return
    }
    if (rawProject && memberId) {
      await setRawProject({
        ...rawProject,
        members: rawProject.members.map((m) =>
          m.id === memberId ? { ...m, display_name: name.trim() } : m,
        ),
      })
    }
    toast.success('Navn oppdatert')
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      toast.error('Skriv inn kategorinavn')
      return
    }
    setSaving(true)
    try {
      await createCategory.mutateAsync({
        name: categoryName,
        budget: parseFloat(categoryBudget) || 0,
      })
      toast.success('Kategori lagt til')
      setShowAddCategory(false)
      setCategoryName('')
      setCategoryBudget('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunne ikke legge til kategori')
    } finally {
      setSaving(false)
    }
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
              Begge må ha appen åpen for live synk. Ellers: eksporter/importer.
            </p>
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Sikkerhetskopi</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (!rawProject) return
                  const blob = new Blob([JSON.stringify(rawProject)], {
                    type: 'application/json',
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `renover-${rawProject.invite_code}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Sikkerhetskopi lastet ned')
                }}
              >
                Eksporter
              </Button>
              <label className="flex-1">
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const text = await file.text()
                      const data = JSON.parse(text)
                      if (!data?.id || !data?.invite_code || !Array.isArray(data.expenses)) {
                        throw new Error('Ugyldig fil')
                      }
                      await setRawProject(data)
                      toast.success('Prosjekt importert')
                    } catch {
                      toast.error('Kunne ikke importere filen')
                    }
                    e.target.value = ''
                  }}
                />
                <span className="inline-flex w-full h-9 items-center justify-center rounded-xl border border-border bg-white text-sm font-medium cursor-pointer hover:bg-surface">
                  Importer
                </span>
              </label>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Kategorier
            </h2>
          </div>
          <Button size="sm" onClick={() => setShowAddCategory(true)}>
            <Plus className="h-4 w-4" />
            Ny
          </Button>
        </div>
        <Card>
          {!categories?.length ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted">Ingen kategorier ennå</p>
              <Button size="sm" onClick={() => setShowAddCategory(true)}>
                <Plus className="h-4 w-4" />
                Legg til kategori
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <span className="font-medium text-sm">{cat.name}</span>
                  <span className="text-xs text-muted">{formatNOK(cat.budget)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Personer
            </h2>
          </div>
          {members.length < 2 && (
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <Plus className="h-4 w-4" />
              Legg til
            </Button>
          )}
        </div>
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
                    {member.id === memberId ? (
                      <span className="text-xs text-muted font-normal"> (deg)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    Kan åpne prosjektet på flere enheter med invitasjonskoden
                  </p>
                </div>
              </div>
            ))}
            {members.length < 2 && (
              <p className="text-xs text-muted pt-1">
                Legg til partnerens navn her, eller be dem bruke «Åpne / bli med» med koden.
              </p>
            )}
          </div>
        </Card>
      </section>

      <Button variant="destructive" size="lg" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Logg ut
      </Button>

      <Sheet
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        title="Ny kategori"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4 pb-6">
          <Input
            label="Navn"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="F.eks. Materialer"
            required
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_SUGGESTIONS.filter(
              (s) => !categories?.some((c) => c.name.toLowerCase() === s.toLowerCase()),
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCategoryName(s)}
                className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            label="Budsjett (NOK)"
            type="number"
            value={categoryBudget}
            onChange={(e) => setCategoryBudget(e.target.value)}
            placeholder="0"
          />
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Lagrer...' : 'Legg til kategori'}
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Legg til person"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            const { error } = await addMember(newMemberName)
            if (error) toast.error(error)
            else {
              toast.success('Person lagt til')
              setShowAddMember(false)
              setNewMemberName('')
            }
            setSaving(false)
          }}
          className="space-y-4 pb-6"
        >
          <Input
            label="Navn"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Partnerens navn"
            required
          />
          <p className="text-xs text-muted">
            De åpner appen på sin enhet, velger «Åpne / bli med», skriver invitasjonskoden og
            trykker «Fortsett som [navn]».
          </p>
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Lagrer...' : 'Legg til person'}
          </Button>
        </form>
      </Sheet>
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
