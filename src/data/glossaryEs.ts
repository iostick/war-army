// Glosario en español de habilidades y claves (keywords) de la 11ª edición.
// Resumen propio a partir del reglamento básico en español (secciones 13, 17–24); no es el texto oficial.

export interface EsEntry {
  /** Nombre en el reglamento español */
  es: string
  /** Referencia del reglamento */
  ref?: string
  text: string
  kind: 'ability' | 'weapon' | 'keyword'
}

const E = (es: string, kind: EsEntry['kind'], text: string, ref?: string): EsEntry => ({ es, kind, text, ref })

/** Clave normalizada en inglés (como aparece en BSData) → entrada en español */
export const ES_GLOSSARY: Record<string, EsEntry> = {
  // ---------- Habilidades de armas (24) ----------
  anti: E('[ANTI]', 'weapon', 'Se escribe [ANTI-X Y+]. Si el objetivo tiene la clave X, cada tirada para herir sin modificar de Y+ es una herida crítica.', '24.03'),
  assault: E('[ASALTO]', 'weapon', 'La unidad puede disparar con disparo de asalto (10.05), es decir, después de haber avanzado.', '24.04'),
  blast: E('[ÁREA]', 'weapon', 'Al reunir dados de ataque, sumas 1 dado por cada 5 miniaturas de la unidad objetivo (redondeando abajo). Si pone [ÁREA X], sumas X dados por cada 5. No puede disparar contra unidades trabadas con tus tropas.', '24.05'),
  cleave: E('[TAJAR]', 'weapon', 'Se escribe [TAJAR X]. Si todos los ataques de esa arma van contra un solo objetivo, sumas X dados de ataque por cada 5 miniaturas que tenga (redondeando abajo).', '24.06'),
  'close-quarters': E('[A QUEMARROPA]', 'weapon', 'La unidad puede disparar estando trabada (disparo a quemarropa, 10.06). En los demás disparos, cada miniatura (salvo MONSTRUO/VEHÍCULO) elige: o dispara sus armas [A QUEMARROPA] o el resto de sus armas a distancia.', '24.07'),
  pistol: E('[PISTOLA]', 'weapon', 'Funciona exactamente igual que [A QUEMARROPA]: se puede disparar estando trabado. Es el nombre antiguo y se irá sustituyendo.', '24.27'),
  'devastating wounds': E('[HERIDAS DEVASTADORAS]', 'weapon', 'Cuando un ataque logra herida crítica, no hay tirada de salvación: el objetivo sufre tantas heridas mortales como el Daño del arma, después del daño normal. Cada herida crítica solo puede matar como máximo a 1 miniatura; el sobrante se pierde.', '24.10'),
  'extra attacks': E('[ATAQUES ADICIONALES]', 'weapon', 'La miniatura ataca con estas armas además de con otra arma cuerpo a cuerpo. Siempre las usa todas, más una de sus otras armas si puede.', '24.11'),
  hazardous: E('[DE RIESGO]', 'weapon', 'Después de que la unidad dispare o combata, haces una tirada de riesgo por cada arma [DE RIESGO] que usó: con 1-2 sufre 1 herida mortal (3 si toda la unidad es MONSTRUO/VEHÍCULO).', '24.15'),
  heavy: E('[PESADA]', 'weapon', '+1 a impactar en tu fase de disparo si la unidad no está trabada, no se desplegó este turno y ninguna miniatura movió más de 3".', '24.16'),
  'ignores cover': E('[IGNORA COBERTURA]', 'weapon', 'El objetivo no se beneficia de cobertura contra ese ataque, ni por terreno ni por reglas como Sigilo.', '24.18'),
  'indirect fire': E('[INDIRECTA]', 'weapon', 'La unidad puede hacer disparo indirecto (10.07) contra objetivos que no ve.', '24.19'),
  lance: E('[LANZA]', 'weapon', '+1 a herir si la unidad atacante hizo un movimiento de carga en este turno.', '24.21'),
  'lethal hits': E('[IMPACTOS LETALES]', 'weapon', 'Un impacto crítico puede herir automáticamente, sin tirar para herir. Si lo haces, ese ataque no puede ser herida crítica (no activa [HERIDAS DEVASTADORAS]).', '24.23'),
  melta: E('[FUSIÓN]', 'weapon', 'Se escribe [FUSIÓN X]. Si el objetivo estaba a la mitad del alcance o menos, el arma suma X a su Daño.', '24.25'),
  'one shot': E('[DISPARO ÚNICO]', 'weapon', 'El arma solo se puede usar una vez por batalla.', '24.26'),
  precision: E('[PRECISIÓN]', 'weapon', 'Si la unidad objetivo incluye un PERSONAJE visible, puedes asignar los ataques primero a su grupo hasta resolverlos o eliminarlo. Sirve para matar al líder escondido en una escuadra.', '24.28'),
  psychic: E('[PSÍQUICA]', 'weapon', 'Puedes ignorar cualquier modificador a la HP/HA y a la tirada para impactar. Estos ataques cuentan como ataques psíquicos.', '24.29'),
  'rapid fire': E('[FUEGO RÁPIDO]', 'weapon', 'Se escribe [FUEGO RÁPIDO X]. Si el objetivo estaba a la mitad del alcance o menos, sumas X dados de ataque.', '24.30'),
  'sustained hits': E('[GOLPES SOSTENIDOS]', 'weapon', 'Se escribe [GOLPES SOSTENIDOS X]. Cada impacto crítico causa X impactos adicionales.', '24.36'),
  torrent: E('[RÁFAGA]', 'weapon', 'Los ataques impactan automáticamente: no se tira para impactar.', '24.37'),
  'twin-linked': E('[ACOPLADA]', 'weapon', 'Puedes repetir las tiradas para herir.', '24.38'),

  // ---------- Habilidades básicas (24) ----------
  'deadly demise': E('Final violento', 'ability', 'Se escribe Final violento X. Al morir la miniatura (tras el desembarco de emergencia de sus pasajeros), tira 1D6: con un 6, cada unidad a 6" o menos sufre X heridas mortales.', '24.08'),
  'deep strike': E('Despliegue rápido', 'ability', 'Al entrar desde reservas (movimiento de inserción, 20.04) puede colocarse en cualquier punto a más de 8" en horizontal de todo enemigo, incluso en la zona de despliegue rival.', '24.09'),
  'feel no pain': E('No hay dolor', 'ability', 'Se escribe No hay dolor X+. Cada vez que la miniatura va a perder una herida, tira 1D6: con X+ no la pierde.', '24.12'),
  'fights first': E('Combatir primero', 'ability', 'Si todas las miniaturas la tienen, la unidad combate en el paso de Combatir primero de la fase de combate (12.04), antes que el resto.', '24.13'),
  'firing deck': E('Cubierta de disparo', 'ability', 'Se escribe Cubierta de disparo X. Cuando este TRANSPORTE dispara, elige hasta X miniaturas embarcadas y una arma a distancia de cada una: el transporte las usa como propias. Esas unidades ya no pueden disparar este turno.', '24.14'),
  hover: E('Planeador', 'ability', 'Cuando alza el vuelo (21.03) no resta 2" a su movimiento.', '24.17'),
  infiltrators: E('Infiltradores', 'ability', 'Al desplegar, si toda la unidad la tiene, puede colocarse en cualquier punto a más de 8" en horizontal de la zona de despliegue rival y de todo enemigo.', '24.20'),
  leader: E('Líder', 'ability', 'Antes de la batalla puede unirse a una unidad guardaespaldas permitida para formar una unidad adjunta (19). Cada guardaespaldas admite 1 líder y 1 apoyo.', '24.22'),
  support: E('Apoyo', 'ability', 'Como Líder, pero es un especialista que se une a una unidad guardaespaldas permitida (19). Cada guardaespaldas admite 1 líder y 1 apoyo.', '24.34'),
  'lone operative': E('Agente solitario', 'ability', 'Si no está en una unidad adjunta, los enemigos a más de 12" (o X" si pone Agente solitario X") no la ven, y las armas [INDIRECTA] tampoco pueden apuntarle desde más lejos.', '24.24'),
  scouts: E('Avanzadilla', 'ability', 'Se escribe Avanzadilla X". Antes de la batalla, si toda la unidad la tiene, puede desplegar desde reservas en tu zona o hacer un movimiento de hasta X" (acabando a más de 8" de enemigos). Un TRANSPORTE DEDICADO también puede hacerlo si todos sus pasajeros la tienen.', '24.31'),
  stealth: E('Sigilo', 'ability', 'Si todas las miniaturas la tienen, la unidad tiene cobertura contra ataques a distancia.', '24.33'),
  'super-heavy walker': E('Bípode superpesado', 'ability', 'Al mover (normal, avanzar o retroceder) puede atravesar miniaturas (también MONSTRUO/VEHÍCULO, pero no TITÁNICA) y terreno de 4" o menos. Además puede ganar la clave MÓVIL para ese movimiento; si lo hace, con un 1 en 1D6 al terminar queda acobardada.', '24.35'),

  // ---------- Claves de unidad ----------
  character: E('PERSONAJE', 'keyword', 'Al repartir ataques, cada miniatura PERSONAJE forma su propio grupo y va siempre al final del orden de asignación: no recibe ataques mientras queden otras miniaturas, salvo armas [PRECISIÓN] (05.03, 24.28).\nPuede usar la estratagema Desafío épico (15.03). Un VEHÍCULO PERSONAJE puede hacer Intervención heroica (15.11).\nAl crear el ejército, las mejoras van en PERSONAJES que no sean HÉROE ÉPICO.', '05.03'),
  'epic hero': E('HÉROE ÉPICO', 'keyword', 'Personaje único con nombre propio: solo puedes llevar 1 en el ejército y no puede llevar mejoras.'),
  monster: E('MONSTRUO', 'keyword', 'Comparte reglas con VEHÍCULO (17):\n• Al mover normal o avanzar atraviesa miniaturas, salvo otros MONSTRUO/VEHÍCULO (17.01).\n• Aunque esté trabado se le puede disparar, con −1 a impactar (17.03).\n• Puede disparar estando trabado (a quemarropa) con todas sus armas, con −1 a impactar salvo armas [A QUEMARROPA] (10.06).\n• Las tiradas de riesgo fallidas le hacen 3 heridas mortales si toda la unidad lo es (06.03).\n• Puede usar Impacto aplastante (15.06).\n• Puede subir a pisos altos de las ruinas (13.06).', '17'),
  vehicle: E('VEHÍCULO', 'keyword', 'Comparte reglas con MONSTRUO (17):\n• Al mover normal o avanzar atraviesa miniaturas, salvo otros MONSTRUO/VEHÍCULO (17.01).\n• Aunque esté trabado se le puede disparar, con −1 a impactar (17.03).\n• Puede disparar estando trabado (a quemarropa) con todas sus armas, con −1 a impactar salvo armas [A QUEMARROPA] (10.06).\n• Las tiradas de riesgo fallidas le hacen 3 heridas mortales si toda la unidad lo es (06.03).\n• Puede usar Impacto aplastante (15.06).\n• Solo puede hacer Intervención heroica si además es PERSONAJE o BÍPODE (15.11).', '17'),
  infantry: E('INFANTERÍA', 'keyword', '• Atraviesa terreno denso en horizontal y vertical, y puede terminar en pisos altos (13.06).\n• Tiene cobertura si está en un área de terreno (13.08).\n• Puede quedar oculta en terreno denso si no disparó este turno ni el anterior: solo la ven enemigos a 15" o menos (13.09).', '13'),
  beast: E('BESTIAS', 'keyword', 'Mismas ventajas de terreno que INFANTERÍA: atraviesa terreno denso, tiene cobertura en áreas de terreno y puede quedar oculta (13.06–13.09).', '13'),
  swarm: E('ENJAMBRE', 'keyword', 'Mismas ventajas de terreno que INFANTERÍA: atraviesa terreno denso, tiene cobertura en áreas de terreno y puede quedar oculta (13.06–13.09).', '13'),
  mobile: E('MÓVIL', 'keyword', 'Puede atravesar en horizontal el terreno denso (13.06).', '13.06'),
  mounted: E('MONTADO', 'keyword', 'Unidades a caballo, motos o monturas. El reglamento básico no le da reglas propias: la usan habilidades de armas como [ANTI-MONTADO] y reglas de facción.'),
  fly: E('VOLAR', 'keyword', 'Al mover normal, avanzar, retroceder o cargar puede alzar el vuelo: −2" de movimiento, pero ignora la distancia vertical y atraviesa miniaturas (también MONSTRUO/VEHÍCULO) y terreno (21.03). También puede terminar en pisos altos y es la única que puede cargar y atacar a AERONAVES.', '21.03'),
  aircraft: E('AERONAVE', 'keyword', '• Empieza siempre en reservas estratégicas y solo entra con movimientos de inserción.\n• Al final del turno rival vuelve a reservas.\n• Las demás miniaturas pueden atravesarla.\n• Solo la pueden cargar y atacar en combate unidades que puedan VOLAR, y ella solo ataca en combate a unidades VOLADORAS.\n• Lluvia de fuego no le afecta. No puede hacer acciones.', '23'),
  transport: E('TRANSPORTE', 'keyword', 'Lleva unidades embarcadas hasta su capacidad (18.01). Una unidad puede embarcar si termina a 3" o menos; para desembarcar debe colocarse a 3" o menos del transporte. Si el transporte muere, los pasajeros hacen un desembarco de emergencia.', '18'),
  'dedicated transport': E('TRANSPORTE DEDICADO', 'keyword', 'Transporte que acompaña a tus tropas. Al crear el ejército puedes llevar el doble de copias que de otras fichas. Si todos sus pasajeros tienen Avanzadilla, puede hacer un movimiento de avanzadilla (24.31).'),
  titanic: E('TITÁNICA', 'keyword', 'Máquinas o bestias colosales:\n• Puede iniciar acciones aunque esté trabada, y disparar después de iniciarlas (16).\n• No se le puede elegir para Disparos preventivos (15.08).\n• El Bípode superpesado no puede atravesarla (24.35).'),
  towering: E('GIGANTESCA', 'keyword', 'Lluvia de fuego (22.05): sus ataques a distancia ganan +1 FP contra unidades con miniaturas a nivel del suelo a 12" o menos, aunque ella esté en el suelo.', '22.05'),
  frame: E('FIGURA', 'keyword', 'Miniaturas grandes, muchas sin peana. Las distancias se miden desde el punto más cercano de la propia miniatura, no desde su peana (17.02).', '17.02'),
  walker: E('BÍPODE', 'keyword', 'Un VEHÍCULO BÍPODE puede usar la estratagema Intervención heroica (15.11).'),
  psyker: E('PSÍQUICO', 'keyword', 'Unidad con poderes psíquicos. Es objetivo de armas [ANTI-PSÍQUICO]. Si un líder PSÍQUICO se une a una unidad, toda la unidad adjunta tiene la clave (19.03).', '22.03'),
  smoke: E('HUMO', 'keyword', 'Puede usar la estratagema Pantalla de humo (15.10): ella y las unidades que tape tienen cobertura durante la fase de disparo rival.', '15.10'),
  grenades: E('GRANADAS', 'keyword', 'Puede usar la estratagema Explosivos (15.05): una miniatura lanza contra un enemigo a 8" o menos y tiras 6D6, cada 4+ es una herida mortal.', '15.05'),
  explosives: E('EXPLOSIVOS', 'keyword', 'Puede usar la estratagema Explosivos (15.05): una miniatura lanza contra un enemigo a 8" o menos y tiras 6D6, cada 4+ es una herida mortal.', '15.05'),
  fortification: E('FORTIFICACIÓN', 'keyword', 'Estructura fija. No puede ir en reservas estratégicas (20.01) ni iniciar acciones (16).'),
  battleline: E('LÍNEA DE BATALLA', 'keyword', 'Tropas de línea. Al crear el ejército puedes llevar el doble de copias que de otras fichas.'),
  warlord: E('SEÑOR DE LA GUERRA', 'keyword', 'El comandante de tu ejército. Debes elegir exactamente uno, normalmente un PERSONAJE.'),
  imperium: E('IMPERIUM', 'keyword', 'Clave de alianza. La usan reglas que afectan a todas las fuerzas del Imperio.'),
  chaos: E('CHAOS', 'keyword', 'Clave de alianza. La usan reglas que afectan a todas las fuerzas del Caos.'),
}

/** Normaliza un término de BSData o de un arma ("Anti-Infantry 4+", "Sustained Hits 1", "Faction: Necrons") */
export function esKey(term: string): string {
  let t = term
    .toLowerCase()
    .replace(/[[\]*^]/g, '')
    .trim()
  if (t.startsWith('anti-') || t.startsWith('anti ')) return 'anti'
  t = t.replace(/\s+(d?\d+[+"]?|\d*d\d+(\+\d+)?)\+?"?$/i, '').trim()
  if (t.endsWith('s') && !ES_GLOSSARY[t] && ES_GLOSSARY[t.slice(0, -1)]) t = t.slice(0, -1)
  return t
}

export function lookupEs(term: string): EsEntry | undefined {
  const k = esKey(term)
  return ES_GLOSSARY[k] ?? ES_GLOSSARY[k.split(':')[0]]
}
