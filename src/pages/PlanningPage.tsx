import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useExpenses } from '@/hooks/useExpenses'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { sortTasks, taskBlockers } from '@/lib/workflow'
import {
  Plus,
  Check,
  Flag,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePlanning } from '@/hooks/usePlanning'
import { useRooms } from '@/hooks/useRooms'
import { useProject } from '@/hooks/useProject'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { uid } from '@/lib/localStore'
import { type ProjectTask } from '@/lib/planning'
import { todayISO, formatDate } from '@/lib/format'
const phases = [
  { key: 'todo', label: 'Ikke startet' },
  { key: 'doing', label: 'Pågår' },
  { key: 'blocked', label: 'Blokkert' },
  { key: 'done', label: 'Ferdig' },
] as const
const emptyTask = (): ProjectTask => ({
  id: uid(),
  title: '',
  room_id: null,
  status: 'todo',
  due_date: '',
  owner_id: null,
  milestone: false,
  notes: '',
  updated_at: new Date().toISOString(),
  deleted_at: null,
})
export function PlanningPage() {
  const { tasks, saveTask, patchTask } = usePlanning()
  const { data: rooms } = useRooms()
  const { members } = useProject()
  const [params, setParams] = useSearchParams()
  const room = params.get('rom') ?? ''
  const { expenses } = useExpenses()
  const { openEdit } = useExpenseSheet()
  const setRoom = (value: string) => setParams(value ? { rom: value } : {})
  const [editing, setEditing] = useState<ProjectTask | null>(() => tasks.find(t => t.id === params.get('oppgave')) ?? null)
  const [busy, setBusy] = useState(false)
  const [period, setPeriod] = useState('all')
  const today = todayISO()
  const weekEnd = new Date(`${today}T12:00:00`)
  weekEnd.setDate(weekEnd.getDate() + ((7 - weekEnd.getDay()) % 7))
  const end = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth()+1).padStart(2,'0')}-${String(weekEnd.getDate()).padStart(2,'0')}`
  const shown = tasks.filter(t => (!room || t.room_id === room) && (period === 'all' || (period === 'overdue' && t.status !== 'done' && t.due_date && t.due_date < today) || (period === 'week' && t.due_date >= today && t.due_date <= end) || (period === 'later' && t.due_date > end) || (period === 'undated' && !t.due_date)))
  const completed = shown.filter((t) => t.status === 'done').length
  const act = async (fn: () => Promise<unknown>, message?: string) => {
    try {
      await fn()
      if (message) toast.success(message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke lagre')
    }
  }
  return (
    <div className="planning-page">
      <header className="page-heading"><div><h1>Plan</h1><p>{completed} av {shown.length} oppgaver ferdige</p></div>
        <Button onClick={() => setEditing({ ...emptyTask(), room_id: room || null })}><Plus size={17} />Ny oppgave</Button>
      </header>
      <Select label="Rom" value={room} onChange={e => setRoom(e.target.value)} options={[{ value: '', label: 'Alle rom' }, ...rooms.map(r => ({ value: r.id, label: r.name }))]} />
      <Select label="Frist" value={period} onChange={e => setPeriod(e.target.value)} options={[{value:'all',label:'Alle frister'},{value:'overdue',label:'Forfalt'},{value:'week',label:'Resten av denne uken'},{value:'later',label:'Senere'},{value:'undated',label:'Uten frist'}]} />
      {phases.map(phase => {
        const rows = shown.filter(t => t.status === 'done' ? phase.key === 'done' : taskBlockers(t, tasks, expenses).length ? phase.key === 'blocked' : t.status === phase.key).sort(sortTasks)
        if (!rows.length) return null
        const list = rows.map(t => {
          const blockers = taskBlockers(t, tasks, expenses)
          return <article className="work-task" key={t.id}>
            <button className="task-check" aria-label={t.status === 'done' ? `Gjenåpne ${t.title}` : `Fullfør ${t.title}`} disabled={t.status !== 'done' && blockers.length > 0} onClick={() => void act(() => patchTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' }))}>
              {t.status === 'done' ? <Check size={19} /> : <Circle size={19} />}
            </button>
            <button className="work-task-body" onClick={() => setEditing(t)}>
              <strong>{t.priority && '↑ '}{t.title} {t.milestone && <Flag size={13} />}</strong>
              <small>{[rooms.find(r => r.id === t.room_id)?.name, members.find(m => m.id === t.owner_id)?.display_name, t.due_date ? `${t.status !== 'done' && t.due_date < todayISO() ? 'Forfalt · ' : ''}${formatDate(t.due_date)}` : ''].filter(Boolean).join(' · ')}</small>
              {blockers.length > 0 && t.status !== 'done' && <span className="work-warning">Venter på: {blockers.join(' · ')}</span>}
            </button>
            {t.status === 'todo' && !blockers.length && <Button size="sm" variant="secondary" onClick={() => void act(() => patchTask(t.id, { status: 'doing' }))}>Start</Button>}
          </article>
        })
        return phase.key === 'done' ? <details key={phase.key} className="work-section"><summary>Ferdig ({rows.length})</summary>{list}</details>
          : <section key={phase.key} className="work-section"><h2>{phase.label} <span className="text-muted">{rows.length}</span></h2>{list}</section>
      })}
      {!shown.length && <p className="plain-empty">Ingen oppgaver. Legg til en oppgave for å starte.</p>}
      {editing && (
        <Sheet
          open
          onClose={() => {
            if (
              !busy &&
              window.confirm('Lukke uten å lagre eventuelle endringer?')
            )
              setEditing(null)
          }}
          title={
            tasks.some((t) => t.id === editing.id)
              ? 'Rediger oppgave'
              : 'Ny oppgave'
          }
        >
          <form
            className="idea-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                await saveTask(editing)
                setEditing(null)
                toast.success('Planen er oppdatert')
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Kunne ikke lagre',
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            <fieldset disabled={busy}>
              <Input
                label="Hva skal gjøres?"
                required
                maxLength={160}
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
              <div className="form-two">
                <Select
                  label="Rom"
                  value={editing.room_id ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, room_id: e.target.value || null })
                  }
                  options={[
                    { value: '', label: 'Hele hjemmet' },
                    ...rooms.map((r) => ({ value: r.id, label: r.name })),
                  ]}
                />
                <Select
                  label="Status"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as ProjectTask['status'],
                    })
                  }
                  options={phases.map((p) => ({
                    value: p.key,
                    label: p.label,
                  }))}
                />
              </div>
              <div className="form-two">
                <Input
                  label="Frist"
                  type="date"
                  value={editing.due_date}
                  onChange={(e) =>
                    setEditing({ ...editing, due_date: e.target.value })
                  }
                />
                <Select
                  label="Ansvarlig"
                  value={editing.owner_id ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, owner_id: e.target.value || null })
                  }
                  options={[
                    { value: '', label: 'Ikke avtalt ennå' },
                    ...members.map((m) => ({
                      value: m.id,
                      label: m.display_name ?? 'Person',
                    })),
                  ]}
                />
              </div>
              <div className="form-two">
                <label className="check-label"><input type="checkbox" checked={!!editing.priority} onChange={e => setEditing({ ...editing, priority: e.target.checked })} />Prioritert</label>
                <Input label="Rekkefølge" type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
              {editing.status === 'blocked' && <Input label="Hva venter oppgaven på?" value={editing.blocked_reason ?? ''} onChange={e => setEditing({ ...editing, blocked_reason: e.target.value })} />}
              <details className="work-details"><summary>Avhengigheter og innkjøp</summary>
                <h3>Må være ferdig først</h3>
                {tasks.filter(t => t.id !== editing.id).map(t => <label className="check-label" key={t.id}><input type="checkbox" checked={editing.depends_on?.includes(t.id) ?? false} onChange={e => setEditing({ ...editing, depends_on: e.target.checked ? [...(editing.depends_on ?? []), t.id] : editing.depends_on?.filter(id => id !== t.id) })} />{t.title}</label>)}
                {(editing.depends_on ?? []).filter(id => !tasks.some(t => t.id === id)).map(id => <button type="button" key={id} className="text-link" onClick={() => setEditing({ ...editing, depends_on: editing.depends_on?.filter(x => x !== id) })}>Fjern kobling til slettet oppgave</button>)}
                <h3>Nødvendige innkjøp</h3>
                {expenses.map(e => <div key={e.id} className="flex items-center justify-between"><label className="check-label"><input type="checkbox" checked={editing.expense_ids?.includes(e.id) ?? false} onChange={event => setEditing({ ...editing, expense_ids: event.target.checked ? [...(editing.expense_ids ?? []), e.id] : editing.expense_ids?.filter(id => id !== e.id) })} />{e.description}</label><button type="button" className="text-link" onClick={() => openEdit(e)}>Åpne</button></div>)}
                {(editing.expense_ids ?? []).filter(id => !expenses.some(e => e.id === id)).map(id => <button type="button" key={id} className="text-link" onClick={() => setEditing({ ...editing, expense_ids: editing.expense_ids?.filter(x => x !== id) })}>Fjern kobling til slettet kjøp</button>)}
              </details>
              <label className="milestone-choice">
                <input
                  type="checkbox"
                  checked={editing.milestone}
                  onChange={(e) =>
                    setEditing({ ...editing, milestone: e.target.checked })
                  }
                />
                <Flag size={18} /> Dette er en milepæl
              </label>
              <label className="field-label">
                Notater
                <textarea
                  value={editing.notes}
                  maxLength={2000}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                  placeholder="Hva trenger dere, og hva skal avklares?"
                />
              </label>
              <Button type="submit" className="w-full">
                {busy ? 'Lagrer …' : 'Lagre oppgave'}
              </Button>
              {tasks.some((t) => t.id === editing.id) && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm('Slette denne oppgaven?'))
                      void act(async () => {
                        await patchTask(editing.id, {
                          deleted_at: new Date().toISOString(),
                        })
                        setEditing(null)
                      }, 'Oppgaven er slettet')
                  }}
                >
                  Slett oppgave
                </Button>
              )}
            </fieldset>
          </form>
        </Sheet>
      )}
    </div>
  )
}
