// Evaluador de reglas: aplica modificadores y condiciones de BSData, calcula costes y valida límites.
import type { DataIndex, EntryNode, Raw } from './catalog'
import type { Force, Roster, Selection } from './roster'
import { validateCore } from './rules11'

export interface RosterInst {
  kind: 'roster'
  roster: Roster
  forces: ForceInst[]
  mult: 1
}

export interface ForceInst {
  kind: 'force'
  force: Force
  forceEntry: Raw
  catalogueIds: string[]
  parent: ForceInst | RosterInst
  selections: SelInst[]
  forces: ForceInst[]
  mult: 1
}

export interface SelInst {
  kind: 'sel'
  sel: Selection
  node: EntryNode
  groups: EntryNode[]
  parent: SelInst | ForceInst
  force: ForceInst
  children: SelInst[]
  /** Multiplicador absoluto: producto de las cantidades desde la fuerza hasta esta selección (incluida) */
  mult: number
}

/** Selección hipotética (entrada aún no elegida) para evaluar opciones disponibles */
interface VirtualInst {
  kind: 'virtual'
  node: EntryNode
  groups: EntryNode[]
  parent: SelInst | ForceInst
  mult: 0
}

type Inst = RosterInst | ForceInst | SelInst | VirtualInst

interface Ctx {
  self: Inst
  parent?: Inst
  /** En condiciones locales (New Recruit): la selección original desde la que se evalúa */
  outer?: Inst
}

export interface EffectiveState {
  hidden: boolean
  name: string
  /** Coste unitario por tipo de coste */
  costs: Record<string, number>
  /** Valor efectivo de cada restricción por id */
  constraintValues: Record<string, number>
  categoriesAdded: string[]
  errors: string[]
  warnings: string[]
  infos: string[]
}

export interface Issue {
  severity: 'error' | 'warning'
  message: string
  /** uid de la selección o fuerza afectada */
  targetUid?: string
}

export interface OptionInfo {
  node: EntryNode
  groups: EntryNode[]
  state: EffectiveState
  /** Cantidad actual seleccionada dentro del contenedor */
  count: number
  min: number
  /** -1 = sin límite */
  max: number
  /** Selecciones actuales de esta entrada en el contenedor */
  selections: SelInst[]
}

export interface GroupInfo {
  node: EntryNode
  state: EffectiveState
  min: number
  max: number
  count: number
}

const TYPE_IDS = new Set(['model', 'unit', 'upgrade', 'mount', 'crew'])

export class Evaluator {
  readonly root: RosterInst
  private stateMemo = new Map<string, EffectiveState>()
  private computing = new Set<string>()
  private costMemo = new Map<SelInst, Record<string, number>>()
  readonly unresolved: Selection[] = []
  /** Orden de aparición de cada selección (para la condición "before") */
  private order = new Map<SelInst, number>()

  readonly index: DataIndex
  readonly roster: Roster

  constructor(index: DataIndex, roster: Roster) {
    this.index = index
    this.roster = roster
    this.root = { kind: 'roster', roster, forces: [], mult: 1 }
    this.root.forces = roster.forces.map((f) => this.buildForce(f, this.root))
    let i = 0
    for (const f of this.allForces()) for (const s of descendants(f.selections)) this.order.set(s, i++)
  }

  // ---------- Construcción del árbol de instancias ----------

  private buildForce(f: Force, parent: ForceInst | RosterInst): ForceInst {
    const fi: ForceInst = {
      kind: 'force',
      force: f,
      forceEntry: this.index.forceEntry(f.forceEntryId) ?? {},
      catalogueIds: this.index.linkedCatalogueIds(f.catalogueId),
      parent,
      selections: [],
      forces: [],
      mult: 1,
    }
    const options = flattenOptions(this.index, this.index.rootEntries(f.catalogueId))
    fi.selections = this.buildSelections(f.selections, options, fi, fi)
    fi.forces = f.forces.map((sub) => this.buildForce(sub, fi))
    return fi
  }

  private buildSelections(list: Selection[], options: FlatOption[], parent: SelInst | ForceInst, force: ForceInst): SelInst[] {
    const out: SelInst[] = []
    for (const sel of list) {
      const opt =
        options.find((o) => o.node.key === sel.entryKey && sameKeys(o.groups, sel.groupKeys)) ??
        options.find((o) => o.node.key === sel.entryKey) ??
        options.find((o) => o.node.id === sel.entryId)
      if (!opt) {
        this.unresolved.push(sel)
        continue
      }
      const inst: SelInst = {
        kind: 'sel',
        sel,
        node: opt.node,
        groups: opt.groups,
        parent,
        force,
        children: [],
        mult: parent.mult * sel.number,
      }
      inst.children = this.buildSelections(sel.children, flattenOptions(this.index, this.index.children(opt.node)), inst, force)
      out.push(inst)
    }
    return out
  }

