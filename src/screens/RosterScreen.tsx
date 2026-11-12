// Una lista: puntos, avisos de reglas y unidades agrupadas por categoría.
import { useMemo, useState } from 'react'
import { dropSession, useRoster } from '../data/session'
import { rosterStore } from '../data/rosterStore'
import type { Evaluator, Issue, SelInst } from '../engine/evaluate'
import { addSelection, PTS } from '../engine/ops'
import { Icon, pts, Row, Screen, Search, Section, Sheet, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'
import { SelectionScreen } from './SelectionScreen'

export function RosterScreen(props: { uid: string }) {
  const { roster, index, ev, error, update } = useRoster(props.uid)
  const nav = useNav()
  const [adding, setAdding] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [toast, setToast] = useState<string>()

  const issues = useMemo(() => ev?.validate() ?? [], [ev])

  if (error) return <Screen title="Lista" back="Listas"><div className="empty">{error}</div></Screen>
  if (!roster || !index || !ev) {
    return (
      <Screen title="" back="Listas" large={false}>
        <div className="empty">
          <Spinner />
        </div>
      </Screen>
    )
  }

  const force = ev.root.forces[0]
  const total = ev.rosterTotal(PTS)
  const limit = roster.costLimits[PTS] ?? 0
  const over = limit > 0 && total > limit
  const errors = issues.filter((i) => i.severity === 'error')
  const rootOf = rootMap(ev)
  const unitHasIssue = (u: SelInst) => issues.some((i) => i.targetUid && rootOf.get(i.targetUid) === u.sel.uid)

  // Agrupar por categoría principal, en el orden del sistema de juego
  const order: string[] = (force.forceEntry.categoryLinks ?? []).map((c: any) => c.targetId)
  const groups = new Map<string, SelInst[]>()
  for (const s of force.selections) {
    const cat = s.node.primaryCategoryId ?? 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(s)
  }
  const sortedCats = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))
  const catName = (id: string) => (id === 'other' ? 'Otros' : index.categories.get(id)?.name ?? id)
  const faction = (index.catalogues.get(force.force.catalogueId)?.name ?? '').split(' - ').slice(1).join(' - ')

  const openUnit = (s: SelInst) => nav.push({ key: 'sel:' + s.sel.uid, render: () => <SelectionScreen rosterUid={props.uid} selUid={s.sel.uid} /> })

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(undefined), 1600)
  }

  return (
    <Screen
      title={roster.name}
      back="Listas"
      subtitle={faction}
      right={
        <button className="bar-button" onClick={() => setAdding(true)} aria-label="Añadir unidad">
          {Icon.plus()}
        </button>
      }
    >
      <div className="points-card">
        <div className="points-top">
          <div className="points-value">
            {Math.round(total)} <small>/ {limit} pts</small>
          </div>
          <button onClick={() => setShowIssues(true)}>
            {errors.length > 0 || over ? (
              <span className="pill red">
                {Icon.warning(12)} {errors.length} {errors.length === 1 ? 'aviso' : 'avisos'}
              </span>
            ) : (
              <span className="pill green">{Icon.checkCircle(12)} Lista válida</span>
            )}
          </button>
        </div>
        <div className={'meter' + (over ? ' over' : '')}>
          <div style={{ width: `${Math.min(100, limit ? (total / limit) * 100 : 0)}%` }} />
        </div>
      </div>

      {sortedCats.map((cat) => (
        <Section key={cat} header={catName(cat)} headerRight={cat === order[0] ? undefined : pts(groups.get(cat)!.reduce((a, s) => a + ev.selectionTotal(s, PTS), 0))}>
          {groups.get(cat)!.map((s) => {
            const p = ev.selectionTotal(s, PTS)
            return (
              <Row
                key={s.sel.uid}
                title={ev.stateOf(s).name}
                sub={unitSummary(ev, s)}
                leading={unitHasIssue(s) ? <span className="dot" /> : undefined}
                detail={p ? pts(p) : undefined}
                chevron
                onClick={() => openUnit(s)}
              />
            )
          })}
        </Section>
      ))}

      <Section>
        <Row title="Añadir unidad" className="action" icon={Icon.plus(18)} onClick={() => setAdding(true)} />
      </Section>

      <Section>
        <Row
          title="Eliminar lista"
          className="destructive"
          onClick={async () => {
            if (!confirm(`¿Eliminar "${roster.name}"? No se puede deshacer.`)) return
            await rosterStore.delete(roster.uid)
            dropSession(roster.uid)
            nav.pop()
          }}
        />
      </Section>

      {adding && (
        <AddUnitSheet
          ev={ev}
          onClose={() => setAdding(false)}
          onAdd={(node, groups, name) => {
            update((r, idx) => addSelection(idx, r, force.force.uid, node, groups).roster)
            setAdding(false)
            flash(`${name} añadido`)
          }}
        />
      )}
      {showIssues && (
        <IssuesSheet
          issues={issues}
          onClose={() => setShowIssues(false)}
          onPick={(i) => {
            setShowIssues(false)
            const root = i.targetUid ? rootOf.get(i.targetUid) : undefined
            const inst = root ? ev.findInst(root) : undefined
            if (inst && inst.kind === 'sel') openUnit(inst)
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </Screen>
  )
}

/** Mapa de cada selección a su unidad raíz */
function rootMap(ev: Evaluator): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of ev.allForces()) {
    for (const root of f.selections) {
      const stack = [root]
      while (stack.length) {
        const s = stack.pop()!
        m.set(s.sel.uid, root.sel.uid)
        stack.push(...s.children)
      }
    }
  }
  return m
}

function unitSummary(ev: Evaluator, u: SelInst): string {
  if (u.node.type === 'upgrade') {
    // Configuración (tamaño de batalla, destacamento…): mostramos lo elegido
    const names: string[] = []
    const stack = [...u.children]
    while (stack.length) {
      const s = stack.shift()!
      names.push(ev.stateOf(s).name)
    }
    return names.join(', ') || 'Sin elegir'
  }
  let models = 0
  const extras: string[] = []
  const stack: [SelInst, number][] = u.children.map((c) => [c, c.sel.number])
  if (u.node.type === 'model') models = u.sel.number
  while (stack.length) {
    const [s, n] = stack.shift()!
    if (s.node.type === 'model') models += n
    if (s.groups.some((g) => /enhancement/i.test(g.name))) extras.push(ev.stateOf(s).name)
    for (const c of s.children) stack.push([c, n * c.sel.number])
  }
  return [models > 1 ? `${models} modelos` : models === 1 ? '1 modelo' : '', ...extras].filter(Boolean).join(' · ')
}

function AddUnitSheet(props: { ev: Evaluator; onClose: () => void; onAdd: (node: any, groups: any[], name: string) => void }) {
  const { ev } = props
  const [q, setQ] = useState('')
  const force = ev.root.forces[0]
  const index = ev.index
  const opts = useMemo(
    () => ev.options(force).filter((o) => !o.state.hidden && o.node.type !== 'upgrade'),
    [ev, force],
  )
  const order: string[] = (force.forceEntry.categoryLinks ?? []).map((c: any) => c.targetId)
  const filtered = opts.filter((o) => o.state.name.toLowerCase().includes(q.trim().toLowerCase()))
  const groups = new Map<string, typeof opts>()
  for (const o of filtered) {
    const cat = o.node.primaryCategoryId ?? 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(o)
  }
  const cats = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))
  return (
    <Sheet title="Añadir unidad" onClose={props.onClose}>
      <Search value={q} onChange={setQ} placeholder="Buscar unidades" />
      {cats.map((cat) => (
        <Section key={cat} header={index.categories.get(cat)?.name ?? 'Otros'}>
          {groups.get(cat)!.map((o) => {
            const full = o.max >= 0 && o.count >= o.max
            return (
              <Row
                key={o.node.key}
                title={o.state.name}
                sub={o.count ? `En la lista: ${o.count}` : undefined}
                detail={o.state.costs[PTS] ? pts(o.state.costs[PTS]) : ''}
                className={full ? 'disabled' : ''}
                onClick={() => props.onAdd(o.node, o.groups, o.state.name)}
              />
            )
          })}
        </Section>
      ))}
      {!filtered.length && <div className="empty">Sin resultados</div>}
    </Sheet>
  )
}

function IssuesSheet(props: { issues: Issue[]; onClose: () => void; onPick: (i: Issue) => void }) {
  return (
    <Sheet
      title="Validación"
      onClose={props.onClose}
      left={<span />}
      right={
        <button className="bar-button bold" onClick={props.onClose}>
          OK
        </button>
      }
    >
      {props.issues.length === 0 ? (
        <div className="empty">
          <div className="big-icon" style={{ color: 'var(--green)' }}>
            {Icon.shield()}
          </div>
          <h2>Todo correcto</h2>
          <p>La lista cumple las reglas de los datos de BSData.</p>
        </div>
      ) : (
        <Section footer="Toca un aviso para ir a la unidad.">
          {props.issues.map((i, n) => (
            <Row
              key={n}
              title={i.message}
              icon={Icon.warning(16)}
              iconBg={i.severity === 'error' ? 'var(--red)' : 'var(--orange)'}
              onClick={() => props.onPick(i)}
            />
          ))}
        </Section>
      )}
    </Sheet>
  )
}
