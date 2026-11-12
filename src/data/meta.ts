// Competitive meta snapshot: public tournament stats gathered from Listhammer and Tabletop Battles.
// The data lives in public/meta/meta.json so it can be refreshed without touching the code.
import { useEffect, useState } from 'react'

export interface MetaDetachment {
  name: string
  /** Share of the faction's players using it, in % */
  field: number
  /** Win rate, in %, or null when the sample is too small */
  wr: number | null
}

export interface MetaList {
  player: string
  event: string
  eventPlayers: number
  record: string
  detachment: string
  date: string
}

export interface MetaFaction {
  faction: string
  winRate: number | null
  games: number
  players: number
  x0: number
  x1: number
  eventWins: number
  /** Share of top finishes divided by share of the field (1 = as expected) */
  overrep: number | null
  detachments: MetaDetachment[]
  topLists: MetaList[]
}

export interface MetaResult {
  player: string
  faction: string
  record: string
  detachment: string
}

export interface MetaEvent {
  name: string
  players: number
  date: string
  rounds?: number
  location?: string
  winner?: string
  winnerFaction?: string
  note?: string
  results: MetaResult[]
}

export interface MetaData {
  updated: string
  window: string
  filters: string
  sources: { name: string; url: string; what: string }[]
  teamEvents: { name: string; players?: number; winner: string }[]
  trend4w: { source: string; label: string; rows: [string, number][] }
  factions: MetaFaction[]
  events: MetaEvent[]
}

let cache: Promise<MetaData> | undefined

export function loadMeta(): Promise<MetaData> {
  cache ??= fetch('./meta/meta.json').then((r) => {
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return r.json() as Promise<MetaData>
  })
  cache.catch(() => (cache = undefined))
  return cache
}

export function useMeta(): { data?: MetaData; error?: string } {
  const [state, setState] = useState<{ data?: MetaData; error?: string }>({})
  useEffect(() => {
    let alive = true
    loadMeta().then(
      (data) => alive && setState({ data }),
      (e: Error) => alive && setState({ error: e.message }),
    )
    return () => {
      alive = false
    }
  }, [])
  return state
}

/** Wins minus losses, used to rank finishes like "5-0" or "4-0-1". */
export function recordScore(r: string): number {
  const [w = 0, l = 0] = r.split('-').map(Number)
  return w - l
}

export function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

/** Every detachment across factions, for the "Detachments" view. */
export function allDetachments(d: MetaData): (MetaDetachment & { faction: string; factionGames: number })[] {
  return d.factions.flatMap((f) =>
    f.detachments.map((x) => ({
      ...x,
      faction: f.faction,
      factionGames: f.games,
    })),
  )
}
