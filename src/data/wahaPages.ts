// Wahapedia rule pages (core rules, Event Companion missions, appendix).
// Downloaded when the app is published; split here into parts, chapters and numbered sections.
import { useEffect, useState } from 'react'

export type SectionKind = 'part' | 'chapter' | 'section' | 'sub' | 'note'

export interface RuleSection {
  id: string
  title: string
  /** Rule number from the heading ("01.02"), shown as a tag */
  num?: string
  kind: SectionKind
  /** Sanitised HTML (safe tags only) */
  html: string
  text: string
}

export const RULE_PAGES = [
  { id: 'core-rules', title: 'Core rules', sub: 'Movement, visibility, terrain, shooting, fighting…' },
  { id: 'warhammer-event-companion', title: 'Missions', sub: 'Primary and secondary missions, deployments' },
  { id: 'rules-appendix', title: 'Rules appendix', sub: 'Clarifications and special cases' },
] as const

const ALLOWED = new Set(['P', 'B', 'STRONG', 'I', 'EM', 'BR', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'H5', 'H6', 'IMG', 'SPAN', 'DIV', 'SUP', 'SUB'])
const SKIP_TITLES = /^(books|contents|table of contents|disable ads|see also)$/i
const NOTE_TITLES = /^(faq|faqs|errata|designer.s notes?)$/i

/** Sanitises a fragment: keeps only safe tags and attributes */
function clean(el: Element, doc: Document): string {
  const out = doc.createElement('div')
  const copy = (src: Node, dst: Node) => {
    for (const n of [...src.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) {
        dst.appendChild(doc.createTextNode(n.textContent ?? ''))
        continue
      }
      if (n.nodeType !== Node.ELEMENT_NODE) continue
      const e = n as Element
      if (!ALLOWED.has(e.tagName)) {
        copy(e, dst) // keep the text (links, etc.)
        continue
      }
      const c = doc.createElement(e.tagName.toLowerCase())
      const cls = e.getAttribute('class') ?? ''
      if (/kwb|kwbu/.test(cls)) c.setAttribute('class', 'kw-inline')
      if (e.tagName === 'IMG') {
        const src = e.getAttribute('src') ?? ''
        if (!src) continue
        c.setAttribute('src', new URL(src, 'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/').href)
        c.setAttribute('loading', 'lazy')
        c.setAttribute('alt', '')
      }
      for (const a of ['colspan', 'rowspan']) if (e.hasAttribute(a)) c.setAttribute(a, e.getAttribute(a)!)
      copy(e, c)
      dst.appendChild(c)
    }
  }
  if (ALLOWED.has(el.tagName) && el.tagName !== 'DIV' && el.tagName !== 'SPAN') {
    const wrap = doc.createElement('div')
    wrap.appendChild(el.cloneNode(true))
    copy(wrap, out)
  } else copy(el, out)
  return out.innerHTML
}

/** Splits a heading into title and rule number: "Armies 01.01", "09.05.01 More Than One…", "Core Concepts 01" */
export function splitHeading(raw: string): { title: string; num?: string; depth: number } {
  const t = raw.replace(/\s+/g, ' ').trim()
  let m = /^(.*?)\s+(\d{2}(?:\.\d{2}){0,2})$/.exec(t)
  if (m && m[1]) return { title: m[1], num: m[2], depth: m[2].split('.').length }
  m = /^(\d{2}(?:\.\d{2}){1,2})\s+(.+)$/.exec(t)
  if (m) return { title: m[2], num: m[1], depth: m[1].split('.').length }
  return { title: t, depth: 0 }
}

const isCaps = (t: string) => t.length > 3 && /[A-Z]/.test(t) && t === t.toUpperCase()
const titleCase = (t: string) => t.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

