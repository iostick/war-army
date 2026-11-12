// Short English summaries of the Warhammer Event Companion mission cards (11th edition), used in the game
// tracker so you can play from the app. The full card text (from Wahapedia) is shown when it's available.

export const PRIMARY_SUMMARY: Record<string, string> = {
  'Battlefield Dominance':
    'Rounds 1–2, end of your turn: 2VP if you control more objectives than your opponent. Round 2+, end of your Command phase (round 5: end of turn): 3VP per objective you control, +2VP for each non-home objective if you also control your home objective.',
  'Immovable Object':
    'Any round, end of your turn: 3VP if you control a central objective. Rounds 2–4, end of your Command phase: 5VP per non-home objective you control. Round 5, end of turn: 5VP per non-home objective.',
  'Determined Acquisition':
    'Any round, end of your turn: 2VP per non-home objective you took this turn. Round 2+, end of your Command phase (round 5: end of turn): 3VP per objective you control, +3VP for each one in your opponent’s territory.',
  'Purge and Secure':
    'Any round, end of your turn: 3VP if an enemy unit was destroyed by a unit near an objective (or one that started near an objective was destroyed), and 3VP if you took a non-home objective this turn. Round 2+, end of your Command phase: 4VP per non-home objective you control.',
  'Inescapable Dominion':
    'Any round, end of your turn: 4VP if you control 3+ objectives. Round 2+, end of your Command phase: 5VP if you control 2+ objectives and 4VP if you control more than your opponent. End of battle: 5VP if you control their home objective.',
  'Unstoppable Force':
    'Any round, end of your turn: 3VP if an enemy unit was destroyed this turn and 3VP if you took a non-home objective. Round 2+, end of your Command phase: 4VP per non-home objective you control. End of battle: 5VP if you control a central objective.',
  Meatgrinder:
    'Any round, end of your turn: 3VP if an enemy unit was destroyed this turn. Round 2+, end of your Command phase: 4VP if you control a non-home objective. Round 2+, end of turn: 5VP if you destroyed more units this turn than you lost in the previous turn. End of battle: 5VP for their home objective.',
  Punishment:
    'Start of your turn: condemn 1–3 enemy units until your next turn. Any round, end of turn: 5VP if a condemned unit left the battlefield. Round 2+, end of your Command phase: 4VP for a non-home objective and 5VP if you control more objectives than your opponent. End of battle: 8VP for their home objective.',
  Consecrate:
    'Units that destroy an enemy unit can consecrate an objective at the end of the turn. Any round, end of turn: 3VP for 1–2 consecrated objectives, 6VP for 3+. Round 2+, end of your Command phase: 4VP for a non-home objective and 4VP if you control more than your opponent. End of battle: 5VP if their home objective is consecrated.',
  "Destroyer's Wrath":
    'Any round, end of your turn: 3VP if an enemy unit was destroyed. Round 2+, end of your Command phase: 4VP for a non-home objective and 6VP if you control more objectives than your opponent. End of turn: 4VP if you destroyed more units this turn than you lost in the previous turn.',
  'Death Trap':
    'Any round, end of your turn: 2VP per terrain area trapped this turn (+3VP for each that is an objective), and 3VP if an enemy unit that started in a trapped area was destroyed. Round 2+, end of your Command phase: 4VP for a non-home objective.',
  'Delaying Action':
    'Any round, end of your turn: 2VP per enemy unit destroyed this turn. Round 2+, end of your Command phase: 4VP for a non-home objective. End of turn: 3VP if you control a central and an expansion objective.',
  Outmanoeuvre:
    'Any round, end of your turn: 10VP if you control their home objective. Round 1, end of turn: 4VP per non-home objective. Rounds 2–3, end of your Command phase: 5VP per non-home objective. Round 4+, end of turn: 6VP per non-home objective.',
  'Smoke and Mirrors':
    'Any round, end of your turn: 2VP per decoyed objective (+2VP for each in their territory). Round 2+, end of your Command phase: 4VP for a non-home objective. End of battle: 10VP if 4+ objectives are decoyed.',
  'Locate and Deny':
    'Start of battle: place operation markers in up to 5 terrain areas outside your deployment zone. Any round, end of turn: 4VP if an enemy unit that started near an objective was destroyed, and 4VP if only one of your markers is left with your unit there and no enemies. Round 2+, end of your Command phase: 4VP for a non-home objective.',
  'Reconnaissance Sweep':
    'Any round, end of your turn: 3VP for friendly units wholly in 3 table quarters (not within 6" of the centre), 6VP for 4 quarters, plus 1VP per enemy unit destroyed. Round 2+, end of your Command phase: 3VP for a non-home objective.',
  Triangulation:
    'Round 2+, end of your Command phase: 4VP for a non-home objective. Round 2+, end of turn: 3VP for one triangulated objective, 6VP for two, 10VP for three or more. End of battle: 10VP if you control 4+ objectives.',
  'Surveil the Foe':
    'Any round, end of your turn: 4VP if enemy units were surveilled this turn. Round 2+, end of your Command phase: 4VP for a non-home objective and 4VP if you control more than your opponent. End of turn: 5VP if none of their operation markers are on the battlefield.',
  'Gather Intel':
    'Round 1, end of your turn: 6VP if you control a central objective. Round 2+, end of your Command phase: 4VP for a non-home objective. Round 2+, end of turn: 7VP per unit that completed Extract Intelligence. End of battle: 5VP for 3+ of your markers on the battlefield and 5VP if one is near their home objective.',
  'Search and Scour':
    'Any round, end of your turn: 3VP if you control a central objective and 2VP if an enemy unit that started in a terrain area was destroyed. Round 2+, end of your Command phase: 4VP per non-home objective. End of battle: 5VP if no enemy units are wholly in your territory.',
  'Secure Asset':
    'Any round, end of your turn: 4VP if a friendly unit secured the asset and 2VP if an enemy unit that started near a central objective was destroyed. Round 2+, end of your Command phase: 4VP for a non-home objective and 4VP if you control 3+ objectives.',
  'Vital Link':
    'Any round, end of your turn: 2VP if you control a central objective (+1VP per operation marker of yours near it). Round 2+, end of your Command phase: 4VP for a non-home objective (+4VP if one is central). End of battle: 10VP for their home objective.',
  'Extract Relic':
    'Any round, end of your turn: 4VP if a unit performed a sensor sweep, 3VP if an enemy unit that started near an objective was destroyed, and 4VP if they have one marker left with your unit there and no enemies. Round 2+, end of your Command phase: 4VP for a non-home objective.',
  'Vanguard Operation':
    'Any round, end of your turn: 4VP if a unit performed a vanguard operation and 2VP if an enemy unit was destroyed. Round 2+, end of your Command phase: 4VP for a non-home objective. End of battle: 10VP for their home objective.',
  Sabotage:
    'Any round, end of your turn: 3VP per unit that committed sabotage (+2VP for each near an objective in their territory). Round 2+, end of your Command phase: 4VP for a non-home objective.',
}

