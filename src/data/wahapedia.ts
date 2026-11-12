// Estratagemas y reglas de destacamento de Wahapedia (exportación de datos en CSV, 11ª edición).
// Los CSV se descargan al publicar la app (y cada día) en ./wahapedia/; si no están, se intenta la web de Wahapedia.
import { useEffect, useState } from 'react'

export interface WStratagem {
  factionId: string
  name: string
  id: string
  type: string
  cp: string
  legend: string
  turn: string
  phase: string
  detachment: string
  detachmentId: string
  description: string
}

export interface WDetachmentAbility {
  id: string
  factionId: string
  name: string
  legend: string
  description: string
  detachment: string
  detachmentId: string
}

export interface WahapediaData {
  stratagems: WStratagem[]
  abilities: WDetachmentAbility[]
  factions: Map<string, string>
  updated?: string
}

const SOURCES = ['./wahapedia/', 'https://wahapedia.ru/wh40k11ed/']

/** Lee el formato de Wahapedia: separado por "|", cabecera en la primera línea, cada fila termina en "|". */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const header = (lines.shift() ?? '').split('|')
  if (header[header.length - 1] === '') header.pop()
  const n = header.length
  const out: Record<string, string>[] = []
  let buf = ''
  const pipes = (s: string) => s.split('|').length - 1
  for (const line of lines) {
    buf = buf ? buf + '\n' + line : line
    if (pipes(buf) < n) continue
    const cells = buf.split('|')
    const row: Record<string, string> = {}
    header.forEach((h, i) => (row[h.trim()] = (cells[i] ?? '').trim()))
    out.push(row)
    buf = ''
  }
  return out
}

async function fetchCsv(name: string): Promise<Record<string, string>[] | undefined> {
  for (const base of SOURCES) {
    try {
      const res = await fetch(base + name + '.csv', { cache: 'no-cache' })
      if (!res.ok) continue
      const text = await res.text()
      if (!text.includes('|')) continue
      return parseCsv(text)
    } catch {
      // siguiente fuente
    }
  }
  return undefined
}

let cache: Promise<WahapediaData | undefined> | undefined

export function loadWahapedia(): Promise<WahapediaData | undefined> {
  cache ??= (async () => {
    const [strats, abilities, factions, updated] = await Promise.all([
      fetchCsv('Stratagems'),
      fetchCsv('Detachment_abilities'),
      fetchCsv('Factions'),
      fetchCsv('Last_update'),
    ])
    if (!strats) return undefined
    return {
      stratagems: strats.map((r) => ({
        factionId: r.faction_id ?? '',
        name: r.name ?? '',
        id: r.id ?? '',
        type: r.type ?? '',
        cp: r.cp_cost ?? '',
        legend: r.legend ?? '',
        turn: r.turn ?? '',
        phase: r.phase ?? '',
        detachment: r.detachment ?? '',
        detachmentId: r.detachment_id ?? '',
        description: r.description ?? '',
      })),
      abilities: (abilities ?? []).map((r) => ({
        id: r.id ?? '',
        factionId: r.faction_id ?? '',
        name: r.name ?? '',
        legend: r.legend ?? '',
        description: r.description ?? '',
        detachment: r.detachment ?? '',
        detachmentId: r.detachment_id ?? '',
      })),
      factions: new Map((factions ?? []).map((r) => [r.id, r.name])),
      updated: updated?.[0] ? Object.values(updated[0])[0] : undefined,
    }
  })()
  return cache
}

export function useWahapedia(): { loading: boolean; data?: WahapediaData } {
  const [state, setState] = useState<{ loading: boolean; data?: WahapediaData }>({ loading: true })
  useEffect(() => {
    let alive = true
    loadWahapedia().then((data) => alive && setState({ loading: false, data }))
    return () => {
      alive = false
    }
  }, [])
  return state
}

/** Normaliza nombres para comparar BSData con Wahapedia */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\bdetachment\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Estratagemas del destacamento con ese nombre (de BSData) */
export function stratagemsFor(data: WahapediaData | undefined, detachment: string): WStratagem[] {
  if (!data) return []
  const want = normName(detachment)
  if (!want) return []
  return data.stratagems.filter((s) => s.detachment && normName(s.detachment) === want)
}

export function detachmentAbilitiesFor(data: WahapediaData | undefined, detachment: string): WDetachmentAbility[] {
  if (!data) return []
  const want = normName(detachment)
  return data.abilities.filter((a) => a.detachment && normName(a.detachment) === want)
}

/** Estratagemas básicas (sin facción ni destacamento) */
export function coreStratagems(data: WahapediaData | undefined): WStratagem[] {
  if (!data) return []
  return data.stratagems.filter((s) => !s.factionId && !s.detachment && /core/i.test(s.type))
}

const TURN: Record<string, string> = {
  'your turn': 'Your turn',
  "opponent's turn": "Opponent's turn",
  "either player's turn": "Either player's turn",
}
const PHASE: Record<string, string> = {
  command: 'Command phase',
  movement: 'Movement phase',
  shooting: 'Shooting phase',
  charge: 'Charge phase',
  fight: 'Fight phase',
  any: 'Any phase',
}

export function turnEs(t: string): string {
  return TURN[t.toLowerCase().replace(/’/g, "'")] ?? t
}

export function phaseEs(p: string): string {
  return p
    .split(/\s*(?:,|\bor\b|\band\b|\+)\s*/i)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => PHASE[x.toLowerCase().replace(/ phase$/, '')] ?? x)
    .join(' or ')
}

/** Short stratagem type ("Awakened Dynasty – Battle Tactic Stratagem" → "Battle Tactic") */
export function stratTypeEs(type: string): string {
  const t = type.split(/[–-]\s*/).pop() ?? type
  if (/battle tactic/i.test(t)) return 'Battle Tactic'
  if (/strategic ploy/i.test(t)) return 'Strategic Ploy'
  if (/epic deed/i.test(t)) return 'Epic Deed'
  if (/wargear/i.test(t)) return 'Wargear'
  return t.replace(/\s*stratagem$/i, '')
}
