// Colección: qué miniaturas tienes, fotos por unidad y estado de pintura.
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { factions, getIndex } from '../data/bsdata'
import { useData } from '../data/dataStatus'
import { collection, PAINT_STATUS, photos as photoTable, type CollectionItem } from '../data/db'
import { savePhoto, usePhotoUrl } from '../data/photos'
import { useTable } from '../data/useTable'
import { factionColor, shortFaction } from '../ui/faction'
import { Icon, Row, Screen, Search, Section, Sheet, Spinner, Stepper } from '../ui/kit'
import { useNav } from '../ui/nav'

export function CollectionScreen() {
  const items = useTable('collection', () => collection.all())
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [q, setQ] = useState('')
  const nav = useNav()
  const open = (key: string) => nav.push({ key: 'col:' + key, render: () => <CollectionItemScreen itemKey={key} /> })

  const factionsIn = [...new Set((items ?? []).map((i) => i.faction))].sort()
  const shown = (items ?? []).filter((i) => (filter === 'all' || i.faction === filter) && i.name.toLowerCase().includes(q.toLowerCase()))
  const byFaction = new Map<string, CollectionItem[]>()
  for (const i of shown.sort((a, b) => a.name.localeCompare(b.name))) byFaction.set(i.faction, [...(byFaction.get(i.faction) ?? []), i])
  const totals = (items ?? []).reduce(
    (a, i) => ({ units: a.units + i.owned, done: a.done + (i.status === 'Terminada' ? i.owned : 0) }),
    { units: 0, done: 0 },
  )

  return (
    <Screen
      title="Colección"
      right={
        <button className="bar-button" onClick={() => setAdding(true)} aria-label="Añadir a la colección">
          {Icon.plus()}
        </button>
      }
    >
      {items && items.length === 0 ? (
        <div className="empty">
          <div className="big-icon">{Icon.box(56)}</div>
          <h2>Tu colección está vacía</h2>
          <p>Añade las unidades que tienes, con fotos y su estado de pintura. Las listas te avisarán si te falta algo.</p>
          <button className="button-filled" onClick={() => setAdding(true)}>
            Añadir unidades
          </button>
        </div>
      ) : (
        <>
          <div className="points-card">
            <div className="points-top">
              <div className="points-value">
                {totals.units} <small>unidades</small>
              </div>
              <span className="pill green">{totals.units ? Math.round((totals.done / totals.units) * 100) : 0}% pintado</span>
            </div>
            <div className="meter">
              <div style={{ width: `${totals.units ? (totals.done / totals.units) * 100 : 0}%`, background: 'var(--green)' }} />
            </div>
          </div>
          <Search value={q} onChange={setQ} placeholder="Buscar en tu colección" />
          {factionsIn.length > 1 && (
            <div className="tabs-inline">
              <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
                Todas
              </button>
              {factionsIn.map((f) => (
                <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                  {shortFaction(f)}
                </button>
              ))}
            </div>
          )}
          {[...byFaction].map(([f, list]) => (
            <div key={f} style={{ '--accent': factionColor(f) } as CSSProperties}>
              <Section header={shortFaction(f)} headerRight={`${list.reduce((a, i) => a + i.owned, 0)} uds.`}>
                {list.map((i) => (
                  <ItemRow key={i.key} item={i} onClick={() => open(i.key)} />
                ))}
              </Section>
            </div>
          ))}
        </>
      )}
      {adding && <AddToCollectionSheet onClose={() => setAdding(false)} />}
    </Screen>
  )
}

function ItemRow({ item, onClick }: { item: CollectionItem; onClick: () => void }) {
  const url = usePhotoUrl(item.photos[0])
  const color = item.status === 'Terminada' ? 'green' : item.status === 'Sin montar' ? '' : 'orange'
  return (
    <Row
      title={item.name}
      sub={`${item.owned} ${item.owned === 1 ? 'unidad' : 'unidades'}${item.photos.length ? ` · ${item.photos.length} fotos` : ''}`}
      leading={url ? <img className="thumb" src={url} alt="" /> : <span className="stripe" />}
      accessory={<span className={'pill ' + color}>{item.status}</span>}
      chevron
      onClick={onClick}
    />
  )
}