  // ---------- Unidades adjuntas (líderes y apoyos) ----------

  /** Unidad (selección raíz) a la que pertenece una selección */
  rootOf(inst: SelInst): SelInst {
    let cur = inst
    while (cur.parent.kind === 'sel') cur = cur.parent
    return cur
  }

  private attachIndex?: { bodyguardOf: Map<SelInst, SelInst>; leadersOf: Map<SelInst, SelInst[]> }

  private attachments() {
    if (this.attachIndex) return this.attachIndex
    const bodyguardOf = new Map<SelInst, SelInst>()
    const leadersOf = new Map<SelInst, SelInst[]>()
    for (const f of this.allForces()) {
      for (const s of f.selections) {
        for (const a of s.sel.associations ?? []) {
          const target = f.selections.find((t) => t.sel.uid === a.target)
          if (!target || target === s) continue
          bodyguardOf.set(s, target)
          if (!leadersOf.has(target)) leadersOf.set(target, [])
          leadersOf.get(target)!.push(s)
        }
      }
    }
    this.attachIndex = { bodyguardOf, leadersOf }
    return this.attachIndex
  }

  /** Unidad a la que está adjunto un líder */
  bodyguardOf(inst: SelInst): SelInst | undefined {
    return this.attachments().bodyguardOf.get(inst)
  }

  /** Líderes y apoyos adjuntos a una unidad */
  leadersOf(inst: SelInst): SelInst[] {
    return this.attachments().leadersOf.get(inst) ?? []
  }

  /** La unidad adjunta completa: guardaespaldas + todos sus líderes */
  attachedGroup(root: SelInst): SelInst[] {
    const bg = this.bodyguardOf(root) ?? root
    return [bg, ...this.leadersOf(bg)]
  }

  /** Definiciones de asociación de una entrada (p. ej. "Leader", "Supported by") */
  associationDefs(inst: SelInst): Raw[] {
    return [...(inst.node.target.associations ?? []), ...(inst.node.link?.associations ?? [])]
  }

  /** Unidades a las que se puede adjuntar un líder según una definición */
  associationCandidates(inst: SelInst, def: Raw): SelInst[] {
    return inst.force.selections.filter((cand) => {
      if (cand === inst || cand.node.type === 'upgrade') return false
      if (def.childId && def.childId !== 'unit' && !this.matches(cand, def.childId)) return false
      return this.conditionsPass(def, { self: cand })
    })
  }

  // ---------- Recorridos ----------

  findInst(uid: string): SelInst | ForceInst | undefined {
    for (const f of this.allForces()) {
      if (f.force.uid === uid) return f
      for (const s of descendants(f.selections)) if (s.sel.uid === uid) return s
    }
  }

  *allForces(list: ForceInst[] = this.root.forces): Generator<ForceInst> {
    for (const f of list) {
      yield f
      yield* this.allForces(f.forces)
    }
  }

  // ---------- Coincidencias y ámbitos ----------

  private categoriesOf(inst: SelInst | VirtualInst): string[] {
    const base = inst.node.categoryIds
    if (inst.kind !== 'sel') return base
    const st = this.stateOf(inst)
    return st.categoriesAdded.length ? [...base, ...st.categoriesAdded] : base
  }

  private matches(inst: SelInst | VirtualInst, childId: string | undefined): boolean {
    if (!childId || childId === 'any') return true
    const n = inst.node
    if (TYPE_IDS.has(childId)) return n.type === childId
    if (childId === 'model-or-unit') return n.type === 'model' || n.type === 'unit'
    if (n.id === childId || n.key === childId || n.linkId === childId) return true
    if (inst.groups.some((g) => g.id === childId || g.key === childId)) return true
    return this.categoriesOf(inst).includes(childId)
  }

  private instanceOf(inst: Inst | undefined, childId: string): boolean {
    if (!inst) return false
    switch (inst.kind) {
      case 'roster':
        return childId === 'roster'
      case 'force':
        return inst.force.forceEntryId === childId || inst.catalogueIds.includes(childId)
      default:
        return this.matches(inst, childId)
    }
  }

