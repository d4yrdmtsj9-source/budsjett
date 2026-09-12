import { uid, saveReceipt } from './localStore'
export async function storeIdeaImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Velg et JPG-, PNG- eller WebP-bilde.')
  if (file.size > 10 * 1024 * 1024)
    throw new Error('Bildet må være mindre enn 10 MB.')
  const id = uid()
  // Re-encode to strip metadata and keep local images compact.
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kunne ikke behandle bildet.')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Kunne ikke lagre bildet.'))),
        'image/jpeg',
        0.84,
      ),
    )
    await saveReceipt(id, blob)
    return id
  } finally {
    bitmap.close()
  }
}
