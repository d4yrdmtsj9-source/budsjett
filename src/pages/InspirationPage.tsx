import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ImagePlus,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePlanning } from '@/hooks/usePlanning'
import { useProject } from '@/hooks/useProject'
import { useRooms } from '@/hooks/useRooms'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { IdeaImage } from '@/components/inspiration/IdeaImage'
import { uid } from '@/lib/localStore'
import { storeIdeaImage } from '@/lib/ideaImages'
import { palettePresets, type Inspiration } from '@/lib/planning'

type Photo = {
  id: string
  idea: Inspiration
  field: 'image_id' | 'before_image_id'
}

export function InspirationPage() {
  const { ideas } = usePlanning()
  const { setRawProject } = useProject()
  const { data: rooms } = useRooms()
  const [params, setParams] = useSearchParams()
  const room = params.get('rom') ?? ''
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const upload = useRef<HTMLInputElement>(null)
  const uploadAsMain = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const photos: Photo[] = ideas
    .filter((i) => !room || i.room_id === room)
    .sort(
      (a, b) =>
        b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id),
    )
    .flatMap((idea) =>
      (['image_id', 'before_image_id'] as const).flatMap((field) =>
        idea[field] ? [{ id: idea[field]!, idea, field }] : [],
      ),
    )
  const main =
    photos.find((p) => p.idea.status === 'chosen' && p.field === 'image_id') ??
    photos[0]
  const others = photos.filter((p) => p.id !== main?.id)
  const index = photos.findIndex((p) => p.id === active)
  const current = photos[index]
  const open = !!current

  useEffect(() => {
    const element = dialog.current
    if (open) {
      element?.showModal()
      const overflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        element?.close()
        document.body.style.overflow = overflow
      }
    }
  }, [open])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke lagre bildet.')
    } finally {
      setBusy(false)
    }
  }
  function chooseFiles(asMain: boolean) {
    uploadAsMain.current = asMain
    upload.current?.click()
  }
  async function addFiles(files: File[], asMain: boolean) {
    const targetRoom = room || null
    await run(async () => {
      for (const [index, file] of files.entries()) {
        const image = await storeIdeaImage(file)
        const now = new Date().toISOString()
        const idea: Inspiration = {
          id: uid(),
          title: 'Bilde',
          room_id: targetRoom,
          notes: '',
          link: '',
          image_id: image,
          before_image_id: null,
          palette: [...palettePresets[0].colors],
          price: null,
          status: asMain && index === 0 ? 'chosen' : 'idea',
          votes: {},
          updated_at: now,
          deleted_at: null,
        }
        await setRawProject((p) => ({
          ...p,
          inspirations: [
            ...(p.inspirations ?? []).map((i) =>
              idea.status === 'chosen' &&
              !i.deleted_at &&
              i.room_id === targetRoom &&
              i.status === 'chosen'
                ? { ...i, status: 'idea' as const, updated_at: now }
                : i,
            ),
            idea,
          ],
        }))
      }
      toast.success(
        files.length === 1 ? 'Bildet er lagt til' : 'Bildene er lagt til',
      )
    })
  }
  async function makeMain(photo: Photo) {
    await run(async () => {
      await setRawProject((p) => {
        const selected = p.inspirations?.find(
          (i) => i.id === photo.idea.id && !i.deleted_at,
        )
        if (!selected || selected[photo.field] !== photo.id)
          throw new Error('Bildet er endret på en annen enhet.')
        const now = new Date().toISOString()
        return {
          ...p,
          inspirations: (p.inspirations ?? []).map((i) => {
            if (i.id === selected.id)
              return {
                ...i,
                status: 'chosen' as const,
                image_id: photo.id,
                before_image_id:
                  photo.field === 'before_image_id'
                    ? i.image_id
                    : i.before_image_id,
                updated_at: now,
              }
            return !i.deleted_at &&
              i.room_id === selected.room_id &&
              i.status === 'chosen'
              ? { ...i, status: 'idea' as const, updated_at: now }
              : i
          }),
        }
      })
      toast.success('Hovedbildet er valgt')
    })
  }
  async function remove(photo: Photo) {
    if (!window.confirm('Slette dette bildet fra Inspo?')) return
    await run(async () => {
      await setRawProject((p) => ({
        ...p,
        inspirations: (p.inspirations ?? []).map((i) =>
          i.id === photo.idea.id && i[photo.field] === photo.id
            ? {
                ...i,
                [photo.field]: null,
                updated_at: new Date().toISOString(),
              }
            : i,
        ),
      }))
      setActive(null)
    })
  }
  function move(direction: number) {
    setActive(
      photos[(index + direction + photos.length) % photos.length]?.id ?? null,
    )
  }

  return (
    <div className="simple-inspo">
      <header className="gallery-heading">
        <h1>Inspo</h1>
        <Button onClick={() => chooseFiles(false)} disabled={busy}>
          <ImagePlus size={18} />
          {busy ? 'Lagrer …' : 'Legg til bilder'}
        </Button>
      </header>
      <div className="gallery-room">
        <Select
          label="Rom"
          value={room}
          onChange={(e) =>
            setParams(e.target.value ? { rom: e.target.value } : {})
          }
          options={[
            { value: '', label: 'Alle rom' },
            ...(rooms ?? []).map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
      </div>
      <input
        ref={upload}
        className="sr-only"
        tabIndex={-1}
        aria-label="Last opp bilder"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) void addFiles(files, uploadAsMain.current)
        }}
      />
      {main ? (
        <>
          <div className="gallery-main-wrap">
            <button
              className="gallery-main"
              aria-label="Åpne moodboard i fullskjerm"
              onClick={() => setActive(main.id)}
            >
              <IdeaImage id={main.id} alt="Moodboard" plainFallback />
            </button>
            <Button
              variant="secondary"
              size="sm"
              className="gallery-add-main"
              disabled={busy}
              onClick={() => chooseFiles(true)}
            >
              <ImagePlus size={16} />
              Nytt hovedbilde
            </Button>
          </div>
          <div className="gallery-thumbs">
            {others.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setActive(photo.id)}
                aria-label={`Åpne bilde ${i + 2} i fullskjerm`}
              >
                <IdeaImage
                  id={photo.id}
                  alt={`Inspirasjonsbilde ${i + 2}`}
                  plainFallback
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          className="gallery-empty"
          disabled={busy}
          onClick={() => chooseFiles(true)}
        >
          <ImagePlus size={30} />
          <span>Legg til moodboard</span>
        </button>
      )}
      <p className="text-xs text-muted">
        Bilder lagres på denne enheten. Ta dem med i sikkerhetskopien under Mer.
      </p>
      <dialog
        ref={dialog}
        className="gallery-viewer"
        aria-label="Bilde i fullskjerm"
        onCancel={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            move(-1)
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            move(1)
          }
        }}
      >
        {current && (
          <>
            <header>
              <span>
                {index + 1} / {photos.length}
              </span>
              <button
                autoFocus
                aria-label="Lukk fullskjerm"
                onClick={() => setActive(null)}
              >
                <X />
              </button>
            </header>
            <div className="gallery-full-image">
              <IdeaImage
                id={current.id}
                alt={`Inspirasjonsbilde ${index + 1}`}
                plainFallback
              />
            </div>
            <footer>
              <button
                disabled={photos.length < 2}
                aria-label="Forrige bilde"
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </button>
              <button disabled={busy} onClick={() => void makeMain(current)}>
                <Star size={18} />
                <span>Bruk som hovedbilde</span>
              </button>
              <button
                disabled={busy}
                aria-label="Slett bildet"
                onClick={() => void remove(current)}
              >
                <Trash2 size={19} />
              </button>
              <button
                disabled={photos.length < 2}
                aria-label="Neste bilde"
                onClick={() => move(1)}
              >
                <ChevronRight />
              </button>
            </footer>
          </>
        )}
      </dialog>
    </div>
  )
}