  private forceOf(inst: Inst | undefined): ForceInst | undefined {
    let cur: Inst | undefined = inst
    while (cur) {
      if (cur.kind === 'force') return cur
      if (cur.kind === 'roster') return undefined
      cur = cur.parent
    }
  }

  private parentOf(inst: Inst): Inst | undefined {
    return inst.kind === 'roster' ? undefined : inst.parent
  }

  private ancestors(inst: Inst): Inst[] {
    const out: Inst[] = []
    let cur = this.parentOf(inst)
    while (cur) {
      out.push(cur)
      cur = this.parentOf(cur)
    }
    return out
  }

  /** Resuelve un ámbito (scope) de condición o restricción a una instancia */
  private resolveScope(scope: string | undefined, ctx: Ctx): Inst | undefined {
    const self = ctx.self
    // Variantes "-self" de New Recruit: incluyen la propia selección (ya lo hacemos en los ámbitos por tipo)
    if (scope?.endsWith('-self')) scope = scope.slice(0, -5)
    switch (scope ?? 'parent') {
      case 'self':
        return self
      case 'parent':
        return ctx.parent ?? this.parentOf(self)
      case 'force':
        return this.forceOf(self)
      case 'roster':
        return this.root
      case 'primary-catalogue':
        return this.forceOf(self) ?? this.root.forces[0]
      case 'root-entry': {
        let cur: Inst = self
        while (cur.kind === 'sel' || cur.kind === 'virtual') {
          if (cur.parent.kind === 'force') return cur
          cur = cur.parent
        }
        return undefined
      }
      case 'model':
      case 'unit':
      case 'upgrade':
        return [self, ...this.ancestors(self)].find((i) => (i.kind === 'sel' || i.kind === 'virtual') && i.node.type === scope)
      case 'model-or-unit':
        return [self, ...this.ancestors(self)].find(
          (i) => (i.kind === 'sel' || i.kind === 'virtual') && (i.node.type === 'model' || i.node.type === 'unit'),
        )
      default:
        return [self, ...this.ancestors(self)].find((i) => this.instanceOf(i, scope!))
    }
  }

  /** Selecciones dentro de un ámbito, con su multiplicador relativo */
  private *selectionsIn(scope: Inst, deep: boolean, childForces: boolean): Generator<[SelInst, number]> {
    if (scope.kind === 'virtual') return
    if (scope.kind === 'sel') {
      const list = deep ? descendants(scope.children) : scope.children
      for (const s of list) yield [s, s.mult / scope.mult]
      return
    }
    const forces = scope.kind === 'roster' ? (childForces ? [...this.allForces()] : scope.forces) : [scope, ...(childForces ? [...this.allForces(scope.forces)] : [])]
    for (const f of forces) {
      const list = deep ? descendants(f.selections) : f.selections
      for (const s of list) yield [s, s.mult]
    }
  }

  /** Cuenta selecciones, fuerzas o costes dentro de un ámbito */
  private measure(scope: Inst | undefined, q: Raw): number {
    if (!scope) return 0
    const field: string = q.field ?? 'selections'
    const childId: string | undefined = q.childId
    const deep = Boolean(q.includeChildSelections)
    const childForces = Boolean(q.includeChildForces)
    if (field === 'associations') {
      // Unidades adjuntas (líderes y apoyos) a esta unidad, o la unidad a la que se adjunta
      if (scope.kind !== 'sel') return 0
      const root = this.rootOf(scope)
      return this.attachedGroup(root).filter((o) => o !== root && this.matches(o, childId)).length
    }
    if (field === 'forces') {
      const forces = scope.kind === 'roster' ? [...this.allForces()] : scope.kind === 'force' ? [...this.allForces(scope.forces)] : []
      return forces.filter((f) => this.instanceOf(f, childId ?? 'any') || childId === 'any' || !childId).length
    }
    if (field === 'selections') {
      let n = 0
      for (const [s, m] of this.selectionsIn(scope, deep, childForces)) if (this.matches(s, childId)) n += m
      return n
    }
    // Campo = tipo de coste
    let total = 0
    // traverseAssociationGroup: la unidad adjunta completa (guardaespaldas + líderes) cuenta como una
    const scopes: Inst[] = q.traverseAssociationGroup && scope.kind === 'sel' && scope.parent.kind === 'force' ? this.attachedGroup(scope) : [scope]
    for (const sc of scopes) {
      if (sc.kind === 'sel' && (!childId || childId === 'any')) total += this.ownCost(sc)[field] ?? 0
      for (const [s, m] of this.selectionsIn(sc, true, childForces)) {
        if (this.matches(s, childId)) total += (this.ownCost(s)[field] ?? 0) * m
      }
    }
    return total
  }

