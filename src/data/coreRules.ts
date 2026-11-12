// Resumen propio (en español) de reglas generales de la 11ª edición, para consulta rápida.
// Es un resumen: el texto oficial está en el reglamento de Games Workshop.

export interface CoreStratagem {
  name: string
  en: string
  ref: string
  cp: string
  when: string
  target: string
  effect: string
  limit?: string
}

export const CORE_STRATAGEMS: CoreStratagem[] = [
  {
    name: 'Repetición de mando',
    en: 'Command Re-roll',
    ref: '15.02',
    cp: '1PM',
    when: 'Cualquier fase, justo después de hacer una tirada de avanzar, carga, daño, riesgo, impactar, salvación, herir o de número de ataques de un arma.',
    target: 'Esa unidad o miniatura.',
    effect: 'Repites la tirada. Si eran varios dados, repites solo uno (salvo la carga, que se repite entera).',
  },
  {
    name: 'Desafío épico',
    en: 'Epic Challenge',
    ref: '15.03',
    cp: '1PM',
    when: 'Fase de combate, justo después de elegir para combatir una unidad PERSONAJE tuya.',
    target: 'Esa unidad PERSONAJE.',
    effect: 'Eliges una miniatura PERSONAJE: sus armas de combate ganan [PRECISIÓN] hasta el final de la fase.',
  },
  {
    name: 'Valor insensato',
    en: 'Insane Bravery',
    ref: '15.04',
    cp: '1PM',
    when: 'Paso de acobardamiento de tu fase de mando, justo antes de tirar.',
    target: 'Esa unidad.',
    effect: 'La tirada de acobardamiento se supera automáticamente.',
    limit: 'Una vez por batalla.',
  },
  {
    name: 'Explosivos',
    en: 'Explosives',
    ref: '15.05',
    cp: '1PM',
    when: 'Tu fase de disparo.',
    target: 'Una unidad EXPLOSIVOS/GRANADAS no trabada, apta para disparar y que no haya avanzado.',
    effect: 'Eliges una miniatura y una unidad enemiga no trabada, visible y a 8" o menos. Tiras 6D6: cada 4+ es 1 herida mortal.',
  },
  {
    name: 'Impacto aplastante',
    en: 'Crushing Impact',
    ref: '15.06',
    cp: '1PM',
    when: 'Tu fase de carga, justo después de que una unidad MONSTRUO/VEHÍCULO termine un movimiento de carga.',
    target: 'Esa unidad MONSTRUO/VEHÍCULO.',
    effect: 'Eliges un enemigo trabado y una miniatura tuya trabada con él. Tiras tantos D6 como su R: cada 1 es 1 herida mortal para ti y cada 5+ 1 herida mortal para el enemigo (máximo 6).',
  },
  {
    name: 'Inserción rápida',
    en: 'Rapid Ingress',
    ref: '15.07',
    cp: '1PM',
    when: 'Final de la fase de movimiento del rival.',
    target: 'Una unidad tuya en reservas estratégicas (no AERONAVES).',
    effect: 'La unidad hace un movimiento de inserción (20.04).',
    limit: 'No en la primera ronda de batalla.',
  },
  {
    name: 'Disparos preventivos',
    en: 'Fire Overwatch',
    ref: '15.08',
    cp: '1PM',
    when: 'Final de la fase de movimiento del rival.',
    target: 'Una unidad tuya no trabada (no TITÁNICA).',
    effect: 'Dispara con disparos repentinos (15.09): un solo objetivo visible a 24" o menos, solo impacta con 6 sin modificar y sin repetir tiradas para impactar. Después no puede iniciar acciones esa fase.',
  },
  {
    name: 'Pantalla de humo',
    en: 'Smokescreen',
    ref: '15.10',
    cp: '1PM',
    when: 'Inicio de la fase de disparo del rival.',
    target: 'Una unidad HUMO tuya.',
    effect: 'Hasta el final de la fase, esa unidad y las que tape con sus miniaturas tienen cobertura.',
  },
  {
    name: 'Intervención heroica',
    en: 'Heroic Intervention',
    ref: '15.11',
    cp: '1PM',
    when: 'Final de la fase de carga del rival.',
    target: 'Una unidad tuya no trabada a 12" o menos de enemigos (un VEHÍCULO solo si es PERSONAJE/BÍPODE).',
    effect: 'Haces una carga eligiendo modo: «A defender» (solo contra unidades que cargaron esta fase) o «Hacia el conflicto» (+1PM: la tirada vale como máximo 6 y puedes elegir cualquier enemigo a 6" o menos).',
  },
  {
    name: 'Contraofensiva',
    en: 'Counteroffensive',
    ref: '15.12',
    cp: '2PM',
    when: 'Paso Combatir de la fase de combate del rival, justo después de que una unidad enemiga resuelva sus ataques.',
    target: 'Una unidad tuya apta para combatir.',
    effect: 'Gana Combatir primero hasta el final de la fase y debe ser la siguiente unidad que elijas para combatir.',
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
