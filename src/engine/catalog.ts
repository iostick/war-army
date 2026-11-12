// Índice de datos BSData (formato JSON de BattleScribe / New Recruit).
// Carga el sistema de juego y los catálogos, y resuelve enlaces (entryLinks) a sus destinos.

export type Raw = Record<string, any>

export interface CatalogueFile {
  /** Nombre del archivo en el repositorio, p. ej. "Necrons.json" */
  path: string
  data: Raw
}

/** Una entrada seleccionable o un grupo, con el enlace (si lo hay) fusionado con su destino. */
export interface EntryNode {
  /** Clave única dentro de su padre: id del enlace o id de la entrada */
  key: string
  /** id de la entrada destino (compartida) */
  id: string
  linkId?: string
  kind: 'entry' | 'group'
  name: string
  /** model | unit | upgrade | ... (solo para entradas) */
  type?: string
  hidden: boolean
  collective: boolean
  sortIndex: number
  constraints: Raw[]
  modifiers: Raw[]
  modifierGroups: Raw[]
  costs: Raw[]
  categoryIds: string[]
  primaryCategoryId?: string
  defaultSelectionEntryId?: string
  target: Raw
  link?: Raw
  /** Catálogo al que pertenece el destino */
  catalogueId: string
}

const LINK_TYPES = new Set(['selectionEntry', 'selectionEntryGroup'])

export class DataIndex {
  gameSystem: Raw
  catalogues = new Map<string, Raw>()
  /** Entradas, grupos, perfiles, reglas, categorías... por id (lo primero que aparece gana) */
  byId = new Map<string, Raw>()
  catalogueOf = new Map<Raw, string>()
  categories = new Map<string, Raw>()
  costTypes: Raw[]
  private childCache = new WeakMap<Raw, EntryNode[]>()
  private nodeCache = new WeakMap<Raw, EntryNode>()

  constructor(gameSystemFile: Raw, catalogueFiles: Raw[]) {
    this.gameSystem = gameSystemFile.gameSystem ?? gameSystemFile
    this.costTypes = this.gameSystem.costTypes ?? []
    this.register(this.gameSystem, this.gameSystem.id)
    for (const f of catalogueFiles) {
      const c = f.catalogue ?? f
      this.catalogues.set(c.id, c)
      this.register(c, c.id)
    }
  }

  private register(root: Raw, catId: string) {
    const visit = (o: any) => {
      if (Array.isArray(o)) {
        for (const x of o) visit(x)
        return
      }
      if (!o || typeof o !== 'object') return
      if (typeof o.id === 'string' && !o.targetId && !this.byId.has(o.id)) {
        this.byId.set(o.id, o)
        this.catalogueOf.set(o, catId)
      }
      for (const k in o) {
        const v = o[k]
        if (v && typeof v === 'object') visit(v)
      }
    }
    visit(root)
    for (const c of root.categoryEntries ?? []) this.categories.set(c.id, c)
  }

  /** Catálogos jugables (no librerías) */
  playableCatalogues(): Raw[] {
    return [...this.catalogues.values()].filter((c) => !c.library)
  }

  /** Ids de catálogos que se importan desde uno dado (recursivo) */
  linkedCatalogueIds(catId: string, rootEntriesOnly = false, seen = new Set<string>()): string[] {
    if (seen.has(catId)) return []
    seen.add(catId)
    const c = this.catalogues.get(catId)
    const out = [catId]
    for (const l of c?.catalogueLinks ?? []) {
      if (rootEntriesOnly && !l.importRootEntries) continue
      out.push(...this.linkedCatalogueIds(l.targetId, rootEntriesOnly, seen))
    }
    return out
  }

