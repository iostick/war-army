import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BSDataSync, MemoryStore } from './sync'

const DATA = process.env.BSDATA_DIR ?? ''

/** Simula GitHub con los archivos locales; "commit" y shas controlables */
function fakeGitHub(state: { commit: string; shas: Record<string, string> }) {
  const calls: string[] = []
  const fn = async (url: string) => {
    calls.push(url)
    const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 })
    if (url.includes('/commits/')) return json({ sha: state.commit, commit: { committer: { date: '2026-11-11T21:34:40Z' } } })
    if (url.includes('/git/trees/')) return json({ tree: Object.entries(state.shas).map(([path, sha]) => ({ path, sha, type: 'blob', size: 1 })) })
    const path = decodeURIComponent(url.split('/').pop()!)
    return new Response(readFileSync(join(DATA, path), 'utf8'), { status: 200 })
  }
  return { fn, calls }
}

describe.skipIf(!DATA)('sincronización con BSData', () => {
  it('descarga todo la primera vez y solo lo cambiado después', async () => {
    const files = readdirSync(DATA).filter((f) => f.endsWith('.json'))
    const state = { commit: 'c1', shas: Object.fromEntries(files.map((f) => [f, 'a'])) }
    const gh = fakeGitHub(state)
    const store = new MemoryStore()
    const sync = new BSDataSync(store, gh.fn as any)

    const r1 = await sync.sync()
    expect(r1.updated).toBe(true)
    expect(r1.changedFiles.length).toBe(files.length)

    const r2 = await sync.sync()
    expect(r2.updated).toBe(false)

    state.commit = 'c2'
    state.shas['Necrons.json'] = 'b'
    gh.calls.length = 0
    const r3 = await sync.sync()
    expect(r3.changedFiles).toEqual(['Necrons.json'])
    expect(gh.calls.filter((c) => c.includes('raw.githubusercontent')).length).toBe(1)

    const necrons = store.meta!.catalogues.find((c) => c.name === 'Xenos - Necrons')!
    const loaded = await sync.loadForCatalogue(necrons.id)
    expect(loaded.catalogues.length).toBe(2) // Necrons + Unaligned Forces
  })
})