  // ---------- Condiciones ----------

  private checkCondition(c: Raw, ctx: Ctx): boolean {
    const type: string = c.type
    if (type === 'instanceOf' || type === 'notInstanceOf') {
      let result: boolean
      if (c.scope === 'ancestor') result = this.ancestors(ctx.self).some((a) => this.instanceOf(a, c.childId))
      else result = this.instanceOf(this.resolveScope(c.scope, ctx), c.childId)
      return type === 'instanceOf' ? result : !result
    }
    if (type === 'before') {
      // Extensión de New Recruit: la selección local aparece antes que la original
      if (!ctx.outer || ctx.self.kind !== 'sel') return false
      const a = this.order.get(ctx.self) ?? Infinity
      const b = ctx.outer.kind === 'sel' ? (this.order.get(ctx.outer) ?? Infinity) : Infinity
      return a < b
    }
    const n = this.measure(this.resolveScope(c.scope, ctx), c)
    const v = Number(c.value)
    switch (type) {
      case 'lessThan':
        return n < v
      case 'greaterThan':
        return n > v
      case 'equalTo':
        return n === v
      case 'notEqualTo':
        return n !== v
      case 'atLeast':
        return n >= v
      case 'atMost':
        return n <= v
      default:
        return false
    }
  }

  private checkGroup(g: Raw, ctx: Ctx): boolean {
    const results: boolean[] = []
    for (const c of g.conditions ?? []) results.push(this.checkCondition(c, ctx))
    for (const sub of g.conditionGroups ?? []) results.push(this.checkGroup(sub, ctx))
    for (const lg of g.localConditionGroups ?? []) results.push(this.checkLocalGroup(lg, ctx))
    if (!results.length) return true
    return g.type === 'or' ? results.some(Boolean) : results.every(Boolean)
  }

  /** Extensión de New Recruit: cuenta selecciones del ámbito que cumplen condiciones locales */
  private checkLocalGroup(g: Raw, ctx: Ctx): boolean {
    const scope = this.resolveScope(g.scope, ctx)
    if (!scope) return false
    let n = 0
    for (const [s, m] of this.selectionsIn(scope, Boolean(g.includeChildSelections), Boolean(g.includeChildForces))) {
      const local: Ctx = { self: s, outer: ctx.self }
      const ok = (g.conditions ?? []).every((c: Raw) => this.checkCondition(c, local))
      if (ok) n += m
    }
    const v = Number(g.value)
    switch (g.type) {
      case 'atLeast':
        return n >= v
      case 'atMost':
        return n <= v
      case 'greaterThan':
        return n > v
      case 'lessThan':
        return n < v
      case 'equalTo':
        return n === v
      default:
        return n >= v
    }
  }

  private conditionsPass(m: Raw, ctx: Ctx): boolean {
    for (const c of m.conditions ?? []) if (!this.checkCondition(c, ctx)) return false
    for (const g of m.conditionGroups ?? []) if (!this.checkGroup(g, ctx)) return false
    for (const g of m.localConditionGroups ?? []) if (!this.checkLocalGroup(g, ctx)) return false
    return true
  }

  private repeatTimes(m: Raw, ctx: Ctx): number {
    if (!m.repeats?.length) return 1
    let times = 0
    for (const r of m.repeats) {
      const n = this.measure(this.resolveScope(r.scope, ctx), r)
      const div = Number(r.value) || 1
      const q = r.roundUp ? Math.ceil(n / div) : Math.floor(n / div)
      times += Math.max(0, q) * (Number(r.repeats) || 1)
    }
    return times
  }

  // ---------- Modificadores ----------

  private applyModifiers(state: EffectiveState, mods: Raw[], groups: Raw[], ctx: Ctx, constraints: Raw[]) {
    for (const m of mods) {
      // Modificadores que afectan a otras entradas o a perfiles (extensión de New Recruit): solo visual, se omiten aquí
      if (m.affects || m.scope) continue
      if (!this.conditionsPass(m, ctx)) continue
      const times = this.repeatTimes(m, ctx)
      if (times === 0) continue
      this.applyOne(state, m, times, constraints)
    }
    for (const g of groups) {
      if (g.affects || g.scope) continue
      if (!this.conditionsPass(g, ctx)) continue
      const times = this.repeatTimes(g, ctx)
      if (times === 0) continue
      this.applyModifiers(state, g.modifiers ?? [], g.modifierGroups ?? [], ctx, constraints)
    }
  }

