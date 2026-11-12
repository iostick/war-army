// Competitive meta snapshot: public tournament stats gathered from Listhammer and Tabletop Battles.
// The data lives in public/meta/meta.json so it can be refreshed without touching the code.
import { useEffect, useState } from 'react'
import { DISPOSITIONS, type Disposition } from './missions'

export interface MetaDetachment {
  name: string
  /** Share of the faction's players using it, in % */
  field: number
  /** Win rate, in %, or null when the sample is too small */
  wr: number | null
}

export interface MetaList {
  faction: string
  player: string
  event: string
  eventPlayers: number
  record: string
  detachment: string
  disposition: Disposition | null
  /** ISO date */
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
  /** How this faction's players split across dispositions this window */
  dispositions: { name: Disposition; count: number; pct: number }[]
  /** Listhammer's top lists, as [player, event] keys into MetaData.lists */
  top: [string, string][]
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
}

export interface MetaData {
  updated: string
  window: string
  windowStart: string
  filters: string
  sources: { name: string; url: string; what: string }[]
  dispositions: { name: Disposition; wr: number; games: number; field: number }[]
  teamEvents: { name: string; players?: number; winner: string }[]
  trend4w: { source: string; label: string; rows: [string, number][] }
  factions: MetaFaction[]
  lists: MetaList[]
  events: MetaEvent[]
}

export { DISPOSITIONS }
export type { Disposition }

/** Short labels and colours for disposition tags. */
export const DISPO_SHORT: Record<Disposition, string> = {
  'Take and Hold': 'Take & Hold',
  'Purge the Foe': 'Purge',
  Disruption: 'Disruption',
  Reconnaissance: 'Recon',
  'Priority Assets': 'Assets',
}
export const DISPO_COLOR: Record<Disposition, string> = {
  'Take and Hold': '#4f8cff',
  'Purge the Foe': '#ff5a5f',
  Disruption: '#b26bff',
  Reconnaissance: '#2ec4b6',
  'Priority Assets': '#f2b632',
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

export const unbeaten = (record: string) => Number(record.split('-')[1] ?? 0) === 0

export function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const byResult = (a: MetaList, b: MetaList) => recordScore(b.record) - recordScore(a.record) || b.eventPlayers - a.eventPlayers

/** Listhammer's top lists for a faction, resolved to full list rows. */
export function topLists(d: MetaData, f: MetaFaction): MetaList[] {
  return f.top.map(([player, event]) => d.lists.find((l) => l.faction === f.faction && l.player === player && l.event === event)).filter((l): l is MetaList => !!l)
}

/** Every detachment across factions, for the "Detachments" view. */
export function allDetachments(d: MetaData): (MetaDetachment & { faction: string; factionGames: number })[] {
  return d.factions.flatMap((f) => f.detachments.map((x) => ({ ...x, faction: f.faction, factionGames: f.games })))
}
