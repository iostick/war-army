// Una lista: puntos, límites de la 11ª, unidades (con líderes adjuntos), reglas y exportación a texto.
import { useMemo, useState, type CSSProperties } from 'react'
import { collection, type CollectionItem } from '../data/db'
import { usePhotoUrl } from '../data/photos'
import { rosterStore } from '../data/rosterStore'
import { dropSession, useRoster } from '../data/session'
import { useTable } from '../data/useTable'
import type { EntryNode } from '../engine/catalog'
import type { Evaluator, Issue, SelInst } from '../engine/evaluate'
import { addSelection, PTS } from '../engine/ops'
import { profilesOf, rulesOf } from '../engine/profiles'
import { coreLimits, detachments } from '../engine/rules11'
import { factionColor, shortFaction } from '../ui/faction'
import { RichText } from '../ui/glossaryUi'
import { Icon, pts, Row, Screen, Search, Section, Sheet, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'
import { DetachmentScreen } from './DetachmentScreen'
import { SelectionScreen } from './SelectionScreen'

type View = 'units' | 'rules' | 'text'

export function RosterScreen(props: { uid: string }) {
  const { roster, index, ev, error, update } = useRoster(props.uid)
  const nav = useNav()
  const [adding, setAdding] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [view, setView] = useState<View>('units')
  const [toast, setToast] = useState<string>()
  const items = useTable('collection', () => collection.all())

  const issues = useMemo(() => ev?.validate() ?? [], [ev])

  if (error)
    return (
      <Screen title="Lista" back="Listas">
        <div className="empty">{error}</div>
      </Screen>
    )
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
  const catName = index.catalogues.get(force.force.catalogueId)?.name
  const accent = factionColor(catName)
  const total = ev.rosterTotal(PTS)
  const limit = roster.costLimits[PTS] ?? 0
  const over = limit > 0 && total > limit
  const errors = issues.filter((i) => i.severity === 'error')
  const rootOf = rootMap(ev)
  const unitIssue = (u: SelInst) => issues.some((i) => i.targetUid && rootOf.get(i.targetUid) === u.sel.uid)
  const limits = coreLimits(ev)
  const dets = detachments(ev)
  const dpUsed = dets.reduce((a, d) => a + d.dp, 0)
  const dpMax = limits.size === 'incursion' && dets.length === 1 && dets[0].dp === 3 ? 3 : limits.detachmentPoints
  const enhUsed = countEnhancements(ev)
  const owned = new Map<string, CollectionItem>((items ?? []).filter((i) => i.catalogueId === force.force.catalogueId).map((i) => [i.entryId, i]))

  const openUnit = (s: SelInst) => nav.push({ key: 'sel:' + s.sel.uid, render: () => <SelectionScreen rosterUid={props.uid} selUid={s.sel.uid} /> })
  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(undefined), 1600)
  }

  // Configuración y unidades (los líderes adjuntos se muestran bajo su unidad)
  const config = force.selections.filter((s) => s.node.type === 'upgrade')
  const units = force.selections.filter((s) => s.node.type !== 'upgrade' && !ev.bodyguardOf(s))
  const order: string[] = (force.forceEntry.categoryLinks ?? []).map((c: any) => c.targetId)
  const groups = new Map<string, SelInst[]>()
  for (const s of units) {
    const cat = s.node.primaryCategoryId ?? 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(s)
  }
  const sortedCats = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))

  const unitRow = (s: SelInst, indent = false) => {
    const p = ev.selectionTotal(s, PTS)
    const inList = force.selections.filter((x) => x.node.id === s.node.id).length
    const item = owned.get(s.node.id)
    return (
      <UnitRow
        key={s.sel.uid}
        title={ev.stateOf(s).name}
        sub={[unitSummary(ev, s), item ? `Tienes ${item.owned}/${inList}` : ''].filter(Boolean).join(' · ')}
        missing={!!item && item.owned < inList}
        photo={item?.photos[0]}
        issue={unitIssue(s)}
        detail={p ? pts(p) : ''}
        indent={indent}
        onClick={() => openUnit(s)}
      />
    )
  }

  return (
    <div style={{ '--accent': accent } as CSSProperties}>
      <Screen
        title={roster.name}
        back="Listas"
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
                <span className="pill green">{Icon.checkCircle(12)} Válida</span>
              )}
            </button>
          </div>
          <div className={'meter' + (over ? ' over' : '')}>
            <div style={{ width: `${Math.min(100, limit ? (total / limit) * 100 : 0)}%` }} />
          </div>
          <div className="chips">
            <span className="chip accent">{shortFaction(catName)}</span>
            <span className="chip">{limits.size === 'incursion' ? 'Incursion' : limits.size === 'onslaught' ? 'Onslaught' : 'Strike Force'}</span>
            <span className={'chip' + (dpUsed > dpMax ? ' red' : '')}>
              DP {dpUsed}/{dpMax}
            </span>
            <span className={'chip' + (enhUsed > limits.enhancements ? ' red' : '')}>
              Mejoras {enhUsed}/{limits.enhancements}
            </span>
            <span className="chip">{units.length + force.selections.filter((s) => ev.bodyguardOf(s)).length} unidades</span>
          </div>
        </div>

        <div className="tabs-inline">
          {(
            [
              ['units', 'Unidades'],
              ['rules', 'Reglas del ejército'],
              ['text', 'Exportar'],
            ] as [View, string][]
          ).map(([v, l]) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {l}
            </button>
          ))}
        </div>

        {view === 'units' && (
          <>
            <Section header="Configuración">
              {config.map((s) => (
                <Row
                  key={s.sel.uid}
                  title={ev.stateOf(s).name}
                  sub={s.node.name === 'Detachment' ? dets.map((d) => `${d.name} (${d.dp} DP)`).join(', ') || 'Sin elegir' : unitSummary(ev, s)}
                  leading={unitIssue(s) ? <span className="dot" /> : undefined}
                  chevron
                  onClick={() =>
                    s.node.name === 'Detachment'
                      ? nav.push({ key: 'det:' + s.sel.uid, render: () => <DetachmentScreen rosterUid={props.uid} selUid={s.sel.uid} /> })
                      : openUnit(s)
                  }
                />
              ))}
            </Section>

            {sortedCats.map((cat) => {
              const list = groups.get(cat)!
              const sum = list.reduce((a, s) => a + ev.selectionTotal(s, PTS) + ev.leadersOf(s).reduce((b, l) => b + ev.selectionTotal(l, PTS), 0), 0)
              return (
                <Section key={cat} header={cat === 'other' ? 'Otros' : index.categories.get(cat)?.name ?? cat} headerRight={pts(sum)}>
                  {list.flatMap((s) => [unitRow(s), ...ev.leadersOf(s).map((l) => unitRow(l, true))])}
                </Section>
              )
            })}

            <Section>
              <Row title="Añadir unidad" className="action" icon={Icon.plus(18)} iconBg={accent} onClick={() => setAdding(true)} />
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
          </>
        )}

        {view === 'rules' && <ArmyRules ev={ev} />}
        {view === 'text' && <ExportText ev={ev} name={roster.name} onCopied={() => flash('Lista copiada')} />}

        {adding && (
          <AddUnitSheet
            ev={ev}
            owned={owned}
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
    </div>
  )
}

