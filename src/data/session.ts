// Estado compartido de la lista abierta: la lista, su índice de datos y el evaluador de reglas.
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { DataIndex } from '../engine/catalog'
import { Evaluator } from '../engine/evaluate'
import type { Roster } from '../engine/roster'
import { getIndex } from './bsdata'
import { PTS } from '../engine/ops'
import { rosterStore } from './rosterStore'

interface Snapshot {
  roster?: Roster
  index?: DataIndex
  error?: string
}

class RosterSession {
  snap: Snapshot = {}
  private listeners = new Set<() => void>()
  private saveTimer?: ReturnType<typeof setTimeout>
  private loading?: Promise<void>
  readonly uid: string

  constructor(uid: string) {
    this.uid = uid
  }

  load() {
    this.loading ??= (async () => {
      try {
        const roster = await rosterStore.get(this.uid)
        if (!roster) throw new Error('No se encontró la lista')
        const index = await getIndex(roster.forces[0].catalogueId)
        this.set({ roster, index })
      } catch (e) {
        this.set({ error: (e as Error).message })
      }
    })()
    return this.loading
  }

  private set(s: Snapshot) {
    this.snap = s
    this.listeners.forEach((l) => l())
  }

  update(fn: (r: Roster, index: DataIndex) => Roster) {
    const { roster, index } = this.snap
    if (!roster || !index) return
    const next = fn(roster, index)
    if (next === roster) return
    next.summary = summarize(index, next)
    this.set({ roster: next, index })
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => rosterStore.put(next), 300)
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
}

export function summarize(index: DataIndex, r: Roster): Roster['summary'] {
  const ev = new Evaluator(index, r)
  const cat = index.catalogues.get(r.forces[0]?.catalogueId)
  return {
    points: ev.rosterTotal(PTS),
    limit: r.costLimits[PTS] ?? 0,
    errors: ev.validate().filter((i) => i.severity === 'error').length,
    faction: (cat?.name ?? '').split(' - ').slice(1).join(' - ') || cat?.name || '',
  }
}

const sessions = new Map<string, RosterSession>()

export function session(uid: string): RosterSession {
  let s = sessions.get(uid)
  if (!s) {
    s = new RosterSession(uid)
    sessions.set(uid, s)
  }
  return s
}

export function dropSession(uid: string) {
  sessions.delete(uid)
}

export function useRoster(uid: string) {
  const s = session(uid)
  useEffect(() => {
    s.load()
  }, [s])
  const snap = useSyncExternalStore(s.subscribe, () => s.snap)
  const ev = useMemo(() => (snap.roster && snap.index ? new Evaluator(snap.index, snap.roster) : undefined), [snap.roster, snap.index])
  return { ...snap, ev, update: (fn: (r: Roster, index: DataIndex) => Roster) => s.update(fn) }
}
