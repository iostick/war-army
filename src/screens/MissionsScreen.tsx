// Missions hub (Warhammer Event, 11th edition): disposition matrix, mission decks and deployments.
import { useState } from 'react'
import { DISPOSITIONS, MATRIX, findCard, useMissionCards, type CardKind, type Disposition, type MissionCard } from '../data/missions'
import { Row, Screen, Section, Sheet, Spinner } from '../ui/kit'
import { useNav } from '../ui/nav'
import { RulebookScreen } from './RulebookScreen'

const KIND_TITLE: Record<CardKind, string> = { primary: 'Primary missions', secondary: 'Secondary missions', deployment: 'Deployments' }

export function MissionsScreen({ back }: { back?: string }) {
  const nav = useNav()
  const { loading, cards } = useMissionCards()
  const count = (k: CardKind) => cards?.filter((c) => c.kind === k).length ?? 0
  const openList = (kind: CardKind) => nav.push({ key: 'cards:' + kind, render: () => <CardListScreen kind={kind} /> })
  return (
    <Screen title="Missions" back={back ?? 'Rules'}>
      <MatchupPicker />
      <Section header="Card decks" footer={loading ? 'Loading cards…' : cards?.length ? 'Card text from Wahapedia (Warhammer Event Companion).' : "The card text isn't downloaded yet: it's fetched from Wahapedia when the app is published. Mission names and the matrix work offline."}>
        <Row title="Mission matrix" sub="Your disposition × theirs = your primary mission" chevron onClick={() => nav.push({ key: 'matrix', render: () => <MatrixScreen /> })} />
        <Row title="Primary missions" detail={count('primary') || 25} chevron onClick={() => openList('primary')} />
        <Row title="Secondary missions" detail={count('secondary') || undefined} chevron onClick={() => openList('secondary')} />
        <Row title="Deployments" detail={count('deployment') || undefined} chevron onClick={() => openList('deployment')} />
      </Section>
      <Section header="Event rules">
        <Row title="Mission sequence, terrain layouts and pairings" sub="Warhammer Event Companion" chevron onClick={() => nav.push({ key: 'book:missions', render: () => <RulebookScreen id="warhammer-event-companion" back="Missions" /> })} />
      </Section>
    </Screen>
  )
}

