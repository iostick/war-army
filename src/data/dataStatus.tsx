// Estado de los datos de BSData: descarga inicial y comprobación de actualizaciones al abrir la app.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SyncMeta, SyncProgress } from '../engine/sync'
import { bsdata, clearIndexCache, getMeta } from './bsdata'

interface DataStatus {
  meta?: SyncMeta
  ready: boolean
  syncing: boolean
  progress?: SyncProgress
  error?: string
  lastResult?: string
  checkNow: () => Promise<void>
}

const Ctx = createContext<DataStatus>({ ready: false, syncing: false, checkNow: async () => {} })
export const useData = () => useContext(Ctx)

export function DataProvider(props: { children: ReactNode; onUpdated?: (msg: string) => void }) {
  const [meta, setMeta] = useState<SyncMeta>()
  const [ready, setReady] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress>()
  const [error, setError] = useState<string>()
  const [lastResult, setLastResult] = useState<string>()
  const running = useRef(false)
  const onUpdated = props.onUpdated

  const checkNow = useCallback(async () => {
    if (running.current) return
    running.current = true
    setSyncing(true)
    setError(undefined)
    try {
      const hadData = Boolean(await getMeta())
      const r = await bsdata.sync(setProgress)
      const m = await getMeta()
      setMeta(m)
      if (r.updated) {
        clearIndexCache()
        const msg = `Datos actualizados: ${r.changedFiles.length} archivo${r.changedFiles.length === 1 ? '' : 's'}`
        setLastResult(msg)
        if (hadData) onUpdated?.(msg)
      } else setLastResult('Ya tienes la última versión')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      running.current = false
      setSyncing(false)
      setReady(Boolean(await getMeta()))
    }
  }, [onUpdated])

  useEffect(() => {
    getMeta().then((m) => {
      setMeta(m)
      setReady(Boolean(m))
      checkNow()
    })
  }, [checkNow])

  return <Ctx.Provider value={{ meta, ready, syncing, progress, error, lastResult, checkNow }}>{props.children}</Ctx.Provider>
}
