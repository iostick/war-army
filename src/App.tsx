import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { exportBackup, importBackup } from './data/backup'
import { DataProvider, useData } from './data/dataStatus'
import { CollectionScreen } from './screens/CollectionScreen'
import { GamesScreen } from './screens/GameScreen'
import { RostersScreen } from './screens/RostersScreen'
import { RulesScreen } from './screens/RulesScreen'
import { GlossaryProvider } from './ui/glossaryUi'
import { Icon, Row, Screen, Section, Spinner } from './ui/kit'
import { NavStack } from './ui/nav'

type Tab = 'lists' | 'collection' | 'game' | 'rules' | 'settings'

const TABS: { id: Tab; label: string; icon: () => ReactNode }[] = [
  { id: 'lists', label: 'Listas', icon: () => Icon.list(24) },
  { id: 'collection', label: 'Colección', icon: () => Icon.box(24) },
  { id: 'game', label: 'Partidas', icon: () => Icon.dice(24) },
  { id: 'rules', label: 'Reglas', icon: () => Icon.shield(24) },
  { id: 'settings', label: 'Ajustes', icon: () => Icon.gear(24) },
]

type Theme = 'system' | 'light' | 'dark'
function applyTheme(t: Theme) {
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}
function loadTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) || 'system'
  } catch {
    return 'system'
  }
}

export default function App() {
  const [toast, setToast] = useState<string>()
  const flash = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(undefined), 2500)
  }, [])
  useEffect(() => applyTheme(loadTheme()), [])
  return (
    <DataProvider onUpdated={flash}>
      <GlossaryProvider>
        <Shell flash={flash} />
      </GlossaryProvider>
      {toast && <div className="toast">{toast}</div>}
    </DataProvider>
  )
}

function Shell({ flash }: { flash: (m: string) => void }) {
  const { ready, progress, error } = useData()
  const [tab, setTab] = useState<Tab>('lists')

  if (!ready) return <FirstDownload progress={progress} error={error} />

  return (
    <div className="app">
      <nav className="sidebar">
        <h1>War Army</h1>
        {TABS.map((t) => (
          <button key={t.id} className={'side-item' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
            {t.icon()} {t.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {TABS.map((t) => (
          <div key={t.id} className="stack" style={{ display: tab === t.id ? 'block' : 'none' }}>
            <NavStack root={() => <TabRoot tab={t.id} flash={flash} />} />
          </div>
        ))}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
            {t.icon()}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function TabRoot({ tab, flash }: { tab: Tab; flash: (m: string) => void }) {
  switch (tab) {
    case 'lists':
      return <RostersScreen />
    case 'collection':
      return <CollectionScreen />
    case 'game':
      return <GamesScreen />
    case 'rules':
      return <RulesScreen />
    case 'settings':
      return <SettingsScreen flash={flash} />
  }
}

function SettingsScreen({ flash }: { flash: (m: string) => void }) {
  const { meta, syncing, progress, error, lastResult, checkNow } = useData()
  const [theme, setTheme] = useState<Theme>(loadTheme())
  const file = useRef<HTMLInputElement>(null)
  const date = meta?.commitDate ? new Date(meta.commitDate).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const checked = meta?.checkedAt ? new Date(meta.checkedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const pickTheme = (t: Theme) => {
    setTheme(t)
    applyTheme(t)
    try {
      localStorage.setItem('theme', t)
    } catch {
      /* sin almacenamiento */
    }
  }
  return (
    <Screen title="Ajustes">
      <Section header="Apariencia">
        {(
          [
            ['system', 'Automático (como el dispositivo)'],
            ['light', 'Claro'],
            ['dark', 'Oscuro'],
          ] as [Theme, string][]
        ).map(([t, l]) => (
          <Row key={t} title={l} checked={theme === t} onClick={() => pickTheme(t)} />
        ))}
      </Section>
      <Section header="Datos de juego" footer={error ? `Error: ${error}` : lastResult}>
        <Row title="Fuente" detail="BSData · wh40k-11e" />
        <Row title="Versión" detail={meta?.commitSha ? meta.commitSha.slice(0, 7) : '—'} />
        <Row title="Publicada" detail={date} />
        <Row title="Última comprobación" detail={checked} />
        <Row
          title={syncing ? (progress?.phase === 'downloading' ? `Descargando ${progress.done}/${progress.total}…` : 'Comprobando…') : 'Buscar actualizaciones'}
          className="action"
          icon={Icon.refresh(16)}
          iconBg="var(--green)"
          onClick={syncing ? undefined : checkNow}
        />
      </Section>
      <Section header="Copia de seguridad" footer="Guarda listas, colección con fotos y partidas en un archivo. Ábrelo en otro dispositivo (AirDrop, iCloud Drive) con «Importar» para tener lo mismo.">
        <Row
          title="Exportar copia"
          className="action"
          icon={Icon.share(16)}
          onClick={async () => {
            const blob = await exportBackup()
            const name = `war-army-${new Date().toISOString().slice(0, 10)}.json`
            const f = new File([blob], name, { type: 'application/json' })
            try {
              if (navigator.canShare?.({ files: [f] })) return await navigator.share({ files: [f], title: 'War Army' })
            } catch {
              return
            }
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = name
            a.click()
          }}
        />
        <Row title="Importar copia" className="action" icon={Icon.copy(16)} onClick={() => file.current?.click()} />
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              flash(await importBackup(f))
            } catch (err) {
              flash((err as Error).message)
            }
            e.target.value = ''
          }}
        />
      </Section>
      <Section footer="Los datos los mantiene la comunidad de BSData y no están avalados por Games Workshop. App de uso personal.">
        <Row title="War Army" detail="11ª edición" />
      </Section>
    </Screen>
  )
}

function FirstDownload({ progress, error }: { progress?: { done: number; total: number; phase: string }; error?: string }) {
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <div className="empty" style={{ paddingTop: '22vh', maxWidth: 420, margin: '0 auto' }}>
      <div className="big-icon" style={{ color: 'var(--tint)' }}>
        {Icon.shield(64)}
      </div>
      <h2>Preparando War Army</h2>
      {error ? (
        <p style={{ color: 'var(--red)' }}>No se pudieron descargar los datos de BSData: {error}. Comprueba la conexión y vuelve a abrir la app.</p>
      ) : (
        <>
          <p>Descargando los datos de la 11ª edición desde BSData. Solo ocurre la primera vez; después funciona sin conexión.</p>
          <div className="meter" style={{ margin: '20px 0 8px' }}>
            <div style={{ width: `${pct}%` }} />
          </div>
          <p style={{ fontSize: 13 }}>{progress?.phase === 'downloading' ? `${progress.done} de ${progress.total} archivos` : 'Conectando…'}</p>
          {!progress && <Spinner />}
        </>
      )}
    </div>
  )
}
