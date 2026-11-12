// Subir fotos de una unidad desde la lista o su ficha.
import { useState, type ReactNode } from 'react'
import { addUnitPhotos } from '../data/photos'
import { Spinner } from './kit'

export interface UnitRef {
  catalogueId: string
  entryId: string
  name: string
  faction: string
}

/** Envuelve un botón: al pulsarlo abre la cámara o la galería y guarda las fotos en la unidad */
export function PhotoPicker({ unit, children, className, label }: { unit: UnitRef; children: ReactNode; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <label className={className} aria-label={label ?? `Add photo of ${unit.name}`} onClick={(e) => e.stopPropagation()}>
      {busy ? <Spinner /> : children}
      <input
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (!files.length) return
          setBusy(true)
          try {
            await addUnitPhotos(unit, files)
          } finally {
            setBusy(false)
          }
        }}
      />
    </label>
  )
}
