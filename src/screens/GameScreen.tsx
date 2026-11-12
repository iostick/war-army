// Partida: rondas, puntos de mando (CP) y puntos de victoria (VP) de ambos jugadores.
import { useState } from 'react'
import { games, type Game } from '../data/db'
import { rosterStore } from '../data/rosterStore'
import { useTable } from '../data/useTable'
import { uid } from '../engine/roster'
import { CORE_STRATAGEMS } from '../data/coreRules'
import { Icon, Row, Screen, Section, Sheet, Stepper } from '../ui/kit'
import { useNav } from '../ui/nav'
import { RosterScreen } from './RosterScreen'

export function GamesScreen() {
  const list = useTable('games', () => games.all().then((l) => l.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))))
  const [creating, setCreating] = useState(false)
  const nav = useNav()
  const open = (id: string) => nav.push({ key: 'game:' + id, render: () => <GameScreen id={id} /> })
  const active = (list ?? []).filter((g) => !g.finished)
  const done = (list ?? []).filter((g) => g.finished)
  return (
    <Screen
      title="Partidas"
      right={
        <button className="bar-button" onClick={() => setCreating(true)} aria-label="Nueva partida">
          {Icon.plus()}
        </button>
      }
    >
      {list && list.length === 0 && (
        <div className="empty">
          <div className="big-icon">{Icon.dice(56)}</div>
          <h2>Sin partidas</h2>
          <p>Lleva el marcador de tus partidas: rondas, CP y VP de los dos jugadores, con tu lista a mano.</p>
          <button className="button-filled" onClick={() => setCreating(true)}>
            Empezar partida
          </button>
        </div>
      )}
      {active.length > 0 && (
        <Section header="En curso">
          {active.map((g) => (
            <Row key={g.id} title={`${g.rosterName ?? 'Mi ejército'} vs ${g.opponent || 'Rival'}`} sub={`Ronda ${g.round} · ${g.mission || 'Sin misión'}`} detail={`${g.vp[0]}–${g.vp[1]}`} chevron onClick={() => open(g.id)} />
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Section header="Historial">
          {done.map((g) => (
            <Row
              key={g.id}
              title={`${g.rosterName ?? 'Mi ejército'} vs ${g.opponent || 'Rival'}`}
              sub={new Date(g.createdAt).toLocaleDateString('es-ES')}
              accessory={<span className={'pill ' + (g.vp[0] > g.vp[1] ? 'green' : g.vp[0] < g.vp[1] ? 'red' : '')}>{g.vp[0] > g.vp[1] ? 'Victoria' : g.vp[0] < g.vp[1] ? 'Derrota' : 'Empate'} {g.vp[0]}–{g.vp[1]}</span>}
              chevron
              onClick={() => open(g.id)}
            />
          ))}
        </Section>
      )}
      {creating && (
        <NewGameSheet
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            open(id)
          }}
        />
      )}
    </Screen>
  )
}

function NewGameSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const rosters = useTable('rosters', () => rosterStore.all())
  const [roster, setRoster] = useState<string>()
  const [opponent, setOpponent] = useState('')
  const [oppFaction, setOppFaction] = useState('')
  const [mission, setMission] = useState('')
  const create = async () => {
    const r = rosters?.find((x) => x.uid === roster)
    const now = new Date().toISOString()
    const g: Game = { id: uid(), rosterUid: r?.uid, rosterName: r?.name, opponent, opponentFaction: oppFaction, mission, round: 1, cp: [0, 0], vp: [0, 0], notes: '', finished: false, createdAt: now, updatedAt: now }
    await games.put(g)
    onCreated(g.id)
  }
  return (
    <Sheet
      title="Nueva partida"
      onClose={onClose}
      right={
        <button className="bar-button bold" onClick={create}>
          Empezar
        </button>
      }
    >
      <Section header="Rival">
        <div className="row">
          <input className="text-input" placeholder="Nombre del rival" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </div>
        <div className="row">
          <input className="text-input" placeholder="Su facción" value={oppFaction} onChange={(e) => setOppFaction(e.target.value)} />
        </div>
        <div className="row">
          <input className="text-input" placeholder="Misión o disposiciones" value={mission} onChange={(e) => setMission(e.target.value)} />
        </div>
      </Section>
      <Section header="Mi lista">
        <Row title="Sin lista" checked={!roster} onClick={() => setRoster(undefined)} />
        {(rosters ?? []).map((r) => (
          <Row key={r.uid} title={r.name} sub={r.summary ? `${r.summary.faction} · ${r.summary.points} pts` : undefined} checked={roster === r.uid} onClick={() => setRoster(r.uid)} />
        ))}
      </Section>
    </Sheet>
  )
}

