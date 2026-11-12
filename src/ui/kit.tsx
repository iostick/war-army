// Componentes de interfaz con estilo iOS.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNav } from './nav'

// ---------- Iconos (trazos al estilo SF Symbols) ----------
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const Icon = {
  chevronRight: (s = 14) => (
    <svg width={s * 0.6} height={s} viewBox="0 0 8 14" {...P} strokeWidth={2.2}>
      <path d="M1.5 1.5 6.5 7l-5 5.5" />
    </svg>
  ),
  chevronLeft: (s = 22) => (
    <svg width={s * 0.6} height={s} viewBox="0 0 12 21" {...P} strokeWidth={2.6}>
      <path d="M10 2 2 10.5l8 8.5" />
    </svg>
  ),
  plus: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.6}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  ),
  search: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.8-4.8" />
    </svg>
  ),
  list: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
    </svg>
  ),
  box: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <path d="m3.5 7.5 8.5-4.5 8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9" />
    </svg>
  ),
  dice: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
  gear: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </svg>
  ),
  warning: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P}>
      <path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5M12 17.5h.01" />
    </svg>
  ),
  checkCircle: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.7L16.5 9.5" />
    </svg>
  ),
  copy: (s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  trash: (s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7" />
    </svg>
  ),
  refresh: (s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
    </svg>
  ),
  share: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  ),
  camera: (s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.8}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  ),
  close: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  shield: (s = 56) => (
    <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={1.4}>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5 7.5-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
}

// ---------- Pantalla con barra de navegación ----------
export function Screen(props: { title: string; subtitle?: ReactNode; right?: ReactNode; back?: string; children: ReactNode; large?: boolean }) {
  const nav = useNav()
  const ref = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const el = ref.current?.closest('.screen')
    if (!el) return
    const on = () => setScrolled(el.scrollTop > 38)
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [])
  const large = props.large ?? true
  return (
    <div ref={ref}>
      <div className={'navbar' + (scrolled || !large ? ' scrolled' : '')}>
        <div className="navbar-inner">
          <div className="navbar-left">
            {nav.depth > 0 && (
              <button className="bar-button" onClick={nav.pop} aria-label={`Back to ${props.back ?? "Back"}`}>
                {Icon.chevronLeft()} <span>{props.back ?? 'Back'}</span>
              </button>
            )}
          </div>
          <div className="navbar-title">{props.title}</div>
          <div className="navbar-right">{props.right}</div>
        </div>
      </div>
      <div className="content">
        {large && <h1 className="large-title">{props.title}</h1>}
        {props.subtitle && <div className="subtitle">{props.subtitle}</div>}
        {props.children}
      </div>
    </div>
  )
}

// ---------- Listas ----------
export function Section(props: { header?: ReactNode; footer?: ReactNode; children: ReactNode; headerRight?: ReactNode }) {
  return (
    <div className="section">
      {(props.header || props.headerRight) && (
        <div className="section-header">
          <span>{props.header}</span>
          {props.headerRight && <span>{props.headerRight}</span>}
        </div>
      )}
      <div className="group">{props.children}</div>
      {props.footer && <div className="section-footer">{props.footer}</div>}
    </div>
  )
}

export function Row(props: {
  title: ReactNode
  sub?: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  iconBg?: string
  chevron?: boolean
  checked?: boolean
  accessory?: ReactNode
  onClick?: () => void
  className?: string
  leading?: ReactNode
}) {
  const inner = (
    <>
      {props.checked !== undefined && <span className="check">{props.checked ? Icon.check() : null}</span>}
      {props.icon && (
        <span className="row-icon" style={{ background: props.iconBg ?? 'var(--tint)' }}>
          {props.icon}
        </span>
      )}
      {props.leading}
      <div className="row-body">
        <div className="row-title">{props.title}</div>
        {props.sub && <div className="row-sub">{props.sub}</div>}
      </div>
      {props.detail !== undefined && <span className="row-detail">{props.detail}</span>}
      {props.accessory}
      {props.chevron && <span className="chevron">{Icon.chevronRight()}</span>}
    </>
  )
  const style = props.icon ? ({ '--inset': '57px' } as React.CSSProperties) : props.checked !== undefined ? ({ '--inset': '50px' } as React.CSSProperties) : undefined
  if (props.onClick)
    return (
      <div
        role="button"
        tabIndex={0}
        className={'row pressable ' + (props.className ?? '')}
        onClick={props.onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), props.onClick!())}
        style={style}
      >
        {inner}
      </div>
    )
  return (
    <div className={'row ' + (props.className ?? '')} style={style}>
      {inner}
    </div>
  )
}

export function Stepper(props: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  const min = props.min ?? 0
  const max = props.max ?? Infinity
  return (
    <span className="stepper" onClick={(e) => e.stopPropagation()}>
      <button disabled={props.value <= min} onClick={() => props.onChange(props.value - 1)} aria-label="Less">
        −
      </button>
      <span className="sep" />
      <span className="value">{props.value}</span>
      <span className="sep" />
      <button disabled={props.value >= max} onClick={() => props.onChange(props.value + 1)} aria-label="More">
        +
      </button>
    </span>
  )
}

export function Search(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search">
      {Icon.search()}
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.placeholder ?? 'Search'} type="search" />
    </label>
  )
}

export function Segmented<T extends string | number>(props: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {props.options.map((o) => (
        <button key={String(o.value)} className={o.value === props.value ? 'on' : ''} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Sheet(props: { title: string; onClose: () => void; left?: ReactNode; right?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])
  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={props.title}>
        <div className="sheet-header">
          <div className="navbar-left">
            {props.left ?? (
              <button className="bar-button" onClick={props.onClose}>
                Cancel
              </button>
            )}
          </div>
          <div className="title">{props.title}</div>
          <div className="navbar-right">{props.right}</div>
        </div>
        <div className="sheet-body">{props.children}</div>
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="progress-ring" />
}

export function pts(n: number): string {
  return `${Math.round(n)} pts`
}
