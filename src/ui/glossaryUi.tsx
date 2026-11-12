// Ventana emergente con el significado de una palabra clave o habilidad.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { DataIndex } from '../engine/catalog'
import { lookup, useGlossary, type GlossaryEntry } from '../data/glossary'
import { Section, Sheet } from './kit'

interface Api {
  show: (term: string, index?: DataIndex, fallback?: GlossaryEntry) => void
}
const Ctx = createContext<Api>({ show: () => {} })
export const useTerm = () => useContext(Ctx)

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const g = useGlossary()
  const [open, setOpen] = useState<{ term: string; entry?: GlossaryEntry }>()
  const show = useCallback(
    (term: string, index?: DataIndex, fallback?: GlossaryEntry) => setOpen({ term, entry: lookup(term, g, index) ?? fallback }),
    [g],
  )
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {open && (
        <Sheet
          title={open.entry?.name ?? open.term}
          onClose={() => setOpen(undefined)}
          left={<span />}
          right={
            <button className="bar-button bold" onClick={() => setOpen(undefined)}>
              Cerrar
            </button>
          }
        >
          <Section header={open.term !== open.entry?.name ? open.term : undefined}>
            <div className="rule-text">{open.entry ? <RichText text={open.entry.description} /> : 'No hay descripción para esta palabra clave en los datos de BSData.'}</div>
          </Section>
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

/** Texto con **negritas** y saltos de línea (formato de BSData) */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\^\^[^^]+\^\^|\*[^*\n]+\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') || p.startsWith('^^') ? (
          <strong key={i} style={{ color: 'var(--label)' }}>
            {p.slice(2, -2)}
          </strong>
        ) : p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}
