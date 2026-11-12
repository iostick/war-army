// Meta: competitive tournament stats (faction win rates, detachments, events and top lists).
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { allDetachments, fmtDate, useMeta, type MetaData, type MetaEvent, type MetaFaction } from '../data/meta'
import { rosterStore } from '../data/rosterStore'
import { factionColor } from '../ui/faction'
import { Icon, Screen, Section, Segmented, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'

type View = 'factions' | 'detachments' | 'events'
type Sort = 'wr' | 'games' | 'overrep'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z']/g, '')

/** Factions the user has lists for, so they can be highlighted. */
function useMyFactions(): Set<string> {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    rosterStore.all().then((rs) => setNames(rs.map((r) => r.summary?.faction ?? '').filter(Boolean)))
  }, [])
  return useMemo(() => new Set(names.map((n) => norm(n.split(' - ').pop() ?? n))), [names])
}
const isMine = (mine: Set<string>, faction: string) => [...mine].some((m) => m.includes(norm(faction)) || norm(faction).includes(m))

function wrClass(wr: number | null | undefined): string {
  if (wr == null) return 'wr-none'
  if (wr >= 52) return 'wr-up'
  if (wr <= 48) return 'wr-down'
  return 'wr-even'
}
const unbeaten = (record: string) => Number(record.split('-')[1] ?? 0) === 0
const pct = (n: number | null | undefined, digits = 1) => (n == null ? '—' : `${n.toFixed(digits).replace(/\.0$/, '')}%`)

/** Bar centred on 50%: grows right when above, left when below. */
function WrBar({ wr }: { wr: number | null }) {
  if (wr == null) return <div className="wr-bar" />
  const d = Math.max(-25, Math.min(25, wr - 50))
  const style: CSSProperties = d >= 0 ? { left: '50%', width: `${(d / 25) * 50}%` } : { right: '50%', width: `${(-d / 25) * 50}%` }
  return (
    <div className="wr-bar">
      <span className={'wr-fill ' + wrClass(wr)} style={style} />
      <span className="wr-mid" />
    </div>
  )
}

export function MetaScreen() {
  const { data, error } = useMeta()
  const [view, setView] = useState<View>('factions')
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
  const best = data.factions.find((f) => f.winRate != null)
  const games = Math.round(data.factions.reduce((n, f) => n + f.games, 0) / 2)
  return (
    <Screen title="Meta" subtitle={`Tournament results · ${data.window}`}>
      <div className="meta-stats">
        <div className="meta-stat">
          <b>{games.toLocaleString('en-GB')}</b>
          <span>games</span>
        </div>
        <div className="meta-stat">
          <b>{data.events.length}</b>
          <span>events</span>
        </div>
        {best && (
          <div className="meta-stat" style={{ '--accent': factionColor(best.faction) } as CSSProperties}>
            <b className="accent">{pct(best.winRate)}</b>
            <span>{best.faction}</span>
          </div>
        )}
      </div>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'factions', label: 'Factions' },
          { value: 'detachments', label: 'Detachments' },
          { value: 'events', label: 'Events' },
        ]}
      />
      <div style={{ height: 14 }} />
      {view === 'factions' && <FactionsView data={data} />}
      {view === 'detachments' && <DetachmentsView data={data} />}
      {view === 'events' && <EventsView data={data} />}
      <Sources data={data} />
    </Screen>
  )
}

function FactionsView({ data }: { data: MetaData }) {
  const nav = useNav()
  const mine = useMyFactions()
  const [sort, setSort] = useState<Sort>('wr')
  const rows = [...data.factions].sort((a, b) =>
    sort === 'games' ? b.games - a.games : sort === 'overrep' ? (b.overrep ?? -1) - (a.overrep ?? -1) : (b.winRate ?? -1) - (a.winRate ?? -1),
  )
  return (
    <>
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
      <div className="meta-list">
        {rows.map((f, i) => (
          <button
            key={f.faction}
            className={'meta-row' + (isMine(mine, f.faction) ? ' mine' : '')}
            style={{ '--accent': factionColor(f.faction) } as CSSProperties}
            onClick={() =>
              nav.push({
                key: 'meta:f:' + f.faction,
                render: () => <FactionMetaScreen data={data} faction={f.faction} />,
              })
            }
          >
            <span className="meta-rank">{i + 1}</span>
            <span className="meta-main">
              <span className="meta-name">
                {f.faction}
                {isMine(mine, f.faction) && <span className="meta-tag">Your army</span>}
              </span>
              <span className="meta-sub">
                {f.games ? `${f.games} games · ${f.players} players` : 'No games this window'}
                {f.eventWins > 0 && ` · ${f.eventWins} event win${f.eventWins > 1 ? 's' : ''}`}
              </span>
              <WrBar wr={f.winRate} />
            </span>
            <span className="meta-figure">
              <b className={wrClass(f.winRate)}>{sort === 'games' ? f.games : sort === 'overrep' ? (f.overrep?.toFixed(2) ?? '—') : pct(f.winRate)}</b>
              <small>{sort === 'games' ? 'games' : sort === 'overrep' ? 'over-rep' : 'win rate'}</small>
            </span>
          </button>
        ))}
      </div>
      <Section header={data.trend4w.label} footer={`Source: ${data.trend4w.source}.`}>
        {data.trend4w.rows.map(([name, wr]) => (
          <div className="row" key={name}>
            <span className="dot" style={{ background: factionColor(name) }} />
            <div className="row-body">
              <div className="row-title">{name}</div>
            </div>
            <span className={'row-detail ' + wrClass(wr)}>{wr}%</span>
          </div>
        ))}
      </Section>
    </>
  )
}