  /** Convierte un nodo crudo (entrada, grupo o enlace) en un EntryNode */
  node(raw: Raw): EntryNode | undefined {
    const cached = this.nodeCache.get(raw)
    if (cached) return cached
    let target = raw
    let link: Raw | undefined
    if (raw.targetId) {
      if (!LINK_TYPES.has(raw.type)) return undefined
      target = this.byId.get(raw.targetId) as Raw
      if (!target) return undefined
      link = raw
    }
    // En el JSON, los grupos no tienen campo "type"; las entradas sí (model, unit, upgrade...)
    const isGroup = link ? link.type === 'selectionEntryGroup' : target.type === undefined
    const catLinks = [...(target.categoryLinks ?? []), ...(link?.categoryLinks ?? [])]
    const primary = [...catLinks].reverse().find((c) => c.primary)
    const n: EntryNode = {
      key: link?.id ?? target.id,
      id: target.id,
      linkId: link?.id,
      kind: isGroup ? 'group' : 'entry',
      name: link?.name && link.name !== target.name && !target.name ? link.name : target.name,
      type: isGroup ? undefined : target.type,
      hidden: Boolean(target.hidden) || Boolean(link?.hidden),
      collective: Boolean(target.collective || link?.collective),
      sortIndex: link?.sortIndex ?? target.sortIndex ?? 0,
      constraints: [...(target.constraints ?? []), ...(link?.constraints ?? [])],
      modifiers: [...(target.modifiers ?? []), ...(link?.modifiers ?? [])],
      modifierGroups: [...(target.modifierGroups ?? []), ...(link?.modifierGroups ?? [])],
      costs: mergeCosts(target.costs ?? [], link?.costs ?? []),
      categoryIds: catLinks.map((c) => c.targetId),
      primaryCategoryId: primary?.targetId,
      defaultSelectionEntryId: link?.defaultSelectionEntryId ?? target.defaultSelectionEntryId,
      target,
      link,
      catalogueId: this.catalogueOf.get(target) ?? '',
    }
    this.nodeCache.set(raw, n)
    return n
  }

  /** Hijos directos (entradas y grupos) de una entrada o grupo */
  children(n: EntryNode): EntryNode[] {
    const key = n.link ?? n.target
    const cached = this.childCache.get(key)
    if (cached) return cached
    const raws: Raw[] = []
    for (const src of [n.target, n.link]) {
      if (!src) continue
      raws.push(...(src.selectionEntries ?? []), ...(src.selectionEntryGroups ?? []), ...(src.entryLinks ?? []))
    }
    const out: EntryNode[] = []
    for (const r of raws) {
      const node = this.node(r)
      if (node) out.push(node)
    }
    out.sort((a, b) => a.sortIndex - b.sortIndex || a.name.localeCompare(b.name))
    this.childCache.set(key, out)
    return out
  }

  /** Entradas raíz disponibles para una fuerza de un catálogo */
  rootEntries(catalogueId: string): EntryNode[] {
    const out: EntryNode[] = []
    const seen = new Set<string>()
    const sources: Raw[] = [this.gameSystem]
    for (const id of this.linkedCatalogueIds(catalogueId, true)) {
      const c = this.catalogues.get(id)
      if (c) sources.push(c)
    }
    for (const src of sources) {
      for (const r of [...(src.selectionEntries ?? []), ...(src.entryLinks ?? [])]) {
        const n = this.node(r)
        if (!n || seen.has(n.key)) continue
        seen.add(n.key)
        out.push(n)
      }
    }
    return out
  }

  forceEntry(id: string): Raw | undefined {
    const find = (list: Raw[] = []): Raw | undefined => {
      for (const f of list) {
        if (f.id === id) return f
        const sub = find(f.forceEntries)
        if (sub) return sub
      }
    }
    return find(this.gameSystem.forceEntries)
  }

  costTypeName(id: string): string {
    return this.costTypes.find((c) => c.id === id)?.name ?? id
  }
}

function mergeCosts(a: Raw[], b: Raw[]): Raw[] {
  if (!b.length) return a
  const m = new Map<string, Raw>()
  for (const c of a) m.set(c.typeId, c)
  for (const c of b) m.set(c.typeId, c)
  return [...m.values()]
}
