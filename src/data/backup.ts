// Copia de seguridad: listas, colección (con fotos) y partidas en un solo archivo .json.
// Sirve para pasar los datos del iPhone al iPad o al Mac (AirDrop, iCloud Drive…).
import { collection, games, photos, rosters } from './db'

export async function exportBackup(): Promise<Blob> {
  const ph = await photos.all()
  const photoData = await Promise.all(
    ph.map(async (p) => ({ id: p.id, createdAt: p.createdAt, type: p.blob.type, data: await blobToBase64(p.blob) })),
  )
  const payload = {
    app: 'war-army',
    version: 1,
    exportedAt: new Date().toISOString(),
    rosters: await rosters.all(),
    collection: await collection.all(),
    games: await games.all(),
    photos: photoData,
  }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

export async function importBackup(file: File): Promise<string> {
  const j = JSON.parse(await file.text())
  if (j.app !== 'war-army') throw new Error('This file is not a War Army backup')
  for (const p of j.photos ?? []) await photos.put({ id: p.id, createdAt: p.createdAt, blob: base64ToBlob(p.data, p.type) })
  // Se conserva la versión más reciente de cada elemento
  const merge = async <T extends { updatedAt: string }>(table: { get: (k: string) => Promise<T | undefined>; put: (v: T) => Promise<void> }, list: T[], key: (v: T) => string) => {
    let n = 0
    for (const v of list ?? []) {
      const cur = await table.get(key(v))
      if (!cur || cur.updatedAt < v.updatedAt) {
        await table.put(v)
        n++
      }
    }
    return n
  }
  const r = await merge(rosters, j.rosters, (v: any) => v.uid)
  const c = await merge(collection, j.collection, (v: any) => v.key)
  const g = await merge(games, j.games, (v: any) => v.id)
  return `Imported: ${r} lists, ${c} collection units, ${g} games`
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.readAsDataURL(b)
  })
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type })
}
