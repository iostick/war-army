import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { DataIndex } from './catalog'
import { Evaluator, flattenOptions } from './evaluate'
import { addSelection, createRoster, PTS, setNumber } from './ops'
import type { Roster } from './roster'

const DATA = process.env.BSDATA_DIR ?? ''
const load = (f: string) => JSON.parse(readFileSync(join(DATA, f), 'utf8'))

let index: DataIndex
let necrons: string

function addByName(roster: Roster, parentUid: string, name: string, n = 1) {
  const ev = new Evaluator(index, roster)
  const parent = ev.findInst(parentUid)!
  const raw = parent.kind === 'force' ? index.rootEntries(parent.force.catalogueId) : index.children(parent.node)
  const opt = flattenOptions(index, raw).find((o) => o.node.name === name)
  if (!opt) throw new Error('No encontrado: ' + name)
  return addSelection(index, roster, parentUid, opt.node, opt.groups, n)
}

function findSel(roster: Roster, name: string) {
  const ev = new Evaluator(index, roster)
  for (const f of ev.allForces()) {
    const stack = [...f.selections]
    while (stack.length) {
      const s = stack.shift()!
      if (s.node.name === name) return s
      stack.push(...s.children)
    }
  }
  throw new Error('Sin selección: ' + name)
}

describe.skipIf(!DATA)('motor BSData (11ª edición)', () => {
  beforeAll(() => {
    const files = readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'Warhammer 40,000.json')
    index = new DataIndex(load('Warhammer 40,000.json'), files.map(load))
    necrons = [...index.catalogues.values()].find((c) => c.name === 'Xenos - Necrons')!.id
  })

  it('crea una lista con las opciones de configuración obligatorias', () => {
    const r = createRoster(index, 'Prueba', necrons, 2000)
    const names = r.forces[0].selections.map((s) => s.name)
    expect(names).toContain('Battle Size')
    expect(names).toContain('Detachment')
  })

  it('calcula los puntos de Necron Warriors (10 = 85, 20 = 190)', () => {
    let r = createRoster(index, 'Prueba', necrons, 2000)
    const added = addByName(r, r.forces[0].uid, 'Necron Warriors')
    r = added.roster
    const unit = findSel(r, 'Necron Warriors')
    const models = unit.children.filter((c) => c.node.type === 'model')
    expect(models.reduce((a, m) => a + m.sel.number, 0)).toBe(10)
    let ev = new Evaluator(index, r)
    expect(ev.selectionTotal(ev.findInst(unit.sel.uid) as any, PTS)).toBe(85)

    r = setNumber(r, models[0].sel.uid, 20)
    ev = new Evaluator(index, r)
    expect(ev.rosterTotal(PTS)).toBe(190)
  })

  it('encarece las unidades repetidas (11ª: +10 pts a partir de la 3ª copia)', () => {
    let r = createRoster(index, 'Prueba', necrons, 2000)
    for (let i = 0; i < 4; i++) r = addByName(r, r.forces[0].uid, 'Lokhust Heavy Destroyers').roster
    const ev = new Evaluator(index, r)
    const costs = ev.root.forces[0].selections.filter((s) => s.node.name === 'Lokhust Heavy Destroyers').map((s) => ev.selectionTotal(s, PTS))
    expect(costs).toEqual([50, 50, 60, 60])
  })

  it('avisa al pasarse del límite de puntos y al faltar opciones obligatorias', () => {
    let r = createRoster(index, 'Prueba', necrons, 1000)
    for (let i = 0; i < 3; i++) r = addByName(r, r.forces[0].uid, 'Monolith').roster
    const issues = new Evaluator(index, r).validate()
    console.log(issues.map((i) => i.message))
    expect(issues.some((i) => /máximo 1000 pts/.test(i.message))).toBe(true)
    expect(issues.some((i) => /Detachment/.test(i.message))).toBe(true)
    expect(issues.some((i) => /Character/.test(i.message))).toBe(true)
  })
  it('lista completa: destacamento, personaje con mejora y unidades', () => {
    let r = createRoster(index, 'Prueba', necrons, 2000)
    const det = findSel(r, 'Detachment')
    r = addByName(r, det.sel.uid, 'Awakened Dynasty').roster
    r = addByName(r, r.forces[0].uid, 'Overlord').roster
    const overlord = findSel(r, 'Overlord')
    const ev0 = new Evaluator(index, r)
    const enh = ev0.options(overlord).filter((o) => o.groups.some((g) => g.name === 'Enhancements'))
    const visible = enh.filter((o) => !o.state.hidden)
    expect(visible.length).toBeGreaterThan(0)
    r = addSelection(index, r, overlord.sel.uid, visible[0].node, visible[0].groups).roster
    r = addByName(r, r.forces[0].uid, 'Necron Warriors').roster
    r = addByName(r, r.forces[0].uid, 'Immortals').roster
    const ev = new Evaluator(index, r)
    const issues = ev.validate()
    console.log('mejora', visible[0].node.name, visible[0].state.costs[PTS], 'total', ev.rosterTotal(PTS), issues.map((i) => i.message))
    expect(ev.rosterTotal(PTS)).toBe(90 + (visible[0].state.costs[PTS] ?? 0) + 85 + 65)
  })

  it('todas las facciones: añadir cada unidad no rompe el motor y da puntos válidos', () => {
    const problems: string[] = []
    for (const cat of index.playableCatalogues()) {
      let r = createRoster(index, 'Barrido', cat.id, 2000)
      const ev0 = new Evaluator(index, r)
      const opts = ev0.options(ev0.root.forces[0]).filter((o) => !o.state.hidden && (o.node.type === 'unit' || o.node.type === 'model'))
      for (const o of opts) {
        try {
          r = addSelection(index, r, r.forces[0].uid, o.node, o.groups).roster
          if (r.forces[0].selections.length > 25) break
        } catch (e) {
          problems.push(`${cat.name} / ${o.node.name}: ${(e as Error).message}`)
        }
      }
      const ev = new Evaluator(index, r)
      const total = ev.rosterTotal(PTS)
      if (!Number.isFinite(total)) problems.push(`${cat.name}: total no numérico`)
      ev.validate()
      console.log(cat.name, opts.length, 'unidades', total, 'pts')
    }
    expect(problems).toEqual([])
  }, 300_000)
})
