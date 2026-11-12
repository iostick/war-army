// Datos de la ficha (datasheet): perfiles, armas, habilidades y palabras clave de una selección.
import type { DataIndex, Raw } from './catalog'
import type { Evaluator, SelInst } from './evaluate'

export interface Profile {
  name: string
  typeName: string
  characteristics: { name: string; value: string }[]
  /** Cantidad de modelos/armas con este perfil dentro de la unidad */
  count: number
}

export interface Datasheet {
  profiles: Record<string, Profile[]>
  rules: { name: string; description: string }[]
  keywords: string[]
}

function profilesOf(index: DataIndex, src: Raw | undefined): Raw[] {
  if (!src) return []
  const out: Raw[] = [...(src.profiles ?? [])]
  for (const l of src.infoLinks ?? []) {
    if (l.type !== 'profile' && l.type !== 'infoGroup') continue
    const t = index.byId.get(l.targetId)
    if (!t) continue
    if (l.type === 'profile') out.push(t)
    else out.push(...profilesOf(index, t))
  }
  for (const g of src.infoGroups ?? []) out.push(...profilesOf(index, g))
  return out
}

function rulesOf(index: DataIndex, src: Raw | undefined): Raw[] {
  if (!src) return []
  const out: Raw[] = [...(src.rules ?? [])]
  for (const l of src.infoLinks ?? []) {
    if (l.type === 'rule') {
      const t = index.byId.get(l.targetId)
      if (t && !l.hidden) out.push({ ...t, name: l.name ?? t.name })
    } else if (l.type === 'infoGroup') {
      const t = index.byId.get(l.targetId)
      if (t) out.push(...rulesOf(index, t))
    }
  }
  return out
}

export function datasheet(index: DataIndex, ev: Evaluator, unit: SelInst): Datasheet {
  const profiles: Record<string, Profile[]> = {}
  const rules = new Map<string, string>()
  const add = (p: Raw, count: number) => {
    if (p.hidden) return
    const typeName: string = p.typeName ?? index.byId.get(p.typeId)?.name ?? 'Perfil'
    const list = (profiles[typeName] ??= [])
    const chars = (p.characteristics ?? []).map((c: Raw) => ({ name: c.name, value: String(c.$text ?? c.value ?? '') }))
    const existing = list.find((x) => x.name === p.name && JSON.stringify(x.characteristics) === JSON.stringify(chars))
    if (existing) existing.count = Math.max(existing.count, count)
    else list.push({ name: p.name, typeName, characteristics: chars, count })
  }
  const visit = (s: SelInst, mult: number) => {
    if (ev.stateOf(s).hidden) return
    for (const p of [...profilesOf(index, s.node.target), ...profilesOf(index, s.node.link)]) add(p, mult)
    for (const r of [...rulesOf(index, s.node.target), ...rulesOf(index, s.node.link)]) {
      if (!rules.has(r.name)) rules.set(r.name, r.description ?? '')
    }
    for (const c of s.children) visit(c, mult * c.sel.number)
  }
  visit(unit, 1)
  const keywords = unit.node.categoryIds
    .map((id) => index.categories.get(id)?.name)
    .filter((n): n is string => Boolean(n) && !/^(Configuration|Unit)$/.test(n!))
  return { profiles, rules: [...rules].map(([name, description]) => ({ name, description })), keywords }
}
