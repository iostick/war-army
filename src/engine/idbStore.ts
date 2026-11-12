// Almacén de datos de BSData en IndexedDB (persiste en el iPhone, iPad y Mac sin conexión).
import type { DataStore, SyncMeta } from './sync'

const DB = 'war-army-bsdata'
const FILES = 'files'
const META = 'meta'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(FILES)
      req.result.createObjectStore(META)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export class IdbStore implements DataStore {
  private db = open()
  async getMeta() {
    return tx<SyncMeta | undefined>(await this.db, META, 'readonly', (s) => s.get('meta'))
  }
  async setMeta(m: SyncMeta) {
    await tx(await this.db, META, 'readwrite', (s) => s.put(m, 'meta'))
  }
  async getFile(path: string) {
    return tx<{ sha: string; data: unknown } | undefined>(await this.db, FILES, 'readonly', (s) => s.get(path))
  }
  async setFile(path: string, sha: string, data: unknown) {
    await tx(await this.db, FILES, 'readwrite', (s) => s.put({ sha, data }, path))
  }
  async deleteFile(path: string) {
    await tx(await this.db, FILES, 'readwrite', (s) => s.delete(path))
  }
}
