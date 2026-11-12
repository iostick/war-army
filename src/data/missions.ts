// Warhammer Event missions (11th edition): Force Disposition matrix plus mission/deployment cards
// read from Wahapedia's Event Companion page (downloaded when the app is published).
import { useEffect, useState } from 'react'
import { clean } from './wahaPages'

export const DISPOSITIONS = ['Take and Hold', 'Purge the Foe', 'Disruption', 'Reconnaissance', 'Priority Assets'] as const
export type Disposition = (typeof DISPOSITIONS)[number]

/** Your primary mission: MATRIX[your disposition][opponent's disposition] */
export const MATRIX: Record<Disposition, Record<Disposition, string>> = {
  'Take and Hold': { 'Take and Hold': 'Battlefield Dominance', 'Purge the Foe': 'Immovable Object', Disruption: 'Determined Acquisition', Reconnaissance: 'Purge and Secure', 'Priority Assets': 'Inescapable Dominion' },
  'Purge the Foe': { 'Take and Hold': 'Unstoppable Force', 'Purge the Foe': 'Meatgrinder', Disruption: 'Punishment', Reconnaissance: 'Consecrate', 'Priority Assets': "Destroyer's Wrath" },
  Disruption: { 'Take and Hold': 'Death Trap', 'Purge the Foe': 'Delaying Action', Disruption: 'Outmanoeuvre', Reconnaissance: 'Smoke and Mirrors', 'Priority Assets': 'Locate and Deny' },
  Reconnaissance: { 'Take and Hold': 'Reconnaissance Sweep', 'Purge the Foe': 'Triangulation', Disruption: 'Surveil the Foe', Reconnaissance: 'Gather Intel', 'Priority Assets': 'Search and Scour' },
  'Priority Assets': { 'Take and Hold': 'Secure Asset', 'Purge the Foe': 'Vital Link', Disruption: 'Extract Relic', Reconnaissance: 'Vanguard Operation', 'Priority Assets': 'Sabotage' },
}

export const asDisposition = (s?: string): Disposition | undefined => DISPOSITIONS.find((d) => s && norm(d) === norm(s))

export type CardKind = 'primary' | 'secondary' | 'deployment'

export interface MissionCard {
  kind: CardKind
  name: string
  /** Player / Opponent (primary), Attacker / Defender (secondary) */
  tags: string[]
  /** One sanitised HTML fragment per line of the card */
  lines: string[]
  image?: string
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const BLOCK = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'SECTION', 'ARTICLE'])

interface Line {
  text: string
  html: string
  img?: string
}

/** Flattens the page into lines: the text of each block that isn't inside a deeper block, plus images */
function lines(doc: Document): Line[] {
  const out: Line[] = []
  const walk = (el: Element) => {
    const own = doc.createElement('div')
    let hasText = false
    const flushOwn = () => {
      const text = (own.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) out.push({ text, html: clean(own, doc) })
      own.innerHTML = ''
      hasText = false
    }
    for (const n of [...el.childNodes]) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const e = n as Element
        if (e.tagName === 'IMG') {
          if (hasText) flushOwn()
          const src = e.getAttribute('src')
          if (src) out.push({ text: '', html: '', img: new URL(src, 'https://wahapedia.ru/wh40k11ed/the-rules/warhammer-event-companion/').href })
          continue
        }
        if (BLOCK.has(e.tagName) || e.querySelector([...BLOCK].join(',').toLowerCase())) {
          if (hasText) flushOwn()
          walk(e)
          continue
        }
      }
      own.appendChild(n.cloneNode(true))
      if ((n.textContent ?? '').trim()) hasText = true
    }
    if (hasText) flushOwn()
  }
  walk(doc.body)
  return out
}

const LABEL = /^(primary mission$|deployment card$|secondary mission(?!s?\s*deck))/i
const END = /^(force disposition cards?|primary mission deck|deployment deck|secondary mission deck|card decks|faq|errata|disable ads|terrain layouts|mission generator)$/i
const SIDE = /^(player|opponent)$/i

export function parseMissionCards(html: string): MissionCard[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,noscript,nav,header,footer,iframe,form,button,input,select,textarea,svg,canvas').forEach((e) => e.remove())
  const ls = lines(doc)
  const cards: MissionCard[] = []
  let cur: MissionCard | undefined
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]
    if (END.test(l.text)) {
      if (cur) cards.push(cur)
      cur = undefined
      continue
    }
    const m = LABEL.exec(l.text)
    if (m && i > 0 && ls[i - 1].text && ls[i - 1].text.length < 60) {
      const titleAt = i - 1
      const tags: string[] = []
      if (titleAt > 0 && SIDE.test(ls[titleAt - 1].text)) tags.push(cap(ls[titleAt - 1].text))
      // The title (and Player/Opponent tag) belong to this card, not to the previous one
      if (cur) {
        const drop = tags.length ? 2 : 1
        cur.lines.splice(cur.lines.length - drop, drop)
        cards.push(cur)
      }
      const kind: CardKind = /primary/i.test(m[1]) ? 'primary' : /secondary/i.test(m[1]) ? 'secondary' : 'deployment'
      if (kind === 'secondary') {
        if (/attacker/i.test(l.text)) tags.push('Attacker')
        if (/defender/i.test(l.text)) tags.push('Defender')
      }
      cur = { kind, name: titleCase(ls[titleAt].text), tags, lines: [] }
      continue
    }
    if (!cur) continue
    if (l.img) {
      if (!cur.image && (cur.kind === 'deployment' || /maps|cards/i.test(l.img))) cur.image = l.img
      cur.lines.push('')
      continue
    }
    cur.lines.push(l.html)
  }
  if (cur) cards.push(cur)
  // keep the first copy of each card and drop empty spacer lines
  const seen = new Set<string>()
  return cards
    .map((c) => ({ ...c, lines: c.lines.filter(Boolean) }))
    .filter((c) => {
      const k = c.kind + ':' + norm(c.name)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(And|The|Of|On|To|In|A|An)\b/g, (w, _1, i) => (i === 0 ? w : w.toLowerCase()))
}

let cache: Promise<MissionCard[] | undefined> | undefined

export function loadMissionCards(): Promise<MissionCard[] | undefined> {
  cache ??= fetch('./wahapedia/warhammer-event-companion.html')
    .then(async (r) => {
      if (!r.ok) return undefined
      const html = await r.text()
      if (html.includes('id="root"')) return undefined
      return parseMissionCards(html)
    })
    .catch(() => undefined)
  return cache
}

export function useMissionCards(): { loading: boolean; cards?: MissionCard[] } {
  const [s, set] = useState<{ loading: boolean; cards?: MissionCard[] }>({ loading: true })
  useEffect(() => {
    let alive = true
    loadMissionCards().then((cards) => alive && set({ loading: false, cards }))
    return () => {
      alive = false
    }
  }, [])
  return s
}

export const findCard = (cards: MissionCard[] | undefined, kind: CardKind, name?: string) => (name ? cards?.find((c) => c.kind === kind && norm(c.name) === norm(name)) : undefined)
