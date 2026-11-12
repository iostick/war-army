// Game tracker: rounds, CP and VP (primary/secondary per round) for both players, with the mission set-up.
import { Fragment, useState } from 'react'
import { games, type Game } from '../data/db'
import { rosterStore } from '../data/rosterStore'
import { useTable } from '../data/useTable'
import { uid } from '../engine/roster'
import { CORE_STRATAGEMS } from '../data/coreRules'
import { Icon, Row, Screen, Section, Segmented, Sheet, Spinner, Stepper } from '../ui/kit'
import { MATRIX, asDisposition, useMissionCards, type CardKind, type Disposition } from '../data/missions'
import { CardSheet, MatchupPicker, MissionsScreen } from './MissionsScreen'
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
            <Row key={g.id} title={`${g.rosterName ?? 'My army'} vs ${g.opponent || 'Opponent'}`} sub={`Round ${g.round} · ${g.mission || 'No mission'}`} detail={`${totals(g)[0]}–${totals(g)[1]}`} chevron onClick={() => open(g.id)} />
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
  const { cards } = useMissionCards()
  const [roster, setRoster] = useState<string>()
  const [opponent, setOpponent] = useState('')
  const [oppFaction, setOppFaction] = useState('')
  const [me, setMe] = useState<Disposition>()
  const [them, setThem] = useState<Disposition>()
  const [deployment, setDeployment] = useState('')
  const [attacker, setAttacker] = useState<0 | 1>(0)
  const deployments = (cards ?? []).filter((c) => c.kind === 'deployment')
  const create = async () => {
    const r = rosters?.find((x) => x.uid === roster)
    const now = new Date().toISOString()
    const mission = me && them ? MATRIX[me][them] : ''
    const g: Game = {
      id: uid(),
      rosterUid: r?.uid,
      rosterName: r?.name,
      opponent,
      opponentFaction: oppFaction,
      mission,
      round: 1,
      cp: [0, 0],
      vp: [0, 0],
      notes: '',
      finished: false,
      createdAt: now,
      updatedAt: now,
      myDisposition: me,
      oppDisposition: them,
      deployment: deployment || undefined,
      attacker,
      rounds: emptyRounds(),
      secondaries: [[], []],
    }
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
      <Section header="My list">
        <Row title="No list" checked={!roster} onClick={() => setRoster(undefined)} />
        {(rosters ?? []).map((r) => (
          <Row key={r.uid} title={r.name} sub={r.summary ? `${r.summary.faction} · ${r.summary.points} pts` : undefined} checked={roster === r.uid} onClick={() => setRoster(r.uid)} />
        ))}
      </Section>
      <Section header="Opponent">
        <div className="row">
          <input className="text-input" placeholder="Opponent's name" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </div>
      </Section>
      <div className="section-header">
        <span>Their army</span>
      </div>
      <FactionPicker value={oppFaction} onChange={(f) => setOppFaction(f.short)} />
      <MatchupPicker
        me={me}
        them={them}
        onChange={(a, b) => {
          setMe(a)
          setThem(b)
        }}
      />
      <div className="section-header">
        <span>Attacker</span>
      </div>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={attacker}
          options={[
            { value: 0, label: 'Me' },
            { value: 1, label: opponent || 'Opponent' },
          ]}
          onChange={setAttacker}
        />
      </div>
      {deployments.length > 0 && (
        <Section header="Deployment">
          <Row title="Not chosen" checked={!deployment} onClick={() => setDeployment('')} />
          {deployments.map((d) => (
            <Row key={d.name} title={d.name} checked={deployment === d.name} onClick={() => setDeployment(d.name)} />
          ))}
        </Section>
      )}
    </Sheet>
  )
}

const emptyRounds = (): [number, number, number, number][] => Array.from({ length: 5 }, () => [0, 0, 0, 0] as [number, number, number, number])
const totals = (g: Game): [number, number] => (g.rounds ? g.rounds.reduce<[number, number]>((t, r) => [t[0] + r[0] + r[1], t[1] + r[2] + r[3]], [0, 0]) : g.vp)

