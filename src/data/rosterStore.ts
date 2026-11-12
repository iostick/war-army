// Listas guardadas en el dispositivo.
import type { Roster } from '../engine/roster'
import { rosters } from './db'

export const rosterStore = {
  all: () => rosters.all().then((l) => l.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  get: (uid: string) => rosters.get(uid),
  put: (r: Roster) => rosters.put(r),
  delete: (uid: string) => rosters.delete(uid),
}
