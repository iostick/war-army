// Ventana emergente con el significado de una palabra clave o habilidad (en español, con el texto de BSData debajo).
import { createContext, Fragment, useCallback, useContext, useState, type ReactNode } from 'react'
import type { DataIndex } from '../engine/catalog'
import { lookup, useGlossary, type GlossaryEntry } from '../data/glossary'
import { lookupEs, type EsEntry } from '../data/glossaryEs'
import { Section, Sheet } from './kit'

interface Api {
  show: (term: string, index?: DataIndex, fallback?: GlossaryEntry) => void
}
const Ctx = createContext<Api>({ show: () => {} })
export const useTerm = () => useContext(Ctx)

interface Open {
  term: string
  es?: EsEntry
  entry?: GlossaryEntry
  /** Texto propio (habilidad de la ficha, mejora…): se muestra tal cual */
  own?: boolean
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const g = useGlossary()
  const [open, setOpen] = useState<Open>()
  const show = useCallback(
    (term: string, index?: DataIndex, fallback?: GlossaryEntry) => {
      const es = lookupEs(term)
      const entry = lookup(term, g, index) ?? fallback
      setOpen({ term, es, entry, own: !es && !!fallback && entry === fallback })
    },
    [g],
  )
  const close = () => setOpen(undefined)
  const faction = open && /^faction:\s*/i.test(open.term)
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {open && (
        <Sheet
          title={open.es?.es ?? open.entry?.name ?? open.term.replace(/^faction:\s*/i, '')}
          onClose={close}
          left={<span />}
          right={
            <button className="bar-button bold" onClick={close}>
              Cerrar
            </button>
          }
        >
          {open.es && (
            <Section header={open.es.ref ? `Reglamento ${open.es.ref} · ${open.term}` : open.term}>
              <div className="rule-text">{open.es.text}</div>
            </Section>
          )}
          {open.entry && (
            <Section header={open.es ? 'Texto de BSData (inglés)' : open.term !== open.entry.name ? open.term : undefined}>
              <div className="rule-text">
                <RichText text={open.entry.description} />
              </div>
            </Section>
          )}
          {!open.es && !open.entry && (
            <Section header={open.term}>
              <div className="rule-text">
                {faction
                  ? 'Clave de facción. Las habilidades de facción de una unidad solo se aplican si la facción que elegiste para el ejército coincide con esta clave (22.02).'
                  : 'Clave de la unidad. El reglamento básico no le da reglas propias: la usan las habilidades, mejoras y estratagemas de tu ejército para indicar a qué unidades afectan (p. ej. «una unidad ' +
                    open.term.toUpperCase() +
                    ' amiga»).'}
              </div>
            </Section>
          )}
        </Sheet>
      )}
    </Ctx.Provider>
  )
}

/** Palabra clave pulsable */
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

/** Texto con el formato de BSData: **negrita**, ^^CLAVE^^ y *cursiva*. Las marcas pueden anidarse o cruzarse. */
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
