// Game tracker: rounds, CP and VP (primary/secondary per round) for both players, with the mission set-up.
import { useState } from 'react'
import { games, type Game, type ScoredCard, type SecMode } from '../data/db'
import { rosterStore } from '../data/rosterStore'
import { useTable } from '../data/useTable'
import { uid, walkSelections, type Roster } from '../engine/roster'
import { CORE_STRATAGEMS } from '../data/coreRules'
import { Icon, Row, Screen, Section, Segmented, Sheet, Stepper } from '../ui/kit'
import { PRIMARY_SUMMARY, SECONDARIES, SECONDARY_RULES, secondaryInfo } from '../data/missionSummaries'
import { MATRIX, asDisposition, layoutUrl, useLayoutsAvailable, useMissionCards, type CardKind, type Disposition, type LayoutLetter } from '../data/missions'
import { CardSheet, LayoutPicker, LayoutSheet, MatchupPicker, MissionsScreen } from './MissionsScreen'
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
            <Row
              key={g.id}
              title={`${g.rosterName ?? 'My army'} vs ${g.opponent || 'Opponent'}`}
              sub={`Round ${g.round} · ${g.mission || 'No mission'}`}
              detail={`${totals(g)[0]}–${totals(g)[1]}`}
              chevron
              onClick={() => open(g.id)}
            />
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
              accessory={
                <span className={'pill ' + (g.vp[0] > g.vp[1] ? 'green' : g.vp[0] < g.vp[1] ? 'red' : '')}>
                  {g.vp[0] > g.vp[1] ? 'Win' : g.vp[0] < g.vp[1] ? 'Loss' : 'Draw'} {g.vp[0]}–{g.vp[1]}
                </span>
              }
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

