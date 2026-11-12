import { useEffect, useState } from 'react'
import { onChange, type StoreName } from './db'

/** Carga una consulta y la repite cuando cambia la tabla */
export function useTable<T>(store: StoreName, load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [v, setV] = useState<T>()
  useEffect(() => {
    let alive = true
    const run = () => load().then((x) => alive && setV(x))
    run()
    const off = onChange((s) => s === store && run())
    return () => {
      alive = false
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return v
}
