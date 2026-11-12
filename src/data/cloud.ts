// Sincronización en la nube (Supabase): listas, colección, partidas y fotos entre tus dispositivos.
// Cada cambio local se sube; al abrir la app (y cada minuto) se bajan los cambios de otros dispositivos.
// Gana la versión con la fecha de modificación más reciente.
import { createClient, type Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { collection, games, onLocalWrite, photos, rosters, type StoreName } from './db'
import { applyRemoteRoster, dropSession } from './session'

const URL = 'https://brolnjqnudabskzdwunk.supabase.co'
// Clave pública (publishable): está pensada para ir dentro de la app; los permisos los limita la base de datos.
const KEY = 'sb_publishable_8TMPuVclVsebxpolHTgP8A_NUwUwMvE'

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'war-army-auth' },
})

type Synced = Extract<StoreName, 'rosters' | 'collection' | 'games'>
const TABLES = { rosters, collection, games } as const
const SYNCED: Synced[] = ['rosters', 'collection', 'games']
const BUCKET = 'photos'

// ---------- Estado visible ----------
export interface CloudStatus {
  session?: Session | null
  syncing: boolean
  lastSync?: string
  error?: string
}
let status: CloudStatus = { syncing: false, lastSync: read('war-army-last-sync') ?? undefined }
const listeners = new Set<(s: CloudStatus) => void>()
function setStatus(p: Partial<CloudStatus>) {
  status = { ...status, ...p }
  listeners.forEach((l) => l(status))
}
export function useCloud(): CloudStatus {
  const [s, setS] = useState(status)
  useEffect(() => {
    listeners.add(setS)
    return () => {
      listeners.delete(setS)
    }
  }, [])
  return s
}

function read(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function write(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    // sin almacenamiento: se reintentará
  }
}

// ---------- Cola de cambios pendientes ----------
const PENDING = 'war-army-pending'
function pending(): Set<string> {
  try {
    return new Set(JSON.parse(read(PENDING) ?? '[]'))
  } catch {
    return new Set()
  }
}
function savePending(p: Set<string>) {
  write(PENDING, JSON.stringify([...p]))
}
const UPLOADED = 'war-army-uploaded-photos'
function uploaded(): Set<string> {
  try {
    return new Set(JSON.parse(read(UPLOADED) ?? '[]'))
  } catch {
    return new Set()
  }
}

let pushTimer: ReturnType<typeof setTimeout> | undefined
onLocalWrite((store, key) => {
  if (!SYNCED.includes(store as Synced)) return
  const p = pending()
  p.add(`${store}/${key}`)
  savePending(p)
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void syncNow(), 1500)
})

// ---------- Sincronizar ----------
let running: Promise<void> | undefined

export function syncNow(): Promise<void> {
  if (running) return running
  running = (async () => {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) return
    setStatus({ syncing: true, error: undefined })
    try {
      await push(session.user.id)
      await pull(session.user.id)
      const now = new Date().toISOString()
      write('war-army-last-sync', now)
      setStatus({ lastSync: now })
    } catch (e) {
      setStatus({ error: (e as Error).message })
    } finally {
      setStatus({ syncing: false })
    }
  })().finally(() => (running = undefined))
  return running
}

async function push(userId: string) {
  const p = pending()
  if (!p.size) return
  const rows = []
  for (const id of p) {
    const [store, ...rest] = id.split('/')
    const key = rest.join('/')
    const t = TABLES[store as Synced]
    if (!t) continue
    const v: any = await t.get(key)
    if (store === 'collection' && v) await uploadPhotos(userId, v.photos ?? [])
    rows.push({ user_id: userId, store, key, data: v ?? null, deleted: !v, updated_at: v?.updatedAt ?? new Date().toISOString() })
  }
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('items').upsert(rows.slice(i, i + 50))
    if (error) throw new Error(error.message)
  }
  const left = pending()
  for (const id of p) left.delete(id)
  savePending(left)
}

