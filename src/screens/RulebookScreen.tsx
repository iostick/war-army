// Reglamento completo (Wahapedia): índice por capítulos, buscador y lectura de cada capítulo.
import { useMemo, useState } from 'react'
import { RULE_PAGES, useRulesPage, type RuleSection } from '../data/wahaPages'
import { Row, Screen, Search, Section, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'

export function RulebookList() {
  const nav = useNav()
  return (
    <Section footer="Texto de Wahapedia (en inglés), descargado al publicar la app y actualizado cada día.">
      {RULE_PAGES.map((p) => (
        <Row key={p.id} title={p.title} sub={p.sub} chevron onClick={() => nav.push({ key: 'book:' + p.id, render: () => <RulebookScreen id={p.id} /> })} />
      ))}
    </Section>
  )
}

interface Chapter {
  head: RuleSection
  items: RuleSection[]
}

function chapters(sections: RuleSection[]): Chapter[] {
  const out: Chapter[] = []
  for (const s of sections) {
    if (s.level === 1 || !out.length) out.push({ head: s, items: [] })
    else out[out.length - 1].items.push(s)
  }
  return out
}

export function RulebookScreen({ id, back }: { id: string; back?: string }) {
  const page = RULE_PAGES.find((p) => p.id === id)!
  const { loading, sections } = useRulesPage(id)
  const [q, setQ] = useState('')
  const nav = useNav()
  const chs = useMemo(() => chapters(sections ?? []), [sections])
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2 || !sections) return []
    return sections.filter((s) => s.title.toLowerCase().includes(t) || s.text.toLowerCase().includes(t)).slice(0, 60)
  }, [q, sections])
  const open = (ch: Chapter, focus?: string) => nav.push({ key: 'ch:' + id + ch.head.id, render: () => <ChapterScreen ch={ch} focus={focus} back={page.title} /> })
  const chapterOf = (s: RuleSection) => chs.find((c) => c.head === s || c.items.includes(s))!
  return (
    <Screen title={page.title} back={back ?? 'Reglas'}>
      {loading && (
        <div className="empty">
          <Spinner />
        </div>
      )}
      {!loading && !sections?.length && <div className="empty">Este texto aún no está descargado. Se descarga de Wahapedia al publicar la app; vuelve a abrirla con conexión.</div>}
      {!!sections?.length && (
        <>
          <Search value={q} onChange={setQ} placeholder="Buscar en el reglamento (p. ej. cover, visible)" />
          {q.trim().length >= 2 ? (
            <Section header={`${hits.length} resultados`}>
              {hits.map((s) => (
                <Row key={s.id} title={s.title} sub={snippet(s.text, q)} chevron onClick={() => open(chapterOf(s), s.id)} />
              ))}
            </Section>
          ) : (
            <Section>
              {chs.map((c) => (
                <Row key={c.head.id} title={c.head.title} sub={c.items.length ? c.items.slice(0, 4).map((i) => i.title).join(' · ') : undefined} chevron onClick={() => open(c)} />
              ))}
            </Section>
          )}
        </>
      )}
    </Screen>
  )
}

function snippet(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.trim().toLowerCase())
  if (i < 0) return text.slice(0, 90)
  const start = Math.max(0, i - 40)
  return (start ? '…' : '') + text.slice(start, i + 80) + '…'
}

function ChapterScreen({ ch, focus, back }: { ch: Chapter; focus?: string; back: string }) {
  return (
    <Screen title={ch.head.title} back={back}>
      {[ch.head, ...ch.items].map((s) => (
        <Section key={s.id} header={s === ch.head ? undefined : s.title}>
          <div
            className={'rule-text rulebook' + (s.id === focus ? ' focus' : '')}
            ref={(el) => {
              if (el && s.id === focus) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50)
            }}
            dangerouslySetInnerHTML={{ __html: s.html }}
          />
        </Section>
      ))}
    </Screen>
  )
}
