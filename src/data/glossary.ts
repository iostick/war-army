// Glosario de palabras clave de armas y habilidades, a partir de las reglas de BSData (11ª edición).
import { useEffect, useState } from 'react'
import type { DataIndex } from '../engine/catalog'
import { bsdata } from './bsdata'
import { GAME_SYSTEM_FILE } from '../engine/sync'

export interface GlossaryEntry {
  name: string
  description: string
}

let cache: Promise<Map<string, GlossaryEntry>> | undefined

export function loadGlossary(): Promise<Map<string, GlossaryEntry>> {
  cache ??= bsdata
    .getStore()
    .getFile(GAME_SYSTEM_FILE)
    .then((f) => {
      const gs = (f?.data as any)?.gameSystem ?? {}
      const m = new Map<string, GlossaryEntry>()
      for (const r of gs.sharedRules ?? []) if (r.description) m.set(norm(r.name), { name: r.name, description: r.description })
      return m
    })
  return cache
}

export function useGlossary() {
  const [g, setG] = useState<Map<string, GlossaryEntry>>()
  useEffect(() => {
    loadGlossary().then(setG)
  }, [])
  return g
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[[\]*]/g, '')
    .trim()
}

/** Busca una palabra clave tal y como aparece en un arma (p. ej. "Rapid Fire 1", "Anti-Infantry 4+") */
export function lookup(term: string, g: Map<string, GlossaryEntry> | undefined, index?: DataIndex): GlossaryEntry | undefined {
  const t = norm(term)
  const candidates = [t, t.replace(/\s*[\d+"D-]+\+?$/i, '').trim(), t.replace(/\s+\d.*$/, '').trim(), t.split('-')[0].trim(), t.split(' ')[0]]
  for (const c of candidates) {
    const hit = g?.get(c)
    if (hit) return hit
  }
  // Reglas propias de la facción (p. ej. "Reanimation Protocols")
  if (index) {
    for (const node of index.byId.values()) {
      if (node.description && typeof node.name === 'string' && norm(node.name) === t) return { name: node.name, description: node.description }
    }
  }
  return undefined
}

/** Divide la lista de palabras clave de un arma */
export function splitKeywords(s: string): string[] {
  return s
    .split(/,\s*/)
    .map((x) => x.trim())
    .filter((x) => x && x !== '-')
}
