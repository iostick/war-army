// Short glossary of 11th edition weapon abilities, core abilities and unit keywords.
// Our own summary of the core rules (sections 13, 17–24), not the official text.

export interface CoreEntry {
  /** Display name */
  name: string
  /** Core rules reference */
  ref?: string
  text: string
  kind: 'ability' | 'weapon' | 'keyword'
}

const E = (name: string, kind: CoreEntry['kind'], text: string, ref?: string): CoreEntry => ({ name, kind, text, ref })

/** Normalised BSData term → entry */
export const CORE_GLOSSARY: Record<string, CoreEntry> = {
  // ---------- Weapon abilities (24) ----------
  anti: E('[ANTI]', 'weapon', 'Written [ANTI-X Y+]. If the target has keyword X, each unmodified Wound roll of Y+ is a Critical Wound.', '24.03'),
  assault: E('[ASSAULT]', 'weapon', 'The unit can make assault shots (10.05), i.e. shoot after it Advanced.', '24.04'),
  blast: E('[BLAST]', 'weapon', 'When gathering attack dice, add 1 die for every 5 models in the target unit (rounding down). [BLAST X] adds X dice per 5. Cannot target units engaged with your own units.', '24.05'),
  cleave: E('[CLEAVE]', 'weapon', 'Written [CLEAVE X]. If all of that weapon’s attacks target a single unit, add X attack dice for every 5 models in it (rounding down).', '24.06'),
  'close-quarters': E('[CLOSE-QUARTERS]', 'weapon', 'The unit can shoot while engaged (close-quarters shots, 10.06). For other shots, each model (except MONSTER/VEHICLE) shoots either its [CLOSE-QUARTERS] weapons or its other ranged weapons.', '24.07'),
  pistol: E('[PISTOL]', 'weapon', 'Works exactly like [CLOSE-QUARTERS]: it can shoot while engaged. Older name that is being phased out.', '24.27'),
  'devastating wounds': E('[DEVASTATING WOUNDS]', 'weapon', 'A Critical Wound skips the saving throw: the target suffers mortal wounds equal to the weapon’s Damage, after normal damage. Each Critical Wound can kill at most 1 model; excess is lost.', '24.10'),
  'extra attacks': E('[EXTRA ATTACKS]', 'weapon', 'The model attacks with these weapons in addition to another melee weapon. It always uses all of them, plus one of its other weapons if it can.', '24.11'),
  hazardous: E('[HAZARDOUS]', 'weapon', 'After the unit shoots or fights, make a Hazardous roll for each [HAZARDOUS] weapon used: on a 1–2 it suffers 1 mortal wound (3 if the whole unit is MONSTER/VEHICLE).', '24.15'),
  heavy: E('[HEAVY]', 'weapon', '+1 to Hit in your Shooting phase if the unit is not engaged, was not set up this turn and no model moved more than 3".', '24.16'),
  'ignores cover': E('[IGNORES COVER]', 'weapon', 'The target gets no benefit of cover against that attack, from terrain or from rules like Stealth.', '24.18'),
  'indirect fire': E('[INDIRECT FIRE]', 'weapon', 'The unit can make indirect shots (10.07) at targets it cannot see.', '24.19'),
  lance: E('[LANCE]', 'weapon', '+1 to Wound if the attacking unit made a Charge move this turn.', '24.21'),
  'lethal hits': E('[LETHAL HITS]', 'weapon', 'A Critical Hit can automatically wound without a Wound roll. If you do, that attack can’t be a Critical Wound (it doesn’t trigger [DEVASTATING WOUNDS]).', '24.23'),
  melta: E('[MELTA]', 'weapon', 'Written [MELTA X]. If the target was within half range, the weapon adds X to its Damage.', '24.25'),
  'one shot': E('[ONE SHOT]', 'weapon', 'The weapon can only be used once per battle.', '24.26'),
  precision: E('[PRECISION]', 'weapon', 'If the target unit contains a visible CHARACTER, you can allocate the attacks to its group first until they are resolved or it is destroyed. Used to pick out a leader hiding in a squad.', '24.28'),
  psychic: E('[PSYCHIC]', 'weapon', 'You can ignore any modifiers to BS/WS and to the Hit roll. These attacks count as psychic attacks.', '24.29'),
  'rapid fire': E('[RAPID FIRE]', 'weapon', 'Written [RAPID FIRE X]. If the target was within half range, add X attack dice.', '24.30'),
  'sustained hits': E('[SUSTAINED HITS]', 'weapon', 'Written [SUSTAINED HITS X]. Each Critical Hit scores X additional hits.', '24.36'),
  torrent: E('[TORRENT]', 'weapon', 'The attacks hit automatically: no Hit roll is made.', '24.37'),
  'twin-linked': E('[TWIN-LINKED]', 'weapon', 'You can re-roll the Wound roll.', '24.38'),

  // ---------- Core abilities (24) ----------
  'deadly demise': E('Deadly Demise', 'ability', 'Written Deadly Demise X. When the model is destroyed (after its passengers make an emergency disembark), roll 1D6: on a 6, each unit within 6" suffers X mortal wounds.', '24.08'),
  'deep strike': E('Deep Strike', 'ability', 'When it arrives from Reserves (ingress move, 20.04) it can be set up anywhere more than 8" horizontally from all enemies, even in the enemy deployment zone.', '24.09'),
  'feel no pain': E('Feel No Pain', 'ability', 'Written Feel No Pain X+. Each time the model would lose a wound, roll 1D6: on X+ it is not lost.', '24.12'),
  'fights first': E('Fights First', 'ability', 'If every model has it, the unit fights in the Fights First step of the Fight phase (12.04), before the rest.', '24.13'),
  'firing deck': E('Firing Deck', 'ability', 'Written Firing Deck X. When this TRANSPORT shoots, pick up to X embarked models and one ranged weapon from each: the transport uses them as its own. Those units can’t shoot this turn.', '24.14'),
  hover: E('Hover', 'ability', 'When it takes flight (21.03) it doesn’t subtract 2" from its move.', '24.17'),
  infiltrators: E('Infiltrators', 'ability', 'When deploying, if the whole unit has it, it can be set up anywhere more than 8" horizontally from the enemy deployment zone and all enemies.', '24.20'),
  leader: E('Leader', 'ability', 'Before the battle it can join an allowed Bodyguard unit to form an attached unit (19). Each Bodyguard takes 1 leader and 1 support.', '24.22'),
  support: E('Support', 'ability', 'Like Leader, but a specialist that joins an allowed Bodyguard unit (19). Each Bodyguard takes 1 leader and 1 support.', '24.34'),
  'lone operative': E('Lone Operative', 'ability', 'Unless it is part of an attached unit, enemies more than 12" away (or X" for Lone Operative X") can’t see it, and [INDIRECT FIRE] weapons can’t target it from further away either.', '24.24'),
  scouts: E('Scouts', 'ability', 'Written Scouts X". Before the battle, if the whole unit has it, it can deploy from Reserves in your zone or make a move of up to X" (ending more than 8" from enemies). A DEDICATED TRANSPORT can do it too if all its passengers have it.', '24.31'),
  stealth: E('Stealth', 'ability', 'If every model has it, the unit has cover against ranged attacks.', '24.33'),
  'super-heavy walker': E('Super-heavy Walker', 'ability', 'When it makes a Normal, Advance or Fall Back move it can move through models (including MONSTER/VEHICLE, but not TITANIC) and terrain 4" or less tall. It can also gain MOBILE for that move; if it does, on a 1 on 1D6 at the end it is Battle-shocked.', '24.35'),

  // ---------- Unit keywords ----------
  character: E('CHARACTER', 'keyword', 'When allocating attacks, each CHARACTER model forms its own group and always goes last in the allocation order: it receives no attacks while other models remain, except from [PRECISION] weapons (05.03, 24.28).\nIt can use the Epic Challenge stratagem (15.03). A CHARACTER VEHICLE can make a Heroic Intervention (15.11).\nWhen mustering, enhancements go on CHARACTERS that are not EPIC HEROES.', '05.03'),
  'epic hero': E('EPIC HERO', 'keyword', 'A unique named character: you can only take 1 in your army and it can’t take enhancements.'),
  monster: E('MONSTER', 'keyword', 'Shares rules with VEHICLE (17):\n• Normal and Advance moves pass through models, except other MONSTER/VEHICLE (17.01).\n• It can be shot while engaged, at −1 to Hit (17.03).\n• It can shoot while engaged (close-quarters) with all its weapons, at −1 to Hit except [CLOSE-QUARTERS] weapons (10.06).\n• Failed Hazardous rolls inflict 3 mortal wounds if the whole unit has it (06.03).\n• It can use Crushing Impact (15.06).\n• It can climb to upper floors of ruins (13.06).', '17'),
  vehicle: E('VEHICLE', 'keyword', 'Shares rules with MONSTER (17):\n• Normal and Advance moves pass through models, except other MONSTER/VEHICLE (17.01).\n• It can be shot while engaged, at −1 to Hit (17.03).\n• It can shoot while engaged (close-quarters) with all its weapons, at −1 to Hit except [CLOSE-QUARTERS] weapons (10.06).\n• Failed Hazardous rolls inflict 3 mortal wounds if the whole unit has it (06.03).\n• It can use Crushing Impact (15.06).\n• It can only make a Heroic Intervention if it is also a CHARACTER or WALKER (15.11).', '17'),
  infantry: E('INFANTRY', 'keyword', '• Moves through dense terrain horizontally and vertically, and can end on upper floors (13.06).\n• Has cover while within a terrain area (13.08).\n• Can be hidden in dense terrain if it didn’t shoot this turn or last: only enemies within 15" can see it (13.09).', '13'),
  beast: E('BEASTS', 'keyword', 'Same terrain benefits as INFANTRY: moves through dense terrain, has cover in terrain areas and can be hidden (13.06–13.09).', '13'),
  swarm: E('SWARM', 'keyword', 'Same terrain benefits as INFANTRY: moves through dense terrain, has cover in terrain areas and can be hidden (13.06–13.09).', '13'),
  mobile: E('MOBILE', 'keyword', 'Can move horizontally through dense terrain (13.06).', '13.06'),
  mounted: E('MOUNTED', 'keyword', 'Cavalry, bikes and other mounts. The core rules give it no rules of its own: weapon abilities like [ANTI-MOUNTED] and faction rules use it.'),
  fly: E('FLY', 'keyword', 'When making a Normal, Advance, Fall Back or Charge move it can take flight: −2" of movement, but it ignores vertical distance and moves through models (including MONSTER/VEHICLE) and terrain (21.03). It can also end on upper floors and is the only kind of unit that can charge and fight AIRCRAFT.', '21.03'),
  aircraft: E('AIRCRAFT', 'keyword', '• Always starts in Strategic Reserves and only arrives with ingress moves.\n• At the end of the opponent’s turn it returns to Reserves.\n• Other models can move through it.\n• Only units that can FLY can charge and fight it, and it only fights units that can FLY.\n• Plunging Fire doesn’t affect it. It can’t perform actions.', '23'),
  transport: E('TRANSPORT', 'keyword', 'Carries embarked units up to its capacity (18.01). A unit can embark if it ends within 3"; to disembark it is set up within 3" of the transport. If the transport is destroyed, passengers make an emergency disembark.', '18'),
  'dedicated transport': E('DEDICATED TRANSPORT', 'keyword', 'A transport that carries your troops. When mustering you can take twice as many copies as other datasheets. If all its passengers have Scouts, it can make a Scouts move (24.31).'),
  titanic: E('TITANIC', 'keyword', 'Colossal machines or beasts:\n• It can start actions while engaged, and shoot after starting them (16).\n• It can’t be picked for Fire Overwatch (15.08).\n• Super-heavy Walkers can’t move through it (24.35).'),
  towering: E('TOWERING', 'keyword', 'Plunging Fire (22.05): its ranged attacks gain +1 AP against units with models at ground level within 12", even if it is on the ground.', '22.05'),
  frame: E('FRAME', 'keyword', 'Large models, many without a base. Distances are measured from the closest point of the model itself, not its base (17.02).', '17.02'),
  walker: E('WALKER', 'keyword', 'A WALKER VEHICLE can use the Heroic Intervention stratagem (15.11).'),
  psyker: E('PSYKER', 'keyword', 'A unit with psychic powers. It is a target for [ANTI-PSYKER] weapons. If a PSYKER leader joins a unit, the whole attached unit has the keyword (19.03).', '22.03'),
  smoke: E('SMOKE', 'keyword', 'It can use the Smokescreen stratagem (15.10): it and the units it screens have cover during the opponent’s Shooting phase.', '15.10'),
  grenades: E('GRENADES', 'keyword', 'It can use the Explosives stratagem (15.05): one model throws at an enemy within 8" and you roll 6D6, each 4+ is a mortal wound.', '15.05'),
  explosives: E('EXPLOSIVES', 'keyword', 'It can use the Explosives stratagem (15.05): one model throws at an enemy within 8" and you roll 6D6, each 4+ is a mortal wound.', '15.05'),
  fortification: E('FORTIFICATION', 'keyword', 'A fixed structure. It can’t be placed in Strategic Reserves (20.01) or start actions (16).'),
  battleline: E('BATTLELINE', 'keyword', 'Line troops. When mustering you can take twice as many copies as other datasheets.'),
  warlord: E('WARLORD', 'keyword', 'Your army’s commander. You must pick exactly one, normally a CHARACTER.'),
  imperium: E('IMPERIUM', 'keyword', 'Alliance keyword. Used by rules that affect all Imperial forces.'),
  chaos: E('CHAOS', 'keyword', 'Alliance keyword. Used by rules that affect all forces of Chaos.'),
}

/** Normalises a BSData or weapon term ("Anti-Infantry 4+", "Sustained Hits 1", "Faction: Necrons") */
export function coreKey(term: string): string {
  let t = term
    .toLowerCase()
    .replace(/[[\]*^]/g, '')
    .trim()
  if (t.startsWith('anti-') || t.startsWith('anti ')) return 'anti'
  t = t.replace(/\s+(d?\d+[+"]?|\d*d\d+(\+\d+)?)\+?"?$/i, '').trim()
  if (t.endsWith('s') && !CORE_GLOSSARY[t] && CORE_GLOSSARY[t.slice(0, -1)]) t = t.slice(0, -1)
  return t
}

export function lookupCore(term: string): CoreEntry | undefined {
  const k = coreKey(term)
  return CORE_GLOSSARY[k] ?? CORE_GLOSSARY[k.split(':')[0]]
}
