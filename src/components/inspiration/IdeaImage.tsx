import { useEffect, useState } from 'react'
import { readReceipt } from '@/lib/localStore'
export function IdeaImage({
  id,
  alt,
  plainFallback = false,
  colors = ['#d3c6b4', '#9c8871', '#504637'],
}: {
  id?: string | null
  alt: string
  plainFallback?: boolean
  colors?: string[]
}) {
  const [url, setUrl] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => {
    let cancelled = false,
      objectUrl = ''
    if (id)
      void readReceipt(id)
        .then((blob) => {
          if (blob && !cancelled) {
            objectUrl = URL.createObjectURL(blob)
            setUrl({ id, url: objectUrl })
          }
        })
        .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  if (id && url?.id === id)
    return <img src={url.url} alt={alt} loading="lazy" />
  if (plainFallback)
    return (
      <div className="gallery-unavailable">
        Bildet er ikke tilgjengelig på denne enheten
      </div>
    )
  return (
    <div
      className="material-art"
      role="img"
      aria-label={
        id
          ? `${alt} – bildet finnes ikke på denne enheten`
          : `${alt} – farge- og materialstudie`
      }
      style={{ background: colors[0] }}
    >
      <span className="material-arch" style={{ background: colors[1] }} />
      <span className="material-block" style={{ background: colors[2] }} />
      <span
        className="material-orb"
        style={{ background: colors[3] ?? '#eee5d9' }}
      />
      {id && <small>Bildet er på en annen enhet</small>}
    </div>
  )
}
