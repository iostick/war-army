// Sincronización con el repositorio de BSData en GitHub.
// Comprueba el último commit, descarga solo los archivos que han cambiado y los guarda en el dispositivo.

export const REPO = 'BSData/wh40k-11e'
export const BRANCH = 'main'
export const GAME_SYSTEM_FILE = 'Warhammer 40,000.json'

export interface FileInfo {
  path: string
  /** sha del blob en git: si no cambia, el archivo no ha cambiado */
  sha: string
  size: number
}

export interface CatalogueInfo {
  path: string
  id: string
  name: string
  library: boolean
  revision: number
  /** ids de catálogos enlazados */
  links: string[]
}

export interface SyncMeta {
  commitSha: string
  commitDate: string
  checkedAt: string
  files: FileInfo[]
  catalogues: CatalogueInfo[]
}

/** Almacenamiento local (IndexedDB en el navegador, memoria en pruebas) */
export interface DataStore {
  getMeta(): Promise<SyncMeta | undefined>
  setMeta(m: SyncMeta): Promise<void>
  getFile(path: string): Promise<{ sha: string; data: unknown } | undefined>
  setFile(path: string, sha: string, data: unknown): Promise<void>
  deleteFile(path: string): Promise<void>
}

export interface SyncProgress {
  phase: 'checking' | 'downloading' | 'done'
  done: number
  total: number
  file?: string
}

export interface SyncResult {
  updated: boolean
  commitSha: string
  commitDate: string
  changedFiles: string[]
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export class BSDataSync {
  private store: DataStore
  private fetchFn: Fetch
  private apiBase: string
  private rawBase: string
  constructor(store: DataStore, fetchFn: Fetch = (u, i) => fetch(u, i), opts: { apiBase?: string; rawBase?: string } = {}) {
    this.store = store
    this.fetchFn = fetchFn
    this.apiBase = opts.apiBase ?? 'https://api.github.com'
    this.rawBase = opts.rawBase ?? 'https://raw.githubusercontent.com'
  }

  getStore(): DataStore {
    return this.store
  }

  /** Último commit de la rama principal en GitHub */
  async latestCommit(): Promise<{ sha: string; date: string }> {
    const res = await this.fetchFn(`${this.apiBase}/repos/${REPO}/commits/${BRANCH}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`GitHub returned ${res.status} while checking for updates`)
    const j = await res.json()
    return { sha: j.sha, date: j.commit?.committer?.date ?? j.commit?.author?.date ?? '' }
  }

  async listFiles(commitSha: string): Promise<FileInfo[]> {
    const res = await this.fetchFn(`${this.apiBase}/repos/${REPO}/git/trees/${commitSha}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`GitHub returned ${res.status} while listing files`)
    const j = await res.json()
    return (j.tree as any[])
      .filter((t) => t.type === 'blob' && t.path.endsWith('.json'))
      .map((t) => ({ path: t.path, sha: t.sha, size: t.size ?? 0 }))
  }

  async downloadFile(commitSha: string, path: string): Promise<unknown> {
    const url = `${this.rawBase}/${REPO}/${commitSha}/${encodeURIComponent(path)}`
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`Couldn't download ${path} (${res.status})`)
    return res.json()
  }

  /**
   * Comprueba si hay una versión nueva y descarga solo lo que ha cambiado.
   * Si no hay conexión, se sigue usando lo que ya está guardado.
   */
  async sync(onProgress?: (p: SyncProgress) => void): Promise<SyncResult> {
    onProgress?.({ phase: 'checking', done: 0, total: 0 })
    const prev = await this.store.getMeta()
    const latest = await this.latestCommit()
    if (prev && prev.commitSha === latest.sha) {
      await this.store.setMeta({ ...prev, checkedAt: new Date().toISOString() })
      onProgress?.({ phase: 'done', done: 0, total: 0 })
      return { updated: false, commitSha: prev.commitSha, commitDate: prev.commitDate, changedFiles: [] }
    }

    const files = await this.listFiles(latest.sha)
    const changed: FileInfo[] = []
    for (const f of files) {
      const have = await this.store.getFile(f.path)
      if (!have || have.sha !== f.sha) changed.push(f)
    }

    let done = 0
    const catalogues = new Map<string, CatalogueInfo>((prev?.catalogues ?? []).map((c) => [c.path, c]))
    // Descargas en paralelo (de 4 en 4)
    const queue = [...changed]
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift()!
        onProgress?.({ phase: 'downloading', done, total: changed.length, file: f.path })
        const data = await this.downloadFile(latest.sha, f.path)
        await this.store.setFile(f.path, f.sha, data)
        const info = describe(f.path, data)
        if (info) catalogues.set(f.path, info)
        done++
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])

    // Archivos que ya no existen en el repositorio
    const present = new Set(files.map((f) => f.path))
    for (const f of prev?.files ?? []) {
      if (!present.has(f.path)) {
        await this.store.deleteFile(f.path)
        catalogues.delete(f.path)
      }
    }

    const meta: SyncMeta = {
      commitSha: latest.sha,
      commitDate: latest.date,
      checkedAt: new Date().toISOString(),
      files,
      catalogues: [...catalogues.values()].filter((c) => present.has(c.path)),
    }
    await this.store.setMeta(meta)
    onProgress?.({ phase: 'done', done, total: changed.length })
    return { updated: true, commitSha: latest.sha, commitDate: latest.date, changedFiles: changed.map((f) => f.path) }
  }

  /** Archivos necesarios para jugar con un catálogo: sistema de juego + catálogo + catálogos enlazados */
  async loadForCatalogue(catalogueId: string): Promise<{ gameSystem: unknown; catalogues: unknown[] }> {
    const meta = await this.store.getMeta()
    if (!meta) throw new Error('No BSData data downloaded yet')
    const byId = new Map(meta.catalogues.map((c) => [c.id, c]))
    const needed = new Set<string>()
    const visit = (id: string) => {
      if (needed.has(id)) return
      const c = byId.get(id)
      if (!c) return
      needed.add(id)
      c.links.forEach(visit)
    }
    visit(catalogueId)
    const gs = await this.store.getFile(GAME_SYSTEM_FILE)
    if (!gs) throw new Error('The BSData game system is missing')
    const catalogues: unknown[] = []
    for (const id of needed) {
      const f = await this.store.getFile(byId.get(id)!.path)
      if (f) catalogues.push(f.data)
    }
    return { gameSystem: gs.data, catalogues }
  }
}

function describe(path: string, data: any): CatalogueInfo | undefined {
  const c = data?.catalogue
  if (!c) return undefined
  return {
    path,
    id: c.id,
    name: c.name,
    library: Boolean(c.library),
    revision: Number(c.revision ?? 0),
    links: (c.catalogueLinks ?? []).map((l: any) => l.targetId),
  }
}

/** Almacén en memoria (para pruebas) */
export class MemoryStore implements DataStore {
  meta?: SyncMeta
  files = new Map<string, { sha: string; data: unknown }>()
  async getMeta() {
    return this.meta
  }
  async setMeta(m: SyncMeta) {
    this.meta = m
  }
  async getFile(p: string) {
    return this.files.get(p)
  }
  async setFile(p: string, sha: string, data: unknown) {
    this.files.set(p, { sha, data })
  }
  async deleteFile(p: string) {
    this.files.delete(p)
  }
}
