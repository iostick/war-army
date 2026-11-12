// Base de datos local de la app (IndexedDB): listas, colección, fotos y partidas.
import type { Roster } from '../engine/roster'

const DB = 'war-army'
const VERSION = 2
export type StoreName = 'rosters' | 'collection' | 'photos' | 'games'

let dbp: Promise<IDBDatabase> | undefined
function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      const d = req.result
      for (const [name, key] of [
        ['rosters', 'uid'],
        ['collection', 'key'],
        ['photos', 'id'],
        ['games', 'id'],
      ] as const) {
        if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: key })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(store, mode).objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

const listeners = new Set<(store: StoreName) => void>()
export function onChange(fn: (store: StoreName) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = (s: StoreName) => listeners.forEach((l) => l(s))

/** Aviso de cambios hechos en este dispositivo (para subirlos a la nube) */
const writeHooks = new Set<(store: StoreName, key: string) => void>()
export function onLocalWrite(fn: (store: StoreName, key: string) => void) {
  writeHooks.add(fn)
  return () => writeHooks.delete(fn)
}

export function table<T>(name: StoreName) {
  const keyOf = (v: any): string => v.uid ?? v.key ?? v.id
  return {
    all: () => run<T[]>(name, 'readonly', (s) => s.getAll()),
    get: (key: string) => run<T | undefined>(name, 'readonly', (s) => s.get(key)),
    put: (v: T) =>
      run(name, 'readwrite', (s) => s.put(v)).then(() => {
        emit(name)
        writeHooks.forEach((h) => h(name, keyOf(v)))
      }),
    delete: (key: string) =>
      run(name, 'readwrite', (s) => s.delete(key)).then(() => {
        emit(name)
        writeHooks.forEach((h) => h(name, key))
      }),
    /** Cambios que llegan de la nube: no se vuelven a subir */
    putRemote: (v: T) => run(name, 'readwrite', (s) => s.put(v)).then(() => emit(name)),
    deleteRemote: (key: string) => run(name, 'readwrite', (s) => s.delete(key)).then(() => emit(name)),
  }
}

// ---------- Tipos ----------

export const PAINT_STATUS = ['Sin montar', 'Montada', 'Imprimada', 'Pintando', 'Terminada'] as const
export type PaintStatus = (typeof PAINT_STATUS)[number]
/** Stored values stay as they were; these are the labels shown */
export const PAINT_LABEL: Record<string, string> = { 'Sin montar': 'Unassembled', Montada: 'Assembled', Imprimada: 'Primed', Pintando: 'Painting', Terminada: 'Finished' }
export const paintLabel = (s: string) => PAINT_LABEL[s] ?? s

export interface CollectionItem {
  /** catalogueId:entryId */
  key: string
  catalogueId: string
  entryId: string
  name: string
  faction: string
  /** Unidades que tienes */
  owned: number
  status: PaintStatus
  notes: string
  photos: string[]
  updatedAt: string
}

export interface Photo {
  id: string
  blob: Blob
  createdAt: string
}

export interface Game {
  id: string
  rosterUid?: string
  rosterName?: string
  opponent: string
  opponentFaction: string
  mission: string
  round: number
  cp: [number, number]
  vp: [number, number]
  notes: string
  finished: boolean
  createdAt: string
  updatedAt: string
}

export const rosters = table<Roster>('rosters')
export const collection = table<CollectionItem>('collection')
export const photos = table<Photo>('photos')
export const games = table<Game>('games')