function UnitRow(props: { title: string; sub: string; detail: string; photo?: string; issue: boolean; missing: boolean; indent: boolean; onClick: () => void }) {
  const url = usePhotoUrl(props.photo)
  return (
    <Row
      title={props.title}
      sub={props.missing ? <span style={{ color: 'var(--orange)' }}>{props.sub}</span> : props.sub}
      leading={
        <>
          {props.issue ? <span className="dot" /> : !props.indent && <span className="stripe" />}
          {url && <img className="thumb" src={url} alt="" />}
        </>
      }
      detail={props.detail}
      className={props.indent ? 'indent' : ''}
      chevron
      onClick={props.onClick}
    />
  )
}

function countEnhancements(ev: Evaluator): number {
  let n = 0
  for (const f of ev.allForces()) {
    const stack = [...f.selections]
    while (stack.length) {
      const s = stack.pop()!
      if (s.groups.some((g) => /enhancement/i.test(g.name))) n += s.sel.number
      stack.push(...s.children)
    }
  }
  return n
}

/** Mapa de cada selección a su unidad raíz */
function rootMap(ev: Evaluator): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of ev.allForces()) {
    m.set(f.force.uid, f.force.uid)
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

export function unitSummary(ev: Evaluator, u: SelInst): string {
  if (u.node.type === 'upgrade') {
    const names: string[] = []
    const stack = [...u.children]
    while (stack.length) names.push(ev.stateOf(stack.shift()!).name)
    return names.join(', ') || 'Sin elegir'
  }
  let models = u.node.type === 'model' ? u.sel.number : 0
  const extras: string[] = []
  const stack: [SelInst, number][] = u.children.map((c) => [c, c.sel.number])
  while (stack.length) {
    const [s, n] = stack.shift()!
    if (s.node.type === 'model') models += n
    if (s.groups.some((g) => /enhancement/i.test(g.name)) || s.node.name === 'Warlord') extras.push(ev.stateOf(s).name)
    for (const c of s.children) stack.push([c, n * c.sel.number])
  }
  const bg = ev.bodyguardOf(u)
  return [models > 1 ? `${models} modelos` : '', ...extras, bg ? `con ${ev.stateOf(bg).name}` : ''].filter(Boolean).join(' · ')
}

// ---------- Reglas del ejército ----------

function ArmyRules({ ev }: { ev: Evaluator }) {
  const index = ev.index
  const dets = detachments(ev)
  // Reglas de ejército: reglas que comparten la mayoría de unidades de la facción (p. ej. Reanimation Protocols)
  const counts = new Map<string, { name: string; description: string; n: number }>()
  const force = ev.root.forces[0]
  const unitList = force.selections.filter((s) => s.node.type !== 'upgrade')
  for (const s of unitList) {
    const hidden = (l: any) => ev.infoHidden(l, s)
    for (const r of [...rulesOf(index, s.node.target, hidden), ...rulesOf(index, s.node.link, hidden)]) {
      if (!r.description) continue
      const c = counts.get(r.name) ?? { name: r.name, description: r.description, n: 0 }
      c.n++
      counts.set(r.name, c)
    }
  }
  const detRuleNames = new Set(dets.flatMap((d) => [...rulesOf(index, d.inst.node.target), ...rulesOf(index, d.inst.node.link)].map((r: any) => r.name)))
  const armyRules = [...counts.values()].filter((r) => r.n >= Math.max(2, unitList.length * 0.6) && !detRuleNames.has(r.name))
  const enhancements: { unit: string; name: string; text: string }[] = []
  for (const s of unitList) {
    const stack = [...s.children]
    while (stack.length) {
      const c = stack.pop()!
      if (c.groups.some((g) => /enhancement/i.test(g.name))) {
        const text = [...profilesOf(index, c.node.target).map((p: any) => (p.characteristics ?? []).map((x: any) => x.$text).join(' ')), ...rulesOf(index, c.node.target).map((r: any) => r.description)].join('\n')
        enhancements.push({ unit: ev.stateOf(s).name, name: ev.stateOf(c).name, text })
      }
      stack.push(...c.children)
    }
  }
  return (
    <>
      {armyRules.length > 0 && (
        <Section header="Regla de ejército">
          {armyRules.map((r) => (
            <div className="rule-text" key={r.name}>
              <b>{r.name}</b>
              <RichText text={r.description} />
            </div>
          ))}
        </Section>
      )}
      {dets.length === 0 && <Section header="Destacamentos"><div className="rule-text">Todavía no has elegido destacamento.</div></Section>}
      {dets.map((d) => {
        const rules = [...rulesOf(index, d.inst.node.target), ...rulesOf(index, d.inst.node.link)]
        return (
          <Section key={d.inst.sel.uid} header={`Destacamento · ${d.name} · ${d.dp} DP`} footer={[...d.dispositions, ...d.tags].join(' · ')}>
            {rules.length ? (
              rules.map((r: any) => (
                <div className="rule-text" key={r.id ?? r.name}>
                  <b>{r.name}</b>
                  <RichText text={r.description ?? ''} />
                </div>
              ))
            ) : (
              <div className="rule-text">Los datos de BSData no incluyen el texto de este destacamento.</div>
            )}
          </Section>
        )
      })}
      {enhancements.length > 0 && (
        <Section header="Mejoras elegidas">
          {enhancements.map((e) => (
            <div className="rule-text" key={e.unit + e.name}>
              <b>
                {e.name} · {e.unit}
              </b>
              <RichText text={e.text || 'Sin texto en los datos.'} />
            </div>
          ))}
        </Section>
      )}
      <Section footer="BSData no publica las estratagemas de cada destacamento (son texto de Games Workshop). Las generales están en la pestaña Reglas.">
        <a className="row action" href="https://wahapedia.ru/wh40k11ed/" target="_blank" rel="noreferrer">
          <div className="row-body">
            <div className="row-title">Ver estratagemas del destacamento en Wahapedia</div>
          </div>
          <span className="chevron">{Icon.chevronRight()}</span>
        </a>
      </Section>
    </>
  )
}

// ---------- Exportar a texto ----------

export function rosterText(ev: Evaluator, name: string): string {
  const force = ev.root.forces[0]
  const cat = shortFaction(ev.index.catalogues.get(force.force.catalogueId)?.name)
  const lines: string[] = [`${name} (${Math.round(ev.rosterTotal(PTS))} pts)`, cat, '']
  const dets = detachments(ev)
  const size = coreLimits(ev).size
  lines.push(`Battle Size: ${size === 'incursion' ? 'Incursion (1000)' : size === 'onslaught' ? 'Onslaught (3000)' : 'Strike Force (2000)'}`)
  if (dets.length) lines.push(`Detachments: ${dets.map((d) => d.name).join(', ')}`)
  const fd = force.selections.find((s) => s.node.name === 'Force Disposition')
  if (fd?.children.length) lines.push(`Force Disposition: ${fd.children.map((c) => c.node.name).join(', ')}`)
  lines.push('')
  const describe = (s: SelInst, depth: number) => {
    const st = ev.stateOf(s)
    const p = ev.selectionTotal(s, PTS)
    const pad = '  '.repeat(depth)
    const qty = s.sel.number > 1 ? `${s.sel.number}x ` : ''
    lines.push(`${pad}${depth ? '• ' : ''}${qty}${st.name}${depth === 0 && p ? ` (${Math.round(p)} pts)` : ''}`)
    for (const c of s.children) describe(c, depth + 1)
  }
  for (const s of force.selections) {
    if (s.node.type === 'upgrade' || ev.bodyguardOf(s)) continue
    describe(s, 0)
    for (const l of ev.leadersOf(s)) {
      lines.push('  ↳ Adjunto:')
      describe(l, 1)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

function ExportText({ ev, name, onCopied }: { ev: Evaluator; name: string; onCopied: () => void }) {
  const text = rosterText(ev, name)
  return (
    <>
      <Section footer="Formato de texto plano para compartir por WhatsApp, Discord o foros.">
        <pre className="rule-text" style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}>
          {text}
        </pre>
      </Section>
      <button
        className="button-filled"
        style={{ background: 'var(--accent)' }}
        onClick={async () => {
          try {
            if (navigator.share) await navigator.share({ title: name, text })
            else {
              await navigator.clipboard.writeText(text)
              onCopied()
            }
          } catch {
            /* cancelado */
          }
        }}
      >
        Compartir o copiar
      </button>
    </>
  )
}

// ---------- Hojas ----------

function AddUnitSheet(props: { ev: Evaluator; owned: Map<string, CollectionItem>; onClose: () => void; onAdd: (node: EntryNode, groups: EntryNode[], name: string) => void }) {
  const { ev } = props
  const [q, setQ] = useState('')
  const [onlyOwned, setOnlyOwned] = useState(false)
  const force = ev.root.forces[0]
  const index = ev.index
  const limits = coreLimits(ev)
  const opts = useMemo(() => ev.options(force).filter((o) => !o.state.hidden && o.node.type !== 'upgrade'), [ev, force])
  const order: string[] = (force.forceEntry.categoryLinks ?? []).map((c: any) => c.targetId)
  const filtered = opts.filter((o) => o.state.name.toLowerCase().includes(q.trim().toLowerCase()) && (!onlyOwned || props.owned.has(o.node.id)))
  const groups = new Map<string, typeof opts>()
  for (const o of filtered) {
    const cat = o.node.primaryCategoryId ?? 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(o)
  }
  const cats = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))
  const limitFor = (node: EntryNode) => {
    const names = node.categoryIds.map((id) => index.categories.get(id)?.name)
    if (names.includes('Epic Hero')) return 1
    if (names.includes('Battleline') || names.includes('Dedicated Transport')) return limits.unitLimit * 2
    return limits.unitLimit
  }
  return (
    <Sheet title="Añadir unidad" onClose={props.onClose}>
      <Search value={q} onChange={setQ} placeholder="Buscar unidades" />
      <div className="tabs-inline">
        <button className={!onlyOwned ? 'on' : ''} onClick={() => setOnlyOwned(false)}>
          Todas
        </button>
        <button className={onlyOwned ? 'on' : ''} onClick={() => setOnlyOwned(true)}>
          Solo mi colección
        </button>
      </div>
      {cats.map((cat) => (
        <Section key={cat} header={index.categories.get(cat)?.name ?? 'Otros'}>
          {groups.get(cat)!.map((o) => {
            const lim = limitFor(o.node)
            const full = o.count >= lim
            const item = props.owned.get(o.node.id)
            return (
              <Row
                key={o.node.key}
                title={o.state.name}
                sub={[`${o.count}/${lim}`, item ? `tienes ${item.owned}` : ''].filter(Boolean).join(' · ')}
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
          <p>La lista cumple las reglas de construcción de la 11ª y las de los datos de BSData.</p>
        </div>
      ) : (
        <Section footer="Toca un aviso para ir a la unidad.">
          {props.issues.map((i, n) => (
            <Row key={n} title={i.message} icon={Icon.warning(16)} iconBg={i.severity === 'error' ? 'var(--red)' : 'var(--orange)'} onClick={() => props.onPick(i)} />
          ))}
        </Section>
      )}
    </Sheet>
  )
}
