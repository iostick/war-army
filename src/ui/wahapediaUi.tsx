// Estratagemas y reglas de destacamento con el texto de Wahapedia.
import { useState, type ReactNode } from 'react'
import { phaseEs, stratTypeEs, turnEs, useWahapedia, stratagemsFor, detachmentAbilitiesFor, type WStratagem } from '../data/wahapedia'
import { Icon } from './kit'

const LABELS: [RegExp, string][] = [
  [/\bWHEN:/g, 'CUÁNDO:'],
  [/\bTARGET:/g, 'OBJETIVO:'],
  [/\bEFFECT:/g, 'EFECTO:'],
  [/\bRESTRICTIONS?:/g, 'RESTRICCIONES:'],
]

/** Muestra HTML de Wahapedia de forma segura: solo texto, negritas, cursivas, saltos y listas. */
export function HtmlText({ html }: { html: string }) {
  let src = html
  for (const [re, es] of LABELS) src = src.replace(re, es)
  const doc = new DOMParser().parseFromString(`<div>${src}</div>`, 'text/html')
  return <>{convert(doc.body.firstChild as Node, 'r')}</>
}

function convert(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const kids = [...el.childNodes].map((c, i) => convert(c, key + '.' + i))
  const tag = el.tagName.toLowerCase()
  const cls = el.getAttribute('class') ?? ''
  switch (tag) {
    case 'br':
      return '\n'
    case 'b':
    case 'strong':
      return (
        <strong key={key} style={{ color: 'var(--label)' }}>
          {kids}
        </strong>
      )
    case 'i':
    case 'em':
      return <em key={key}>{kids}</em>
    case 'li':
      return <span key={key}>{['\n• ', ...kids]}</span>
    case 'p':
    case 'div':
    case 'ul':
    case 'ol':
    case 'table':
    case 'tr':
      return <span key={key}>{[...kids, tag === 'p' || tag === 'tr' ? '\n' : '']}</span>
    case 'script':
    case 'style':
    case 'img':
      return null
    default:
      if (/kwb|kwbu/.test(cls)) return <span key={key} className="kw-inline">{kids}</span>
      return <span key={key}>{kids}</span>
  }
}

export function StratagemCard({ s, defaultOpen }: { s: WStratagem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  const when = [turnEs(s.turn), phaseEs(s.phase)].filter(Boolean).join(' · ')
  return (
    <div className="strat" onClick={() => setOpen(!open)} role="button" tabIndex={0}>
      <div className="strat-head">
        <span className="strat-cp">{s.cp}PM</span>
        <div className="row-body">
          <div className="row-title">{s.name}</div>
          <div className="row-sub">
            {stratTypeEs(s.type)}
            {when && ` · ${when}`}
          </div>
        </div>
        <span className={'chevron' + (open ? ' open' : '')}>{Icon.chevronRight()}</span>
      </div>
      {open && (
        <div className="rule-text strat-body">
          {s.legend && <em className="legend">{s.legend}</em>}
          <HtmlText html={s.description} />
        </div>
      )}
    </div>
  )
}

/** Estratagemas (y reglas) de un destacamento según Wahapedia */
export function DetachmentStratagems({ detachment, showRules }: { detachment: string; showRules?: boolean }) {
  const { loading, data } = useWahapedia()
  if (loading) return <div className="rule-text muted-text">Cargando estratagemas…</div>
  if (!data) return <div className="rule-text muted-text">Las estratagemas de Wahapedia aún no están descargadas. Se descargan al publicar la app; vuelve a abrirla con conexión.</div>
  const strats = stratagemsFor(data, detachment)
  const rules = showRules ? detachmentAbilitiesFor(data, detachment) : []
  if (!strats.length && !rules.length) return <div className="rule-text muted-text">Wahapedia no tiene estratagemas para «{detachment}» todavía.</div>
  return (
    <>
      {rules.map((r) => (
        <div className="rule-text" key={r.id}>
          <b>{r.name}</b>
          <HtmlText html={r.description} />
        </div>
      ))}
      {strats.map((s) => (
        <StratagemCard key={s.id} s={s} />
      ))}
    </>
  )
}

export function WahapediaCredit() {
  const { data } = useWahapedia()
  if (!data) return null
  return <>Datos de estratagemas: Wahapedia{data.updated ? ` (actualizado ${data.updated.slice(0, 10)})` : ''}.</>
}
