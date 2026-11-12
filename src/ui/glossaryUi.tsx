// Popup explaining a keyword or ability: BSData text when it has one, otherwise our core-rules summary.
import { createContext, Fragment, useCallback, useContext, useState, type ReactNode } from 'react'
import type { DataIndex } from '../engine/catalog'
import { lookup, useGlossary, type GlossaryEntry } from '../data/glossary'
import { lookupCore, type CoreEntry } from '../data/glossaryCore'
import { Section, Sheet } from './kit'

interface Api {
  show: (term: string, index?: DataIndex, fallback?: GlossaryEntry) => void
}
const Ctx = createContext<Api>({ show: () => {} })
export const useTerm = () => useContext(Ctx)

interface Open {
  term: string
  core?: CoreEntry
  entry?: GlossaryEntry
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const g = useGlossary()
  const [open, setOpen] = useState<Open>()
  const show = useCallback(
    (term: string, index?: DataIndex, fallback?: GlossaryEntry) => {
      setOpen({ term, core: lookupCore(term), entry: lookup(term, g, index) ?? fallback })
    },
    [g],
  )
  const close = () => setOpen(undefined)
  const faction = open && /^faction:\s*/i.test(open.term)
  // For abilities BSData already has the full English text; the summary is only needed for keywords or when BSData has nothing
  const summary = open?.core && (open.core.kind === 'keyword' || !open.entry) ? open.core : undefined
  const ref = open?.core?.ref ? `Core rules ${open.core.ref}` : undefined
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {open && (
        <Sheet
          title={open.entry?.name ?? open.core?.name ?? open.term.replace(/^faction:\s*/i, '')}
          onClose={close}
          left={<span />}
          right={
            <button className="bar-button bold" onClick={close}>
              Close
            </button>
          }
        >
          {summary && (
            <Section header={ref ? `${ref} · ${open.term}` : open.term}>
              <div className="rule-text">{summary.text}</div>
            </Section>
          )}
          {open.entry && (
            <Section header={summary ? 'BSData text' : ref ?? (open.term !== open.entry.name ? open.term : undefined)}>
              <div className="rule-text">
                <RichText text={open.entry.description} />
              </div>
            </Section>
          )}
          {!open.core && !open.entry && (
            <Section header={open.term}>
              <div className="rule-text">
                {faction
                  ? "Faction keyword. A unit's faction abilities only apply if the faction you chose for your army matches this keyword (22.02)."
                  : `Unit keyword. The core rules give it no rules of its own: your army's abilities, enhancements and stratagems use it to say which units they affect (e.g. “a friendly ${open.term.toUpperCase()} unit”).`}
              </div>
            </Section>
          )}
        </Sheet>
      )}
    </Ctx.Provider>
  )
}

/** Tappable keyword */
export function Kw({ term, index, className }: { term: string; index?: DataIndex; className?: string }) {
  const { show } = useTerm()
  return (
    <button
      className={'chip kw-chip ' + (className ?? '')}
      onClick={(e) => {
        e.stopPropagation()
        show(term, index)
      }}
    >
      {term}
    </button>
  )
}

/** BSData-formatted text: **bold**, ^^KEYWORD^^ and *italics*. Marks can nest or overlap. */
export function RichText({ text }: { text: string }) {
  const tokens = text.split(/(\*\*|\^\^)/)
  let bold = false
  let kw = false
  const out: ReactNode[] = []
  tokens.forEach((t, i) => {
    if (t === '**') return void (bold = !bold)
    if (t === '^^') return void (kw = !kw)
    if (!t) return
    let node: ReactNode = italics(t)
    if (kw) node = <span className="kw-inline">{node}</span>
    if (bold) node = <strong style={{ color: 'var(--label)' }}>{node}</strong>
    out.push(<Fragment key={i}>{node}</Fragment>)
  })
  return <>{out}</>
}

function italics(t: string): ReactNode {
  const parts = t.split(/(\*[^*\n]+\*)/g)
  if (parts.length === 1) return t
  return parts.map((p, i) => (p.length > 2 && p.startsWith('*') && p.endsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : p))
}
