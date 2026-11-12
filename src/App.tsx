import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { exportBackup, importBackup } from './data/backup'
import { FROM_RECOVERY_LINK, resetPassword, setNewPassword, signIn, signOut, signUp, startCloud, syncNow, useCloud } from './data/cloud'
import { DataProvider, useData } from './data/dataStatus'
import { CollectionScreen } from './screens/CollectionScreen'
import { GamesScreen } from './screens/GameScreen'
import { MetaScreen } from './screens/MetaScreen'
import { RostersScreen } from './screens/RostersScreen'
import { RulesScreen } from './screens/RulesScreen'
import { GlossaryProvider } from './ui/glossaryUi'
import { Icon, Row, Screen, Section, Spinner } from './ui/kit'
import { NavStack } from './ui/nav'

type Tab = 'lists' | 'collection' | 'game' | 'meta' | 'rules' | 'settings'

const TABS: { id: Tab; label: string; icon: () => ReactNode }[] = [
  { id: 'lists', label: 'Lists', icon: () => Icon.list(24) },
  { id: 'collection', label: 'Collection', icon: () => Icon.box(24) },
  { id: 'game', label: 'Games', icon: () => Icon.dice(24) },
  { id: 'meta', label: 'Meta', icon: () => Icon.trophy(24) },
  { id: 'rules', label: 'Rules', icon: () => Icon.shield(24) },
  { id: 'settings', label: 'Settings', icon: () => Icon.gear(24) },
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
  useEffect(() => startCloud(), [])
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
  const [tab, setTab] = useState<Tab>(FROM_RECOVERY_LINK ? 'settings' : 'lists')

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
    case 'meta':
      return <MetaScreen />
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
  const date = meta?.commitDate ? new Date(meta.commitDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const checked = meta?.checkedAt ? new Date(meta.checkedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
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
    <Screen title="Settings">
      <CloudSection flash={flash} />
      <Section header="Appearance">
        {(
          [
            ['system', 'Automatic (match device)'],
            ['light', 'Light'],
            ['dark', 'Dark'],
          ] as [Theme, string][]
        ).map(([t, l]) => (
          <Row key={t} title={l} checked={theme === t} onClick={() => pickTheme(t)} />
        ))}
      </Section>
      <Section header="Game data" footer={error ? `Error: ${error}` : lastResult}>
        <Row title="Source" detail="BSData · wh40k-11e" />
        <Row title="Version" detail={meta?.commitSha ? meta.commitSha.slice(0, 7) : '—'} />
        <Row title="Published" detail={date} />
        <Row title="Last checked" detail={checked} />
        <Row
          title={syncing ? (progress?.phase === 'downloading' ? `Downloading ${progress.done}/${progress.total}…` : 'Checking…') : 'Check for updates'}
          className="action"
          icon={Icon.refresh(16)}
          iconBg="var(--green)"
          onClick={syncing ? undefined : checkNow}
        />
      </Section>
      <Section header="Backup" footer="Saves lists, collection with photos and games to a file. Open it on another device (AirDrop, iCloud Drive) with “Import” to get the same data.">
        <Row
          title="Export backup"
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
        <Row title="Import backup" className="action" icon={Icon.copy(16)} onClick={() => file.current?.click()} />
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
      <Section footer="Data is maintained by the BSData community and is not endorsed by Games Workshop. Personal-use app.">
        <Row title="War Army" detail="11th edition" />
      </Section>
    </Screen>
  )
}

function CloudSection({ flash }: { flash: (m: string) => void }) {
  const cloud = useCloud()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true)
    try {
      const m = await fn()
      if (m) flash(m)
    } catch (e) {
      flash((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const user = cloud.session?.user
  if (user && cloud.recovery) {
    return (
      <Section header="Choose a new password" footer="You opened the password-reset link. Type the new password you want for this account.">
        <div className="row">
          <input className="text-input" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Row title={busy ? 'One moment…' : 'Save new password'} className={'action' + (busy || password.length < 6 ? ' disabled' : '')} onClick={() => run(() => setNewPassword(password))} />
      </Section>
    )
  }
  if (user) {
    const last = cloud.lastSync ? new Date(cloud.lastSync).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'
    return (
      <Section header="Sync" footer={cloud.error ? `Error: ${cloud.error}` : 'Lists, collection with photos and games sync automatically between your devices.'}>
        <Row title="Account" detail={user.email} />
        <Row title="Last sync" detail={cloud.syncing ? 'Syncing…' : last} />
        <Row title="Sync now" className="action" icon={Icon.refresh(16)} iconBg="var(--green)" onClick={cloud.syncing ? undefined : () => void syncNow()} />
        <Row title="Sign out" className="destructive" onClick={() => void signOut()} />
      </Section>
    )
  }
  return (
    <Section header="Sync" footer="Sign in with the same account on your iPhone, iPad and Mac to share lists, collection, photos and games. The first time, tap “Create account” and confirm the email.">
      <div className="row">
        <input className="text-input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="row">
        <input className="text-input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Row title={busy ? 'One moment…' : 'Sign in'} className={'action' + (busy || !email || !password ? ' disabled' : '')} onClick={() => run(() => signIn(email.trim(), password))} />
      <Row title="Create account" className={'action' + (busy || !email || !password ? ' disabled' : '')} onClick={() => run(() => signUp(email.trim(), password))} />
      <Row title="Forgot password?" className={'action' + (busy || !email ? ' disabled' : '')} onClick={() => run(() => resetPassword(email.trim()))} />
    </Section>
  )
}

function FirstDownload({ progress, error }: { progress?: { done: number; total: number; phase: string }; error?: string }) {
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <div className="empty" style={{ paddingTop: '22vh', maxWidth: 420, margin: '0 auto' }}>
      <div className="big-icon" style={{ color: 'var(--tint)' }}>
        {Icon.shield(64)}
      </div>
      <h2>Preparing War Army</h2>
      {error ? (
        <p style={{ color: 'var(--red)' }}>Couldn't download the BSData data: {error}. Check your connection and reopen the app.</p>
      ) : (
        <>
          <p>Downloading 11th edition data from BSData. This only happens the first time; after that it works offline.</p>
          <div className="meter" style={{ margin: '20px 0 8px' }}>
            <div style={{ width: `${pct}%` }} />
          </div>
          <p style={{ fontSize: 13 }}>{progress?.phase === 'downloading' ? `${progress.done} of ${progress.total} files` : 'Connecting…'}</p>
          {!progress && <Spinner />}
        </>
      )}
    </div>
  )
}
