import { describe, expect, it } from 'vitest'
import { normName, parseCsv, phaseEs, stratagemsFor, type WahapediaData } from '../data/wahapedia'

describe('Wahapedia CSV', () => {
  const csv =
    '﻿faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description|\n' +
    'NEC|PRUEBA UNO|1|Awakened Dynasty – Battle Tactic Stratagem|1|Leyenda|Your turn|Shooting|Awakened Dynasty|10|<b>WHEN:</b> algo<br>sigue\notra línea|\n' +
    '|COMMAND RE-ROLL|2|Core – Battle Tactic Stratagem|1||Either player’s turn|Any phase|||texto|\n'
  it('lee filas con saltos de línea dentro de la descripción', () => {
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].faction_id).toBe('NEC')
    expect(rows[0].description).toContain('otra línea')
    expect(rows[1].name).toBe('COMMAND RE-ROLL')
  })
  it('empareja destacamentos de BSData con Wahapedia', () => {
    const rows = parseCsv(csv)
    const data: WahapediaData = {
      stratagems: rows.map((r) => ({ factionId: r.faction_id, name: r.name, id: r.id, type: r.type, cp: r.cp_cost, legend: r.legend, turn: r.turn, phase: r.phase, detachment: r.detachment, detachmentId: r.detachment_id, description: r.description })),
      abilities: [],
      factions: new Map(),
    }
    expect(stratagemsFor(data, 'Awakened Dynasty')).toHaveLength(1)
    expect(stratagemsFor(data, 'Awakened Dynasty Detachment')).toHaveLength(1)
    expect(normName("Annihilation Legion")).toBe('annihilation legion')
    expect(phaseEs('Shooting or Fight')).toBe('Shooting phase or Fight phase')
  })
})
