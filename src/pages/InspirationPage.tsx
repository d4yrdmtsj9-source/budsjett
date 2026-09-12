import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Heart,
  Plus,
  Sparkles,
  Check,
  Pencil,
  Columns2,
  X,
  ImagePlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePlanning } from '@/hooks/usePlanning'
import { useRooms } from '@/hooks/useRooms'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useExpenses } from '@/hooks/useExpenses'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { IdeaImage } from '@/components/inspiration/IdeaImage'
import { uid } from '@/lib/localStore'
import { palettePresets, type Inspiration } from '@/lib/planning'
import { storeIdeaImage } from '@/lib/ideaImages'
import { formatNOK } from '@/lib/format'
import { financials } from '@/lib/finance'
const statuses = {
  idea: 'På ønskelisten',
  chosen: 'Dette velger vi',
  finished: 'Slik ble det',
}
const emptyIdea = (): Inspiration => ({
  id: uid(),
  title: '',
  room_id: null,
  notes: '',
  link: '',
  image_id: null,
  before_image_id: null,
  palette: [...palettePresets[0].colors],
  price: null,
  status: 'idea',
  votes: {},
  updated_at: new Date().toISOString(),
  deleted_at: null,
})
export function InspirationPage() {
  const { ideas, saveIdea, removeIdea, toggleVote, planIdea } = usePlanning()
  const { data: rooms } = useRooms()
  const { memberId } = useAuth()
  const { project } = useProject()
  const { expenses } = useExpenses()
  const [params, setParams] = useSearchParams()
  const room = params.get('rom') ?? ''
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Inspiration | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [compare, setCompare] = useState(false)
  const [busy, setBusy] = useState(false)
  const shown = ideas
    .filter(
      (i) =>
        (!room || i.room_id === room) &&
        (filter === 'all' ||
          (filter === 'liked'
            ? !!i.votes[memberId ?? '']?.liked
            : i.status === filter)),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const pair = selected
    .map((id) => ideas.find((i) => i.id === id))
    .filter((i): i is Inspiration => !!i)
  const f = financials(expenses, project?.total_budget, project?.reserve_amount)
  const run = async (fn: () => Promise<unknown>, message?: string) => {
    try {
      await fn()
      if (message) toast.success(message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke lagre')
    }
  }
  const choose = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1], id],
    )
  return (
    <div className="inspiration-page">
      <section className="creative-hero">
        <div className="creative-copy">
          <p className="eyebrow">
            <Sparkles size={14} /> PLASS TIL Å DRØMME
          </p>
          <h1>
            Et hjem.
            <br />
            <em>Helt deres.</em>
          </h1>
          <p>
            Samle det dere faller for. Finn uttrykket.
            <br />
            Gjør én god idé til virkelighet av gangen.
          </p>
          <Button onClick={() => setEditing(emptyIdea())}>
            <Plus size={17} /> Legg til inspirasjon
          </Button>
          <span className="creative-count">
            {ideas.length} ideer ·{' '}
            {ideas.filter((i) => i.status === 'chosen').length} valg dere har
            tatt
          </span>
        </div>
        <div className="hero-mood" aria-hidden="true">
          <div className="mood-paper">
            <IdeaImage alt="" colors={palettePresets[0].colors} />
            <span>01 / VARME MATERIALER</span>
          </div>
          <div className="mood-swatch">
            <span style={{ background: '#e1d6c7' }} />
            <span style={{ background: '#807761' }} />
            <span style={{ background: '#453d32' }} />
            <p>Finn følelsen.</p>
          </div>
          <span className="mood-caption">DERES NESTE KAPITTEL</span>
        </div>
      </section>
      <div className="inspo-controls">
        <div className="filter-tabs" role="group" aria-label="Vis inspirasjon">
          {[
            ['all', 'Alle ideer'],
            ['liked', 'Mine favoritter'],
            ['chosen', 'Valgt'],
            ['finished', 'Ferdig'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'active' : ''}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <Select
          label="Rom"
          value={room}
          onChange={(e) =>
            setParams(e.target.value ? { rom: e.target.value } : {})
          }
          options={[
            { value: '', label: 'Alle rom' },
            ...rooms.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
      </div>
      {shown.length > 0 ? (
        <div className="idea-grid">
          {shown.map((idea) => (
            <article
              className={`idea-card ${selected.includes(idea.id) ? 'is-selected' : ''}`}
              key={idea.id}
            >
              <button
                className="idea-cover"
                onClick={() => setEditing(idea)}
                aria-label={`Åpne ${idea.title}`}
              >
                <IdeaImage
                  id={idea.image_id}
                  alt={idea.title}
                  colors={idea.palette}
                />
                <span className="idea-room">
                  {rooms.find((r) => r.id === idea.room_id)?.name ??
                    'Hele hjemmet'}
                </span>
              </button>
              <button
                className={`idea-heart ${idea.votes[memberId ?? '']?.liked ? 'liked' : ''}`}
                aria-label={`Favoritt: ${idea.title}`}
                aria-pressed={!!idea.votes[memberId ?? '']?.liked}
                onClick={() => void run(() => toggleVote(idea.id))}
              >
                <Heart
                  size={19}
                  fill={
                    idea.votes[memberId ?? '']?.liked ? 'currentColor' : 'none'
                  }
                />
                <span>
                  {Object.values(idea.votes).filter((v) => v.liked).length ||
                    ''}
                </span>
              </button>
              <div className="idea-body">
                <div className="idea-meta">
                  <span>{statuses[idea.status]}</span>
                  <span>
                    {idea.price === null
                      ? 'Pris å utforske'
                      : formatNOK(idea.price)}
                  </span>
                </div>
                <button className="idea-title" onClick={() => setEditing(idea)}>
                  {idea.title}
                  <ArrowUpRight size={17} />
                </button>
                <div className="palette-row">
                  {idea.palette.map((c, i) => (
                    <span key={i} style={{ background: c }} title={c} />
                  ))}
                  <small>{idea.notes || 'En idé til hjemmet deres.'}</small>
                </div>
                <div className="idea-actions">
                  <button
                    onClick={() => choose(idea.id)}
                    aria-pressed={selected.includes(idea.id)}
                  >
                    {selected.includes(idea.id) ? (
                      <Check size={15} />
                    ) : (
                      <Columns2 size={15} />
                    )}{' '}
                    Sammenlign
                  </button>
                  <button
                    onClick={() =>
                      void run(
                        () => planIdea(idea),
                        'Ideen ligger nå under Planlegg',
                      )
                    }
                  >
                    <Plus size={15} /> Planlegg
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="inspo-empty">
          <Sparkles size={28} />
          <h2>
            {ideas.length
              ? 'Ingen ideer i dette utvalget.'
              : 'Hva skal hjemmet deres føles som?'}
          </h2>
          <p>
            {ideas.length
              ? 'Velg et annet rom eller filter.'
              : 'Start med et bilde, en farge eller noe dere har lyst på. Ideer påvirker ikke budsjettet før dere registrerer et kjøp.'}
          </p>
          <button
            className="text-link"
            onClick={() =>
              setEditing({ ...emptyIdea(), room_id: room || null })
            }
          >
            Legg til den første ideen <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      <section className="palette-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EN LITEN START PÅ NOE STORT</p>
            <h2>Finn deres uttrykk.</h2>
          </div>
          <span className="text-xs text-muted">
            Fargeforslag · tilpass selv
          </span>
        </div>
        <div className="style-grid">
          {palettePresets.map((p) => (
            <button
              key={p.name}
              className="style-card"
              onClick={() =>
                setEditing({
                  ...emptyIdea(),
                  title: p.name,
                  notes: p.note,
                  palette: [...p.colors],
                  room_id: room || null,
                })
              }
            >
              <div className="style-colors">
                {p.colors.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
              <h3>
                {p.name}
                <ArrowUpRight size={17} />
              </h3>
              <p>{p.note}</p>
            </button>
          ))}
        </div>
      </section>
      {pair.length > 0 && (
        <div className="compare-dock">
          <span>{pair.length}/2 ideer valgt</span>
          <Button disabled={pair.length !== 2} onClick={() => setCompare(true)}>
            <Columns2 size={16} /> Sammenlign
          </Button>
          <button
            aria-label="Fjern sammenligning"
            onClick={() => setSelected([])}
          >
            <X size={20} />
          </button>
        </div>
      )}
      <Sheet
        open={compare}
        onClose={() => setCompare(false)}
        title="Denne eller denne?"
        subtitle="Utforsk forskjellen før dere bestemmer dere."
      >
        <div className="compare-pair">
          {pair.map((i) => (
            <div key={i.id}>
              <div className="compare-image">
                <IdeaImage id={i.image_id} alt={i.title} colors={i.palette} />
              </div>
              <h3>{i.title}</h3>
              <p>{i.price === null ? 'Pris mangler' : formatNOK(i.price)}</p>
              <span>
                {Object.values(i.votes).filter((v) => v.liked).length}{' '}
                favorittstemmer
              </span>
            </div>
          ))}
        </div>
        {pair.length === 2 && pair.every((i) => i.price !== null) ? (
          <div className="scenario-card">
            <p className="eyebrow">HVA OM?</p>
            <h3>
              {formatNOK(Math.abs(pair[1].price! - pair[0].price!))} i forskjell
            </h3>
            <p>
              Hvis «{pair[0].title}» allerede er med i budsjettet og erstattes
              av «{pair[1].title}», blir sluttprognosen{' '}
              <strong>
                {formatNOK(f.projected - pair[0].price! + pair[1].price!)}
              </strong>
              .
            </p>
            <p className="text-xs">
              Regneeksempel basert på oppgitte priser. Ingen budsjettposter
              endres.{' '}
              {f.missing > 0 ? 'Budsjettet inneholder poster uten pris.' : ''}
            </p>
          </div>
        ) : (
          <p>Legg inn pris på begge ideene for å se forskjellen.</p>
        )}
        <Link
          to="/utgifter"
          className="text-link"
          onClick={() => setCompare(false)}
        >
          Gå til budsjettpostene <ArrowUpRight size={16} />
        </Link>
      </Sheet>
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
            ideas.some((i) => i.id === editing.id)
              ? 'Din inspirasjon'
              : 'En ny idé'
          }
          subtitle="Et bilde. En følelse. En mulighet."
        >
          <form
            className="idea-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                await saveIdea(editing)
                setEditing(null)
                toast.success('Ideen er lagret')
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
                label="Hva drømmer dere om?"
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                required
                maxLength={120}
              />
              <div className="idea-photo-editor">
                <IdeaImage
                  id={editing.image_id}
                  alt={editing.title}
                  colors={editing.palette}
                />
                <label className="upload-idea">
                  <ImagePlus size={18} /> Velg bilde
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setBusy(true)
                      try {
                        const id = await storeIdeaImage(file)
                        setEditing((prev) =>
                          prev ? { ...prev, image_id: id } : null,
                        )
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : 'Kunne ikke laste opp',
                        )
                      } finally {
                        setBusy(false)
                      }
                    }}
                  />
                </label>
                {editing.image_id && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setEditing({ ...editing, image_id: null })}
                  >
                    Fjern bilde
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">
                Bilder lagres på denne enheten og følger med i
                JSON-sikkerhetskopien. Tekst, valg og favoritter synkroniseres
                med prosjektet.
              </p>
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
                  label="Hvor er dere i prosessen?"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as Inspiration['status'],
                    })
                  }
                  options={Object.entries(statuses).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>
              <Input
                label="Lenke til produkt eller inspirasjon"
                type="url"
                placeholder="https://…"
                value={editing.link}
                onChange={(e) =>
                  setEditing({ ...editing, link: e.target.value })
                }
              />
              {editing.link && /^https?:\/\//i.test(editing.link) && (
                <a
                  className="text-link"
                  href={editing.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Åpne lenken <ArrowUpRight size={15} />
                </a>
              )}
              <Input
                label="Anslått pris (valgfritt)"
                type="number"
                min="0"
                step="0.01"
                value={editing.price ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    price:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <label className="field-label">
                Det dere liker
                <textarea
                  value={editing.notes}
                  maxLength={2000}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                  placeholder="Materialer, mål, detaljer eller hvorfor dette føles riktig …"
                />
              </label>
              <div>
                <p className="field-label">Fargepalett</p>
                <div className="color-inputs">
                  {editing.palette.map((c, i) => (
                    <label key={i}>
                      <input
                        type="color"
                        aria-label={`Farge ${i + 1}`}
                        value={c}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            palette: editing.palette.map((old, n) =>
                              n === i ? e.target.value : old,
                            ),
                          })
                        }
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <details className="before-details">
                <summary>
                  Før og etter <Pencil size={14} />
                </summary>
                <p>
                  Bruk hovedbildet som etterbilde, og legg til hvordan rommet så
                  ut før.
                </p>
                <label className="upload-idea">
                  <ImagePlus size={16} /> Legg til førbilde
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setBusy(true)
                      try {
                        const id = await storeIdeaImage(file)
                        setEditing((prev) =>
                          prev ? { ...prev, before_image_id: id } : null,
                        )
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : 'Kunne ikke laste opp',
                        )
                      } finally {
                        setBusy(false)
                      }
                    }}
                  />
                </label>
                {editing.before_image_id && (
                  <>
                    <div className="compare-pair">
                      <div>
                        <span>Før</span>
                        <div className="compare-image">
                          <IdeaImage
                            id={editing.before_image_id}
                            alt="Før oppussing"
                          />
                        </div>
                      </div>
                      <div>
                        <span>Etter / ønsket uttrykk</span>
                        <div className="compare-image">
                          <IdeaImage
                            id={editing.image_id}
                            alt="Etter oppussing"
                            colors={editing.palette}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        setEditing({ ...editing, before_image_id: null })
                      }
                    >
                      Fjern førbilde
                    </button>
                  </>
                )}
              </details>
              <Button type="submit" className="w-full">
                {busy ? 'Lagrer …' : 'Lagre idé'}
              </Button>
              {ideas.some((i) => i.id === editing.id) && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm('Slette denne ideen?'))
                      void run(async () => {
                        await removeIdea(editing.id)
                        setEditing(null)
                        setSelected((prev) =>
                          prev.filter((id) => id !== editing.id),
                        )
                      }, 'Ideen er slettet')
                  }}
                >
                  Slett idé
                </Button>
              )}
            </fieldset>
          </form>
        </Sheet>
      )}
    </div>
  )
}
