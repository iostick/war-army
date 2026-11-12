// Meta: competitive tournament stats (faction win rates, dispositions, detachments, events and published lists).
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  allDetachments,
  byResult,
  DISPO_COLOR,
  DISPO_SHORT,
  DISPOSITIONS,
  fmtDate,
  topLists,
  unbeaten,
  useMeta,
  type Disposition,
  type MetaData,
  type MetaEvent,
  type MetaList,
} from '../data/meta'
import { rosterStore } from '../data/rosterStore'
import { factionColor } from '../ui/faction'
import { Icon, Screen, Segmented, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'

type View = 'factions' | 'lists' | 'detachments' | 'events'
type Sort = 'wr' | 'games' | 'overrep'
type Dispo = Disposition | 'all'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z']/g, '')

/** Factions the user has lists for, so they can be highlighted. */
function useMyFactions(): (faction: string) => boolean {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    rosterStore.all().then((rs) => setNames(rs.map((r) => r.summary?.faction ?? '').filter(Boolean)))
  }, [])
  return useMemo(() => {
    const mine = names.map((n) => norm(n.split(' - ').pop() ?? n))
    return (faction: string) => mine.some((m) => m.includes(norm(faction)) || norm(faction).includes(m))
  }, [names])
}

function wrClass(wr: number | null | undefined): string {
  if (wr == null) return 'wr-none'
  if (wr >= 52) return 'wr-up'
  if (wr <= 48) return 'wr-down'
  return 'wr-even'
}
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1).replace(/\.0$/, '')}%`)
const accent = (faction?: string) => ({ '--accent': factionColor(faction) }) as CSSProperties

// ---------- Building blocks: every Meta row shares the same three columns ----------

function Item(props: {
  lead?: ReactNode
  title: ReactNode
  lines?: ReactNode[]
  figure?: ReactNode
  figureSub?: string
  onClick?: () => void
  style?: CSSProperties
  className?: string
}) {
  const body = (
    <>
      <span className="mi-lead">{props.lead}</span>
      <span className="mi-body">
        <span className="mi-title">{props.title}</span>
        {props.lines?.filter(Boolean).map((l, i) => (
          <span className="mi-line" key={i}>
            {l}
          </span>
        ))}
      </span>
      <span className="mi-figure">
        {props.figure}
        {props.figureSub && <small>{props.figureSub}</small>}
      </span>
    </>
  )
  const cls = 'meta-item ' + (props.className ?? '') + (props.onClick ? ' pressable' : '')
  return props.onClick ? (
    <div role="button" tabIndex={0} className={cls} style={props.style} onClick={props.onClick} onKeyDown={(e) => e.key === 'Enter' && props.onClick!()}>
      {body}
    </div>
  ) : (
    <div className={cls} style={props.style}>
      {body}
    </div>
  )
}

function Group(props: { title?: ReactNode; right?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="meta-group">
      {(props.title || props.right) && (
        <header>
          <span>{props.title}</span>
          {props.right}
        </header>
      )}
      <div className="meta-items">{props.children}</div>
      {props.footer && <p className="meta-foot">{props.footer}</p>}
    </section>
  )
}

function DispoTag({ d }: { d: Disposition | null }) {
  if (!d) return null
  return (
    <span className="dispo-tag" style={{ '--dc': DISPO_COLOR[d] } as CSSProperties}>
      {DISPO_SHORT[d]}
    </span>
  )
}

function Record({ r }: { r: string }) {
  return <span className={'record' + (unbeaten(r) ? ' perfect' : '')}>{r}</span>
}

/** Bar centred on 50%: grows right when above, left when below. */
function WrBar({ wr }: { wr: number | null }) {
  if (wr == null) return <span className="wr-bar" />
  const d = Math.max(-25, Math.min(25, wr - 50))
  const style: CSSProperties = d >= 0 ? { left: '50%', width: `${(d / 25) * 50}%` } : { right: '50%', width: `${(-d / 25) * 50}%` }
  return (
    <span className="wr-bar">
      <span className={'wr-fill ' + wrClass(wr)} style={style} />
      <span className="wr-mid" />
    </span>
  )
}

function ShareBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  return (
    <span className="share-bar">
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color ?? 'var(--accent)' }} />
    </span>
  )
}

function DispoChips({ value, onChange, rates }: { value: Dispo; onChange: (d: Dispo) => void; rates?: MetaData['dispositions'] }) {
  return (
    <div className="chip-scroll" role="tablist" aria-label="Force disposition">
      <button className={'chip' + (value === 'all' ? ' on' : '')} onClick={() => onChange('all')}>
        All dispositions
      </button>
      {DISPOSITIONS.map((d) => (
        <button key={d} className={'chip dispo' + (value === d ? ' on' : '')} style={{ '--dc': DISPO_COLOR[d] } as CSSProperties} onClick={() => onChange(d)}>
          {d}
          {rates && <span className="chip-wr">{pct(rates.find((r) => r.name === d)?.wr)}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------- Root ----------

export function MetaScreen() {
  const { data, error } = useMeta()
  const [view, setView] = useState<View>('factions')
  const [dispo, setDispo] = useState<Dispo>('all')
  if (error)
    return (
      <Screen title="Meta">
        <div className="empty">
          <h2>Couldn't load the meta</h2>
          <p>{error}. Open the app online once so it can be saved for offline use.</p>
        </div>
      </Screen>
    )
  if (!data)
    return (
      <Screen title="Meta">
        <div className="empty">
          <Spinner />
        </div>
      </Screen>
    )
  const games = Math.round(data.factions.reduce((n, f) => n + f.games, 0) / 2)
  const weekend = data.events.filter((e) => e.date >= data.windowStart).length
  return (
    <Screen title="Meta" subtitle={`Tournament results · ${data.window}`}>
      <div className="meta-stats">
        <div className="meta-stat">
          <b>{games.toLocaleString('en-GB')}</b>
          <span>games</span>
        </div>
        <div className="meta-stat">
          <b>{weekend}</b>
          <span>events</span>
        </div>
        <div className="meta-stat">
          <b>{data.lists.length}</b>
          <span>top lists</span>
        </div>
      </div>
      <DispoChips value={dispo} onChange={setDispo} rates={data.dispositions} />
      <DispoSummary data={data} dispo={dispo} />
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'factions', label: 'Factions' },
          { value: 'lists', label: 'Top lists' },
          { value: 'detachments', label: 'Detach.' },
          { value: 'events', label: 'Events' },
        ]}
      />
      {view === 'factions' && <FactionsView data={data} dispo={dispo} />}
      {view === 'lists' && <ListsView data={data} dispo={dispo} />}
      {view === 'detachments' && <DetachmentsView data={data} dispo={dispo} />}
      {view === 'events' && <EventsView data={data} dispo={dispo} />}
      <Sources data={data} />
    </Screen>
  )
}

function DispoSummary({ data, dispo }: { data: MetaData; dispo: Dispo }) {
  if (dispo === 'all') return null
  const d = data.dispositions.find((x) => x.name === dispo)
  if (!d) return null
  return (
    <div className="dispo-card" style={{ '--dc': DISPO_COLOR[dispo] } as CSSProperties}>
      <div>
        <b>{dispo}</b>
        <span>
          {d.games.toLocaleString('en-GB')} games · {pct(d.field)} of the field
        </span>
      </div>
      <b className={'dispo-card-wr ' + wrClass(d.wr)}>{pct(d.wr)}</b>
    </div>
  )
}

function FactionsView({ data, dispo }: { data: MetaData; dispo: Dispo }) {
  const nav = useNav()
  const isMine = useMyFactions()
  const [sort, setSort] = useState<Sort>('wr')
  const share = (f: (typeof data.factions)[number]) => f.dispositions.find((x) => x.name === dispo)?.pct ?? 0
  const rows = [...data.factions].sort((a, b) =>
    dispo !== 'all'
      ? share(b) - share(a)
      : sort === 'games'
        ? b.games - a.games
        : sort === 'overrep'
          ? (b.overrep ?? -1) - (a.overrep ?? -1)
          : (b.winRate ?? -1) - (a.winRate ?? -1),
  )
  return (
    <>
      {dispo === 'all' ? (
        <div className="chip-row">
          {(
            [
              ['wr', 'Win rate'],
              ['games', 'Most played'],
              ['overrep', 'Top finishes'],
            ] as [Sort, string][]
          ).map(([s, l]) => (
            <button key={s} className={'chip' + (sort === s ? ' on' : '')} onClick={() => setSort(s)}>
              {l}
            </button>
          ))}
        </div>
      ) : (
        <p className="meta-hint">Sorted by how many of each faction's players chose {dispo} this window.</p>
      )}
      <div className="meta-items">
        {rows.map((f, i) => {
          const mine = isMine(f.faction)
          const figure = dispo !== 'all' ? pct(share(f)) : sort === 'games' ? String(f.games) : sort === 'overrep' ? (f.overrep?.toFixed(2) ?? '—') : pct(f.winRate)
          return (
            <Item
              key={f.faction}
              className={'faction' + (mine ? ' mine' : '')}
              style={accent(f.faction)}
              lead={<span className="mi-rank">{i + 1}</span>}
              title={
                <>
                  <span className="mi-faction">{f.faction}</span>
                  {mine && <span className="meta-tag">Your army</span>}
                </>
              }
              lines={[
                dispo !== 'all' ? <ShareBar value={share(f)} color={DISPO_COLOR[dispo]} /> : <WrBar wr={f.winRate} />,
                f.games
                  ? `${dispo !== 'all' ? `${pct(f.winRate)} win rate · ` : ''}${f.games} games · ${f.players} players${f.eventWins ? ` · ${f.eventWins} win${f.eventWins > 1 ? 's' : ''}` : ''}`
                  : 'No games this window',
              ]}
              figure={<b className={dispo === 'all' && sort === 'wr' ? wrClass(f.winRate) : ''}>{figure}</b>}
              figureSub={dispo !== 'all' ? 'of players' : sort === 'games' ? 'games' : sort === 'overrep' ? 'over-rep' : 'win rate'}
              onClick={() => nav.push({ key: 'meta:f:' + f.faction, render: () => <FactionMetaScreen data={data} faction={f.faction} dispo={dispo} /> })}
            />
          )
        })}
      </div>
      <Group title={data.trend4w.label} footer={`Source: ${data.trend4w.source}.`}>
        {data.trend4w.rows.map(([name, wr]) => (
          <Item
            key={name}
            style={accent(name)}
            lead={<span className="dispo-dot" style={{ background: 'var(--accent)' }} />}
            title={name}
            figure={<b className={wrClass(wr)}>{wr}%</b>}
          />
        ))}
      </Group>
    </>
  )
}

function ListRow({ l, data, showFaction = true }: { l: MetaList; data: MetaData; showFaction?: boolean }) {
  const nav = useNav()
  const ev = data.events.find((e) => e.name === l.event)
  return (
    <Item
      style={accent(l.faction)}
      lead={<Record r={l.record} />}
      title={l.player}
      lines={[
        <>
          {showFaction && <b className="mi-accent">{l.faction}</b>}
          {showFaction && l.detachment && ' · '}
          {l.detachment}
        </>,
        <>
          <DispoTag d={l.disposition} /> {l.event} · {l.eventPlayers} players · {fmtDate(l.date)}
        </>,
      ]}
      figure={<span className="chevron">{Icon.chevronRight()}</span>}
      onClick={ev ? () => nav.push({ key: 'meta:e:' + ev.name, render: () => <EventMetaScreen data={data} event={ev} /> }) : undefined}
    />
  )
}

function ListsView({ data, dispo }: { data: MetaData; dispo: Dispo }) {
  const [faction, setFaction] = useState('all')
  const [recent, setRecent] = useState(true)
  const [limit, setLimit] = useState(40)
  const rows = data.lists
    .filter((l) => (dispo === 'all' || l.disposition === dispo) && (faction === 'all' || l.faction === faction) && (!recent || l.date >= data.windowStart))
    .sort((a, b) => b.date.localeCompare(a.date) || byResult(a, b))
  return (
    <>
      <div className="meta-filters">
        <select className="select-input" value={faction} onChange={(e) => setFaction(e.target.value)} aria-label="Faction">
          <option value="all">All factions</option>
          {[...data.factions]
            .sort((a, b) => a.faction.localeCompare(b.faction))
            .map((f) => (
              <option key={f.faction} value={f.faction}>
                {f.faction}
              </option>
            ))}
        </select>
        <Segmented
          value={recent ? 'w' : 'a'}
          onChange={(v) => setRecent(v === 'w')}
          options={[
            { value: 'w', label: 'This window' },
            { value: 'a', label: 'Since Sept' },
          ]}
        />
      </div>
      <Group
        title={`${rows.length} list${rows.length === 1 ? '' : 's'}`}
        footer="Top finishes published on Listhammer (4-1 or better). Listhammer shows the army summary only; the full unit list stays on Best Coast Pairings."
      >
        {rows.slice(0, limit).map((l) => (
          <ListRow key={l.faction + l.player + l.event} l={l} data={data} />
        ))}
        {rows.length === 0 && <div className="meta-empty">No published lists match these filters.</div>}
      </Group>
      {rows.length > limit && (
        <button className="button-plain meta-more" onClick={() => setLimit((n) => n + 40)}>
          Show more ({rows.length - limit})
        </button>
      )}
    </>
  )
}

function DetachmentsView({ data, dispo }: { data: MetaData; dispo: Dispo }) {
  const nav = useNav()
  const [popular, setPopular] = useState(false)
  if (dispo !== 'all') {
    // Which detachment combinations reach the top tables on this disposition
    const counts = new Map<string, { faction: string; name: string; n: number; unbeaten: number }>()
    for (const l of data.lists) {
      if (l.disposition !== dispo || !l.detachment) continue
      const k = l.faction + '|' + l.detachment
      const c = counts.get(k) ?? { faction: l.faction, name: l.detachment, n: 0, unbeaten: 0 }
      c.n++
      if (unbeaten(l.record)) c.unbeaten++
      counts.set(k, c)
    }
    const rows = [...counts.values()].sort((a, b) => b.n - a.n || b.unbeaten - a.unbeaten).slice(0, 30)
    return (
      <Group
        title={`Top finishes on ${dispo}`}
        footer="Counted from the published top lists since September. Listhammer doesn't split win rates by disposition and detachment together."
      >
        {rows.map((r) => (
          <Item
            key={r.faction + r.name}
            style={accent(r.faction)}
            lead={<span className="dispo-dot" style={{ background: 'var(--accent)' }} />}
            title={r.name}
            lines={[<b className="mi-accent">{r.faction}</b>, r.unbeaten ? `${r.unbeaten} unbeaten` : '']}
            figure={<b>{r.n}</b>}
            figureSub="lists"
            onClick={() => nav.push({ key: 'meta:f:' + r.faction, render: () => <FactionMetaScreen data={data} faction={r.faction} dispo={dispo} /> })}
          />
        ))}
      </Group>
    )
  }
  const rows = allDetachments(data)
    .filter((d) => d.wr != null && d.field >= 5 && d.factionGames >= 50)
    .sort((a, b) => (popular ? b.field * b.factionGames - a.field * a.factionGames : (b.wr ?? 0) - (a.wr ?? 0)))
  return (
    <>
      <div className="chip-row">
        <button className={'chip' + (!popular ? ' on' : '')} onClick={() => setPopular(false)}>
          Best win rate
        </button>
        <button className={'chip' + (popular ? ' on' : '')} onClick={() => setPopular(true)}>
          Most played
        </button>
      </div>
      <Group footer="Detachment combinations used by at least 5% of a faction's players, in factions with 50+ games. Share is within that faction.">
        {rows.map((d) => (
          <Item
            key={d.faction + d.name}
            style={accent(d.faction)}
            lead={<span className="dispo-dot" style={{ background: 'var(--accent)' }} />}
            title={d.name}
            lines={[
              <>
                <b className="mi-accent">{d.faction}</b> · {pct(d.field)} of players
              </>,
            ]}
            figure={<b className={wrClass(d.wr)}>{pct(d.wr)}</b>}
            figureSub="win rate"
            onClick={() => nav.push({ key: 'meta:f:' + d.faction, render: () => <FactionMetaScreen data={data} faction={d.faction} dispo={dispo} /> })}
          />
        ))}
      </Group>
    </>
  )
}

function DateLead({ iso }: { iso: string }) {
  const d = new Date(iso + 'T12:00:00')
  return (
    <span className="meta-date">
      <b>{d.getDate()}</b>
      <small>{d.toLocaleDateString('en-GB', { month: 'short' })}</small>
    </span>
  )
}

function EventsView({ data, dispo }: { data: MetaData; dispo: Dispo }) {
  const nav = useNav()
  const [recent, setRecent] = useState(true)
  const events = data.events.filter((e) => (!recent || e.date >= data.windowStart) && (dispo === 'all' || data.lists.some((l) => l.event === e.name && l.disposition === dispo)))
  return (
    <>
      <div className="meta-filters">
        <Segmented
          value={recent ? 'w' : 'a'}
          onChange={(v) => setRecent(v === 'w')}
          options={[
            { value: 'w', label: 'This window' },
            { value: 'a', label: 'Since Sept' },
          ]}
        />
      </div>
      <Group title="Singles events" footer="Events with top lists published on Listhammer, newest first.">
        {events.map((e) => {
          const best = data.lists.filter((l) => l.event === e.name && (dispo === 'all' || l.disposition === dispo)).sort(byResult)[0]
          return (
            <Item
              key={e.name}
              style={accent(e.winnerFaction ?? best?.faction)}
              lead={<DateLead iso={e.date} />}
              title={e.name}
              lines={[
                e.winner ? (
                  <span className="meta-winner">
                    {Icon.trophy(12)} {e.winnerFaction}
                  </span>
                ) : best ? (
                  <>
                    Best listed: {best.record} <b className="mi-accent">{best.faction}</b>
                  </>
                ) : (
                  ''
                ),
              ]}
              figure={<b>{e.players}</b>}
              figureSub="players"
              onClick={() => nav.push({ key: 'meta:e:' + e.name, render: () => <EventMetaScreen data={data} event={e} /> })}
            />
          )
        })}
      </Group>
      <Group title="Team events" footer="Winning teams reported by Tabletop Battles.">
        {data.teamEvents.map((t) => (
          <Item
            key={t.name}
            lead={Icon.trophy(18)}
            title={t.name}
            lines={[t.winner]}
            figure={t.players ? <b>{t.players}</b> : undefined}
            figureSub={t.players ? 'players' : undefined}
          />
        ))}
      </Group>
    </>
  )
}

function Sources({ data }: { data: MetaData }) {
  return (
    <Group title="Sources" footer={`${data.filters} Snapshot updated ${new Date(data.updated + 'T12:00:00').toLocaleDateString('en-GB', { dateStyle: 'medium' })}.`}>
      {data.sources.map((s) => (
        <a className="meta-item pressable" key={s.name} href={s.url} target="_blank" rel="noreferrer">
          <span className="mi-lead">{Icon.share(18)}</span>
          <span className="mi-body">
            <span className="mi-title">{s.name}</span>
            <span className="mi-line">{s.what}</span>
          </span>
          <span className="mi-figure">
            <span className="chevron">{Icon.chevronRight()}</span>
          </span>
        </a>
      ))}
    </Group>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="meta-hero-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

export function FactionMetaScreen({ data, faction, dispo: initial = 'all' }: { data: MetaData; faction: string; dispo?: Dispo }) {
  const [dispo, setDispo] = useState<Dispo>(initial)
  const f = data.factions.find((x) => x.faction === faction)!
  const ranked = data.factions.filter((x) => x.winRate != null).sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
  const rank = ranked.indexOf(f) + 1
  const maxField = Math.max(1, ...f.detachments.map((d) => d.field))
  const top = topLists(data, f)
  const lists = (
    dispo === 'all' ? top : data.lists.filter((l) => l.faction === faction && l.disposition === dispo).sort((a, b) => b.date.localeCompare(a.date) || byResult(a, b))
  ).slice(0, 25)
  return (
    <Screen title={faction} back="Meta" large={false}>
      <div style={accent(faction)}>
        <div className="meta-hero">
          <span className="roster-faction">{rank ? `#${rank} of ${ranked.length} by win rate` : 'No games this window'}</span>
          <span className="roster-name">{faction}</span>
          <span className="meta-hero-wr">{pct(f.winRate)}</span>
          <div className="meta-hero-grid">
            <Stat label="Games" value={f.games} />
            <Stat label="Players" value={f.players} />
            <Stat label="X-0" value={f.x0} />
            <Stat label="X-1" value={f.x1} />
            <Stat label="Event wins" value={f.eventWins} />
            <Stat label="Over-rep" value={f.overrep?.toFixed(2) ?? '—'} />
          </div>
        </div>
        {f.dispositions.length > 0 && (
          <Group title="Dispositions" footer="Share of this faction's players on each disposition this window.">
            {f.dispositions.map((d) => (
              <Item
                key={d.name}
                lead={<span className="dispo-dot" style={{ background: DISPO_COLOR[d.name] }} />}
                title={d.name}
                lines={[<ShareBar value={d.pct} color={DISPO_COLOR[d.name]} />, `${d.count} player${d.count === 1 ? '' : 's'}`]}
                figure={<b>{pct(d.pct)}</b>}
              />
            ))}
          </Group>
        )}
        {f.detachments.length > 0 && (
          <Group title="Detachments" footer="Bar: share of this faction's players. Right: win rate with that combination.">
            {f.detachments.map((d) => (
              <Item
                key={d.name}
                lead={<span className="dispo-dot" style={{ background: 'var(--accent)' }} />}
                title={d.name}
                lines={[<ShareBar value={d.field} max={maxField} />, `${pct(d.field)} of players`]}
                figure={<b className={wrClass(d.wr)}>{pct(d.wr)}</b>}
                figureSub="win rate"
              />
            ))}
          </Group>
        )}
        <DispoChips value={dispo} onChange={setDispo} />
        <Group
          title={dispo === 'all' ? 'Top lists' : `Lists on ${dispo}`}
          footer={dispo === 'all' ? "Listhammer's best placed lists for this faction. Tap one to see the event." : 'Published top finishes since September with this disposition.'}
        >
          {lists.map((l) => (
            <ListRow key={l.player + l.event} l={l} data={data} showFaction={false} />
          ))}
          {lists.length === 0 && <div className="meta-empty">No published lists with this disposition.</div>}
        </Group>
      </div>
    </Screen>
  )
}

export function EventMetaScreen({ data, event: e }: { data: MetaData; event: MetaEvent }) {
  const results = data.lists.filter((l) => l.event === e.name).sort(byResult)
  return (
    <Screen title={e.name} back="Back" large={false}>
      <div className="meta-hero" style={accent(e.winnerFaction ?? results[0]?.faction)}>
        <span className="roster-faction">
          {fmtDate(e.date)} 2026{e.location ? ` · ${e.location}` : ''}
        </span>
        <span className="roster-name">{e.name}</span>
        <div className="meta-hero-grid">
          <Stat label="Players" value={e.players} />
          {e.rounds && <Stat label="Rounds" value={e.rounds} />}
          <Stat label="Lists here" value={results.length} />
        </div>
        {e.winner && (
          <div className="meta-hero-winner">
            {Icon.trophy(16)} {e.winner} · {e.winnerFaction}
          </div>
        )}
      </div>
      {e.note && <p className="meta-note">{e.note}</p>}
      <Group title="Published finishes" footer="Lists found on Listhammer for this event, best record first. Not a full standings table.">
        {results.map((l) => (
          <ListRow key={l.player + l.faction} l={l} data={data} />
        ))}
      </Group>
    </Screen>
  )
}
