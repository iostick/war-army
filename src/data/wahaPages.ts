// Páginas de reglas de Wahapedia (reglas básicas, misiones del Event Companion, apéndice).
// Se descargan al publicar la app y aquí se trocean en capítulos para leerlas dentro de la app.
import { useEffect, useState } from 'react'

export interface RuleSection {
  id: string
  title: string
  /** 1 = capítulo, 2 = apartado */
  level: number
  /** HTML ya limpio (solo etiquetas seguras) */
  html: string
  text: string
}

export const RULE_PAGES = [
  { id: 'core-rules', title: 'Reglas básicas', sub: 'Movimiento, visión, terreno, disparo, combate…' },
  { id: 'warhammer-event-companion', title: 'Misiones', sub: 'Misiones primarias, secundarias y despliegues' },
  { id: 'rules-appendix', title: 'Apéndice de reglas', sub: 'Aclaraciones y casos especiales' },
] as const

const ALLOWED = new Set(['P', 'B', 'STRONG', 'I', 'EM', 'BR', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'H4', 'H5', 'H6', 'IMG', 'SPAN', 'DIV', 'SUP', 'SUB'])
const SKIP_TITLES = /^(books|contents|table of contents|faq|errata)$/i

/** Limpia un fragmento: deja solo etiquetas y atributos seguros */
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
        copy(e, dst) // se queda con el texto (enlaces, etc.)
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

export function parseRulesPage(html: string): RuleSection[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,noscript,nav,header,footer,iframe,form,button,input,select,textarea,svg,canvas').forEach((e) => e.remove())
  const heads = [...doc.body.querySelectorAll('h1,h2,h3')]
  if (!heads.length) return []
  // Contenedor principal: el más profundo que tenga la mayoría de los títulos
  let container: Element = doc.body
  const need = Math.ceil(heads.length * 0.75)
  for (;;) {
    const child = [...container.children].find((c) => heads.filter((h) => c.contains(h)).length >= need)
    if (!child) break
    container = child
  }
  const levels = [...new Set(heads.filter((h) => container.contains(h)).map((h) => Number(h.tagName[1])))].sort()
  const top = levels.find((l) => l >= 2) ?? levels[0]
  const sections: RuleSection[] = []
  let cur: { title: string; level: number; parts: string[] } | undefined
  const flush = () => {
    if (cur && cur.parts.join('').replace(/<[^>]+>/g, '').trim() && !SKIP_TITLES.test(cur.title)) {
      const html = cur.parts.join('')
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      sections.push({ id: 's' + sections.length, title: cur.title, level: cur.level, html, text })
    }
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
      const m = /^H([1-3])$/.exec(e.tagName)
      if (m) {
        const title = (e.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (!title) continue
        flush()
        cur = { title, level: Number(m[1]) <= top ? 1 : 2, parts: [] }
        continue
      }
      if (e.querySelector('h1,h2,h3')) {
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
        // En desarrollo Vite responde con la propia app si falta el archivo
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
