import { useCallback, useState, type ReactNode } from 'react'
import { DataProvider, useData } from './data/dataStatus'
import { RostersScreen } from './screens/RostersScreen'
import { Icon, Row, Screen, Section, Spinner } from './ui/kit'
import { NavStack } from './ui/nav'

type Tab = 'lists' | 'collection' | 'game' | 'settings'

const TABS: { id: Tab; label: string; icon: () => ReactNode }[] = [
  { id: 'lists', label: 'Listas', icon: () => Icon.list() },
  { id: 'collection', label: 'Colección', icon: () => Icon.box() },
  { id: 'game', label: 'Partida', icon: () => Icon.dice() },
  { id: 'settings', label: 'Ajustes', icon: () => Icon.gear() },
]

export default function App() {
  const [toast, setToast] = useState<string>()
  const onUpdated = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(undefined), 2500)
  }, [])
  return (
    <DataProvider onUpdated={onUpdated}>
      <Shell />
      {toast && <div className="toast">{toast}</div>}
    </DataProvider>
  )
}

function Shell() {
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
        {/* Cada pestaña conserva su propia pila de navegación */}
        {TABS.map((t) => (
          <div key={t.id} className="stack" style={{ display: tab === t.id ? 'block' : 'none' }}>
            <NavStack root={() => <TabRoot tab={t.id} />} />
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

function TabRoot({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'lists':
      return <RostersScreen />
    case 'collection':
      return (
        <Screen title="Colección">
          <div className="empty">
            <div className="big-icon">{Icon.box(56)}</div>
            <h2>Próximamente</h2>
            <p>Aquí marcarás qué unidades tienes, con una foto por unidad y su estado de pintura, sincronizado entre tus dispositivos.</p>
          </div>
        </Screen>
      )
    case 'game':
      return (
        <Screen title="Partida">
          <div className="empty">
            <div className="big-icon">{Icon.dice(56)}</div>
            <h2>Próximamente</h2>
            <p>Seguimiento de partidas: rondas, CP, VP y objetivos. Y exportación a Tabletop Simulator.</p>
          </div>
        </Screen>
      )
    case 'settings':
      return <SettingsScreen />
  }
}

function SettingsScreen() {
  const { meta, syncing, progress, error, lastResult, checkNow } = useData()
  const date = meta?.commitDate ? new Date(meta.commitDate).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const checked = meta?.checkedAt ? new Date(meta.checkedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  return (
    <Screen title="Ajustes">
      <Section header="Datos de juego" footer={error ? `Error: ${error}` : lastResult}>
        <Row title="Fuente" detail="BSData · wh40k-11e" />
        <Row title="Versión" detail={meta?.commitSha ? meta.commitSha.slice(0, 7) : '—'} />
        <Row title="Publicada" detail={date} />
        <Row title="Última comprobación" detail={checked} />
        <Row
          title={syncing ? (progress?.phase === 'downloading' ? `Descargando ${progress.done}/${progress.total}…` : 'Comprobando…') : 'Buscar actualizaciones'}
          className="action"
          icon={Icon.refresh(17)}
          iconBg="var(--green)"
          onClick={syncing ? undefined : checkNow}
        />
      </Section>
      <Section footer="Los datos los mantiene la comunidad de BSData y no están avalados por Games Workshop.">
        <Row title="War Army" detail="Uso personal" />
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
