# War Army

App personal para crear listas de ejército de Warhammer 40.000 (11ª edición), llevar la colección con fotos y preparar partidas. Es una web app instalable (PWA) para iPhone, iPad, Mac y Windows.

## Estado

**Paso 1 (hecho): motor de datos conectado a BSData**

- `src/engine/sync.ts`: comprueba el último commit de [BSData/wh40k-11e](https://github.com/BSData/wh40k-11e), descarga solo los archivos que han cambiado y los guarda en el dispositivo (`idbStore.ts`, IndexedDB), así que funciona sin conexión.
- `src/engine/catalog.ts`: índice de catálogos y resolución de enlaces.
- `src/engine/evaluate.ts`: motor de reglas. Aplica modificadores y condiciones de BSData, calcula puntos y valida límites (mínimos, máximos, límite de puntos, destacamentos, mejoras y coste extra de unidades repetidas).
- `src/engine/ops.ts`: crear listas y añadir, quitar o duplicar unidades rellenando las opciones obligatorias.

Pendiente en el motor: líderes adjuntos (associations), y los modificadores que solo cambian perfiles de armas (se mostrarán en el paso 2).

## Pruebas

```bash
git clone --depth 1 https://github.com/BSData/wh40k-11e.git /tmp/wh40k-11e
BSDATA_DIR=/tmp/wh40k-11e npm test
```
