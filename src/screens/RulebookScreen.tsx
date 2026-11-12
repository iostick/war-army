// Full rulebook (Wahapedia): parts → chapters → numbered sections, with search and collapsible FAQs.
import { Fragment, useMemo, useState } from 'react'
import { RULE_PAGES, useRulesPage, type RuleSection } from '../data/wahaPages'
import { Row, Screen, Search, Section, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'
import { MissionsScreen } from './MissionsScreen'

export function RulebookList() {
  const nav = useNav()
  return (
    <Section footer="Text from Wahapedia, downloaded when the app is published and refreshed daily.">
      <Row title="Missions" sub="Mission matrix, primary and secondary missions, deployments" chevron onClick={() => nav.push({ key: 'missions', render: () => <MissionsScreen /> })} />
      {RULE_PAGES.map((p) => (
        <Row key={p.id} title={p.title} sub={p.sub} chevron onClick={() => nav.push({ key: 'book:' + p.id, render: () => <RulebookScreen id={p.id} /> })} />
      ))}
    </Section>
  )
}

interface Block {
  head: RuleSection
  /** sub-headings and FAQ/errata notes inside this section */
  subs: RuleSection[]
}
interface Chapter {
  part?: string
  head: RuleSection
  intro: RuleSection[]
  blocks: Block[]
  all: RuleSection[]
}

function chapters(sections: RuleSection[]): Chapter[] {
  const out: Chapter[] = []
  let part: string | undefined
  for (const s of sections) {
    if (s.kind === 'part') {
      part = s.title
      continue
    }
    if (s.kind === 'chapter' || !out.length) {
      out.push({ part, head: s, intro: [], blocks: [], all: [s] })
      continue
    }
    const ch = out[out.length - 1]
    ch.all.push(s)
    if (s.kind === 'section') ch.blocks.push({ head: s, subs: [] })
    else if (ch.blocks.length) ch.blocks[ch.blocks.length - 1].subs.push(s)
    else ch.intro.push(s)
  }
  return out.filter((c) => c.all.some((s) => s.text))
}

export function RulebookScreen({ id, back }: { id: string; back?: string }) {
  const page = RULE_PAGES.find((p) => p.id === id)!
  const { loading, sections } = useRulesPage(id)
  const [q, setQ] = useState('')
  const nav = useNav()
  const chs = useMemo(() => chapters(sections ?? []), [sections])
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return []
    return chs.flatMap((c) => c.all.filter((s) => s.kind !== 'note' || s.text).filter((s) => s.title.toLowerCase().includes(t) || s.text.toLowerCase().includes(t)).map((s) => ({ s, c }))).slice(0, 60)
  }, [q, chs])
  const open = (ch: Chapter, focus?: string) => nav.push({ key: 'ch:' + id + ch.head.id, render: () => <ChapterScreen ch={ch} focus={focus} back={page.title} /> })
  const parts = useMemo(() => {
    const m: { part?: string; chs: Chapter[] }[] = []
    for (const c of chs) {
      if (!m.length || m[m.length - 1].part !== c.part) m.push({ part: c.part, chs: [] })
      m[m.length - 1].chs.push(c)
    }
    return m
  }, [chs])
  return (
    <Screen title={page.title} back={back ?? 'Rules'}>
      {loading && (
        <div className="empty">
          <Spinner />
        </div>
      )}
      {!loading && !chs.length && <div className="empty">This text isn't downloaded yet. It's fetched from Wahapedia when the app is published; reopen it while online.</div>}
      {!!chs.length && (
        <>
          <Search value={q} onChange={setQ} placeholder="Search the rules (e.g. cover, visible)" />
          {q.trim().length >= 2 ? (
            <Section header={`${hits.length} results`}>
              {hits.map(({ s, c }) => (
                <Row key={s.id} title={s.kind === 'note' ? `${c.head.title} · ${s.title}` : s.title} leading={s.num ? <span className="rule-num">{s.num}</span> : undefined} sub={snippet(s.text, q)} chevron onClick={() => open(c, s.id)} />
              ))}
            </Section>
          ) : (
            parts.map((p, i) => (
              <Section key={i} header={p.part}>
                {p.chs.map((c) => (
                  <Row
                    key={c.head.id}
                    leading={<span className="rule-num big">{c.head.num ?? '•'}</span>}
                    title={c.head.title}
                    sub={c.blocks.length ? c.blocks.slice(0, 4).map((b) => b.head.title).join(' · ') : undefined}
                    chevron
                    onClick={() => open(c)}
                  />
                ))}
              </Section>
            ))
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

function Body({ s, focus }: { s: RuleSection; focus?: string }) {
  const ref = (el: HTMLElement | null) => {
    if (el && s.id === focus) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50)
  }
  if (s.kind === 'note')
    return (
      <details className="rule-note" open={s.id === focus} ref={ref}>
        <summary>{s.title}</summary>
        <div className="rulebook" dangerouslySetInnerHTML={{ __html: s.html }} />
      </details>
    )
  return (
    <>
      {s.kind === 'sub' && (
        <h4 className="rule-sub" ref={ref}>
          {s.title}
          {s.num && <span className="rule-num">{s.num}</span>}
        </h4>
      )}
      {s.html && <div className="rulebook" ref={s.kind === 'sub' ? undefined : ref} dangerouslySetInnerHTML={{ __html: s.html }} />}
    </>
  )
}

function ChapterScreen({ ch, focus, back }: { ch: Chapter; focus?: string; back: string }) {
  return (
    <Screen title={ch.head.title} subtitle={[ch.part, ch.head.num && `Section ${ch.head.num}`].filter(Boolean).join(' · ') || undefined} back={back}>
      {(ch.head.html || ch.intro.length > 0) && (
        <Section>
          <div className={'rule-text' + (focus === ch.head.id ? ' focus' : '')}>
            <Body s={ch.head} focus={focus} />
            {ch.intro.map((s) => (
              <Body key={s.id} s={s} focus={focus} />
            ))}
          </div>
        </Section>
      )}
      {ch.blocks.map((b) => (
        <Section key={b.head.id} header={b.head.title} headerRight={b.head.num && <span className="rule-num">{b.head.num}</span>}>
          <div className={'rule-text' + ([b.head, ...b.subs].some((s) => s.id === focus) ? ' focus' : '')}>
            <Body s={b.head} focus={focus} />
            {b.subs.map((s) => (
              <Fragment key={s.id}>
                <Body s={s} focus={focus} />
              </Fragment>
            ))}
          </div>
        </Section>
      ))}
    </Screen>
  )
}