export function GameScreen({ id }: { id: string }) {
  const g = useTable('games', () => games.get(id), [id])
  const nav = useNav()
  const [strats, setStrats] = useState(false)
  const [card, setCard] = useState<{ kind: CardKind; name: string }>()
  const [picking, setPicking] = useState(false)
  const [addSec, setAddSec] = useState<0 | 1>()
  if (!g) return <Screen title="">{null}</Screen>
  const save = (patch: Partial<Game>) => games.put({ ...g, ...patch, updatedAt: new Date().toISOString() })
  const setPair = (key: 'cp' | 'vp', i: 0 | 1, v: number) => {
    const next = [...g[key]] as [number, number]
    next[i] = Math.max(0, v)
    save({ [key]: next } as Partial<Game>)
  }
  const vp = totals(g)
  const me = asDisposition(g.myDisposition)
  const them = asDisposition(g.oppDisposition)
  const myPrimary = me && them ? MATRIX[me][them] : undefined
  const theirPrimary = me && them ? MATRIX[them][me] : undefined
  const setRoundVp = (round: number, k: number, v: number) => {
    const rounds = (g.rounds ?? emptyRounds()).map((r) => [...r] as [number, number, number, number])
    rounds[round - 1][k] = Math.max(0, v)
    const next = { ...g, rounds }
    save({ rounds, vp: totals(next) })
  }
  const names = ['Me', g.opponent || 'Opponent']
  const sec = g.secondaries ?? [[], []]
  const setSec = (i: 0 | 1, list: string[]) => {
    const next = [...sec] as [string[], string[]]
    next[i] = list
    save({ secondaries: next })
  }
  return (
    <Screen title={`Round ${g.round}`} back="Games" subtitle={`${g.rosterName ?? 'My army'} vs ${g.opponent || 'Opponent'}${g.opponentFaction ? ` (${g.opponentFaction})` : ''}`}>
      <div className="score-grid">
        {([0, 1] as const).map((i) => (
          <div className={'score-card' + (i === 1 ? ' them' : '')} key={i}>
            <h3>
              {names[i]}
              {g.attacker !== undefined && <span className="pill glass">{g.attacker === i ? 'Attacker' : 'Defender'}</span>}
            </h3>
            <div className="label">VP</div>
            <div className="big-number">{vp[i]}</div>
            {!g.rounds && <Stepper value={g.vp[i]} onChange={(v) => setPair('vp', i, v)} />}
            <div className="label">CP</div>
            <div className="big-number" style={{ fontSize: 30 }}>
              {g.cp[i]}
            </div>
            <Stepper value={g.cp[i]} onChange={(v) => setPair('cp', i, v)} />
          </div>
        ))}
      </div>
      {g.rounds && (
        <>
          <div className="round-tabs">
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} className={r === g.round ? 'on' : ''} onClick={() => save({ round: r })}>
                <span>R{r}</span>
                <b>
                  {g.rounds![r - 1][0] + g.rounds![r - 1][1]}–{g.rounds![r - 1][2] + g.rounds![r - 1][3]}
                </b>
              </button>
            ))}
          </div>
          <Section header={`Round ${g.round} VP`} footer="Primary VP max 15 per round in most missions; check your card.">
            {([0, 1] as const).map((i) => (
              <Fragment key={i}>
                <Row title={`${names[i]} · Primary`} accessory={<Stepper value={g.rounds![g.round - 1][i * 2]} onChange={(v) => setRoundVp(g.round, i * 2, v)} />} />
                <Row title={`${names[i]} · Secondary`} accessory={<Stepper value={g.rounds![g.round - 1][i * 2 + 1]} onChange={(v) => setRoundVp(g.round, i * 2 + 1, v)} />} />
              </Fragment>
            ))}
          </Section>
          <Section>
            <Row
              title={g.round >= 5 ? 'Last round' : `Next round (+1CP each)`}
              className={'action' + (g.round >= 5 ? ' disabled' : '')}
              icon={Icon.refresh(16)}
              onClick={() => g.round < 5 && save({ round: g.round + 1, cp: [g.cp[0] + 1, g.cp[1] + 1] })}
            />
          </Section>
          <div className="vp-table-wrap">
            <table className="vp-table">
              <thead>
                <tr>
                  <th />
                  {[1, 2, 3, 4, 5].map((r) => (
                    <th key={r}>R{r}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {([0, 1] as const).map((i) => (
                  <tr key={i}>
                    <th>{names[i]}</th>
                    {g.rounds!.map((r, k) => (
                      <td key={k}>
                        {r[i * 2]}
                        <small>+{r[i * 2 + 1]}</small>
                      </td>
                    ))}
                    <td className="total">{vp[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!g.rounds && (
        <Section header="Round" footer="When the round advances, each player gains 1CP (Command phase).">
          <Row title="Current round" accessory={<Stepper value={g.round} min={1} max={5} onChange={(v) => save({ round: v })} />} />
          <Row
            title="Next round (+1CP each)"
            className={'action' + (g.round >= 5 ? ' disabled' : '')}
            icon={Icon.refresh(16)}
            onClick={() => save({ round: Math.min(5, g.round + 1), cp: [g.cp[0] + 1, g.cp[1] + 1] })}
          />
        </Section>
      )}
      <Section header="Mission">
        {myPrimary ? (
          <>
            <Row title={myPrimary} sub={`Your primary · ${me} vs ${them}`} chevron onClick={() => setCard({ kind: 'primary', name: myPrimary })} />
            <Row title={theirPrimary!} sub={`${names[1]}'s primary`} chevron onClick={() => setCard({ kind: 'primary', name: theirPrimary! })} />
          </>
        ) : (
          <Row title={g.mission || 'No mission set'} sub="Pick both Force Dispositions to get the primary missions" chevron onClick={() => setPicking(true)} />
        )}
        {g.deployment && <Row title={g.deployment} sub="Deployment" chevron onClick={() => setCard({ kind: 'deployment', name: g.deployment! })} />}
        {myPrimary && <Row title="Change dispositions" className="action" onClick={() => setPicking(true)} />}
      </Section>
      {([0, 1] as const).map((i) => (
        <Section key={i} header={`${names[i]} · Secondary missions`}>
          {sec[i].map((n) => (
            <Row key={n} title={n} chevron onClick={() => setCard({ kind: 'secondary', name: n })} accessory={<button className="bar-button" aria-label={`Remove ${n}`} onClick={(e) => (e.stopPropagation(), setSec(i, sec[i].filter((x) => x !== n)))}>{Icon.close(14)}</button>} />
          ))}
          <Row title="Add secondary mission" className="action" icon={Icon.plus(16)} onClick={() => setAddSec(i)} />
        </Section>
      ))}
      <Section>
        <Row title="Stratagems" icon={Icon.list(16)} chevron onClick={() => setStrats(true)} />
        <Row title="Missions" icon={Icon.dice(16)} chevron onClick={() => nav.push({ key: 'missions', render: () => <MissionsScreen back="Game" /> })} />
        <Row title="Core rules" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'book:core', render: () => <RulebookScreen id="core-rules" back="Game" /> })} />
        {g.rosterUid && <Row title="View my list" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'roster:' + g.rosterUid, render: () => <RosterScreen uid={g.rosterUid!} /> })} />}
      </Section>
      {card && <CardSheet kind={card.kind} name={card.name} onClose={() => setCard(undefined)} />}
      {picking && (
        <Sheet title="Force Dispositions" onClose={() => setPicking(false)} left={<span />} right={<button className="bar-button bold" onClick={() => setPicking(false)}>Done</button>}>
          <MatchupPicker me={me} them={them} onChange={(a, b) => save({ myDisposition: a, oppDisposition: b, mission: a && b ? MATRIX[a][b] : g.mission })} />
        </Sheet>
      )}
      {addSec !== undefined && <SecondaryPicker taken={sec[addSec]} onClose={() => setAddSec(undefined)} onPick={(n) => (setSec(addSec, [...sec[addSec], n]), setAddSec(undefined))} />}
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

function SecondaryPicker({ taken, onPick, onClose }: { taken: string[]; onPick: (name: string) => void; onClose: () => void }) {
  const { loading, cards } = useMissionCards()
  const [name, setName] = useState('')
  const list = (cards ?? []).filter((c) => c.kind === 'secondary' && !taken.includes(c.name))
  return (
    <Sheet title="Secondary mission" onClose={onClose}>
      {loading && <Spinner />}
      {list.length > 0 ? (
        <Section>
          {list.map((c) => (
            <Row key={c.name} title={c.name} sub={c.tags.join(' · ') || undefined} onClick={() => onPick(c.name)} />
          ))}
        </Section>
      ) : (
        !loading && (
          <Section header="Name" footer="The secondary cards aren't downloaded yet, so type the name.">
            <div className="row">
              <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Assassination" />
            </div>
            <Row title="Add" className="action" onClick={() => name.trim() && onPick(name.trim())} />
          </Section>
        )
      )}
    </Sheet>
  )
}