  private applyOne(state: EffectiveState, m: Raw, times: number, constraints: Raw[]) {
    const field: string = m.field
    const type: string = m.type
    const value = m.value
    if (field === 'hidden') {
      if (type === 'set') state.hidden = value === true || value === 'true'
      return
    }
    if (field === 'name') {
      if (type === 'set') state.name = String(value)
      else if (type === 'append') state.name = `${state.name} ${value}`
      return
    }
    if (field === 'category') {
      if (type === 'add' || type === 'set-primary') state.categoriesAdded.push(String(value))
      else if (type === 'remove' || type === 'unset-primary') state.categoriesAdded = state.categoriesAdded.filter((c) => c !== value)
      return
    }
    if (field === 'error' || field === 'warning' || field === 'info') {
      if (type === 'add') (field === 'error' ? state.errors : field === 'warning' ? state.warnings : state.infos).push(String(value))
      return
    }
    const isCost = field in state.costs || this.index.costTypes.some((c) => c.id === field)
    const isConstraint = !isCost && constraints.some((c) => c.id === field)
    if (!isCost && !isConstraint) return
    const bag = isCost ? state.costs : state.constraintValues
    const current = bag[field] ?? 0
    const num = Number(value)
    switch (type) {
      case 'set':
        bag[field] = num
        break
      case 'increment':
        bag[field] = current + num * times
        break
      case 'decrement':
        bag[field] = current - num * times
        break
      case 'multiply':
        bag[field] = current * Math.pow(num, times)
        break
      case 'divide':
        bag[field] = num ? current / Math.pow(num, times) : current
        break
    }
  }

  /** Estado efectivo de una entrada en un contexto (seleccionada o hipotética) */
  private computeState(node: EntryNode, ctx: Ctx, memoKey: string): EffectiveState {
    const cached = this.stateMemo.get(memoKey)
    if (cached) return cached
    const base: EffectiveState = {
      hidden: node.hidden,
      name: node.name,
      costs: Object.fromEntries(node.costs.map((c) => [c.typeId, Number(c.value)])),
      constraintValues: Object.fromEntries(node.constraints.map((c) => [c.id, Number(c.value)])),
      categoriesAdded: [],
      errors: [],
      warnings: [],
      infos: [],
    }
    if (this.computing.has(memoKey)) return base // ciclo: devolvemos el estado base
    this.computing.add(memoKey)
    try {
      this.applyModifiers(base, node.modifiers, node.modifierGroups, ctx, node.constraints)
    } finally {
      this.computing.delete(memoKey)
    }
    this.stateMemo.set(memoKey, base)
    return base
  }

  stateOf(inst: SelInst): EffectiveState {
    return this.computeState(inst.node, { self: inst }, 's:' + inst.sel.uid)
  }

  /** ¿Está oculto un enlace de información (regla/perfil) de una selección, según sus modificadores? */
  infoHidden(link: Raw, inst: SelInst): boolean {
    if (!link.modifiers?.length && !link.modifierGroups?.length) return Boolean(link.hidden)
    const node = { key: link.id, id: link.id, kind: 'entry', name: link.name ?? '', hidden: Boolean(link.hidden), collective: false, sortIndex: 0, constraints: [], modifiers: link.modifiers ?? [], modifierGroups: link.modifierGroups ?? [], costs: [], categoryIds: [], target: link, catalogueId: '' } as EntryNode
    return this.computeState(node, { self: inst }, `i:${inst.sel.uid}:${link.id}`).hidden
  }

  /** Estado de una entrada aún no seleccionada dentro de un contenedor */
  optionState(node: EntryNode, groups: EntryNode[], parent: SelInst | ForceInst): EffectiveState {
    const v: VirtualInst = { kind: 'virtual', node, groups, parent, mult: 0 }
    const pk = parent.kind === 'force' ? parent.force.uid : parent.sel.uid
    return this.computeState(node, { self: v }, `v:${pk}:${groups.map((g) => g.key).join('/')}:${node.key}`)
  }

  private groupState(group: EntryNode, parent: SelInst | ForceInst, outer: EntryNode[]): EffectiveState {
    const v: VirtualInst = { kind: 'virtual', node: group, groups: outer, parent, mult: 0 }
    const pk = parent.kind === 'force' ? parent.force.uid : parent.sel.uid
    return this.computeState(group, { self: v, parent }, `g:${pk}:${outer.map((g) => g.key).join('/')}:${group.key}`)
  }