/** The Force Disposition chosen in a list, if any. */
function rosterDisposition(r?: Roster): Disposition | undefined {
  for (const f of r?.forces ?? [])
    for (const s of walkSelections(f.selections))
      if (s.name === 'Force Disposition') {
        const d = s.children.map((c) => asDisposition(c.name)).find(Boolean)
        if (d) return d
      }
  return undefined
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
  const [layout, setLayout] = useState<LayoutLetter>()
  const [attacker, setAttacker] = useState<0 | 1>(0)
  const layoutsOk = useLayoutsAvailable()
  const deployments = (cards ?? []).filter((c) => c.kind === 'deployment')
  const fromList = rosterDisposition(rosters?.find((x) => x.uid === roster))
  const pickRoster = (uid?: string) => {
    setRoster(uid)
    const d = rosterDisposition(rosters?.find((x) => x.uid === uid))
    if (d) setMe(d)
  }
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
      layout,
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
      <Section
        header="My list"
        footer={roster ? (fromList ? `Your list is on ${fromList}, so it's already picked below.` : 'This list has no Force Disposition yet; pick it below.') : undefined}
      >
        <Row title="No list" checked={!roster} onClick={() => pickRoster(undefined)} />
        {(rosters ?? []).map((r) => {
          const d = rosterDisposition(r)
          return (
            <Row
              key={r.uid}
              title={r.name}
              sub={[r.summary && `${r.summary.faction} · ${r.summary.points} pts`, d].filter(Boolean).join(' · ') || undefined}
              checked={roster === r.uid}
              onClick={() => pickRoster(r.uid)}
            />
          )
        })}
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
        key={roster ?? 'none'}
        me={me}
        them={them}
        showLayouts={false}
        onChange={(a, b) => {
          setMe(a)
          setThem(b)
        }}
      />
      {me && them && (
        <>
          <div className="section-header">
            <span>Terrain layout</span>
          </div>
          <LayoutPicker me={me} them={them} value={layout} onChange={setLayout} />
        </>
      )}
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
      {deployments.length > 0 && layoutsOk === false && (
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

type Round = [number, number, number, number]
const emptyRounds = (): Round[] => Array.from({ length: 5 }, () => [0, 0, 0, 0] as Round)
const totals = (g: Game): [number, number] => (g.rounds ? g.rounds.reduce<[number, number]>((t, r) => [t[0] + r[0] + r[1], t[1] + r[2] + r[3]], [0, 0]) : g.vp)
const pair = <T,>(p: [T, T], i: 0 | 1, v: T): [T, T] => (i === 0 ? [v, p[1]] : [p[0], v])
const SEC_ROUND_CAP = 15
const SEC_GAME_CAP = 45
const FIXED_CARD_CAP = 20

export function GameScreen({ id }: { id: string }) {
  const g = useTable('games', () => games.get(id), [id])
  const nav = useNav()
  const [who, setWho] = useState<0 | 1>(0)
  const [strats, setStrats] = useState(false)
  const [card, setCard] = useState<{ kind: CardKind; name: string }>()
  const [picking, setPicking] = useState(false)
  const [layoutView, setLayoutView] = useState(false)
  const [rules, setRules] = useState(false)
  if (!g) return <Screen title="">{null}</Screen>
  const save = (patch: Partial<Game>) => games.put({ ...g, ...patch, updatedAt: new Date().toISOString() })
  const rounds = g.rounds ?? emptyRounds()
  const vp = totals({ ...g, rounds })
  const me = asDisposition(g.myDisposition)
  const them = asDisposition(g.oppDisposition)
  const primaries = me && them ? [MATRIX[me][them], MATRIX[them][me]] : undefined
  const names = ['Me', g.opponent || 'Opponent']
  /** Patch that sets one VP cell of a round and keeps the totals in sync */
  const vpPatch = (round: number, k: number, v: number, base: Round[] = rounds): Pick<Game, 'rounds' | 'vp'> => {
    const next = base.map((r) => [...r] as Round)
    next[round - 1][k] = Math.max(0, v)
    return { rounds: next, vp: totals({ ...g, rounds: next }) }
  }
  const setCp = (i: 0 | 1, v: number) => save({ cp: pair(g.cp, i, Math.max(0, v)) })

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
            <div className="label">CP</div>
            <div className="big-number" style={{ fontSize: 30 }}>
              {g.cp[i]}
            </div>
            <Stepper value={g.cp[i]} onChange={(v) => setCp(i, v)} />
          </div>
        ))}
      </div>
      <div className="round-tabs">
        {[1, 2, 3, 4, 5].map((r) => (
          <button key={r} className={r === g.round ? 'on' : ''} onClick={() => save({ round: r })}>
            <span>R{r}</span>
            <b>
              {rounds[r - 1][0] + rounds[r - 1][1]}–{rounds[r - 1][2] + rounds[r - 1][3]}
            </b>
          </button>
        ))}
      </div>
      <div className="who-switch">
        <Segmented
          value={who}
          onChange={setWho}
          options={[
            { value: 0, label: 'My missions' },
            { value: 1, label: `${names[1]}'s missions` },
          ]}
        />
      </div>
      {primaries ? (
        <PrimaryPanel
          name={primaries[who]}
          round={g.round}
          value={rounds[g.round - 1][who * 2]}
          onChange={(v) => save(vpPatch(g.round, who * 2, v))}
          onOpen={() => setCard({ kind: 'primary', name: primaries[who] })}
        />
      ) : (
        <div className="mission-panel empty-panel">
          <p>Pick both Force Dispositions to get each player's primary mission.</p>
          <button className="button-filled small" onClick={() => setPicking(true)}>
            Pick dispositions
          </button>
        </div>
      )}
      <SecondaryPanel
        key={who}
        g={g}
        i={who}
        rounds={rounds}
        save={save}
        vpPatch={vpPatch}
        onOpen={(name) => setCard({ kind: 'secondary', name })}
        onRules={() => setRules(true)}
      />
      <Section>
        <Row
          title={g.round >= 5 ? 'Last round' : 'Next round (+1CP each)'}
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
                {rounds.map((r, k) => (
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
      <Section header="Battle set-up">
        {me && them ? (
          <Row title={`${me} vs ${them}`} sub="Force Dispositions" chevron onClick={() => setPicking(true)} />
        ) : (
          <Row title="Pick Force Dispositions" className="action" onClick={() => setPicking(true)} />
        )}
        {me && them && g.layout && (
          <Row
            leading={<img className="layout-thumb" src={layoutUrl(me, them, g.layout as LayoutLetter)} alt="" />}
            title={`Layout ${g.layout}`}
            sub="Terrain layout"
            chevron
            onClick={() => setLayoutView(true)}
          />
        )}
        {g.deployment && <Row title={g.deployment} sub="Deployment" chevron onClick={() => setCard({ kind: 'deployment', name: g.deployment! })} />}
      </Section>
      <Section>
        <Row title="Stratagems" icon={Icon.list(16)} chevron onClick={() => setStrats(true)} />
        <Row title="Missions" icon={Icon.dice(16)} chevron onClick={() => nav.push({ key: 'missions', render: () => <MissionsScreen back="Game" /> })} />
        <Row title="Core rules" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'book:core', render: () => <RulebookScreen id="core-rules" back="Game" /> })} />
        {g.rosterUid && (
          <Row title="View my list" icon={Icon.shield(16)} chevron onClick={() => nav.push({ key: 'roster:' + g.rosterUid, render: () => <RosterScreen uid={g.rosterUid!} /> })} />
        )}
      </Section>
      {card && <CardSheet kind={card.kind} name={card.name} onClose={() => setCard(undefined)} />}
      {layoutView && me && them && g.layout && <LayoutSheet me={me} them={them} letter={g.layout as LayoutLetter} onClose={() => setLayoutView(false)} />}
      {picking && (
        <Sheet
          title="Force Dispositions"
          onClose={() => setPicking(false)}
          left={<span />}
          right={
            <button className="bar-button bold" onClick={() => setPicking(false)}>
              Done
            </button>
          }
        >
          <MatchupPicker me={me} them={them} showLayouts={false} onChange={(a, b) => save({ myDisposition: a, oppDisposition: b, mission: a && b ? MATRIX[a][b] : g.mission })} />
          {me && them && <LayoutPicker me={me} them={them} value={g.layout as LayoutLetter | undefined} onChange={(l) => save({ layout: l })} />}
        </Sheet>
      )}
      {rules && (
        <Sheet
          title="Secondary missions"
          onClose={() => setRules(false)}
          left={<span />}
          right={
            <button className="bar-button bold" onClick={() => setRules(false)}>
              Close
            </button>
          }
        >
          <Section footer="Summary of the Warhammer Event Companion rules.">
            {SECONDARY_RULES.map((r) => (
              <div className="rule-text" key={r}>
                {r}
              </div>
            ))}
          </Section>
        </Sheet>
      )}
      <Section header="Notes">
        <div className="row">
          <textarea className="text-input" rows={3} defaultValue={g.notes} onBlur={(e) => save({ notes: e.target.value })} placeholder="Key plays, what to remember next time…" />
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
        <Sheet
          title="Stratagems"
          onClose={() => setStrats(false)}
          left={<span />}
          right={
            <button className="bar-button bold" onClick={() => setStrats(false)}>
              Close
            </button>
          }
        >
          {g.rosterUid && <RosterStratagems rosterUid={g.rosterUid} />}
          <StratagemList />
        </Sheet>
      )}
    </Screen>
  )
}

