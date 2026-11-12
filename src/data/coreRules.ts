// Our own short summary of general 11th edition rules, for quick reference.
// It is a summary: the official text is in the Games Workshop rulebook.

export interface CoreStratagem {
  name: string
  ref: string
  cp: string
  when: string
  target: string
  effect: string
  limit?: string
}

export const CORE_STRATAGEMS: CoreStratagem[] = [
  {
    name: 'Command Re-roll',
    ref: '15.02',
    cp: '1CP',
    when: 'Any phase, just after you make an Advance, Charge, Damage, Hazardous, Hit, saving throw, Wound or weapon Attacks roll.',
    target: 'That unit or model.',
    effect: 'Re-roll that roll. If several dice were rolled, re-roll just one of them (except a Charge roll, which is re-rolled in full).',
  },
  {
    name: 'Epic Challenge',
    ref: '15.03',
    cp: '1CP',
    when: 'Fight phase, just after one of your CHARACTER units is selected to fight.',
    target: 'That CHARACTER unit.',
    effect: 'Pick one CHARACTER model in it: its melee weapons gain [PRECISION] until the end of the phase.',
  },
  {
    name: 'Insane Bravery',
    ref: '15.04',
    cp: '1CP',
    when: 'Battle-shock step of your Command phase, just before you take a test.',
    target: 'That unit.',
    effect: 'The Battle-shock test is passed automatically.',
    limit: 'Once per battle.',
  },
  {
    name: 'Explosives',
    ref: '15.05',
    cp: '1CP',
    when: 'Your Shooting phase.',
    target: 'One EXPLOSIVES/GRENADES unit that is not engaged, is eligible to shoot and did not Advance.',
    effect: 'Pick one model and one visible enemy unit within 8" that is not engaged. Roll 6D6: each 4+ inflicts 1 mortal wound.',
  },
  {
    name: 'Crushing Impact',
    ref: '15.06',
    cp: '1CP',
    when: 'Your Charge phase, just after a MONSTER/VEHICLE unit ends a Charge move.',
    target: 'That MONSTER/VEHICLE unit.',
    effect: 'Pick an engaged enemy unit and one of your models engaged with it. Roll D6 equal to its T: each 1 inflicts 1 mortal wound on you and each 5+ 1 mortal wound on the enemy (max 6).',
  },
  {
    name: 'Rapid Ingress',
    ref: '15.07',
    cp: '1CP',
    when: "End of your opponent's Movement phase.",
    target: 'One of your units in Strategic Reserves (not AIRCRAFT).',
    effect: 'The unit makes an ingress move (20.04).',
    limit: 'Not in the first battle round.',
  },
  {
    name: 'Fire Overwatch',
    ref: '15.08',
    cp: '1CP',
    when: "End of your opponent's Movement phase.",
    target: 'One of your units that is not engaged (not TITANIC).',
    effect: 'It shoots with snap shots (15.09): one visible target within 24", hits only on an unmodified 6 and no Hit re-rolls. It then cannot start actions that phase.',
  },
  {
    name: 'Smokescreen',
    ref: '15.10',
    cp: '1CP',
    when: "Start of your opponent's Shooting phase.",
    target: 'One of your SMOKE units.',
    effect: 'Until the end of the phase, that unit and units its models screen have cover.',
  },
  {
    name: 'Heroic Intervention',
    ref: '15.11',
    cp: '1CP',
    when: "End of your opponent's Charge phase.",
    target: 'One of your units that is not engaged and is within 12" of enemies (a VEHICLE only if it is a CHARACTER/WALKER).',
    effect: 'Make a charge in one of two modes: “Defensive” (only against units that charged this phase) or “Into the fray” (+1CP: the roll counts as at most 6 and you can pick any enemy within 6").',
  },
  {
    name: 'Counteroffensive',
    ref: '15.12',
    cp: '2CP',
    when: "Fight step of your opponent's Fight phase, just after an enemy unit resolves its attacks.",
    target: 'One of your units that is eligible to fight.',
    effect: 'It gains Fights First until the end of the phase and must be the next unit you pick to fight.',
  },
]

export const MUSTER_RULES: { title: string; text: string }[] = [
  {
    title: 'Battle size',
    text: 'Incursion (1000 pts): 2 Detachment Points (DP), 2 enhancements, max 2 of the same unit.\nStrike Force (2000 pts): 3 DP, 4 enhancements, max 3 of the same unit.\nOnslaught (3000 pts): set by the mission or event; the app applies what the BSData data provides.',
  },
  {
    title: 'Detachments',
    text: "Each detachment costs 1 to 3 DP and you can't exceed the total. The same detachment can't be repeated, nor two with the same tag (e.g. DYNASTY). Each detachment has one or more Force Dispositions; if you take several, pick one for the list.",
  },
  {
    title: 'Repeated units',
    text: 'At most 2 (Incursion) or 3 copies of the same datasheet. Battleline and Dedicated Transport, double that. Epic Hero, only 1.',
  },
  {
    title: 'Enhancements',
    text: "Only characters that aren't Epic Heroes. One per unit, including the whole attached unit. The same enhancement can't be repeated.",
  },
  {
    title: 'Warlord',
    text: 'Pick one character from your faction as your Warlord. If a datasheet says it must be your Warlord, it must be.',
  },
  {
    title: 'Attached units (19.01)',
    text: 'In the Muster Armies step, each unit with Leader or Support can join a Bodyguard unit it is allowed to. Each Bodyguard takes one leader and one support unless stated otherwise. The attached unit counts as a single unit.',
  },
]

export const BATTLE_ROUND: { title: string; text: string }[] = [
  { title: '1. Command phase', text: 'Each player gains 1CP (Core CP). Then take Battle-shock tests for your units that are below half-strength.' },
  { title: '2. Movement phase', text: 'Move your units (Normal, Advance or Fall Back) and set up reinforcements.' },
  { title: '3. Shooting phase', text: 'Pick units that can shoot and resolve their attacks.' },
  { title: '4. Charge phase', text: 'Declare charges against enemies within 12" and roll 2D6.' },
  { title: '5. Fight phase', text: 'Units with Fights First go first (units that charged have it), then players alternate.' },
]
