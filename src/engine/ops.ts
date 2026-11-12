// Operaciones sobre la lista: crear, añadir y quitar selecciones (rellenando las opciones obligatorias).
import type { DataIndex, EntryNode, Raw } from './catalog'
import { Evaluator, type ForceInst, type SelInst } from './evaluate'
import { findContainer, findParent, isForce, uid, type Force, type Roster, type Selection } from './roster'

export const ARMY_ROSTER_FORCE = 'bb9d-299a-ed60-2d8a'
export const PTS = '51b2-306e-1021-d207'

export function createRoster(index: DataIndex, name: string, catalogueId: string, pointsLimit = 2000, forceEntryId = ARMY_ROSTER_FORCE): Roster {
  const now = new Date().toISOString()
  const cat = index.catalogues.get(catalogueId)
  const fe = index.forceEntry(forceEntryId)
  const force: Force = {
    uid: uid(),
    forceEntryId,
    catalogueId,
    name: `${fe?.name ?? 'Force'} · ${cat?.name ?? ''}`,
    selections: [],
    forces: [],
  }
  let roster: Roster = {
    uid: uid(),
    name,
    gameSystemId: index.gameSystem.id,
    costLimits: { [PTS]: pointsLimit },
    forces: [force],
    createdAt: now,
    updatedAt: now,
  }
  roster = fillDefaults(index, roster, force.uid)
  roster = chooseBattleSize(index, roster, pointsLimit)
  return roster
}

/** Elige el tamaño de batalla según el límite de puntos (Incursion 1000, Strike Force 2000, Onslaught 3000) */
export function chooseBattleSize(index: DataIndex, roster: Roster, pointsLimit: number): Roster {
  const ev = new Evaluator(index, roster)
  const force = ev.root.forces[0]
  const bs = force?.selections.find((s) => s.node.name === 'Battle Size')
  if (!bs) return roster
  const wanted = pointsLimit <= 1000 ? '1. Incursion' : pointsLimit <= 2000 ? '2. Strike Force' : '3. Onslaught'
  let next = roster
  for (const c of bs.children) if (c.groups.length) next = removeSelection(next, c.sel.uid)
  const opt = ev.options(bs).find((o) => o.node.name.startsWith(wanted))
  if (!opt) return next
  next = addSelection(index, next, bs.sel.uid, opt.node, opt.groups).roster
  next.costLimits[PTS] = pointsLimit
  return next
}

function newSelection(node: EntryNode, groups: EntryNode[], number: number): Selection {
  return {
    uid: uid(),
    entryKey: node.key,
    entryId: node.id,
    groupKeys: groups.map((g) => g.key),
    name: node.name,
    type: node.type,
    number,
    children: [],
  }
}

/** Añade una entrada bajo un contenedor (fuerza o selección) y rellena sus opciones obligatorias */
export function addSelection(index: DataIndex, roster: Roster, parentUid: string, node: EntryNode, groups: EntryNode[] = [], number = 1): { roster: Roster; uid?: string } {
  const next = structuredClone(roster)
  const parent = findContainer(next, parentUid)
  if (!parent) return { roster }
  const sel = newSelection(node, groups, number)
  if (isForce(parent)) parent.selections.push(sel)
  else parent.children.push(sel)
  return { roster: touch(fillDefaults(index, next, sel.uid)), uid: sel.uid }
}

/** Adjunta un líder/apoyo a una unidad (o lo separa si target es undefined) */
export function attach(roster: Roster, leaderUid: string, assocId: string, target: string | undefined): Roster {
  const next = structuredClone(roster)
  const sel = findContainer(next, leaderUid)
  if (!sel || isForce(sel)) return roster
  const others = (sel.associations ?? []).filter((a) => a.id !== assocId)
  sel.associations = target ? [...others, { id: assocId, target }] : others
  return touch(next)
}

export function removeSelection(roster: Roster, selUid: string): Roster {
  const next = structuredClone(roster)
  // Quitar adjuntos que apuntaban a la unidad eliminada
  for (const f of next.forces) for (const s of f.selections) if (s.associations) s.associations = s.associations.filter((a) => a.target !== selUid)
  const parent = findParent(next, selUid)
  if (!parent) return roster
  if (isForce(parent)) parent.selections = parent.selections.filter((s) => s.uid !== selUid)
  else parent.children = parent.children.filter((s) => s.uid !== selUid)
  return touch(next)
}

export function setNumber(roster: Roster, selUid: string, number: number): Roster {
  const next = structuredClone(roster)
  const sel = findContainer(next, selUid)
  if (!sel || isForce(sel)) return roster
  if (number <= 0) return removeSelection(roster, selUid)
  sel.number = number
  return touch(next)
}

