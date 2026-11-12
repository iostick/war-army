// Reglas de construcción de ejércitos de la 11ª edición (Muster Armies) que los datos de BSData no cubren
// o no cubren del todo. Se suman a las restricciones propias de los datos.
import type { Evaluator, Issue, SelInst } from './evaluate'

/** Disposiciones de fuerza: cada destacamento tiene una o varias; la lista elige una */
export const DISPOSITIONS = ['Take and Hold', 'Priority Assets', 'Purge the Foe', 'Reconnaissance', 'Disruption']

export type BattleSize = 'incursion' | 'strike' | 'onslaught'

export interface CoreLimits {
  size: BattleSize
  unitLimit: number
  detachmentPoints: number
  enhancements: number
}

export function battleSize(ev: Evaluator): BattleSize {
  const f = ev.root.forces[0]
  const bs = f?.selections.find((s) => s.node.name === 'Battle Size')
  const name = bs?.children.map((c) => c.node.name).join(' ') ?? ''
  if (/Incursion/i.test(name)) return 'incursion'
  if (/Onslaught/i.test(name)) return 'onslaught'
  return 'strike'
}

export function coreLimits(ev: Evaluator): CoreLimits {
  const size = battleSize(ev)
  return {
    size,
    unitLimit: size === 'incursion' ? 2 : 3,
    detachmentPoints: size === 'incursion' ? 2 : 3,
    enhancements: size === 'incursion' ? 2 : 4,
  }
}

function categoryNames(ev: Evaluator, s: SelInst): string[] {
  const st = ev.stateOf(s)
  return [...s.node.categoryIds, ...st.categoriesAdded].map((id) => ev.index.categories.get(id)?.name ?? '').filter(Boolean)
}

/** Destacamentos elegidos (con su coste en DP, etiquetas y disposiciones) */
export function detachments(ev: Evaluator) {
  const out: { inst: SelInst; name: string; dp: number; tags: string[]; dispositions: string[] }[] = []
  const DP = ev.index.costTypes.find((c) => c.name === 'Detachment Points')?.id
  for (const f of ev.allForces()) {
    for (const d of f.selections.filter((s) => s.node.name === 'Detachment')) {
      for (const c of d.children) {
        const cats = c.node.categoryIds.map((id) => ev.index.categories.get(id)?.name ?? '')
        out.push({
          inst: c,
          name: ev.stateOf(c).name,
          dp: DP ? (ev.ownCost(c)[DP] ?? 0) : 0,
          dispositions: cats.filter((n) => DISPOSITIONS.includes(n)),
          tags: cats.filter((n) => n && !DISPOSITIONS.includes(n) && !/DP Detachment$/i.test(n)),
        })
      }
    }
  }
  return out
}

export function validateCore(ev: Evaluator): Issue[] {
  const issues: Issue[] = []
  const limits = coreLimits(ev)

  for (const f of ev.allForces()) {
    // Límite de unidades repetidas: 2 (Incursion) o 3; Battleline y Dedicated Transport el doble; Epic Hero 1
    const byDatasheet = new Map<string, SelInst[]>()
    for (const s of f.selections) {
      if (s.node.type !== 'unit' && s.node.type !== 'model') continue
      const list = byDatasheet.get(s.node.id) ?? []
      list.push(s)
      byDatasheet.set(s.node.id, list)
    }
    for (const list of byDatasheet.values()) {
      const cats = categoryNames(ev, list[0])
      let limit = limits.unitLimit
      let why = ''
      if (cats.includes('Epic Hero')) {
        limit = 1
        why = ' (Epic Hero)'
      } else if (cats.includes('Battleline') || cats.includes('Dedicated Transport')) {
        limit = limits.unitLimit * 2
        why = cats.includes('Battleline') ? ' (Battleline)' : ' (Dedicated Transport)'
      }
      if (list.length > limit) {
        issues.push({
          severity: 'error',
          message: `${ev.stateOf(list[0]).name}: máximo ${limit} por ejército${why} (tienes ${list.length})`,
          targetUid: list[limit].sel.uid,
        })
      }
    }

    // Señor de la guerra: exactamente uno
    let warlords = 0
    const stack = [...f.selections]
    while (stack.length) {
      const s = stack.pop()!
      if (s.node.name === 'Warlord') warlords += s.sel.number
      stack.push(...s.children)
    }
    const hasCharacter = f.selections.some((s) => categoryNames(ev, s).includes('Character'))
    if (hasCharacter && warlords === 0) issues.push({ severity: 'error', message: 'Elige un Warlord: entra en un personaje y marca «Warlord»', targetUid: f.force.uid })
    if (warlords > 1) issues.push({ severity: 'error', message: `Solo puede haber un Warlord (tienes ${warlords})`, targetUid: f.force.uid })
  }

  // Destacamentos: no se repiten etiquetas
  const dets = detachments(ev)
  const tagOwners = new Map<string, string[]>()
  for (const d of dets) for (const t of d.tags) tagOwners.set(t, [...(tagOwners.get(t) ?? []), d.name])
  for (const [tag, names] of tagOwners) {
    if (names.length > 1)
      issues.push({ severity: 'error', message: `Destacamentos con la misma etiqueta «${tag}»: ${names.join(' y ')}. Solo puede haber uno.`, targetUid: dets[0].inst.parent.kind === 'sel' ? dets[0].inst.parent.sel.uid : undefined })
  }

  // Disposición de fuerza: debe ser una de las de tus destacamentos
  const fd = ev.root.forces[0]?.selections.find((s) => s.node.name === 'Force Disposition')
  const chosen = fd?.children.map((c) => ev.stateOf(c).name) ?? []
  const allowed = new Set(dets.flatMap((d) => d.dispositions))
  for (const c of chosen) {
    if (dets.length && !allowed.has(c))
      issues.push({ severity: 'error', message: `La disposición «${c}» no la ofrece ninguno de tus destacamentos (${[...allowed].join(', ') || 'ninguna'})`, targetUid: fd?.sel.uid })
  }
  return issues
}