  // ---------- Costes ----------

  /** Coste propio (unitario) de una selección, sin hijos */
  ownCost(inst: SelInst): Record<string, number> {
    const c = this.costMemo.get(inst)
    if (c) return c
    const st = this.stateOf(inst)
    this.costMemo.set(inst, st.costs)
    return st.costs
  }

  /** Coste total de una selección (cantidad × (propio + hijos)) */
  selectionTotal(inst: SelInst, typeId: string): number {
    const own = this.ownCost(inst)[typeId] ?? 0
    let sum = own
    for (const ch of inst.children) sum += this.selectionTotal(ch, typeId)
    return sum * inst.sel.number
  }

  forceTotal(f: ForceInst, typeId: string): number {
    let sum = 0
    for (const s of f.selections) sum += this.selectionTotal(s, typeId)
    for (const sub of f.forces) sum += this.forceTotal(sub, typeId)
    return sum
  }

  rosterTotal(typeId: string): number {
    return this.root.forces.reduce((a, f) => a + this.forceTotal(f, typeId), 0)
  }

  // ---------- Opciones disponibles ----------

  /**
   * Entradas hijas disponibles dentro de un contenedor, con mínimo, máximo y cantidad actual.
   * Si un grupo está oculto, sus entradas también (y no se evalúan, salvo que ya estén seleccionadas).
   */
  options(parent: SelInst | ForceInst, includeHidden = false): OptionInfo[] {
    const out: OptionInfo[] = []
    this.walkOptions(parent, includeHidden, (o) => out.push(o))
    return out
  }

  private walkOptions(parent: SelInst | ForceInst, includeHidden: boolean, onEntry: (o: OptionInfo) => void, onGroup?: (g: GroupInfo, outer: EntryNode[]) => void) {
    const raw = parent.kind === 'force' ? this.index.rootEntries(parent.force.catalogueId) : this.index.children(parent.node)
    const current = parent.kind === 'force' ? parent.selections : parent.children
    const visit = (nodes: EntryNode[], outer: EntryNode[], groupHidden: boolean) => {
      for (const n of nodes) {
        if (n.kind === 'group') {
          const used = current.some((s) => s.groups.some((g) => g.key === n.key))
          if (groupHidden && !used && !includeHidden) continue
          const gi = this.groupInfo(n, parent, outer)
          const hidden = groupHidden || gi.state.hidden
          if (hidden && !used && !includeHidden) continue
          onGroup?.(hidden !== gi.state.hidden ? { ...gi, state: { ...gi.state, hidden } } : gi, outer)
          visit(this.index.children(n), [...outer, n], hidden)
          continue
        }
        const mine = current.filter((s) => s.node.key === n.key && sameKeys(outer, s.groups.map((g) => g.key)))
        if (groupHidden && !mine.length && !includeHidden) continue
        const own = mine[0] ? this.stateOf(mine[0]) : this.optionState(n, outer, parent)
        const state = groupHidden && !own.hidden ? { ...own, hidden: true } : own
        const count = mine.reduce((a, s) => a + s.sel.number, 0)
        const { min, max } = parentLimits(n.constraints, state.constraintValues)
        onEntry({ node: n, groups: outer, state, count, min, max, selections: mine })
      }
    }
    visit(raw, [], false)
  }

  groupInfo(group: EntryNode, parent: SelInst | ForceInst, outer: EntryNode[] = []): GroupInfo {
    const state = this.groupState(group, parent, outer)
    const { min, max } = parentLimits(group.constraints, state.constraintValues)
    const current = parent.kind === 'force' ? parent.selections : parent.children
    const count = current.filter((s) => s.groups.some((g) => g.key === group.key)).reduce((a, s) => a + s.sel.number, 0)
    return { node: group, state, min, max, count }
  }

  // ---------- Validación ----------

