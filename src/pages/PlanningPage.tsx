import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Check,
  Flag,
  ArrowUpRight,
  Circle,
  CalendarDays,
  Sparkles,
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
  { key: 'todo', label: 'Neste steg' },
  { key: 'doing', label: 'I gang' },
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
  const [room, setRoom] = useState('')
  const [editing, setEditing] = useState<ProjectTask | null>(null)
  const [busy, setBusy] = useState(false)
  const shown = tasks.filter((t) => !room || t.room_id === room)
  const completed = shown.filter((t) => t.status === 'done').length
  const percent = shown.length
    ? Math.round((completed / shown.length) * 100)
    : 0
  const milestones = shown
    .filter((t) => t.milestone)
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
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
      <section className="planning-hero">
        <div>
          <p className="eyebrow">
            <CalendarDays size={14} /> FRA DRØM TIL GJENNOMFØRT
          </p>
          <h1>
            Små steg.
            <br />
            <em>Store forandringer.</em>
          </h1>
          <p>En plan med plass til både hverdagen og drømmene.</p>
          <Button
            onClick={() =>
              setEditing({ ...emptyTask(), room_id: room || null })
            }
          >
            <Plus size={17} /> Ny oppgave
          </Button>
        </div>
        <div
          className="progress-orbit"
          style={{
            background: `conic-gradient(#d7be89 ${percent}%, #ffffff20 0)`,
          }}
        >
          <div>
            <strong>
              {percent}
              <small>%</small>
            </strong>
            <span>
              {completed} av {shown.length} steg ferdig
            </span>
            <Sparkles size={22} />
          </div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">DERES VEI VIDERE</p>
          <h2>Planen tar form.</h2>
        </div>
        <Select
          label="Rom"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          options={[
            { value: '', label: 'Alle rom' },
            ...rooms.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
      </div>
      {milestones.length > 0 && (
        <section className="milestone-track" aria-label="Milepæler">
          {milestones.map((t) => (
            <button
              key={t.id}
              className={t.status === 'done' ? 'complete' : ''}
              onClick={() => setEditing(t)}
            >
              <span className="milestone-dot">
                {t.status === 'done' ? <Check size={18} /> : <Flag size={16} />}
              </span>
              <span>
                <small>
                  {t.due_date ? formatDate(t.due_date) : 'Dato kommer'}
                </small>
                <strong>{t.title}</strong>
              </span>
            </button>
          ))}
        </section>
      )}
      {!tasks.length && (
        <section className="planning-starters">
          <h3>Hvor vil dere begynne?</h3>
          <p>Velg et første steg og tilpass det til deres oppussing.</p>
          <div>
            {[
              'Samle inspirasjon til kjøkkenet',
              'Innhente tilbud fra håndverkere',
              'Bestemme materialer og farger',
              'Rommet er ferdig!',
            ].map((title, i) => (
              <button
                key={title}
                onClick={() =>
                  setEditing({
                    ...emptyTask(),
                    title,
                    milestone: i === 3,
                    room_id: room || null,
                  })
                }
              >
                <Plus size={16} />
                {title}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="planning-columns">
        {phases.map((phase) => (
          <section className={`task-column phase-${phase.key}`} key={phase.key}>
            <header>
              <h3>{phase.label}</h3>
              <span>{shown.filter((t) => t.status === phase.key).length}</span>
            </header>
            {shown
              .filter((t) => t.status === phase.key)
              .sort((a, b) =>
                (a.due_date || '9999').localeCompare(b.due_date || '9999'),
              )
              .map((t) => (
                <article className="task-card" key={t.id}>
                  <div className="task-title">
                    <button
                      className={`task-check ${t.status === 'done' ? 'checked' : ''}`}
                      aria-label={
                        t.status === 'done'
                          ? `Gjenåpne ${t.title}`
                          : `Fullfør ${t.title}`
                      }
                      onClick={() =>
                        void act(
                          () =>
                            patchTask(t.id, {
                              status: t.status === 'done' ? 'todo' : 'done',
                            }),
                          t.status === 'done'
                            ? 'Oppgaven er åpnet igjen'
                            : t.milestone
                              ? 'Milepæl nådd! Et steg nærmere drømmehjemmet.'
                              : 'Et steg nærmere. Bra jobbet!',
                        )
                      }
                    >
                      {t.status === 'done' ? (
                        <Check size={16} />
                      ) : (
                        <Circle size={17} />
                      )}
                    </button>
                    <button onClick={() => setEditing(t)}>{t.title}</button>
                    {t.milestone && <Flag size={15} />}
                  </div>
                  {t.notes && <p className="task-note">{t.notes}</p>}
                  <div className="task-tags">
                    <span>
                      {rooms.find((r) => r.id === t.room_id)?.name ??
                        'Hele hjemmet'}
                    </span>
                    {t.owner_id && (
                      <span>
                        {members.find((m) => m.id === t.owner_id)
                          ?.display_name ?? 'Deltaker'}
                      </span>
                    )}
                    {t.due_date && (
                      <span
                        className={
                          t.due_date < todayISO() && t.status !== 'done'
                            ? 'overdue'
                            : ''
                        }
                      >
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                  <div className="task-bottom">
                    {t.inspiration_id && (
                      <Link to="/moodboard">
                        Se inspirasjon <ArrowUpRight size={12} />
                      </Link>
                    )}
                    {t.status === 'todo' && (
                      <button
                        onClick={() =>
                          void act(() => patchTask(t.id, { status: 'doing' }))
                        }
                      >
                        Start oppgaven <ArrowUpRight size={14} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            {!shown.some((t) => t.status === phase.key) && (
              <p className="column-empty">
                {phase.key === 'done'
                  ? 'Her samler dere fremgangen.'
                  : phase.key === 'doing'
                    ? 'Én ting av gangen er en god start.'
                    : 'Plass til neste gode steg.'}
              </p>
            )}
          </section>
        ))}
      </div>
      <Link className="planning-inspo-link" to="/moodboard">
        <Sparkles size={24} />
        <div>
          <strong>Trenger planen litt inspirasjon?</strong>
          <span>Se moodboard for rommene.</span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
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
              ? 'Rediger steg'
              : 'Et nytt steg'
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
                  label="Måldato (valgfritt)"
                  type="date"
                  value={editing.due_date}
                  onChange={(e) =>
                    setEditing({ ...editing, due_date: e.target.value })
                  }
                />
                <Select
                  label="Hvem tar steget?"
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
                {busy ? 'Lagrer …' : 'Lagre steg'}
              </Button>
              {tasks.some((t) => t.id === editing.id) && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm('Slette dette steget?'))
                      void act(async () => {
                        await patchTask(editing.id, {
                          deleted_at: new Date().toISOString(),
                        })
                        setEditing(null)
                      }, 'Steget er slettet')
                  }}
                >
                  Slett steg
                </Button>
              )}
            </fieldset>
          </form>
        </Sheet>
      )}
    </div>
  )
}