function DetachmentsView({ data }: { data: MetaData }) {
  const nav = useNav()
  const [popular, setPopular] = useState(false)
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
      <Section footer="Detachment combinations used by at least 5% of a faction's players, in factions with 50+ games. Field share is within that faction.">
        {rows.map((d) => (
          <div
            role="button"
            tabIndex={0}
            className="row pressable meta-det"
            key={d.faction + d.name}
            style={{ '--accent': factionColor(d.faction) } as CSSProperties}
            onClick={() =>
              nav.push({
                key: 'meta:f:' + d.faction,
                render: () => <FactionMetaScreen data={data} faction={d.faction} />,
              })
            }
          >
            <span className="dot" style={{ background: 'var(--accent)' }} />
            <div className="row-body">
              <div className="row-title">{d.name}</div>
              <div className="row-sub">
                {d.faction} · {pct(d.field)} of players
              </div>
            </div>
            <span className={'row-detail meta-wr ' + wrClass(d.wr)}>{pct(d.wr)}</span>
          </div>
        ))}
      </Section>
    </>
  )
}

function EventsView({ data }: { data: MetaData }) {
  const nav = useNav()
  return (
    <>
      <Section header="Singles events" footer="Events with lists published on Listhammer, newest first. Finishes shown are the best placed lists found per faction.">
        {data.events.map((e) => {
          const top = e.results[0]
          return (
            <div
              role="button"
              tabIndex={0}
              className="row pressable"
              key={e.name}
              onClick={() =>
                nav.push({
                  key: 'meta:e:' + e.name,
                  render: () => <EventMetaScreen data={data} event={e} />,
                })
              }
            >
              <span className="meta-date">
                <b>{new Date(e.date + 'T12:00:00').getDate()}</b>
                <small>
                  {new Date(e.date + 'T12:00:00').toLocaleDateString('en-GB', {
                    month: 'short',
                  })}
                </small>
              </span>
              <div className="row-body">
                <div className="row-title">{e.name}</div>
                <div className="row-sub">
                  {e.players} players
                  {e.winner ? (
                    <>
                      {' · '}
                      <span className="meta-winner" style={{ color: factionColor(e.winnerFaction) }}>
                        {Icon.trophy(12)} {e.winnerFaction}
                      </span>
                    </>
                  ) : (
                    top && ` · ${top.record} ${top.faction}`
                  )}
                </div>
              </div>
              <span className="chevron">{Icon.chevronRight()}</span>
            </div>
          )
        })}
      </Section>
      <Section header="Team events" footer="Winning teams reported by Tabletop Battles.">
        {data.teamEvents.map((t) => (
          <div className="row" key={t.name}>
            <div className="row-body">
              <div className="row-title">{t.name}</div>
              <div className="row-sub">{t.players ? `${t.players} players` : 'Teams'}</div>
            </div>
            <span className="row-detail">{t.winner}</span>
          </div>
        ))}
      </Section>
    </>
  )
}

