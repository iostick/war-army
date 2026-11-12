// Color de acento por facción (para dar identidad a cada lista).
const COLORS: [RegExp, string][] = [
  [/Necron/i, '#22b573'],
  [/Ultramarines/i, '#2f6fde'],
  [/Blood Angels/i, '#c8102e'],
  [/Dark Angels/i, '#1f7a4d'],
  [/Space Wolves/i, '#6b8fb3'],
  [/Black Templars/i, '#8a8f98'],
  [/Imperial Fists/i, '#e0b000'],
  [/Salamanders/i, '#2e9a3a'],
  [/Raven Guard/i, '#4a4f58'],
  [/White Scars/i, '#b8323a'],
  [/Iron Hands/i, '#7d8590'],
  [/Deathwatch/i, '#5a6270'],
  [/Space Marines/i, '#2f6fde'],
  [/Custodes/i, '#d4a017'],
  [/Sororitas/i, '#b3122e'],
  [/Mechanicus/i, '#c4371f'],
  [/Astra Militarum/i, '#6b7f3a'],
  [/Grey Knights/i, '#8fa3b8'],
  [/Imperial Knights/i, '#2b5fad'],
  [/Agents/i, '#7a5c3e'],
  [/Titanicus/i, '#9e7b2f'],
  [/Death Guard/i, '#8a9a2b'],
  [/Thousand Sons/i, '#1a7fb5'],
  [/World Eaters/i, '#b0151c'],
  [/Emperor's Children/i, '#c04ab3'],
  [/Chaos Knights/i, '#6e1f1f'],
  [/Daemons/i, '#a12b5c'],
  [/Chaos Space Marines/i, '#a8281e'],
  [/Aeldari|Craftworld/i, '#1fa5a0'],
  [/Drukhari/i, '#5c2a86'],
  [/Orks/i, '#4c9a2a'],
  [/T'au/i, '#d2782e'],
  [/Tyranids/i, '#8b3fa8'],
  [/Genestealer/i, '#7e4ca8'],
  [/Votann/i, '#d08a2c'],
]

export function factionColor(name: string | undefined): string {
  if (!name) return 'var(--tint)'
  return COLORS.find(([re]) => re.test(name))?.[1] ?? 'var(--tint)'
}

export function shortFaction(name: string | undefined): string {
  if (!name) return ''
  const parts = name.split(' - ')
  return parts[parts.length - 1]
}
