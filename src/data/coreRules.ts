// Resumen propio (en español) de reglas generales de la 11ª edición, para consulta rápida.
// Es un resumen: el texto oficial está en el reglamento de Games Workshop.

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
    when: 'Cualquier fase, justo después de hacer una tirada de avance, carga, daño, peligro (hazard), impactar, salvar, herir o de número de ataques.',
    target: 'Esa unidad o miniatura.',
    effect: 'Repites esa tirada. Si tiras varios dados juntos, repites solo uno (salvo la carga, que se repite entera).',
  },
  {
    name: 'Epic Challenge',
    ref: '15.03',
    cp: '1CP',
    when: 'Fase de combate, justo después de elegir una unidad CHARACTER para combatir.',
    target: 'Esa unidad CHARACTER.',
    effect: 'Una miniatura CHARACTER de la unidad gana [PRECISION] en sus armas cuerpo a cuerpo hasta el final de la fase.',
  },
  {
    name: 'Insane Bravery',
    ref: '15.04',
    cp: '1CP',
    when: 'Paso de battle-shock de tu fase de mando, justo antes de tirar battle-shock.',
    target: 'Esa unidad.',
    effect: 'La tirada de battle-shock se supera automáticamente.',
    limit: 'Una vez por batalla.',
  },
  {
    name: 'Explosives',
    ref: '15.05',
    cp: '1CP',
    when: 'Tu fase de disparo.',
    target: 'Una unidad EXPLOSIVES/GRENADES no trabada, que pueda disparar y no haya avanzado.',
    effect: 'Eliges una miniatura de la unidad y una unidad enemiga no trabada a 8" o menos y visible. Tiras 6D6: cada 4+ hace 1 herida mortal.',
  },
  {
    name: 'Crushing Impact',
    ref: '15.06',
    cp: '1CP',
    when: 'Tu fase de carga, justo después de que una unidad MONSTER/VEHICLE termine un movimiento de carga.',
    target: 'Esa unidad MONSTER/VEHICLE.',
    effect: 'Eliges una unidad enemiga trabada y una miniatura tuya trabada con ella. Tiras tantos D6 como su T: cada 1 es 1 herida mortal para ti; cada 5+ es 1 herida mortal para el enemigo (máximo 6).',
  },
  {
    name: 'Rapid Ingress',
    ref: '15.07',
    cp: '1CP',
    when: 'Final de la fase de movimiento del rival.',
    target: 'Una unidad tuya en reservas estratégicas (no AIRCRAFT).',
    effect: 'La unidad hace un movimiento de entrada (ingress, 20.04).',
    limit: 'No en la primera ronda de batalla.',
  },
  {
    name: 'Fire Overwatch',
    ref: '15.08',
    cp: '1CP',
    when: 'Final de la fase de movimiento del rival.',
    target: 'Una unidad tuya no trabada (no TITANIC).',
    effect: 'Dispara con snap shooting: un solo objetivo visible a 24" o menos, solo impacta con 6 natural, sin repetir tiradas para impactar. Después no puede empezar acciones esa fase.',
  },
  {
    name: 'Smokescreen',
    ref: '15.10',
    cp: '1CP',
    when: 'Inicio de la fase de disparo del rival.',
    target: 'Una unidad SMOKE tuya.',
    effect: 'Hasta el final de la fase, los ataques contra esa unidad (o contra unidades tapadas por ella) cuentan con cobertura.',
  },
  {
    name: 'Heroic Intervention',
    ref: '15.11',
    cp: '1CP',
    when: 'Final de la fase de carga del rival.',
    target: 'Una unidad tuya no trabada a 12" o menos de enemigos (un VEHICLE solo si es CHARACTER/WALKER).',
    effect: 'Haces una carga eligiendo modo: «Leap to Defend» (solo contra unidades que cargaron esta fase) o «Into the Fray» (+1CP: tirada máxima 6 y puedes elegir enemigos a 6").',
  },
  {
    name: 'Counteroffensive',
    ref: '15.12',
    cp: '2CP',
    when: 'Paso de combate de la fase de combate del rival, justo después de que una unidad enemiga resuelva sus ataques.',
    target: 'Una unidad tuya que pueda combatir.',
    effect: 'Gana Fights First hasta el final de la fase y debe ser la siguiente unidad que elijas para combatir.',
  },
]

export const MUSTER_RULES: { title: string; text: string }[] = [
  {
    title: 'Tamaño de batalla',
    text: 'Incursion (1000 pts): 2 puntos de destacamento (DP), 2 mejoras, máx. 2 unidades iguales.\nStrike Force (2000 pts): 3 DP, 4 mejoras, máx. 3 unidades iguales.\nOnslaught (3000 pts): según la misión o el torneo; la app aplica lo que traen los datos de BSData.',
  },
  {
    title: 'Destacamentos',
    text: 'Cada destacamento cuesta de 1 a 3 DP y no puedes pasarte del total. No se repite el mismo destacamento ni dos con la misma etiqueta (p. ej. DYNASTY). Cada destacamento tiene una o varias disposiciones de fuerza; si llevas varios, eliges una para la lista.',
  },
  {
    title: 'Unidades repetidas',
    text: 'Máximo 2 (Incursion) o 3 copias de la misma ficha. Battleline y Dedicated Transport, el doble. Epic Hero, solo 1.',
  },
  {
    title: 'Mejoras (Enhancements)',
    text: 'Solo personajes que no sean Epic Hero. Una por unidad, incluida la unidad adjunta completa. No se repite la misma mejora.',
  },
  {
    title: 'Warlord',
    text: 'Elige un personaje de la facción como Warlord. Si una ficha obliga a ser Warlord, debe serlo.',
  },
  {
    title: 'Unidades adjuntas (19.01)',
    text: 'En el paso Muster Armies, cada unidad con Leader o Support puede unirse a una unidad guardaespaldas que tenga permitida. Cada guardaespaldas admite un líder y un apoyo, salvo que se diga lo contrario. La unidad adjunta cuenta como una sola unidad.',
  },
]

export const BATTLE_ROUND: { title: string; text: string }[] = [
  { title: '1. Fase de mando', text: 'Cada jugador gana 1CP (Core CP). Después, pruebas de battle-shock de tus unidades por debajo de la mitad de efectivos.' },
  { title: '2. Fase de movimiento', text: 'Mueves tus unidades (normal, avance o retirada) y metes refuerzos.' },
  { title: '3. Fase de disparo', text: 'Eliges unidades que pueden disparar y resuelves sus ataques.' },
  { title: '4. Fase de carga', text: 'Declaras cargas contra enemigos a 12" o menos y tiras 2D6.' },
  { title: '5. Fase de combate', text: 'Primero las unidades con Fights First (las que cargaron lo tienen), luego se alternan.' },
]
