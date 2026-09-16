import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ImagePlus, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useProject } from '@/hooks/useProject'
import { useRooms } from '@/hooks/useRooms'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { IdeaImage } from '@/components/inspiration/IdeaImage'
import { storeIdeaImage } from '@/lib/ideaImages'
import { roomMoodboard } from '@/lib/moodboard'

export function MoodboardPage() {
  const { rawProject, setRawProject } = useProject()
  const { data: rooms } = useRooms()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const upload = useRef<HTMLInputElement>(null)
  const targetRoom = useRef<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const filter = params.get('rom') ?? ''
  const shown = rooms.filter((r) => !filter || r.id === filter)
  const selected = rooms.find((r) => r.id === active)
  const selectedImage = selected
    ? roomMoodboard(selected, rawProject?.inspirations)
    : null
  const open = !!selectedImage
  useEffect(() => {
    if (!open) return
    const element = dialog.current
    const overflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
    }
  }, [open])

  async function save(roomId: string, file: File | null) {
    setBusy(true)
    try {
      const imageId = file ? await storeIdeaImage(file) : null
      await setRawProject((p) => {
        if (!p.rooms.some((r) => r.id === roomId && !r.deleted_at))
          throw new Error('Rommet finnes ikke lenger.')
        return {
          ...p,
          rooms: p.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  moodboard_image_id: imageId,
                  updated_at: new Date().toISOString(),
                }
              : r,
          ),
        }
      })
      toast.success(file ? 'Moodboard lagret' : 'Moodboard fjernet')
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Kunne ikke lagre moodboard.',
      )
    } finally {
      setBusy(false)
    }
  }
  function choose(roomId: string) {
    targetRoom.current = roomId
    upload.current?.click()
  }

  return (
    <div className="simple-inspo">
      <header className="gallery-heading">
        <h1>Moodboard</h1>
      </header>
      {rooms.length > 0 && (
        <div className="gallery-room">
          <Select
            label="Rom"
            value={filter}
            options={[
              { value: '', label: 'Alle rom' },
              ...rooms.map((r) => ({ value: r.id, label: r.name })),
            ]}
            onChange={(e) =>
              setParams(e.target.value ? { rom: e.target.value } : {})
            }
          />
        </div>
      )}
      <input
        ref={upload}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Last opp moodboard"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          const roomId = targetRoom.current
          e.target.value = ''
          if (file && roomId) void save(roomId, file)
        }}
      />
      <div className="moodboard-rooms">
        {shown.map((room) => {
          const imageId = roomMoodboard(room, rawProject?.inspirations)
          return (
            <section className="moodboard-room" key={room.id}>
              <h2>{room.name}</h2>
              {imageId ? (
                <button
                  className="gallery-main"
                  aria-label={`Åpne moodboard for ${room.name}`}
                  onClick={() => setActive(room.id)}
                >
                  <IdeaImage
                    id={imageId}
                    alt={`Moodboard for ${room.name}`}
                    plainFallback
                  />
                </button>
              ) : (
                <button
                  className="gallery-empty"
                  disabled={busy}
                  onClick={() => choose(room.id)}
                  aria-label={`Legg til moodboard for ${room.name}`}
                >
                  <ImagePlus size={28} />
                  <span>Legg til moodboard</span>
                </button>
              )}
              {imageId && (
                <div className="moodboard-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => choose(room.id)}
                  >
                    <ImagePlus size={16} />
                    Bytt bilde
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Fjern moodboard for ${room.name}`}
                    onClick={() => {
                      if (window.confirm(`Fjerne moodboard for ${room.name}?`))
                        void save(room.id, null)
                    }}
                  >
                    <Trash2 size={16} />
                    Fjern
                  </Button>
                </div>
              )}
            </section>
          )
        })}
      </div>
      {shown.length === 0 && (
        <p className="text-sm text-muted">
          {rooms.length
            ? 'Ingen rom valgt.'
            : 'Legg til et rom for å laste opp moodboard.'}{' '}
          <Link className="text-link" to="/rom">
            Se rom
          </Link>
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted">
          Lagrer …
        </p>
      )}
      <p className="text-xs text-muted">
        Ett bilde per rom. Bilder lagres på denne enheten og tas med i
        sikkerhetskopien under Mer.
      </p>
      <dialog
        ref={dialog}
        className="gallery-viewer moodboard-viewer"
        aria-label={`Moodboard for ${selected?.name ?? 'rom'}`}
        onCancel={() => setActive(null)}
      >
        {selectedImage && (
          <>
            <header>
              <span>{selected?.name}</span>
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
                id={selectedImage}
                alt={`Moodboard for ${selected?.name}`}
                plainFallback
              />
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