export function GameScreen({ id }: { id: string }) {
  const g = useTable('games', () => games.get(id), [id])
  const nav = useNav()
  const [strats, setStrats] = useState(false)
  if (!g) return <Screen title="">{null}</Screen>
  const save = (patch: Partial<Game>) => games.put({ ...g, ...patch, updatedAt: new Date().toISOString() })
  const setPair = (key: 'cp' | 'vp', i: 0 | 1, v: number) => {
    const next = [...g[key]] as [number, number]
    next[i] = Math.max(0, v)
    save({ [key]: next } as Partial<Game>)
  }
  return (
    <Screen title={`Ronda ${g.round}`} back="Partidas" subtitle={`${g.rosterName ?? 'Mi ejército'} vs ${g.opponent || 'Rival'}${g.mission ? ' · ' + g.mission : ''}`}>
      <div className="score-grid">
        {([0, 1] as const).map((i) => (
          <div className="score-card" key={i}>
            <h3>{i === 0 ? 'Yo' : g.opponent || 'Rival'}</h3>
            <div className="label">VP</div>
            <div className="big-number">{g.vp[i]}</div>
            <Stepper value={g.vp[i]} onChange={(v) => setPair('vp', i, v)} />
            <div className="label">CP</div>
            <div className="big-number" style={{ fontSize: 30 }}>
              {g.cp[i]}
            </div>
            <Stepper value={g.cp[i]} onChange={(v) => setPair('cp', i, v)} />
          </div>
        ))}
      </div>
      <Section header="Ronda" footer="Al pasar de ronda, cada jugador gana 1CP (fase de mando).">
        <Row title="Ronda actual" accessory={<Stepper value={g.round} min={1} max={5} onChange={(v) => save({ round: v })} />} />
        <Row
          title="Siguiente ronda (+1CP cada uno)"
          className={'action' + (g.round >= 5 ? ' disabled' : '')}
          icon={Icon.refresh(16)}
          onClick={() => save({ round: Math.min(5, g.round + 1), cp: [g.cp[0] + 1, g.cp[1] + 1] })}
        />
      </Section>
      <Section>
        <Row title="Estratagemas generales" icon={Icon.list(16)} chevron onClick={() => setStrats(true)} />
        {g.rosterUid && <Row title="Ver mi lista" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'roster:' + g.rosterUid, render: () => <RosterScreen uid={g.rosterUid!} /> })} />}
      </Section>
      <Section header="Notas">
        <div className="row">
          <textarea className="text-input" rows={3} defaultValue={g.notes} onBlur={(e) => save({ notes: e.target.value })} placeholder="Objetivos secundarios, jugadas clave…" />
        </div>
      </Section>
      <Section>
        {g.finished ? (
          <Row title="Reabrir partida" className="action" onClick={() => save({ finished: false })} />
        ) : (
          <Row title="Terminar partida" className="action" onClick={() => save({ finished: true })} />
        )}
        <Row
          title="Borrar partida"
          className="destructive"
          onClick={async () => {
            if (!confirm('¿Borrar esta partida?')) return
            await games.delete(g.id)
            nav.pop()
          }}
        />
      </Section>
      {strats && (
        <Sheet title="Estratagemas generales" onClose={() => setStrats(false)} left={<span />} right={<button className="bar-button bold" onClick={() => setStrats(false)}>Cerrar</button>}>
          <StratagemList />
        </Sheet>
      )}
    </Screen>
  )
}

export function StratagemList() {
  return (
    <Section footer="Resumen propio de las estratagemas del reglamento de la 11ª (sección 15).">
      {CORE_STRATAGEMS.map((s) => (
        <div className="rule-text" key={s.name}>
          <b>
            {s.name} · {s.cp} <span style={{ color: 'var(--label-3)', fontWeight: 500 }}>({s.ref})</span>
          </b>
          <strong style={{ color: 'var(--label)' }}>Cuándo:</strong> {s.when}
          {'\n'}
          <strong style={{ color: 'var(--label)' }}>Objetivo:</strong> {s.target}
          {'\n'}
          <strong style={{ color: 'var(--label)' }}>Efecto:</strong> {s.effect}
          {s.limit && (
            <>
              {'\n'}
              <strong style={{ color: 'var(--label)' }}>Restricción:</strong> {s.limit}
            </>
          )}
        </div>
      ))}
    </Section>
  )
}