/** Pick both dispositions and see each player's primary mission */
export function MatchupPicker({ me: me0, them: them0, onChange }: { me?: Disposition; them?: Disposition; onChange?: (me?: Disposition, them?: Disposition) => void }) {
  const [me, setMe] = useState<Disposition | undefined>(me0)
  const [them, setThem] = useState<Disposition | undefined>(them0)
  const [open, setOpen] = useState<string>()
  const set = (a?: Disposition, b?: Disposition) => {
    setMe(a)
    setThem(b)
    onChange?.(a, b)
  }
  return (
    <>
      <div className="section-header">
        <span>You play</span>
      </div>
      <div className="dispo-chips">
        {DISPOSITIONS.map((d) => (
          <button key={d} className={'dispo-chip' + (me === d ? ' on' : '')} onClick={() => set(d, them)}>
            {d}
          </button>
        ))}
      </div>
      <div className="section-header">
        <span>Opponent plays</span>
      </div>
      <div className="dispo-chips">
        {DISPOSITIONS.map((d) => (
          <button key={d} className={'dispo-chip them' + (them === d ? ' on' : '')} onClick={() => set(me, d)}>
            {d}
          </button>
        ))}
      </div>
      {me && them && (
        <div className="matchup">
          <button className="matchup-card" onClick={() => setOpen(MATRIX[me][them])}>
            <span>Your primary</span>
            <b>{MATRIX[me][them]}</b>
          </button>
          <button className="matchup-card them" onClick={() => setOpen(MATRIX[them][me])}>
            <span>Their primary</span>
            <b>{MATRIX[them][me]}</b>
          </button>
        </div>
      )}
      {open && <CardSheet kind="primary" name={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}

export function MatrixScreen() {
  const [open, setOpen] = useState<string>()
  return (
    <Screen title="Mission matrix" back="Missions" subtitle="Row: your disposition · Column: your opponent's. The cell is your primary mission.">
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th />
              {DISPOSITIONS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISPOSITIONS.map((r) => (
              <tr key={r}>
                <th>{r}</th>
                {DISPOSITIONS.map((c) => (
                  <td key={c}>
                    <button onClick={() => setOpen(MATRIX[r][c])}>{MATRIX[r][c]}</button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <CardSheet kind="primary" name={open} onClose={() => setOpen(undefined)} />}
    </Screen>
  )
}

function CardListScreen({ kind }: { kind: CardKind }) {
  const { loading, cards } = useMissionCards()
  const [open, setOpen] = useState<MissionCard>()
  const list = cards?.filter((c) => c.kind === kind) ?? []
  return (
    <Screen title={KIND_TITLE[kind]} back="Missions">
      {loading && (
        <div className="empty">
          <Spinner />
        </div>
      )}
      {kind === 'primary' &&
        DISPOSITIONS.map((d) => (
          <Section key={d} header={`${d} deck`}>
            {DISPOSITIONS.map((o) => {
              const name = MATRIX[d][o]
              const c = findCard(cards, 'primary', name)
              return <Row key={o} title={name} sub={`vs ${o}`} chevron onClick={() => setOpen(c ?? { kind, name, tags: [], lines: [] })} />
            })}
          </Section>
        ))}
      {kind === 'secondary' && !loading && (
        <Section>
          {list.length ? list.map((c) => <Row key={c.name} title={c.name} accessory={<Tags tags={c.tags} />} chevron onClick={() => setOpen(c)} />) : <div className="row muted-text">Not downloaded yet.</div>}
        </Section>
      )}
      {kind === 'deployment' && !loading && (
        <div className="deploy-grid">
          {list.map((c) => (
            <button key={c.name} className="deploy-tile" onClick={() => setOpen(c)}>
              {c.image && <img src={c.image} alt="" loading="lazy" />}
              <span>{c.name}</span>
            </button>
          ))}
          {!list.length && <div className="muted-text">Not downloaded yet.</div>}
        </div>
      )}
      {open && <CardSheet card={open} kind={open.kind} name={open.name} onClose={() => setOpen(undefined)} />}
    </Screen>
  )
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <span className="card-tags">
      {tags.map((t) => (
        <span key={t} className={'pill ' + (t === 'Attacker' ? 'red' : t === 'Defender' ? 'green' : '')}>
          {t}
        </span>
      ))}
    </span>
  )
}

export function CardSheet({ card, kind, name, onClose }: { card?: MissionCard; kind: CardKind; name: string; onClose: () => void }) {
  const { cards } = useMissionCards()
  const c = card?.lines.length || card?.image ? card : (findCard(cards, kind, name) ?? card)
  return (
    <Sheet
      title={name}
      onClose={onClose}
      left={<span />}
      right={
        <button className="bar-button bold" onClick={onClose}>
          Close
        </button>
      }
    >
      <MissionCardView kind={kind} name={name} card={c} />
    </Sheet>
  )
}

export function MissionCardView({ kind, name, card }: { kind: CardKind; name: string; card?: MissionCard }) {
  return (
    <div className={'mission-card ' + kind}>
      <div className="mission-card-head">
        <span>{kind === 'primary' ? 'Primary mission' : kind === 'secondary' ? 'Secondary mission' : 'Deployment'}</span>
        <b>{name}</b>
        {card && <Tags tags={card.tags} />}
      </div>
      {card?.image && <img className="mission-card-img" src={card.image} alt="" />}
      {card?.lines.length ? (
        <div className="mission-card-body">
          {card.lines.map((h, i) => {
            const t = h.replace(/<[^>]+>/g, '').trim()
            const cls = /^\d+\s*VP/i.test(t) ? 'card-vp' : t.length < 40 && t === t.toUpperCase() && /[A-Z]{3}/.test(t) && !/:/.test(t) ? 'card-round' : 'card-line'
            return <div key={i} className={cls} dangerouslySetInnerHTML={{ __html: h }} />
          })}
        </div>
      ) : (
        !card?.image && <div className="mission-card-body muted-text">The card text isn't downloaded yet. It's fetched from Wahapedia when the app is published; reopen the app while online.</div>
      )}
    </div>
  )
}
