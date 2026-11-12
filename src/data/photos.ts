// Fotos de miniaturas: se reducen (máx. 1600 px, JPEG) antes de guardarlas en el dispositivo.
import { useEffect, useState } from 'react'
import { uid } from '../engine/roster'
import { photos } from './db'

export async function savePhoto(file: File): Promise<string> {
  const blob = await shrink(file, 1600, 0.85)
  const id = uid()
  await photos.put({ id, blob, createdAt: new Date().toISOString() })
  return id
}

async function shrink(file: File, max: number, quality: number): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', quality))
  } catch {
    return file
  }
}

const urlCache = new Map<string, string>()

export function usePhotoUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState(id ? urlCache.get(id) : undefined)
  useEffect(() => {
    if (!id) return setUrl(undefined)
    const cached = urlCache.get(id)
    if (cached) return setUrl(cached)
    let alive = true
    photos.get(id).then((p) => {
      if (!p || !alive) return
      const u = URL.createObjectURL(p.blob)
      urlCache.set(id, u)
      setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [id])
  return url
}