function PrimaryPanel({ name, round, value, onChange, onOpen }: { name: string; round: number; value: number; onChange: (v: number) => void; onOpen: () => void }) {
  const summary = PRIMARY_SUMMARY[name]
  return (
    <div className="mission-panel primary">
      <div className="mp-head">
        <span>Primary mission</span>
        <b>{name}</b>
      </div>
      {summary ? <p className="mp-text">{summary}</p> : <p className="mp-text muted-text">Open the card to see how it scores.</p>}
      <button className="link-button" onClick={onOpen}>
        Full card
      </button>
      <div className="mp-score">
        <span className="mp-label">
          Primary VP · <b>round {round}</b>
        </span>
        <Stepper value={value} onChange={onChange} />
      </div>
    </div>
  )
}

function SecondaryPanel({
  g,
  i,
  rounds,
  save,
  vpPatch,
  onOpen,
  onRules,
}: {
  g: Game
  i: 0 | 1
  rounds: Round[]
  save: (p: Partial<Game>) => void
  vpPatch: (round: number, k: number, v: number, base?: Round[]) => Pick<Game, 'rounds' | 'vp'>
  onOpen: (name: string) => void
  onRules: () => void
}) {
  const mode = g.secMode?.[i] ?? null
  const active = g.secondaries ?? [[], []]
  const deck = g.deck ?? [[], []]
  const discarded = g.discarded ?? [[], []]
  const scored = g.scored ?? [[], []]
  const newOrders = g.newOrders ?? [false, false]
  const cpBonus = g.cpBonusRound ?? [0, 0]
  const k = i * 2 + 1
  const roundSec = rounds[g.round - 1][k]
  const gameSec = rounds.reduce((n, r) => n + r[k], 0)
  const cpLeftThisRound = cpBonus[i] !== g.round

  const start = (m: SecMode) =>
    save({
      secMode: pair(g.secMode ?? [null, null], i, m),
      deck: pair(deck, i, m === 'tactical' ? shuffle(SECONDARIES.map((s) => s.name)) : []),
      secondaries: pair(active, i, []),
      discarded: pair(discarded, i, []),
      newOrders: pair(newOrders, i, false),
    })
  /** Draws n cards, reshuffling the discard pile if the deck runs out */
  const drawn = (n: number, act: string[], d: string[], disc: string[]) => {
    const a = [...act]
    let dk = [...d]
    let ds = [...disc]
    for (let x = 0; x < n; x++) {
      if (!dk.length && ds.length) {
        dk = shuffle(ds)
        ds = []
      }
      const c = dk.shift()
      if (c) a.push(c)
    }
    return { secondaries: pair(active, i, a), deck: pair(deck, i, dk), discarded: pair(discarded, i, ds) }
  }
  const draw2 = () => save(drawn(2, active[i], deck[i], discarded[i]))
  const discard = (name: string, forCp: boolean) => {
    const rest = active[i].filter((x) => x !== name)
    const gain = forCp && cpLeftThisRound
    save({
      secondaries: pair(active, i, rest),
      discarded: pair(discarded, i, [...discarded[i], name]),
      ...(gain ? { cp: pair(g.cp, i, g.cp[i] + 1), cpBonusRound: pair(cpBonus, i, g.round) } : {}),
    })
  }
  const replace = (name: string, paid: boolean) => {
    const rest = active[i].filter((x) => x !== name)
    save({
      ...drawn(1, rest, deck[i], [...discarded[i], name]),
      ...(paid ? { cp: pair(g.cp, i, g.cp[i] - 1), newOrders: pair(newOrders, i, true) } : {}),
    })
  }
  const achieve = (name: string, want: number) => {
    const cardSoFar = scored[i].filter((s) => s.name === name).reduce((n, s) => n + s.vp, 0)
    const vp = Math.max(0, Math.min(want, SEC_ROUND_CAP - roundSec, SEC_GAME_CAP - gameSec, mode === 'fixed' ? FIXED_CARD_CAP - cardSoFar : Infinity))
    const entry: ScoredCard = { name, vp, round: g.round }
    const patch: Partial<Game> = { ...vpPatch(g.round, k, roundSec + vp), scored: pair(scored, i, [...scored[i], entry]) }
    if (mode === 'tactical') {
      patch.secondaries = pair(
        active,
        i,
        active[i].filter((x) => x !== name),
      )
      patch.discarded = pair(discarded, i, [...discarded[i], name])
    }
    save(patch)
  }
  const unscore = (idx: number) => {
    const s = scored[i][idx]
    save({
      ...vpPatch(s.round, k, Math.max(0, rounds[s.round - 1][k] - s.vp)),
      scored: pair(
        scored,
        i,
        scored[i].filter((_, j) => j !== idx),
      ),
    })
  }
  const pickFixed = (name: string) => save({ secondaries: pair(active, i, active[i].includes(name) ? active[i].filter((x) => x !== name) : [...active[i], name].slice(-2)) })

  const header = (
    <div className="mp-head row-head">
      <span>Secondary missions{mode ? ` · ${mode === 'tactical' ? 'Tactical' : 'Fixed'}` : ''}</span>
      <button className="link-button" onClick={onRules}>
        How it works
      </button>
    </div>
  )

  if (!mode)
    return (
      <div className="mission-panel">
        {header}
        <p className="mp-text">Choose secretly before the battle. Tactical: draw 2 cards each Command phase. Fixed: pick 2 cards that score all game.</p>
        <div className="sec-mode">
          <button onClick={() => start('tactical')}>
            <b>Tactical</b>
            <span>Draw from the deck</span>
          </button>
          <button onClick={() => start('fixed')}>
            <b>Fixed</b>
            <span>Pick 2 for the game</span>
          </button>
        </div>
      </div>
    )

  return (
    <div className="mission-panel">
      {header}
      {mode === 'fixed' && active[i].length < 2 && (
        <>
          <p className="mp-text">Pick two fixed secondaries:</p>
          <div className="chip-row">
            {SECONDARIES.filter((s) => s.fixed).map((s) => (
              <button key={s.name} className={'chip' + (active[i].includes(s.name) ? ' on' : '')} onClick={() => pickFixed(s.name)}>
                {s.name}
              </button>
            ))}
          </div>
        </>
      )}
      {active[i].length === 0 && mode === 'tactical' && <p className="mp-text muted-text">No active cards. Draw 2 at the start of your Command phase.</p>}
      {active[i].map((name) => {
        const info = secondaryInfo(name)
        const cardTotal = scored[i].filter((s) => s.name === name).reduce((n, s) => n + s.vp, 0)
        return (
          <div className="sec-card" key={name}>
            <div className="sec-card-head">
              <b>{name}</b>
              <button className="bar-button" aria-label={`Card ${name}`} onClick={() => onOpen(name)}>
                {Icon.info(18)}
              </button>
            </div>
            {info && <p className="sec-text">{info.summary}</p>}
            {mode === 'tactical' && info?.whenDrawn && (
              <p className="sec-when">
                <b>When drawn:</b> {info.whenDrawn}
              </p>
            )}
            <div className="sec-score">
              <span>{mode === 'fixed' ? `Score (${cardTotal}/${FIXED_CARD_CAP})` : 'Achieved'}</span>
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} className="vp-chip" onClick={() => achieve(name, v)}>
                  +{v}
                </button>
              ))}
            </div>
            {mode === 'tactical' && (
              <div className="sec-actions">
                <button onClick={() => discard(name, true)}>{cpLeftThisRound ? 'Discard +1CP' : 'Discard (CP already gained)'}</button>
                {!newOrders[i] && (
                  <button disabled={g.cp[i] < 1} onClick={() => replace(name, true)}>
                    New orders · 1CP
                  </button>
                )}
                {info?.canRedraw && <button onClick={() => replace(name, false)}>Redraw</button>}
              </div>
            )}
          </div>
        )
      })}
      {mode === 'tactical' && (
        <div className="sec-deck">
          <button className="button-filled small" onClick={draw2} disabled={!deck[i].length && !discarded[i].length}>
            {Icon.plus(16)} Draw 2
          </button>
          <span>
            {deck[i].length} in deck · {discarded[i].length} discarded
          </span>
        </div>
      )}
      <div className="mp-score">
        <span className="mp-label">
          Secondary VP · <b>round {g.round}</b>
          <small>
            {roundSec}/{SEC_ROUND_CAP} this round · {gameSec}/{SEC_GAME_CAP} game
          </small>
        </span>
        <Stepper value={roundSec} max={SEC_ROUND_CAP} onChange={(v) => save(vpPatch(g.round, k, v))} />
      </div>
      {scored[i].length > 0 && (
        <div className="sec-log">
          {scored[i].map((s, idx) => (
            <span key={idx} className="sec-log-item">
              R{s.round} {s.name} +{s.vp}
              <button aria-label="Undo" onClick={() => unscore(idx)}>
                {Icon.close(10)}
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        className="link-button subtle"
        onClick={() =>
          confirm('Change how you play secondaries? Active cards and the deck are reset; scored VP stay.') && save({ secMode: pair(g.secMode ?? [null, null], i, null) })
        }
      >
        Switch Tactical / Fixed
      </button>
    </div>
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
