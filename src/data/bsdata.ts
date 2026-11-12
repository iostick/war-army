// Acceso a los datos de BSData desde la app: sincronización y carga del índice por facción.
import { DataIndex } from '../engine/catalog'
import { IdbStore } from '../engine/idbStore'
import { BSDataSync, type CatalogueInfo, type SyncMeta } from '../engine/sync'

const opts = __LOCAL_BSDATA__ ? { apiBase: '/__bsdata/api', rawBase: '/__bsdata/raw' } : {}
export const bsdata = new BSDataSync(new IdbStore(), undefined, opts)

const indexCache = new Map<string, Promise<DataIndex>>()

export function getIndex(catalogueId: string): Promise<DataIndex> {
  let p = indexCache.get(catalogueId)
  if (!p) {
    p = bsdata.loadForCatalogue(catalogueId).then(({ gameSystem, catalogues }) => new DataIndex(gameSystem as any, catalogues as any[]))
    indexCache.set(catalogueId, p)
    p.catch(() => indexCache.delete(catalogueId))
  }
  return p
}

export function clearIndexCache() {
  indexCache.clear()
}

export async function getMeta(): Promise<SyncMeta | undefined> {
  return bsdata.getStore().getMeta()
}

/** Facciones jugables agrupadas por gran alianza (Imperium, Chaos, Xenos...) */
export function factions(meta: SyncMeta): { group: string; items: (CatalogueInfo & { short: string })[] }[] {
  const groups = new Map<string, (CatalogueInfo & { short: string })[]>()
  for (const c of meta.catalogues) {
    if (c.library) continue
    const [g, ...rest] = c.name.split(' - ')
    const group = rest.length ? g : 'Otros'
    const short = rest.length ? rest.join(' - ') : c.name
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push({ ...c, short })
  }
  const order = ['Imperium', 'Chaos', 'Xenos']
  return [...groups.entries()]
    .sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b))
    .map(([group, items]) => ({ group, items: items.sort((a, b) => a.short.localeCompare(b.short)) }))
}
