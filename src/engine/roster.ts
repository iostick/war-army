// Modelo de una lista de ejército (roster). Es JSON plano para poder guardarlo y sincronizarlo.

export interface Selection {
  uid: string
  /** Clave del EntryNode (id del enlace o de la entrada) dentro de su padre */
  entryKey: string
  /** id de la entrada destino */
  entryId: string
  /** Claves de los grupos por los que se llega a esta entrada (del más externo al más interno) */
  groupKeys: string[]
  name: string
  type?: string
  /** Cantidad por cada instancia del padre */
  number: number
  children: Selection[]
  /** Unidades a las que se adjunta (líder o apoyo): id de la definición de asociación y uid de la unidad */
  associations?: { id: string; target: string }[]
}

export interface Force {
  uid: string
  forceEntryId: string
  catalogueId: string
  name: string
  selections: Selection[]
  forces: Force[]
}

export interface Roster {
  uid: string
  name: string
  gameSystemId: string
  /** Revisión de los datos de BSData con la que se creó (sha del commit) */
  dataRevision?: string
  costLimits: Record<string, number>
  forces: Force[]
  /** Resumen guardado para mostrar la lista sin recalcular (puntos y nº de errores) */
  summary?: { points: number; limit: number; errors: number; faction: string }
  createdAt: string
  updatedAt: string
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export type Container = Selection | Force

export function isForce(c: Container | Roster): c is Force {
  return (c as Force).forceEntryId !== undefined
}

export function childSelections(c: Container): Selection[] {
  return isForce(c) ? c.selections : c.children
}

/** Recorre todas las selecciones de la lista */
export function* walkSelections(list: Selection[]): Generator<Selection> {
  for (const s of list) {
    yield s
    yield* walkSelections(s.children)
  }
}

export function* walkForces(forces: Force[]): Generator<Force> {
  for (const f of forces) {
    yield f
    yield* walkForces(f.forces)
  }
}

export function findContainer(roster: Roster, uidToFind: string): Container | undefined {
  for (const f of walkForces(roster.forces)) {
    if (f.uid === uidToFind) return f
    for (const s of walkSelections(f.selections)) if (s.uid === uidToFind) return s
  }
}

export function findParent(roster: Roster, childUid: string): Container | undefined {
  for (const f of walkForces(roster.forces)) {
    if (f.selections.some((s) => s.uid === childUid)) return f
    for (const s of walkSelections(f.selections)) if (s.children.some((c) => c.uid === childUid)) return s
  }
}