  validate(): Issue[] {
    const issues: Issue[] = []
    const seen = new Set<string>()
    const push = (i: Issue, key: string) => {
      if (seen.has(key)) return
      seen.add(key)
      issues.push(i)
    }

    for (const u of this.unresolved) {
      push({ severity: 'error', message: `"${u.name}" no longer exists in the current BSData data`, targetUid: u.uid }, 'unres:' + u.uid)
    }

    for (const f of this.allForces()) {
      // Restricciones de la propia fuerza (p. ej. límite de puntos, puntos de destacamento, mejoras)
      const fState = this.computeState(forceAsNode(f), { self: f, parent: f.parent }, 'f:' + f.force.uid)
      for (const c of f.forceEntry.constraints ?? []) {
        this.checkConstraint(c, fState.constraintValues[c.id] ?? Number(c.value), { self: f, parent: f.parent }, f.forceEntry.name, f.force.uid, push)
      }
      // Restricciones por categoría (p. ej. al menos 1 personaje)
      for (const cl of f.forceEntry.categoryLinks ?? []) {
        if (!cl.constraints?.length) continue
        const node: EntryNode = categoryNode(cl, this.index)
        const st = this.computeState(node, { self: f }, `c:${f.force.uid}:${cl.id}`)
        for (const c of cl.constraints) {
          const q = { ...c, childId: cl.targetId }
          this.checkConstraint(q, st.constraintValues[c.id] ?? Number(c.value), { self: f, parent: f }, node.name, f.force.uid, push)
        }
      }
      this.validateContainer(f, push)
      for (const s of descendants(f.selections)) this.validateContainer(s, push)
      for (const s of f.selections) this.validateAssociations(s, push)
    }
    for (const i of validateCore(this)) push(i, 'core:' + i.message)
    return issues
  }

  private validateContainer(parent: SelInst | ForceInst, push: (i: Issue, key: string) => void) {
    const parentUid = parent.kind === 'force' ? parent.force.uid : parent.sel.uid
    this.walkOptions(
      parent,
      false,
      (o) => {
        const { node, groups, state } = o
        const mine = o.selections
        if (state.hidden && !mine.length) return
        if (state.hidden && mine.length) {
          push({ severity: 'error', message: `${state.name} is not available with the current configuration`, targetUid: mine[0].sel.uid }, 'hid:' + mine[0].sel.uid)
          return
        }
        const self: SelInst | VirtualInst = mine[0] ?? { kind: 'virtual', node, groups, parent, mult: 0 }
        for (const c of node.constraints) {
          const v = state.constraintValues[c.id] ?? Number(c.value)
          if (c.type === 'min' && v <= 0) continue
          if (c.type === 'max' && v < 0) continue
          if ((c.scope ?? 'parent') === 'self' || c.scope === 'root-entry' || c.scope === 'model' || c.scope === 'unit') {
            for (const s of mine) this.checkConstraint(c, v, { self: s }, state.name, s.sel.uid, push)
          } else {
            const q = { ...c, childId: c.childId ?? node.id }
            this.checkConstraint(q, v, { self, parent }, state.name, mine[0]?.sel.uid ?? parentUid, push)
          }
        }
        for (const s of mine) {
          const st = this.stateOf(s)
          for (const e of st.errors) push({ severity: 'error', message: e, targetUid: s.sel.uid }, `e:${s.sel.uid}:${e}`)
          for (const w of st.warnings) push({ severity: 'warning', message: w, targetUid: s.sel.uid }, `w:${s.sel.uid}:${w}`)
        }
      },
      (gi) => {
        if (gi.state.hidden) return
        for (const c of gi.node.constraints) {
          if ((c.field ?? 'selections') !== 'selections' || (c.scope ?? 'parent') !== 'parent') continue
          const v = gi.state.constraintValues[c.id] ?? Number(c.value)
          if (c.type === 'min' && gi.count < v)
            push({ severity: 'error', message: `${gi.state.name}: choose at least ${v} (you have ${gi.count})`, targetUid: parentUid }, `g:${parentUid}:${gi.node.key}:${c.id}`)
          if (c.type === 'max' && v >= 0 && gi.count > v)
            push({ severity: 'error', message: `${gi.state.name}: maximum ${v} (you have ${gi.count})`, targetUid: parentUid }, `g:${parentUid}:${gi.node.key}:${c.id}`)
        }
      },
    )
  }

  private validateAssociations(s: SelInst, push: (i: Issue, key: string) => void) {
    const defs = this.associationDefs(s)
    const bg = this.bodyguardOf(s)
    const name = this.stateOf(s).name
    for (const a of s.sel.associations ?? []) {
      const target = s.force.selections.find((t) => t.sel.uid === a.target)
      if (!target) {
        push({ severity: 'error', message: `${name}: the unit it was attached to is no longer in the list`, targetUid: s.sel.uid }, 'as-miss:' + s.sel.uid)
        continue
      }
      const def = defs.find((d) => d.id === a.id)
      if (!def || !this.associationCandidates(s, def).includes(target)) {
        push({ severity: 'error', message: `${name} can't join ${this.stateOf(target).name}`, targetUid: s.sel.uid }, 'as-bad:' + s.sel.uid)
      }
    }
    for (const d of defs) {
      const n = (s.sel.associations ?? []).filter((a) => a.id === d.id).length
      const min = Number(d.min ?? 0)
      if (n < min && !bg) {
        const what = /support/i.test(d.name ?? '') ? 'must support a unit' : 'must join a unit'
        push({ severity: 'error', message: `${name} ${what}`, targetUid: s.sel.uid }, `as-min:${s.sel.uid}:${d.id}`)
      }
    }
  }