function Sources({ data }: { data: MetaData }) {
  return (
    <Section
      header="Sources"
      footer={`${data.filters} Snapshot updated ${new Date(data.updated + 'T12:00:00').toLocaleDateString('en-GB', { dateStyle: 'medium' })}. Full army lists are on Listhammer.`}
    >
      {data.sources.map((s) => (
        <a className="row pressable" key={s.name} href={s.url} target="_blank" rel="noreferrer">
          <div className="row-body">
            <div className="row-title">{s.name}</div>
            <div className="row-sub">{s.what}</div>
          </div>
          <span className="chevron">{Icon.chevronRight()}</span>
        </a>
      ))}
    </Section>
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

export function FactionMetaScreen({ data, faction }: { data: MetaData; faction: string }) {
  const nav = useNav()
  const f = data.factions.find((x) => x.faction === faction) as MetaFaction
  const maxField = Math.max(1, ...f.detachments.map((d) => d.field))
  const rank =
    [...data.factions]
      .filter((x) => x.winRate != null)
      .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
      .indexOf(f) + 1
  const openEvent = (name: string) => {
    const e = data.events.find((x) => x.name === name)
    if (e)
      nav.push({
        key: 'meta:e:' + name,
        render: () => <EventMetaScreen data={data} event={e} />,
      })
  }
  return (
    <Screen title={faction} back="Meta" large={false}>
      <div style={{ '--accent': factionColor(faction) } as CSSProperties}>
        <div className="meta-hero">
          <span className="roster-faction">{rank ? `#${rank} of ${data.factions.filter((x) => x.winRate != null).length} by win rate` : 'No games this window'}</span>
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
        {f.detachments.length > 0 && (
          <Section header="Detachments" footer="Bar: share of this faction's players. Right: win rate with that combination.">
            {f.detachments.map((d) => (
              <div className="row meta-det-row" key={d.name}>
                <div className="row-body">
                  <div className="row-title">{d.name}</div>
                  <div className="field-bar">
                    <span style={{ width: `${(d.field / maxField) * 100}%` }} />
                  </div>
                  <div className="row-sub">{pct(d.field)} of players</div>
                </div>
                <span className={'row-detail meta-wr ' + wrClass(d.wr)}>{pct(d.wr)}</span>
              </div>
            ))}
          </Section>
        )}
        <Section header="Top lists" footer="Best placed lists published on Listhammer. Tap one to see the event.">
          {f.topLists.map((l) => (
            <div role="button" tabIndex={0} className="row pressable meta-list-row" key={l.player + l.event} onClick={() => openEvent(l.event)}>
              <span className={'record' + (unbeaten(l.record) ? ' perfect' : '')}>{l.record}</span>
              <div className="row-body">
                <div className="row-title">{l.player}</div>
                <div className="row-sub">{l.detachment}</div>
                <div className="row-sub">
                  {l.event} · {l.eventPlayers} players · {fmtDate(l.date)}
                </div>
              </div>
              <span className="chevron">{Icon.chevronRight()}</span>
            </div>
          ))}
        </Section>
      </div>
    </Screen>
  )
}

export function EventMetaScreen({ data, event: e }: { data: MetaData; event: MetaEvent }) {
  const nav = useNav()
  const accent = factionColor(e.winnerFaction ?? e.results[0]?.faction)
  return (
    <Screen title={e.name} back="Back" large={false}>
      <div className="meta-hero" style={{ '--accent': accent } as CSSProperties}>
        <span className="roster-faction">
          {fmtDate(e.date)} 2026{e.location ? ` · ${e.location}` : ''}
        </span>
        <span className="roster-name">{e.name}</span>
        <div className="meta-hero-grid">
          <Stat label="Players" value={e.players} />
          {e.rounds && <Stat label="Rounds" value={e.rounds} />}
          <Stat label="Lists here" value={e.results.length} />
        </div>
        {e.winner && (
          <div className="meta-hero-winner">
            {Icon.trophy(16)} {e.winner} · {e.winnerFaction}
          </div>
        )}
      </div>
      {e.note && (
        <Section>
          <div className="rule-text">{e.note}</div>
        </Section>
      )}
      <Section header="Published finishes" footer="Lists found on Listhammer for this event, best record first. Not a full standings table.">
        {e.results.map((r) => (
          <div
            role="button"
            tabIndex={0}
            className="row pressable meta-list-row"
            key={r.player + r.faction}
            style={{ '--accent': factionColor(r.faction) } as CSSProperties}
            onClick={() =>
              nav.push({
                key: 'meta:f:' + r.faction,
                render: () => <FactionMetaScreen data={data} faction={r.faction} />,
              })
            }
          >
            <span className={'record' + (unbeaten(r.record) ? ' perfect' : '')}>{r.record}</span>
            <div className="row-body">
              <div className="row-title">{r.player}</div>
              <div className="row-sub">
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{r.faction}</span> · {r.detachment}
              </div>
            </div>
            <span className="chevron">{Icon.chevronRight()}</span>
          </div>
        ))}
      </Section>
    </Screen>
  )
}