async function uploadPhotos(userId: string, ids: string[]) {
  const done = uploaded()
  for (const id of ids) {
    if (done.has(id)) continue
    const ph = await photos.get(id)
    if (!ph) continue
    const { error } = await supabase.storage.from(BUCKET).upload(`${userId}/${id}.jpg`, ph.blob, { upsert: true, contentType: ph.blob.type || 'image/jpeg' })
    if (error && !/exists/i.test(error.message)) throw new Error('Photos: ' + error.message)
    done.add(id)
    write(UPLOADED, JSON.stringify([...done]))
  }
}

async function pull(userId: string) {
  // Primero solo las fechas; luego los datos de lo que haya cambiado
  const { data: heads, error } = await supabase.from('items').select('store,key,updated_at,deleted')
  if (error) throw new Error(error.message)
  const want: { store: Synced; key: string }[] = []
  const p = pending()
  for (const h of heads ?? []) {
    const t = TABLES[h.store as Synced]
    if (!t || p.has(`${h.store}/${h.key}`)) continue
    const local: any = await t.get(h.key)
    const remoteTime = new Date(h.updated_at).getTime()
    const localTime = local ? new Date(local.updatedAt ?? 0).getTime() : -1
    if (h.deleted) {
      if (local && localTime <= remoteTime) {
        await t.deleteRemote(h.key)
        if (h.store === 'rosters') dropSession(h.key)
      }
    } else if (remoteTime > localTime) want.push({ store: h.store as Synced, key: h.key })
  }
  // Lo que hay aquí y nunca se subió (p. ej. datos de antes de iniciar sesión)
  const known = new Set((heads ?? []).map((h) => `${h.store}/${h.key}`))
  let added = false
  for (const s of SYNCED) {
    for (const v of (await TABLES[s].all()) as any[]) {
      const id = `${s}/${v.uid ?? v.key ?? v.id}`
      if (!known.has(id) && !p.has(id)) {
        p.add(id)
        added = true
      }
    }
  }
  if (added) {
    savePending(p)
    await push(userId)
  }
  for (let i = 0; i < want.length; i += 40) {
    const chunk = want.slice(i, i + 40)
    for (const s of SYNCED) {
      const keys = chunk.filter((w) => w.store === s).map((w) => w.key)
      if (!keys.length) continue
      const { data, error: e2 } = await supabase.from('items').select('key,data').eq('store', s).in('key', keys)
      if (e2) throw new Error(e2.message)
      for (const row of data ?? []) {
        if (!row.data) continue
        if (s === 'collection') await downloadPhotos(userId, row.data.photos ?? [])
        await (TABLES[s] as any).putRemote(row.data)
        if (s === 'rosters') applyRemoteRoster(row.data)
      }
    }
  }
}

async function downloadPhotos(userId: string, ids: string[]) {
  const done = uploaded()
  for (const id of ids) {
    if (await photos.get(id)) continue
    const { data, error } = await supabase.storage.from(BUCKET).download(`${userId}/${id}.jpg`)
    if (error || !data) continue
    await photos.putRemote({ id, blob: data, createdAt: new Date().toISOString() })
    done.add(id)
  }
  write(UPLOADED, JSON.stringify([...done]))
}

// ---------- Sesión ----------
export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(traducir(error.message))
}

export async function signUp(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
  if (error) throw new Error(traducir(error.message))
  return data.session ? 'Account created' : 'I\'ve sent you an email: confirm it, then sign in with your password.'
}

export async function signOut() {
  await supabase.auth.signOut()
}

function traducir(m: string): string {
  if (/invalid login/i.test(m)) return 'Wrong email or password'
  if (/not confirmed/i.test(m)) return 'Confirm the email I sent you first'
  if (/already registered/i.test(m)) return 'That email already has an account: use “Sign in”'
  if (/at least/i.test(m)) return 'The password is too short (at least 6 characters)'
  return m
}

/** Arranca la sincronización automática */
let started = false
export function startCloud() {
  if (started) return
  started = true
  supabase.auth.getSession().then(({ data }) => {
    setStatus({ session: data.session })
    if (data.session) void syncNow()
  })
  supabase.auth.onAuthStateChange((event, session) => {
    setStatus({ session })
    if (event === 'SIGNED_IN') void syncNow()
  })
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void syncNow())
  setInterval(() => document.visibilityState === 'visible' && void syncNow(), 60_000)
}
