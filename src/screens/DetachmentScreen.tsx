// Elegir destacamentos con el presupuesto de puntos de destacamento (DP), etiquetas y disposiciones.
import { useState } from 'react'
import { useRoster } from '../data/session'
import type { OptionInfo } from '../engine/evaluate'
import { addSelection, removeSelection } from '../engine/ops'
import { rulesOf } from '../engine/profiles'
import { coreLimits, detachments, DISPOSITIONS } from '../engine/rules11'
import { RichText } from '../ui/glossaryUi'
import { DetachmentStratagems } from '../ui/wahapediaUi'
import { Icon, Row, Screen, Section, Spinner } from '../ui/kit'
import { factionColor } from '../ui/faction'

export function DetachmentScreen(props: { rosterUid: string; selUid: string }) {
  const { ev, update } = useRoster(props.rosterUid)
  const [open, setOpen] = useState<string>()
  if (!ev)
    return (
      <Screen title="Destacamentos" large={false}>
        <div className="empty">
          <Spinner />
        </div>
      </Screen>
    )
  const inst = ev.findInst(props.selUid)
  if (!inst || inst.kind !== 'sel') return <Screen title="Destacamentos">{null}</Screen>
  const index = ev.index
  const DP = index.costTypes.find((c) => c.name === 'Detachment Points')?.id ?? ''
  const limits = coreLimits(ev)
  const chosen = detachments(ev)
  const used = chosen.reduce((a, d) => a + d.dp, 0)
  const max = limits.size === 'incursion' && chosen.length === 1 && chosen[0].dp === 3 ? 3 : limits.detachmentPoints
  const usedTags = new Set(chosen.flatMap((d) => d.tags))
  const opts = ev.options(inst).filter((o) => !o.state.hidden || o.count > 0)

  const info = (o: OptionInfo) => {
    const cats = o.node.categoryIds.map((id) => index.categories.get(id)?.name ?? '')
    return {
      dp: o.state.costs[DP] ?? 0,
      dispositions: cats.filter((c) => DISPOSITIONS.includes(c)),
      tags: cats.filter((c) => c && !DISPOSITIONS.includes(c) && !/DP Detachment$/i.test(c)),
    }
  }

  const toggle = (o: OptionInfo) =>
    update((r, idx) => {
      if (o.count > 0) {
        let next = r
        for (const s of o.selections) next = removeSelection(next, s.sel.uid)
        return next
      }
      return addSelection(idx, r, inst.sel.uid, o.node, o.groups).roster
    })

  return (
    <div style={{ '--accent': factionColor(index.catalogues.get(inst.force.force.catalogueId)?.name) } as React.CSSProperties}>
    <Screen title="Destacamentos" back="Lista">
      <div className="points-card">
        <div className="points-top">
          <div className="points-value">
            {used} <small>/ {max} DP</small>
          </div>
          <span className={'pill ' + (used > max ? 'red' : 'green')}>{used > max ? 'Te pasas' : `Quedan ${max - used} DP`}</span>
        </div>
        <div className={'meter' + (used > max ? ' over' : '')}>
          <div style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
        </div>
        <div className="chips">
          <span className="chip">No se repiten etiquetas</span>
          {limits.size === 'incursion' && <span className="chip">Incursion: un destacamento de 3 DP solo vale si va solo</span>}
        </div>
      </div>

      <Section footer="Toca el nombre para ver las reglas del destacamento.">
        {opts.map((o) => {
          const d = info(o)
          const selected = o.count > 0
          const conflict = !selected && d.tags.find((t) => usedTags.has(t))
          const tooExpensive = !selected && used + d.dp > (limits.size === 'incursion' && chosen.length === 0 && d.dp === 3 ? 3 : limits.detachmentPoints)
          const reason = conflict ? `Ya tienes un destacamento ${conflict}` : tooExpensive ? 'No te quedan DP suficientes' : ''
          const rules = [...rulesOf(index, o.node.target), ...rulesOf(index, o.node.link)]
          return (
            <div key={o.node.key}>
              <Row
                title={o.state.name}
                checked={selected}
                sub={
                  <>
                    {[...d.dispositions, ...d.tags].join(' · ')}
                    {reason && <span style={{ color: 'var(--orange)' }}> · {reason}</span>}
                  </>
                }
                detail={`${d.dp} DP`}
                className={reason ? 'muted' : ''}
                onClick={() => (reason ? setOpen(open === o.node.key ? undefined : o.node.key) : toggle(o))}
                accessory={
                  <button
                    className="bar-button"
                    aria-label="Ver reglas"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(open === o.node.key ? undefined : o.node.key)
                    }}
                  >
                    {Icon.chevronRight()}
                  </button>
                }
              />
              {open === o.node.key && <DetachmentStratagems detachment={o.state.name} />}
              {open === o.node.key &&
                (rules.length ? (
                  rules.map((r: any) => (
                    <div className="rule-text" key={r.id ?? r.name}>
                      <b>{r.name}</b>
                      <RichText text={r.description ?? ''} />
                    </div>
                  ))
                ) : (
                  <div className="rule-text">Sin texto de reglas en los datos.</div>
                ))}
            </div>
          )
        })}
      </Section>
    </Screen>
    </div>
  )
}
