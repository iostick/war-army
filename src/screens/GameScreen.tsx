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
import { RulebookScreen } from './RulebookScreen'
import { FactionPicker } from '../ui/factionPicker'
import { useRoster } from '../data/session'
import { detachments } from '../engine/rules11'
import { DetachmentStratagems, StratagemCard, WahapediaCredit } from '../ui/wahapediaUi'
import { coreStratagems, useWahapedia } from '../data/wahapedia'

export function GamesScreen() {
  const list = useTable('games', () => games.all().then((l) => l.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))))
  const [creating, setCreating] = useState(false)
  const nav = useNav()
  const open = (id: string) => nav.push({ key: 'game:' + id, render: () => <GameScreen id={id} /> })
  const active = (list ?? []).filter((g) => !g.finished)
  const done = (list ?? []).filter((g) => g.finished)
  return (
    <Screen
      title="Games"
      right={
        <button className="bar-button" onClick={() => setCreating(true)} aria-label="New game">
          {Icon.plus()}
        </button>
      }
    >
      {list && list.length === 0 && (
        <div className="empty">
          <div className="big-icon">{Icon.dice(56)}</div>
          <h2>No games</h2>
          <p>Track your games: rounds, CP and VP for both players, with your list at hand.</p>
          <button className="button-filled" onClick={() => setCreating(true)}>
            Start game
          </button>
        </div>
      )}
      {active.length > 0 && (
        <Section header="In progress">
          {active.map((g) => (
            <Row key={g.id} title={`${g.rosterName ?? 'My army'} vs ${g.opponent || 'Opponent'}`} sub={`Round ${g.round} · ${g.mission || 'No mission'}`} detail={`${g.vp[0]}–${g.vp[1]}`} chevron onClick={() => open(g.id)} />
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Section header="History">
          {done.map((g) => (
            <Row
              key={g.id}
              title={`${g.rosterName ?? 'My army'} vs ${g.opponent || 'Opponent'}`}
              sub={new Date(g.createdAt).toLocaleDateString('en-GB')}
              accessory={<span className={'pill ' + (g.vp[0] > g.vp[1] ? 'green' : g.vp[0] < g.vp[1] ? 'red' : '')}>{g.vp[0] > g.vp[1] ? 'Win' : g.vp[0] < g.vp[1] ? 'Loss' : 'Draw'} {g.vp[0]}–{g.vp[1]}</span>}
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
      title="New game"
      onClose={onClose}
      right={
        <button className="bar-button bold" onClick={create}>
          Start
        </button>
      }
    >
      <Section header="Opponent">
        <div className="row">
          <input className="text-input" placeholder="Opponent's name" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </div>
        <div className="row">
          <input className="text-input" placeholder="Mission or deployment" value={mission} onChange={(e) => setMission(e.target.value)} />
        </div>
      </Section>
      <div className="section-header">
        <span>Their army</span>
      </div>
      <FactionPicker value={oppFaction} onChange={(f) => setOppFaction(f.short)} />
      <Section header="My list">
        <Row title="No list" checked={!roster} onClick={() => setRoster(undefined)} />
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
    <Screen title={`Round ${g.round}`} back="Games" subtitle={`${g.rosterName ?? 'My army'} vs ${g.opponent || 'Opponent'}${g.opponentFaction ? ` (${g.opponentFaction})` : ''}${g.mission ? ' · ' + g.mission : ''}`}>
      <div className="score-grid">
        {([0, 1] as const).map((i) => (
          <div className="score-card" key={i}>
            <h3>{i === 0 ? 'Me' : g.opponent || 'Opponent'}</h3>
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
      <Section header="Round" footer="When the round advances, each player gains 1CP (Command phase).">
        <Row title="Current round" accessory={<Stepper value={g.round} min={1} max={5} onChange={(v) => save({ round: v })} />} />
        <Row
          title="Next round (+1CP each)"
          className={'action' + (g.round >= 5 ? ' disabled' : '')}
          icon={Icon.refresh(16)}
          onClick={() => save({ round: Math.min(5, g.round + 1), cp: [g.cp[0] + 1, g.cp[1] + 1] })}
        />
      </Section>
      <Section>
        <Row title="Stratagems" icon={Icon.list(16)} chevron onClick={() => setStrats(true)} />
        <Row title="Missions (primary and secondary)" icon={Icon.dice(16)} chevron onClick={() => nav.push({ key: 'book:missions', render: () => <RulebookScreen id="warhammer-event-companion" back="Game" /> })} />
        <Row title="Core rules" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'book:core', render: () => <RulebookScreen id="core-rules" back="Game" /> })} />
        {g.rosterUid && <Row title="View my list" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'roster:' + g.rosterUid, render: () => <RosterScreen uid={g.rosterUid!} /> })} />}
      </Section>
      <Section header="Notes">
        <div className="row">
          <textarea className="text-input" rows={3} defaultValue={g.notes} onBlur={(e) => save({ notes: e.target.value })} placeholder="Secondary objectives, key plays…" />
        </div>
      </Section>
      <Section>
        {g.finished ? (
          <Row title="Reopen game" className="action" onClick={() => save({ finished: false })} />
        ) : (
          <Row title="End game" className="action" onClick={() => save({ finished: true })} />
        )}
        <Row
          title="Delete game"
          className="destructive"
          onClick={async () => {
            if (!confirm('Delete this game?')) return
            await games.delete(g.id)
            nav.pop()
          }}
        />
      </Section>
      {strats && (
        <Sheet title="Stratagems" onClose={() => setStrats(false)} left={<span />} right={<button className="bar-button bold" onClick={() => setStrats(false)}>Close</button>}>
          {g.rosterUid && <RosterStratagems rosterUid={g.rosterUid} />}
          <StratagemList />
        </Sheet>
      )}
    </Screen>
  )
}

export function StratagemList() {
  const { data } = useWahapedia()
  const core = coreStratagems(data)
  if (core.length)
    return (
      <Section header="Core stratagems" footer={<WahapediaCredit />}>
        {core.map((s) => (
          <StratagemCard key={s.id} s={s} />
        ))}
      </Section>
    )
  return (
    <Section header="Core stratagems" footer="Our own summary of the 11th edition core rules (section 15).">
      {CORE_STRATAGEMS.map((s) => (
        <div className="rule-text" key={s.name}>
          <b>
            {s.name} · {s.cp} <span style={{ color: 'var(--label-3)', fontWeight: 500 }}>({s.ref})</span>
          </b>
          <strong style={{ color: 'var(--label)' }}>When:</strong> {s.when}
          {'\n'}
          <strong style={{ color: 'var(--label)' }}>Target:</strong> {s.target}
          {'\n'}
          <strong style={{ color: 'var(--label)' }}>Effect:</strong> {s.effect}
          {s.limit && (
            <>
              {'\n'}
              <strong style={{ color: 'var(--label)' }}>Restriction:</strong> {s.limit}
            </>
          )}
        </div>
      ))}
    </Section>
  )
}

function RosterStratagems({ rosterUid }: { rosterUid: string }) {
  const { ev } = useRoster(rosterUid)
  if (!ev) return null
  return (
    <>
      {detachments(ev).map((d) => (
        <Section key={d.inst.sel.uid} header={`Detachment · ${d.name}`} footer={<WahapediaCredit />}>
          <DetachmentStratagems detachment={d.name} />
        </Section>
      ))}
    </>
  )
}
