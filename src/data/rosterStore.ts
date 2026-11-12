// Listas guardadas en el dispositivo (IndexedDB). En el paso 3 se sincronizarán entre dispositivos.
import type { Roster } from '../engine/roster'

const DB = 'war-army'
const ROSTERS = 'rosters'

let dbp: Promise<IDBDatabase> | undefined
function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(ROSTERS, { keyPath: 'uid' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(ROSTERS, mode).objectStore(ROSTERS))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const rosterStore = {
  all: () => run<Roster[]>('readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  get: (uid: string) => run<Roster | undefined>('readonly', (s) => s.get(uid)),
  put: (r: Roster) => run('readwrite', (s) => s.put(r)).then(() => undefined),
  delete: (uid: string) => run('readwrite', (s) => s.delete(uid)).then(() => undefined),
}
