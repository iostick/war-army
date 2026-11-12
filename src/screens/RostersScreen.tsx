// Mis listas: listado y creación de listas de ejército.
import { useEffect, useState, type CSSProperties } from 'react'
import { factions, getIndex } from '../data/bsdata'
import { useData } from '../data/dataStatus'
import { rosterStore } from '../data/rosterStore'
import { summarize } from '../data/session'
import { createRoster } from '../engine/ops'
import type { Roster } from '../engine/roster'
import { Icon, Screen, Section, Segmented, Sheet, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'
import { factionColor, shortFaction } from '../ui/faction'
import { RosterScreen } from './RosterScreen'
import { FactionPicker } from '../ui/factionPicker'

export function RostersScreen() {
  const nav = useNav()
  const [rosters, setRosters] = useState<Roster[]>()
  const [creating, setCreating] = useState(false)

  const reload = () => rosterStore.all().then(setRosters)
  useEffect(() => {
    reload()
    // Al volver de una lista, refrescamos el resumen
    const t = setInterval(reload, 1500)
    return () => clearInterval(t)
  }, [])

  const open = (uid: string) => nav.push({ key: 'roster:' + uid, render: () => <RosterScreen uid={uid} /> })

  return (
    <Screen
      title="Listas"
      right={
        <button className="bar-button" onClick={() => setCreating(true)} aria-label="Nueva lista">
          {Icon.plus()}
        </button>
      }
    >
      {rosters && rosters.length === 0 && (
        <div className="empty">
          <div className="big-icon">{Icon.shield()}</div>
          <h2>Sin listas todavía</h2>
          <p>Crea tu primera lista de ejército de la 11ª edición.</p>
          <button className="button-filled" onClick={() => setCreating(true)}>
            Nueva lista
          </button>
        </div>
      )}
      {rosters && rosters.length > 0 && (
        <div className="roster-cards">
          {rosters.map((r) => {
            const s = r.summary
            const over = s && s.limit > 0 && s.points > s.limit
            const pct = s && s.limit ? Math.min(100, (s.points / s.limit) * 100) : 0
            return (
              <button key={r.uid} className="roster-card" style={{ '--accent': factionColor(s?.faction) } as CSSProperties} onClick={() => open(r.uid)}>
                <div className="roster-card-top">
                  <span className="roster-faction">{shortFaction(s?.faction) || 'Lista'}</span>
                  {s &&
                    (s.errors > 0 || over ? (
                      <span className="pill glass">
                        {Icon.warning(12)} {s.errors} {s.errors === 1 ? 'aviso' : 'avisos'}
                      </span>
                    ) : (
                      <span className="pill glass">{Icon.checkCircle(12)} Válida</span>
                    ))}
                </div>
                <div className="roster-name">{r.name}</div>
                {s && (
                  <div className="roster-points">
                    <b>{Math.round(s.points)}</b> / {s.limit} pts
                    <div className="meter glass">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                <span className="roster-mark">{Icon.shield(110)}</span>
              </button>
            )
          })}
        </div>
      )}
      {creating && (
        <NewRosterSheet
          onClose={() => setCreating(false)}
          onCreated={(uid) => {
            setCreating(false)
            reload()
            open(uid)
          }}
        />
      )}
    </Screen>
  )
}

function NewRosterSheet(props: { onClose: () => void; onCreated: (uid: string) => void }) {
  const { meta } = useData()
  const [name, setName] = useState('')
  const [points, setPoints] = useState(2000)
  const [cat, setCat] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const groups = meta ? factions(meta) : []
  const chosen = groups.flatMap((g) => g.items).find((c) => c.id === cat)

  const create = async () => {
    if (!cat) return
    setBusy(true)
    try {
      const index = await getIndex(cat)
      const roster = createRoster(index, name.trim() || `${chosen?.short ?? 'Ejército'} ${points}`, cat, points)
      roster.summary = summarize(index, roster)
      await rosterStore.put(roster)
      props.onCreated(roster.uid)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet
      title="Nueva lista"
      onClose={props.onClose}
      right={
        <button className="bar-button bold" disabled={!cat || busy} onClick={create}>
          Crear
        </button>
      }
    >
      {busy ? (
        <div className="empty">
          <Spinner />
          <p>Preparando {chosen?.short}…</p>
        </div>
      ) : (
        <>
          <Section>
            <div className="row">
              <input className="text-input" placeholder={chosen ? `${chosen.short} ${points}` : 'Nombre de la lista'} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </Section>
          <Segmented
            value={points}
            onChange={setPoints}
            options={[
              { value: 1000, label: 'Incursion · 1000' },
              { value: 2000, label: 'Strike Force · 2000' },
              { value: 3000, label: 'Onslaught · 3000' },
            ]}
          />
          {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
          <FactionPicker value={cat} onChange={(f) => setCat(f.id)} />
        </>
      )}
    </Sheet>
  )
}
