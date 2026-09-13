import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Moon,
  Sun,
  Monitor,
  Trash2,
  Copy,
  Check,
  Download,
  Printer,
  Upload,
  ArrowUpRight,
  ShieldCheck,
  LogOut,
  Store,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import { useProject } from '@/hooks/useProject'
import { useAuth } from '@/hooks/useAuth'
import { useExpenses } from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { exportBackup, parseBackup, exportCSV, printBudget } from '@/lib/export'
import { formatNOK } from '@/lib/format'
export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const {
    project,
    rawProject,
    members,
    updateProject,
    setRawProject,
    addMember,
    switchMember,
  } = useProject()
  const { signOut, memberId, updateDisplayName } = useAuth()
  const { expenses } = useExpenses()
  const { data: categories, createCategory, deleteCategory } = useCategories()
  const [name, setName] = useState(project?.name ?? '')
  const [budget, setBudget] = useState(project?.total_budget ?? 0)
  const [reserve, setReserve] = useState(project?.reserve_amount ?? 0)
  const [share, setShare] = useState(
    project?.cost_shares?.[members[0]?.id] ?? 50,
  )
  const [newPerson, setNewPerson] = useState('')
  const [category, setCategory] = useState('')
  const [displayName, setDisplayName] = useState(
    members.find((m) => m.id === memberId)?.display_name ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const perform = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true)
    try {
      await action()
      if (success) toast.success(success)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-7">
      <header className="page-heading">
        <div>
          <p className="eyebrow">RAMMENE RUNDT PROSJEKTET</p>
          <h1>På deres premisser.</h1>
          <p>Budsjett, samarbeid og dokumentasjon.</p>
        </div>
      </header>
      <section className="settings-card appearance-card">
        <div className="section-heading">
          <h2>Lys etter stemningen.</h2>
          <Moon size={21} />
        </div>
        <p className="text-sm text-muted mt-3">
          Velg utseende på denne enheten. Automatisk følger telefonen eller
          datamaskinen.
        </p>
        <div className="theme-options" role="group" aria-label="Utseende">
          {(
            [
              { value: 'light', label: 'Lys', icon: Sun },
              { value: 'dark', label: 'Mørk', icon: Moon },
              { value: 'system', label: 'Automatisk', icon: Monitor },
            ] satisfies {
              value: ThemePreference
              label: string
              icon: typeof Sun
            }[]
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={preference === value}
              onClick={() => setPreference(value)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="settings-grid">
        <section className="settings-card">
          <div className="section-heading">
            <h2>Prosjekt og reserve</h2>
            <ShieldCheck size={21} />
          </div>
          <form
            className="space-y-4 mt-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (
                !name.trim() ||
                reserve > budget ||
                budget < 0 ||
                reserve < 0
              ) {
                toast.error(
                  'Skriv prosjektnavn og en reserve mellom 0 og totalrammen.',
                )
                return
              }
              void perform(async () => {
                const r = await updateProject({
                  name: name.trim(),
                  total_budget: budget,
                  reserve_amount: reserve,
                  ...(members.length === 2
                    ? {
                        cost_shares: {
                          [members[0].id]: share,
                          [members[1].id]: 100 - share,
                        },
                      }
                    : {}),
                })
                if (r.error) throw new Error(r.error)
              }, 'Budsjettet er oppdatert')
            }}
          >
            <Input
              label="Prosjektnavn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <MoneyInput
              label="Totalramme"
              value={budget}
              onChange={setBudget}
            />
            <MoneyInput
              label="Reserve innenfor totalrammen"
              value={reserve}
              onChange={setReserve}
            />
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((p) => (
                <Button
                  type="button"
                  key={p}
                  variant="secondary"
                  size="sm"
                  onClick={() => setReserve(Math.round((budget * p) / 100))}
                >
                  {p} %
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {formatNOK(Math.max(0, budget - reserve))} til planlagte arbeider.
              Resten holdes av til uforutsett.
            </p>
            {members.length === 2 && (
              <div className="space-y-2 border-t border-border pt-4">
                <h3>Fordeling av private utlegg</h3>
                <Input
                  label={`${members[0].display_name} sin andel (%)`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={share}
                  onChange={(e) => setShare(Number(e.target.value))}
                />
                <p className="text-xs text-muted">
                  {members[1].display_name}: {100 - share} %. Betalinger fra
                  felleskonto holdes utenfor mellomværendet.
                </p>
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              Lagre rammer
            </Button>
          </form>
        </section>
        <section className="settings-card">
          <h2>Dere to, samme oversikt.</h2>
          <p className="text-sm text-muted mt-3">
            Åpne prosjektet på den andre telefonen med invitasjonskoden. Velg
            ditt eget navn når du bytter enhet.
          </p>
          <div className="space-y-3 mt-5">
            {members.map((m) => (
              <div key={m.id} className="member-card">
                <span className="member-avatar">
                  {m.display_name?.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{m.display_name}</strong>
                  <p>
                    {m.id === memberId
                      ? 'Du på denne enheten'
                      : 'Prosjektdeltaker'}
                  </p>
                </div>
                {m.id === memberId ? (
                  <Check size={17} />
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        const r = await switchMember(m.id)
                        if (r.error) throw new Error(r.error)
                        setDisplayName(m.display_name ?? '')
                      }, 'Person valgt')
                    }
                  >
                    Dette er meg
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <Input
              label="Ditt visningsnavn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={busy || !displayName.trim()}
              onClick={() =>
                void perform(async () => {
                  const r = await updateDisplayName(displayName.trim())
                  if (r.error) throw new Error(r.error)
                  await setRawProject((p) => ({
                    ...p,
                    members: p.members.map((m) =>
                      m.id === memberId
                        ? { ...m, display_name: displayName.trim() }
                        : m,
                    ),
                  }))
                }, 'Navnet er oppdatert')
              }
            >
              Lagre navn
            </Button>
          </div>
          {members.length < 2 && (
            <form
              className="space-y-3 mt-5"
              onSubmit={(e) => {
                e.preventDefault()
                void perform(async () => {
                  const r = await addMember(newPerson)
                  if (r.error) throw new Error(r.error)
                  setNewPerson('')
                }, 'Person lagt til')
              }}
            >
              <Input
                label="Partnerens navn"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                required
              />
              <Button variant="secondary" disabled={busy}>
                Legg til partner
              </Button>
            </form>
          )}
          <div className="invite-card">
            <p className="eyebrow">INVITASJONSKODE</p>
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => setShowCode(!showCode)}
                className="font-mono text-xl tracking-widest"
                aria-label={
                  showCode ? 'Skjul invitasjonskode' : 'Vis invitasjonskode'
                }
              >
                {showCode ? project?.invite_code : '••••••'}
              </button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Kopier invitasjonskode"
                onClick={() =>
                  void perform(
                    () =>
                      navigator.clipboard.writeText(project?.invite_code ?? ''),
                    'Koden er kopiert',
                  )
                }
              >
                <Copy size={17} />
              </Button>
            </div>
            <p className="text-xs text-muted mt-3">
              Alle med koden kan åpne prosjektet. Del den bare med partneren
              din.
            </p>
          </div>
        </section>
        <section className="settings-card">
          <h2>Ta med oversikten.</h2>
          <p className="text-sm text-muted mt-3 mb-5">
            Eksporter tallene, lag en utskrift eller ta en kopi av prosjektet.
          </p>
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => exportCSV(expenses)}
            >
              <Download size={17} />
              Åpne i Excel (CSV)
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => {
                try {
                  if (rawProject) printBudget(rawProject, expenses)
                } catch (e) {
                  toast.error((e as Error).message)
                }
              }}
            >
              <Printer size={17} />
              Skriv ut / lagre som PDF
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              className="w-full justify-start"
              onClick={() =>
                void perform(async () => {
                  if (rawProject) await exportBackup(rawProject)
                }, 'Sikkerhetskopi lastet ned')
              }
            >
              <Download size={17} />
              Sikkerhetskopi med lokale vedlegg
            </Button>
            <label className="disclosure cursor-pointer">
              <Upload size={17} />
              Importer sikkerhetskopi
              <input
                className="sr-only"
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file || !rawProject) return
                  if (file.size > 100 * 1024 * 1024) {
                    toast.error('Sikkerhetskopien er for stor (maks 100 MB).')
                    return
                  }
                  if (
                    !window.confirm(
                      'Erstatte dette prosjektet med sikkerhetskopien? Last ned en kopi først hvis du vil beholde dagens versjon.',
                    )
                  )
                    return
                  void perform(async () => {
                    const data = await parseBackup(
                      await file.text(),
                      rawProject,
                    )
                    if (
                      data.id !== rawProject.id ||
                      data.invite_code !== rawProject.invite_code
                    )
                      throw new Error(
                        'Denne kopien tilhører et annet prosjekt. Åpne riktig prosjekt før import.',
                      )
                    await setRawProject(data)
                  }, 'Sikkerhetskopi importert')
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted mt-4">
            Vedlegg fra andre enheter følger bare med hvis originalfilene finnes
            her.
          </p>
        </section>
        <section className="settings-card">
          <h2>Organiser prosjektet.</h2>
          <Link to="/leverandorer" className="settings-link">
            <Store size={19} />
            <span>Butikker og leverandører</span>
            <ArrowUpRight size={17} />
          </Link>
          <h3 className="mt-5">Kategorier</h3>
          <div className="flex flex-wrap gap-2 mt-3">
            {categories?.map((c) => (
              <div
                className="flex items-center gap-1 rounded-xl border border-border pl-3 text-sm"
                key={c.id}
              >
                <span>{c.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  aria-label={`Slett kategorien ${c.name}`}
                  onClick={() => {
                    const count = expenses.filter(
                      (e) => e.category_id === c.id,
                    ).length
                    if (
                      !window.confirm(
                        `Slette kategorien «${c.name}»? ${count > 0 ? `${count} kjøp beholder alle beløp og vedlegg, men blir uten kategori.` : 'Ingen kjøp blir slettet.'}`,
                      )
                    )
                      return
                    void perform(
                      () => deleteCategory.mutateAsync(c.id),
                      'Kategorien er slettet. Kjøpene er beholdt.',
                    )
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
          <form
            className="flex items-end gap-2 mt-4"
            onSubmit={(e) => {
              e.preventDefault()
              void perform(async () => {
                await createCategory.mutateAsync({
                  name: category.trim(),
                  budget: 0,
                })
                setCategory('')
              }, 'Kategori lagt til')
            }}
          >
            <div className="flex-1">
              <Input
                label="Ny kategori"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>
            <Button
              disabled={busy || !category.trim()}
              size="icon"
              aria-label="Legg til kategori"
            >
              <Plus size={19} />
            </Button>
          </form>
          <div className="mt-6 border-t border-border pt-5">
            <h3>På hjemskjermen</h3>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              iPhone: Del → Legg til på Hjem-skjerm. Android: nettlesermeny →
              Legg til på startskjerm.
            </p>
          </div>
        </section>
      </div>
      <Button
        variant="ghost"
        onClick={() => {
          if (
            window.confirm(
              'Har du tatt vare på invitasjonskoden? Du trenger den for å åpne prosjektet igjen.',
            )
          )
            void signOut()
        }}
      >
        <LogOut size={16} />
        Lukk prosjektet på denne enheten
      </Button>
    </div>
  )
}