export interface SecondaryInfo {
  name: string
  summary: string
  /** Can be picked as a Fixed secondary */
  fixed?: boolean
  /** "When drawn" note (Tactical only) */
  whenDrawn?: string
  /** The "when drawn" rule lets you discard it and draw again for free */
  canRedraw?: boolean
}

export const SECONDARIES: SecondaryInfo[] = [
  {
    name: 'A Grievous Blow',
    fixed: true,
    summary: '4VP per enemy unit with a Starting Strength of 13+ destroyed (Fixed: 5VP each; Tactical: up to 5VP).',
    whenDrawn: 'If your opponent has no such units, discard it and draw a new card.',
    canRedraw: true,
  },
  { name: 'A Tempting Target', summary: '5VP if you control your tempting target.', whenDrawn: 'Your opponent picks an objective in No Man’s Land as your tempting target.' },
  {
    name: 'Assassination',
    fixed: true,
    summary: '3VP per enemy CHARACTER destroyed (Fixed: +1VP if it had 4+ Wounds). Tactical: 5VP if one or more, or all, enemy CHARACTERS are destroyed.',
  },
  {
    name: 'Beacon',
    summary: '3VP if your beacon unit is outside your deployment zone, 5VP if it is outside your territory (end of your opponent’s turn or round 5).',
    whenDrawn: 'Choose one of your units to be the beacon.',
  },
  {
    name: 'Behind Enemy Lines',
    summary: '3VP per friendly unit wholly within your opponent’s deployment zone (up to 5VP).',
    whenDrawn: 'In round 1 you can discard it and draw a new card.',
    canRedraw: true,
  },
  {
    name: 'Bring It Down',
    fixed: true,
    summary: '4VP per enemy model with 10+ Wounds destroyed (Fixed: 5VP each; Tactical: up to 5VP).',
    whenDrawn: 'If your opponent has no such models, discard it and draw a new card.',
    canRedraw: true,
  },
  { name: 'Burden of Trust', summary: 'Assign units to guard objectives: 2VP per guarded objective (up to 5VP), end of your opponent’s turn or round 5.' },
  { name: 'Centre Ground', summary: '3VP or 5VP depending on how many of your units are near the centre of the battlefield and whether enemy units are nearby.' },
  {
    name: 'Cleanse',
    summary: 'Objective action: 2VP for one objective cleansed this turn, 5VP for two or more.',
    whenDrawn: 'If Plunder is active, you can swap it.',
    canRedraw: true,
  },
  { name: 'Defend Stronghold', summary: '3VP if you control your home objective, +2VP if no enemy units are in your deployment zone (end of your opponent’s turn or round 5).' },
  {
    name: 'Display of Might',
    summary:
      'More of your units than theirs wholly in No Man’s Land: 2VP at the end of your turn, or 5VP at the end of your opponent’s turn. AIRCRAFT and battle-shocked units don’t count.',
  },
  { name: 'Engage on All Fronts', fixed: true, summary: 'Units in 3 table quarters: 2VP (Fixed) / 3VP (Tactical). In 4 quarters: 4VP (Fixed) / 5VP (Tactical).' },
  { name: 'Forward Position', summary: '5VP for controlling your opponent’s home objective and/or each expansion objective.' },
  { name: 'No Prisoners', summary: '2VP per enemy unit destroyed this turn (up to 5VP).' },
  { name: 'Outflank', summary: '3VP for units near a battlefield edge outside your territory, 5VP for units near opposite edges.' },
  { name: 'Overwhelming Force', summary: '3VP per enemy unit that started the turn in range of an objective and was destroyed (up to 5VP).' },
  {
    name: 'Plunder',
    summary: 'Objective action on a terrain area outside your territory: 5VP if one was plundered this turn.',
    whenDrawn: 'If Cleanse is active, you can swap it.',
    canRedraw: true,
  },
  { name: "Secure No Man's Land", summary: '5VP if you control two or more non-home objectives in No Man’s Land.' },
]

export const secondaryInfo = (name: string) => SECONDARIES.find((s) => s.name.toLowerCase() === name.toLowerCase())

export const SECONDARY_RULES = [
  'Before the battle each player secretly picks Tactical or Fixed. Fixed: choose 2 of Assassination, Bring It Down, A Grievous Blow and Engage on All Fronts; they stay active all game and can’t be discarded (max 20VP each).',
  'Tactical: at the start of your Command phase draw 2 cards. Cards you don’t achieve stay active until you achieve or discard them.',
  'Once per battle, at the end of your Command phase, you can spend 1CP to discard an active card and draw a new one.',
  'At the end of your turn you can discard active Tactical cards to gain 1CP. Apart from the core CP, you can gain at most 1CP per battle round.',
  'Secondary VP cap: 15VP per battle round and 45VP per game.',
]