export function CollectionItemScreen({ itemKey }: { itemKey: string }) {
  const item = useTable('collection', () => collection.get(itemKey), [itemKey])
  const nav = useNav()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<string>()
  if (!item)
    return (
      <Screen title="" large={false}>
        <div className="empty">
          <Spinner />
        </div>
      </Screen>
    )
  const save = (patch: Partial<CollectionItem>) => collection.put({ ...item, ...patch, updatedAt: new Date().toISOString() })

  return (
    <div style={{ '--accent': factionColor(item.faction) } as CSSProperties}>
      <Screen title={item.name} back="Atrás" subtitle={shortFaction(item.faction)}>
        <Section header="Fotos">
          <div className="photo-grid">
            {item.photos.map((p) => (
              <Thumb key={p} id={p} onClick={() => setViewing(p)} />
            ))}
            <button className="photo-add" onClick={() => input.current?.click()} aria-label="Añadir foto">
              {busy ? <Spinner /> : Icon.plus(28)}
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])]
              if (!files.length) return
              setBusy(true)
              const ids: string[] = []
              for (const f of files) ids.push(await savePhoto(f))
              await save({ photos: [...item.photos, ...ids] })
              setBusy(false)
              e.target.value = ''
            }}
          />
        </Section>
        <Section header="Cantidad">
          <Row title="Unidades que tengo" accessory={<Stepper value={item.owned} min={0} onChange={(n) => save({ owned: n })} />} />
        </Section>
        <Section header="Estado de pintura">
          {PAINT_STATUS.map((s) => (
            <Row key={s} title={s} checked={item.status === s} onClick={() => save({ status: s })} />
          ))}
        </Section>
        <Section header="Notas" footer="Esquema de color, kitbash, dónde la tienes guardada…">
          <div className="row">
            <textarea className="text-input" rows={4} defaultValue={item.notes} onBlur={(e) => save({ notes: e.target.value })} placeholder="Escribe aquí" style={{ resize: 'vertical' }} />
          </div>
        </Section>
        <Section>
          <Row
            title="Quitar de la colección"
            className="destructive"
            onClick={async () => {
              if (!confirm(`¿Quitar ${item.name} de tu colección? Se borrarán sus fotos.`)) return
              for (const p of item.photos) await photoTable.delete(p)
              await collection.delete(item.key)
              nav.pop()
            }}
          />
        </Section>
        {viewing && (
          <PhotoViewer
            id={viewing}
            onClose={() => setViewing(undefined)}
            onCover={() => save({ photos: [viewing, ...item.photos.filter((p) => p !== viewing)] })}
            onDelete={async () => {
              await save({ photos: item.photos.filter((p) => p !== viewing) })
              await photoTable.delete(viewing)
              setViewing(undefined)
            }}
          />
        )}
      </Screen>
    </div>
  )
}

function Thumb({ id, onClick }: { id: string; onClick: () => void }) {
  const url = usePhotoUrl(id)
  return <button onClick={onClick}>{url ? <img src={url} alt="" /> : <div className="photo-add" />}</button>
}

function PhotoViewer(props: { id: string; onClose: () => void; onDelete: () => void; onCover: () => void }) {
  const url = usePhotoUrl(props.id)
  return (
    <Sheet
      title="Foto"
      onClose={props.onClose}
      left={
        <button className="bar-button" onClick={props.onClose}>
          Cerrar
        </button>
      }
      right={
        <button className="bar-button" style={{ color: 'var(--red)' }} onClick={props.onDelete}>
          Borrar
        </button>
      }
    >
      {url && <img src={url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 12 }} />}
      <button className="button-filled" style={{ background: 'var(--accent)' }} onClick={props.onCover}>
        Usar como portada
      </button>
    </Sheet>
  )
}

function AddToCollectionSheet({ onClose }: { onClose: () => void }) {
  const { meta } = useData()
  const [cat, setCat] = useState<string>()
  const [q, setQ] = useState('')
  const [entries, setEntries] = useState<{ id: string; name: string; cat: string }[]>()
  const items = useTable('collection', () => collection.all())
  const groups = meta ? factions(meta) : []
  const catalogue = groups.flatMap((g) => g.items).find((c) => c.id === cat)

  const pick = async (id: string) => {
    setCat(id)
    setEntries(undefined)
    const index = await getIndex(id)
    const seen = new Set<string>()
    const list: { id: string; name: string; cat: string }[] = []
    for (const n of index.rootEntries(id)) {
      if (n.kind !== 'entry' || (n.type !== 'unit' && n.type !== 'model') || n.hidden || seen.has(n.id)) continue
      if (n.catalogueId && !index.linkedCatalogueIds(id).includes(n.catalogueId)) continue
      seen.add(n.id)
      list.push({ id: n.id, name: n.name, cat: index.categories.get(n.primaryCategoryId ?? '')?.name ?? 'Otros' })
    }
    setEntries(list.sort((a, b) => a.name.localeCompare(b.name)))
  }

  const has = useMemo(() => new Set((items ?? []).map((i) => i.key)), [items])

  const add = async (e: { id: string; name: string }) => {
    const key = `${cat}:${e.id}`
    const existing = await collection.get(key)
    if (existing) return collection.put({ ...existing, owned: existing.owned + 1, updatedAt: new Date().toISOString() })
    await collection.put({ key, catalogueId: cat!, entryId: e.id, name: e.name, faction: catalogue?.name ?? '', owned: 1, status: PAINT_STATUS[0], notes: '', photos: [], updatedAt: new Date().toISOString() })
  }

  return (
    <Sheet
      title={cat ? catalogue?.short ?? '' : 'Elige facción'}
      onClose={onClose}
      left={
        cat ? (
          <button className="bar-button" onClick={() => setCat(undefined)}>
            {Icon.chevronLeft()}
          </button>
        ) : undefined
      }
      right={
        <button className="bar-button bold" onClick={onClose}>
          Listo
        </button>
      }
    >
      {!cat &&
        groups.map((g) => (
          <Section key={g.group} header={g.group}>
            {g.items.map((c) => (
              <Row key={c.id} title={c.short} chevron onClick={() => pick(c.id)} />
            ))}
          </Section>
        ))}
      {cat && !entries && (
        <div className="empty">
          <Spinner />
        </div>
      )}
      {cat && entries && (
        <>
          <Search value={q} onChange={setQ} placeholder="Buscar unidades" />
          <Section footer="Cada toque suma una unidad a tu colección.">
            {entries
              .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
              .map((e) => (
                <Row key={e.id} title={e.name} sub={e.cat} checked={has.has(`${cat}:${e.id}`)} onClick={() => add(e)} />
              ))}
          </Section>
        </>
      )}
    </Sheet>
  )
}
