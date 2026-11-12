// Navegación tipo iOS: una pila de pantallas por pestaña.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export interface Route {
  key: string
  render: () => ReactNode
}

interface NavApi {
  push: (r: Route) => void
  pop: () => void
  popToRoot: () => void
  depth: number
}

const NavContext = createContext<NavApi>({ push: () => {}, pop: () => {}, popToRoot: () => {}, depth: 0 })
const DepthContext = createContext(0)

export function useNav(): NavApi {
  const api = useContext(NavContext)
  const depth = useContext(DepthContext)
  return { ...api, depth }
}

export function NavStack(props: { root: () => ReactNode }) {
  const [stack, setStack] = useState<Route[]>([])
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const popToRoot = useCallback(() => setStack([]), [])
  const api = useMemo(() => ({ push, pop, popToRoot, depth: stack.length }), [push, pop, popToRoot, stack.length])
  const all: Route[] = [{ key: 'root', render: props.root }, ...stack]
  return (
    <NavContext.Provider value={api}>
      <div className="stack">
        {all.map((r, i) => {
          // Solo se pintan la pantalla visible y la anterior (para la animación)
          if (i < all.length - 2) return null
          const covered = i < all.length - 1
          return (
            <div key={r.key + ':' + i} className={'screen' + (i === 0 ? ' root' : '') + (covered ? ' covered' : '')} aria-hidden={covered}>
              <DepthContext.Provider value={i}>{r.render()}</DepthContext.Provider>
            </div>
          )
        })}
      </div>
    </NavContext.Provider>
  )
}