export function parseRulesPage(html: string): RuleSection[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,noscript,nav,header,footer,iframe,form,button,input,select,textarea,svg,canvas').forEach((e) => e.remove())
  // "Show"/"Hide" toggles of the FAQ boxes
  doc.body.querySelectorAll('span,div,a').forEach((e) => {
    if (!e.children.length && /^(show|hide)$/i.test(e.textContent?.trim() ?? '')) e.remove()
  })
  const heads = [...doc.body.querySelectorAll('h1,h2,h3,h4')]
  if (!heads.length) return []
  // Main container: the deepest element that holds most of the headings
  let container: Element = doc.body
  const need = Math.ceil(heads.length * 0.75)
  for (;;) {
    const child = [...container.children].find((c) => heads.filter((h) => c.contains(h)).length >= need)
    if (!child) break
    container = child
  }
  const inside = heads.filter((h) => container.contains(h))
  const numbered = inside.filter((h) => splitHeading(h.textContent ?? '').num).length >= 8
  const levels = [...new Set(inside.map((h) => Number(h.tagName[1])))].sort()
  const top = levels.find((l) => l >= 2) ?? levels[0]

  const sections: RuleSection[] = []
  let cur: { title: string; num?: string; kind: SectionKind; parts: string[] } | undefined
  let haveChapter = false
  const flush = () => {
    if (!cur) return
    const html = cur.parts.join('')
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (SKIP_TITLES.test(cur.title)) return
    if (!text && cur.kind !== 'part' && cur.kind !== 'chapter' && cur.kind !== 'section') return
    sections.push({ id: 's' + sections.length, title: cur.title, num: cur.num, kind: cur.kind, html, text })
  }
  const classify = (e: Element): { title: string; num?: string; kind: SectionKind } | undefined => {
    const raw = (e.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!raw || e.tagName === 'H1') return undefined
    const h = splitHeading(raw)
    if (NOTE_TITLES.test(h.title)) return { title: /errata/i.test(h.title) ? 'Errata' : /designer/i.test(h.title) ? 'Designer’s notes' : 'FAQ', kind: 'note' }
    if (numbered) {
      if (h.depth === 1) return { title: h.title, num: h.num, kind: 'chapter' }
      if (h.depth === 2) return { title: h.title, num: h.num, kind: 'section' }
      if (h.depth === 3) return { title: h.title, num: h.num, kind: 'sub' }
      if (isCaps(h.title)) return { title: titleCase(h.title), kind: 'part' }
      return { title: h.title, kind: haveChapter ? 'sub' : 'chapter' }
    }
    const lvl = Number(e.tagName[1])
    if (lvl <= top) return { title: isCaps(h.title) ? titleCase(h.title) : h.title, kind: 'chapter' }
    return { title: h.title, kind: lvl === top + 1 ? 'section' : 'sub' }
  }
  const visit = (el: Element) => {
    for (const n of [...el.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n.textContent?.trim()
        if (t && cur) cur.parts.push(t.replace(/</g, '&lt;'))
        continue
      }
      if (n.nodeType !== Node.ELEMENT_NODE) continue
      const e = n as Element
      if (/^H[1-4]$/.test(e.tagName)) {
        const c = classify(e)
        if (!c) continue
        flush()
        if (c.kind === 'chapter') haveChapter = true
        cur = { ...c, parts: [] }
        continue
      }
      if (e.querySelector('h1,h2,h3,h4')) {
        visit(e)
        continue
      }
      if (!cur) continue
      if (!(e.textContent ?? '').trim() && !e.querySelector('img,table')) continue
      cur.parts.push(clean(e, doc))
    }
  }
  visit(container)
  flush()
  return sections
}

const cache = new Map<string, Promise<RuleSection[] | undefined>>()

export function loadRulesPage(id: string): Promise<RuleSection[] | undefined> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`./wahapedia/${id}.html`)
      .then(async (r) => {
        if (!r.ok) return undefined
        const html = await r.text()
        // In dev Vite answers with the app itself when the file is missing
        if (html.includes('id="root"')) return undefined
        return parseRulesPage(html)
      })
      .catch(() => undefined)
    cache.set(id, p)
  }
  return p
}

export function useRulesPage(id: string) {
  const [state, setState] = useState<{ loading: boolean; sections?: RuleSection[] }>({ loading: true })
  useEffect(() => {
    let alive = true
    setState({ loading: true })
    loadRulesPage(id).then((sections) => alive && setState({ loading: false, sections }))
    return () => {
      alive = false
    }
  }, [id])
  return state
}