/** Duplica una unidad completa con sus opciones */
export function duplicateSelection(roster: Roster, selUid: string): Roster {
  const next = structuredClone(roster)
  const parent = findParent(next, selUid)
  const sel = findContainer(next, selUid)
  if (!parent || !sel || isForce(sel)) return roster
  const copy = structuredClone(sel)
  const reuid = (s: Selection) => {
    s.uid = uid()
    s.children.forEach(reuid)
  }
  reuid(copy)
  delete copy.associations
  const list = isForce(parent) ? parent.selections : parent.children
  list.splice(list.indexOf(sel) + 1, 0, copy)
  return touch(next)
}

/**
 * Añade las selecciones obligatorias (mínimos de entradas y de grupos) bajo un contenedor,
 * nivel a nivel, reevaluando las reglas tras cada nivel.
 */
export function fillDefaults(index: DataIndex, roster: Roster, startUid: string): Roster {
  let queue = [startUid]
  let guard = 0
  while (queue.length && guard++ < 50) {
    const ev = new Evaluator(index, roster)
    const additions: { parentUid: string; sel: Selection }[] = []
    for (const u of queue) {
      const inst = ev.findInst(u)
      if (!inst) continue
      additions.push(...defaultsFor(index, ev, inst))
    }
    if (!additions.length) break
    for (const a of additions) {
      const parent = findContainer(roster, a.parentUid)
      if (!parent) continue
      if (isForce(parent)) parent.selections.push(a.sel)
      else parent.children.push(a.sel)
    }
    queue = additions.map((a) => a.sel.uid)
  }
  return roster
}

function defaultsFor(index: DataIndex, ev: Evaluator, inst: SelInst | ForceInst): { parentUid: string; sel: Selection }[] {
  const parentUid = inst.kind === 'force' ? inst.force.uid : inst.sel.uid
  const out: { parentUid: string; sel: Selection }[] = []
  const opts = ev.options(inst)
  const groupFilled = new Map<string, number>()

  for (const o of opts) {
    // En la raíz de una fuerza también cuentan los mínimos de fuerza y de lista (p. ej. "Battle Size")
    const min = inst.kind === 'force' ? Math.max(o.min, rootMin(o.node.constraints, o.state.constraintValues)) : o.min
    if (o.state.hidden || min <= o.count) continue
    out.push({ parentUid, sel: newSelection(o.node, o.groups, min - o.count) })
    for (const g of o.groups) groupFilled.set(g.key, (groupFilled.get(g.key) ?? 0) + (min - o.count))
  }

  // Grupos con mínimo: se usa la entrada por defecto (o la primera visible)
  const raw = inst.kind === 'force' ? index.rootEntries(inst.force.catalogueId) : index.children(inst.node)
  const visit = (nodes: EntryNode[], outer: EntryNode[]) => {
    for (const g of nodes) {
      if (g.kind !== 'group') continue
      const info = ev.groupInfo(g, inst, outer)
      if (info.state.hidden) continue
      const have = info.count + (groupFilled.get(g.key) ?? 0)
      if (!info.state.hidden && info.min > have) {
        const candidates = opts.filter((o) => o.groups.length > outer.length && o.groups[outer.length].key === g.key && !o.state.hidden)
        // Solo se elige sola si hay entrada por defecto o una única opción; si no, decide el usuario
        const pick =
          candidates.find((o) => o.node.id === g.defaultSelectionEntryId || o.node.key === g.defaultSelectionEntryId) ??
          (candidates.length === 1 ? candidates[0] : undefined)
        if (pick) {
          const need = info.min - have
          const existing = out.find((a) => a.sel.entryKey === pick.node.key && a.parentUid === parentUid)
          if (existing) existing.sel.number += need
          else out.push({ parentUid, sel: newSelection(pick.node, pick.groups, need) })
          for (const og of pick.groups) groupFilled.set(og.key, (groupFilled.get(og.key) ?? 0) + need)
        }
      }
      visit(index.children(g), [...outer, g])
    }
  }
  visit(raw, [])
  return out
}

function rootMin(constraints: Raw[], values: Record<string, number>): number {
  let min = 0
  for (const c of constraints) {
    if (c.type !== 'min' || (c.field ?? 'selections') !== 'selections') continue
    if (c.scope !== 'force' && c.scope !== 'roster') continue
    min = Math.max(min, values[c.id] ?? Number(c.value))
  }
  return min
}

function touch(r: Roster): Roster {
  r.updatedAt = new Date().toISOString()
  return r
}
