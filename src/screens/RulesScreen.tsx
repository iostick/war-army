// Reglas: estratagemas generales, construcción de ejércitos, ronda de batalla y glosario de habilidades.
import { useState } from 'react'
import { BATTLE_ROUND, MUSTER_RULES } from '../data/coreRules'
import { useGlossary } from '../data/glossary'
import { RichText } from '../ui/glossaryUi'
import { Row, Screen, Search, Section } from '../ui/kit'
import { StratagemList } from './GameScreen'
import { RulebookList } from './RulebookScreen'

type Tab = 'book' | 'strat' | 'muster' | 'round' | 'glossary'

export function RulesScreen() {
  const [tab, setTab] = useState<Tab>('book')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string>()
  const g = useGlossary()
  const entries = [...(g?.values() ?? [])].filter((e) => e.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Screen title="Rules">
      <div className="tabs-inline">
        {(
          [
            ['book', 'Rulebook'],
            ['strat', 'Stratagems'],
            ['muster', 'Muster armies'],
            ['round', 'Battle round'],
            ['glossary', 'Abilities'],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'book' && <RulebookList />}
      {tab === 'strat' && <StratagemList />}
      {tab === 'muster' && (
        <Section footer="What the app checks when validating your lists.">
          {MUSTER_RULES.map((r) => (
            <div className="rule-text" key={r.title}>
              <b>{r.title}</b>
              {r.text}
            </div>
          ))}
        </Section>
      )}
      {tab === 'round' && (
        <Section>
          {BATTLE_ROUND.map((r) => (
            <div className="rule-text" key={r.title}>
              <b>{r.title}</b>
              {r.text}
            </div>
          ))}
        </Section>
      )}
      {tab === 'glossary' && (
        <>
          <Search value={q} onChange={setQ} placeholder="Search ability (e.g. Lethal Hits)" />
          <Section footer="Universal rules text from the BSData 11th edition data.">
            {entries.map((e) =>
              open === e.name ? (
                <div className="rule-text" key={e.name} onClick={() => setOpen(undefined)}>
                  <b>{e.name}</b>
                  <RichText text={e.description} />
                </div>
              ) : (
                <Row key={e.name} title={e.name} chevron onClick={() => setOpen(e.name)} />
              ),
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}
