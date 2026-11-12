// Faction picker: alliance tabs (Imperium, Chaos, Xenos…) and coloured faction tiles.
import { useState, type CSSProperties } from 'react'
import { factions } from '../data/bsdata'
import { useData } from '../data/dataStatus'
import { factionColor } from './faction'
import { Icon } from './kit'

export interface FactionChoice {
  id: string
  name: string
  short: string
}

export function FactionPicker({ value, onChange }: { value?: string; onChange: (f: FactionChoice) => void }) {
  const { meta } = useData()
  const groups = meta ? factions(meta) : []
  const initial = groups.find((g) => g.items.some((c) => c.id === value || c.short === value))?.group
  const [group, setGroup] = useState<string>()
  const current = group ?? initial ?? groups[0]?.group
  return (
    <>
      <div className="tabs-inline">
        {groups.map((g) => (
          <button key={g.group} className={g.group === current ? 'on' : ''} onClick={() => setGroup(g.group)}>
            {g.group}
          </button>
        ))}
      </div>
      <div className="faction-grid">
        {(groups.find((g) => g.group === current)?.items ?? []).map((c) => {
          const on = c.id === value || c.short === value
          return (
            <button
              key={c.id}
              className={'faction-tile' + (on ? ' on' : '')}
              style={{ '--accent': factionColor(c.name) } as CSSProperties}
              onClick={() => onChange({ id: c.id, name: c.name, short: c.short })}
              aria-pressed={on}
            >
              <span>{c.short}</span>
              {on && <span className="faction-check">{Icon.check(16)}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}