  private checkConstraint(c: Raw, value: number, ctx: Ctx, name: string, targetUid: string, push: (i: Issue, key: string) => void) {
    if (c.type === 'max' && value < 0) return
    const scope = this.resolveScope(c.scope ?? 'parent', ctx)
    if (!scope) return
    const field = c.field ?? 'selections'
    const q = field === 'selections' && !c.childId ? { ...c, childId: ctx.self.kind === 'sel' || ctx.self.kind === 'virtual' ? ctx.self.node.id : undefined } : c
    const n = this.measure(scope, q)
    const scopeKey = scope.kind === 'roster' ? 'roster' : scope.kind === 'force' ? scope.force.uid : scope.kind === 'sel' ? scope.sel.uid : 'v'
    const key = `k:${c.id}:${scopeKey}`
    const what = field === 'selections' ? '' : ` ${this.index.costTypeName(field)}`
    const fill = (msg: string) => msg.replace(/\{value\}/g, String(value))
    if (c.type === 'min' && n < value) {
      push({ severity: 'error', message: c.message ? fill(c.message) : `${name}: minimum ${value}${what} (you have ${n})`, targetUid }, key)
    } else if (c.type === 'max' && n > value) {
      push({ severity: 'error', message: c.message ? fill(c.message) : `${name}: maximum ${value}${what} (you have ${n})`, targetUid }, key)
    }
  }
}

// ---------- Utilidades ----------

export interface FlatOption {
  node: EntryNode
  groups: EntryNode[]
}

/** Aplana grupos: devuelve las entradas seleccionables con la cadena de grupos que las contiene */
export function flattenOptions(index: DataIndex, nodes: EntryNode[], outer: EntryNode[] = []): FlatOption[] {
  const out: FlatOption[] = []
  for (const n of nodes) {
    if (n.kind === 'group') out.push(...flattenOptions(index, index.children(n), [...outer, n]))
    else out.push({ node: n, groups: outer })
  }
  return out
}

function sameKeys(groups: EntryNode[], keys: string[]): boolean {
  if (groups.length !== keys.length) return false
  return groups.every((g, i) => g.key === keys[i])
}

function* descendants(list: SelInst[]): Generator<SelInst> {
  for (const s of list) {
    yield s
    yield* descendants(s.children)
  }
}

/** Mínimo y máximo dentro del padre (restricciones de selecciones con ámbito "parent") */
function parentLimits(constraints: Raw[], values: Record<string, number>): { min: number; max: number } {
  let min = 0
  let max = -1
  for (const c of constraints) {
    if ((c.field ?? 'selections') !== 'selections' || (c.scope ?? 'parent') !== 'parent') continue
    const v = values[c.id] ?? Number(c.value)
    if (c.type === 'min') min = Math.max(min, v)
    if (c.type === 'max' && v >= 0) max = max < 0 ? v : Math.min(max, v)
  }
  return { min, max }
}

function forceAsNode(f: ForceInst): EntryNode {
  const fe = f.forceEntry
  return {
    key: fe.id,
    id: fe.id,
    kind: 'entry',
    name: fe.name,
    hidden: false,
    collective: false,
    sortIndex: 0,
    constraints: fe.constraints ?? [],
    modifiers: fe.modifiers ?? [],
    modifierGroups: fe.modifierGroups ?? [],
    costs: [],
    categoryIds: [],
    target: fe,
    catalogueId: '',
  }
}

function categoryNode(cl: Raw, index: DataIndex): EntryNode {
  const cat = index.categories.get(cl.targetId)
  return {
    key: cl.id,
    id: cl.targetId,
    kind: 'entry',
    name: cat?.name ?? cl.name,
    hidden: false,
    collective: false,
    sortIndex: 0,
    constraints: cl.constraints ?? [],
    modifiers: cl.modifiers ?? [],
    modifierGroups: cl.modifierGroups ?? [],
    costs: [],
    categoryIds: [cl.targetId],
    target: cl,
    catalogueId: '',
  }
}
