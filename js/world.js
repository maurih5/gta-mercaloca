/* =========================================================================
   GTA MERCALOCA - Generación de Mundo, Semáforos, Rutas y Ciclo Día/Noche
   ========================================================================= */

// Colecciones del mundo
const buildings = [];
const props = [];
const lamps = [];
const lights = [];
const hospitals = [];
const water = [];
const carBlock = []; // zonas que frenan autos pero se caminan a pie (explanada de la plaza)
const casaRosada = [];
const cabildo = [];
let obelisco = null;
const PLAZA_CX = GRID >> 1, PLAZA_CY = GRID >> 1;
// Plaza de Mayo / Casa Rosada: celda fija al sudeste del obelisco, lindante al rio real (distToRiver~570)
const ROSADA_CX = PLAZA_CX + 3, ROSADA_CY = PLAZA_CY + 3;
const PLAZA_PX = PLAZA_CX * CELL + CELL / 2, PLAZA_PY = PLAZA_CY * CELL + CELL / 2;
const ROSADA_PX = ROSADA_CX * CELL + CELL / 2, ROSADA_PY = ROSADA_CY * CELL + CELL / 2;
const DIAG_WIDTH = ROAD * 1.7;
// La diagonal apunta a la Casa Rosada pero muere en la esquina noroeste de la
// explanada (como la Diagonal Norte real, que desemboca en Plaza de Mayo y no la cruza)
const DIAG_FULL = Math.hypot(ROSADA_PX - PLAZA_PX, ROSADA_PY - PLAZA_PY);
const DIAG_UX = (ROSADA_PX - PLAZA_PX) / DIAG_FULL, DIAG_UY = (ROSADA_PY - PLAZA_PY) / DIAG_FULL;
const DIAG_LEN = Math.min(
  DIAG_FULL,
  (ROSADA_CX * CELL + ROAD - PLAZA_PX) / DIAG_UX,
  (ROSADA_CY * CELL + ROAD - PLAZA_PY) / DIAG_UY,
);
const DIAG_ANG = Math.atan2(DIAG_UY, DIAG_UX);
function inDiagonalBand(x, y) {
  const px2 = x - PLAZA_PX, py2 = y - PLAZA_PY;
  const u = px2 * DIAG_UX + py2 * DIAG_UY, v = -px2 * DIAG_UY + py2 * DIAG_UX;
  return u > 0 && u < DIAG_LEN && Math.abs(v) < DIAG_WIDTH / 2;
}
// Plaza de Mayo: explanada maciza de PLAZA_MAYO_CELLS x PLAZA_MAYO_CELLS celdas.
// El borde exterior sigue siendo calle normal, pero adentro no hay ninguna.
const PM_X0 = ROSADA_CX * CELL, PM_Y0 = ROSADA_CY * CELL;
const PM_X1 = PM_X0 + CELL * PLAZA_MAYO_CELLS, PM_Y1 = PM_Y0 + CELL * PLAZA_MAYO_CELLS;
function inPlazaMayo(x, y) {
  return x > PM_X0 + ROAD && x < PM_X1 && y > PM_Y0 + ROAD && y < PM_Y1;
}
// Lote reservado del Cabildo: enfrentado a la Casa Rosada, con la plaza y la
// calle de por medio (CABILDO | calle | PLAZA DE MAYO | CASA ROSADA)
const CAB_W = 96, CAB_H = (PM_Y1 - PM_Y0 - ROAD) * 0.46;
const CAB_X = PM_X0 - CAB_W - 12;
const CAB_Y = PM_Y0 + ROAD + ((PM_Y1 - PM_Y0 - ROAD) - CAB_H) / 2;
function inCabildoLote(x, y, w, h) {
  return x < CAB_X + CAB_W + 10 && x + w > CAB_X - 10
    && y < CAB_Y + CAB_H + 10 && y + h > CAB_Y - 10;
}

// Celda que cae dentro del bloque de la plaza (para saltearla en la generacion)
function isPlazaMayoCell(cx, cy) {
  return cx >= ROSADA_CX && cx < ROSADA_CX + PLAZA_MAYO_CELLS
    && cy >= ROSADA_CY && cy < ROSADA_CY + PLAZA_MAYO_CELLS;
}

// Ademas del centro de la celda, ningun edificio puede meter una esquina en la diagonal
// (evita el efecto "edificio clavado en la vereda" cuando el lote linda con la banda)
function rectHitsDiagonalBand(x, y, w, h) {
  return inDiagonalBand(x, y) || inDiagonalBand(x + w, y) || inDiagonalBand(x, y + h) || inDiagonalBand(x + w, y + h)
    || inDiagonalBand(x + w / 2, y + h / 2);
}

// Curva del riachuelo: entra por el borde norte, serpentea por el centro (sin tocar
// el obelisco, la Plaza de Mayo ni las villas) y desemboca ancho por el borde este.
// Los puntos de control van en celdas de grilla; la curva es un Catmull-Rom que pasa
// por todos, asi los meandros quedan redondos y no en zigzag.
const riverCurve = [
  [7.3, 0], [6.6, 2.4], [7.6, 4.6], [10.0, 6.3], [12.8, 7.4],
  [14.6, 9.0], [15.0, 11.2], [16.4, 13.0], [18.9, 13.7], [21.0, 15.4], [24, 16.6],
].map(([cx, cy]) => ({ x: cx * CELL, y: cy * CELL }));
// Muestreo denso de la curva. Cada punto lleva t (fraccion del largo recorrido, no del
// parametro de la spline: asi el ancho cambia parejo) y la tangente del cauce, que es
// hacia donde corre el agua.
const riverPts = (() => {
  const P = riverCurve, raw = [];
  const at = (i) => P[Math.max(0, Math.min(P.length - 1, i))];
  for (let s = 0; s < P.length - 1; s++) {
    const p0 = at(s - 1), p1 = at(s), p2 = at(s + 1), p3 = at(s + 2);
    const N = 26;
    for (let k = 0; k < N || (s === P.length - 2 && k === N); k++) {
      const u = k / N, u2 = u * u, u3 = u2 * u;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      raw.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  let L = 0;
  raw[0].s = 0;
  for (let i = 1; i < raw.length; i++) { L += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y); raw[i].s = L; }
  return raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)], b = raw[Math.min(raw.length - 1, i + 1)];
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x, y: p.y, t: p.s / L, tx: (b.x - a.x) / dl, ty: (b.y - a.y) / dl };
  });
})();
const RIVER_LEN = (() => {
  let L = 0;
  for (let i = 1; i < riverPts.length; i++) L += Math.hypot(riverPts[i].x - riverPts[i - 1].x, riverPts[i].y - riverPts[i - 1].y);
  return L;
})();
const smoothstep = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
// Ancho del cauce segun t: dos senos desfasados dan tramos anchos y angostos sin que
// se note el patron (pero sin estrangularse), y al final se abre en la desembocadura.
function riverWidthAt(t) {
  return RIVER_HALF * (1 + RIVER_WOBBLE * Math.sin(t * 7.3 + 0.4) + 0.12 * Math.sin(t * 17.1 + 1.7)
    + 0.75 * smoothstep(0.86, 1, t));
}
// Ancho de la playa segun t: angosta en algunos tramos, ancha en otros, y un playon
// grande en la desembocadura.
function beachBandAt(t) {
  return BEACH_BAND * (0.75 + 0.6 * (0.5 + 0.5 * Math.sin(t * 9.1 + 0.8)) + 3.2 * smoothstep(0.8, 1, t));
}
// Punto mas cercano de la curva junto con su t, para saber que ancho toca ahi
function riverNearest(x, y) {
  let best = Infinity, bi = 0;
  for (let i = 0; i < riverPts.length; i++) {
    const p = riverPts[i], d = (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y);
    if (d < best) { best = d; bi = i; }
  }
  const p = riverPts[bi];
  return { d: Math.sqrt(best), t: p.t, i: bi, tx: p.tx, ty: p.ty };
}
function distToRiver(x, y) {
  return riverNearest(x, y).d;
}

// Puentes: cada uno es un tramo de calle (o de avenida) que cruza el cauce de costa a
// costa. Adentro de su corredor el agua y la arena no existen, asi la calle sigue viva
// y los autos, los peatones y la yuta lo cruzan como cualquier otra cuadra.
// { horiz, line: borde izq/sup de la franja de calle, w: ancho de la franja,
//   half: medio ancho del corredor, a..b: extension a lo largo de la calle, avenue }
const bridges = [];
function inBridgeCorridor(x, y) {
  for (const b of bridges) {
    const u = b.horiz ? x : y, v = b.horiz ? y : x;
    if (u > b.a && u < b.b && Math.abs(v - (b.line + b.w / 2)) < b.half) return true;
  }
  return false;
}
function bridgeAt(x, y) {
  for (const b of bridges) {
    const u = b.horiz ? x : y, v = b.horiz ? y : x;
    if (u > b.a && u < b.b && Math.abs(v - (b.line + b.w / 2)) < b.half) return b;
  }
  return null;
}
// Donde una calle cruzaria el cauce (agua + playa), sin contar los puentes: tramos [a, b].
// Se mira todo el ancho del corredor, no solo el eje: el rio cruza en diagonal, asi
// que de un costado de la calle la costa llega mas lejos que del otro.
function wetSpans(horiz, line, w) {
  const out = [];
  const wet = (u) => {
    for (const v of [line - 6, line + w / 2, line + w + 6]) {
      const n = riverNearest(horiz ? u : v, horiz ? v : u);
      if (n.d < riverWidthAt(n.t) + beachBandAt(n.t) + 4) return true;
    }
    return false;
  };
  let a = -1;
  for (let u = 0; u <= WORLD; u += 4) {
    const w2 = wet(u);
    if (w2 && a < 0) a = u;
    else if (!w2 && a >= 0) { out.push([Math.max(0, a - 12), u + 12]); a = -1; }
  }
  if (a >= 0) out.push([Math.max(0, a - 12), WORLD]);
  return out;
}
// Las dos avenidas siempre cruzan. Ademas, algunas calles comunes: las que cruzan mas
// derecho (tramo corto), repartidas a lo largo del rio para que no queden dos pegados.
function planBridges(skip) {
  bridges.length = 0;
  const cand = [];
  const add = (horiz, i) => {
    const w = horiz ? roadWidthRow(i) : roadWidthCol(i), line = i * CELL;
    const avenue = horiz ? i === PLAZA_CY : i === PLAZA_CX;
    for (const [a, b] of wetSpans(horiz, line, w)) {
      if (a <= 0 || b >= WORLD) continue; // el rio entra o sale por este borde: no hay costa enfrente
      const mid = (a + b) / 2, n = riverNearest(horiz ? mid : line + w / 2, horiz ? line + w / 2 : mid);
      cand.push({ horiz, line, w, half: w / 2 + 6, a, b, avenue, t: n.t, key: (horiz ? 'h' : 'v') + i });
    }
  };
  for (let i = 1; i < GRID; i++) { add(false, i); add(true, i); }
  const take = (c) => bridges.push(c);
  cand.filter(c => c.avenue).forEach(take);
  const comunes = cand.filter(c => !c.avenue && !skip.has(c.key) && c.b - c.a < CELL * 2.5
    && !villas.some(v => (c.horiz ? c.line >= v.y0 && c.line < v.y1 && c.b > v.x0 && c.a < v.x1
      : c.line >= v.x0 && c.line < v.x1 && c.b > v.y0 && c.a < v.y1)))
    .sort((p, q) => (p.b - p.a) - (q.b - q.a));
  for (const c of comunes) {
    if (bridges.length >= BRIDGE_COUNT) break;
    if (bridges.some(o => Math.abs(o.t - c.t) * RIVER_LEN < CELL * 2.4)) continue;
    take(c);
  }
  // Estilo de cada puente (determinista): las avenidas el suyo, y en las calles el
  // Transbordador va en la horizontal mas cercana a la desembocadura (de costado su
  // estructura alta se lee; en una vertical quedaria de canto) y el resto rota a lo
  // largo del rio.
  const calles = bridges.filter(b => !b.avenue).sort((p, q) => p.t - q.t);
  for (const b of bridges) if (b.avenue) b.style = b.horiz ? 'pueyrredon' : 'mujer';
  const trans = calles.filter(b => b.horiz).pop() || calles[calles.length - 1];
  let i = 0;
  for (const b of calles) b.style = b === trans ? 'transbordador' : BRIDGE_STREET_STYLES[i++ % BRIDGE_STREET_STYLES.length];
}
// Disposicion de un puente, una vez horneado el cauce: donde empieza y termina el
// tablero (la parte sobre agua o arena; antes y despues van los estribos en tierra),
// donde van las pilas (y cuales pisan agua, para la espuma) y hacia donde corre el rio.
function layoutBridge(br, w) {
  const at = (u, v) => br.horiz ? [u, v] : [v, u];
  const vs = [br.line, br.line + br.w / 2, br.line + br.w];
  let da = -1, db = -1;
  for (let u = br.a; u <= br.b; u += 2) {
    if (vs.some(v => overBridge(...at(u, v)))) { if (da < 0) da = u; db = u; }
  }
  if (da < 0 || db - da < 20) { da = br.a + 12; db = br.b - 12; }
  // Bocacalles: si una calle viva cruza adentro del tramo (pasa cuando la arena llega
  // hasta la esquina), ahi no van veredas ni barandas: se cruza como cualquier esquina,
  // y el tablero con su estructura termina antes.
  br.cross = [];
  for (let k = Math.max(0, Math.floor(br.a / CELL)); k * CELL < br.b; k++) {
    const c0 = k * CELL, c1 = c0 + (br.horiz ? roadWidthCol(k) : roadWidthRow(k)), cm = (c0 + c1) / 2;
    if (c1 <= br.a || c0 >= br.b) continue;
    if (!w.onRoadCardinal(...at(cm, br.line - 14)) && !w.onRoadCardinal(...at(cm, br.line + br.w + 14))) continue;
    br.cross.push([c0, c1]);
    if (c1 > da && c0 < db) {
      if (cm < (da + db) / 2) da = Math.max(da, c1 + 4); else db = Math.min(db, c0 - 4);
    }
  }
  br.da = da; br.db = db;
  const len = db - da, n = Math.max(2, Math.round(len / BRIDGE_PIER_GAP));
  br.piers = [];
  for (let i = 1; i < n; i++) {
    const u = da + len * i / n;
    const wet = shoreDist(...at(u, br.line - 12)) < 0 || shoreDist(...at(u, br.line + br.w + 12)) < 0;
    br.piers.push({ u, wet });
  }
  const nr = riverNearest(...at((da + db) / 2, br.line + br.w / 2));
  br.flow = (br.horiz ? nr.ty : nr.tx) >= 0 ? 1 : -1; // +1: el agua corre hacia +v
  // Atirantado: el mastil se para sobre la pila mas cercana al primer tercio del tramo
  // (se inclina hacia da y los tirantes bajan hacia db)
  const target = da + len * 0.32;
  br.mast = br.piers.reduce((m, p) => Math.abs(p.u - target) < Math.abs(m - target) ? p.u : m, target);
}

// Mascara de agua: hitBuilding() se llama muchisimo por frame y no puede recorrer
// los puntos de la curva, asi que el cauce se rasteriza una sola vez a una grilla
// gruesa y las consultas quedan O(1). De paso se hornea la distancia a la orilla
// (negativa adentro del agua) y el t de la curva mas cercana: con eso la playa, el
// renderer y lo que haga falta preguntan por la costa sin volver a recorrer la curva.
const WATER_CELL = 12;
const WMW = Math.ceil(WORLD / WATER_CELL) + 1;
let WATER_MASK = null, SHORE_D = null, SHORE_T = null;
function bakeWaterMask() {
  WATER_MASK = new Uint8Array(WMW * WMW);
  SHORE_D = new Float32Array(WMW * WMW);
  SHORE_T = new Float32Array(WMW * WMW);
  for (let j = 0; j < WMW; j++) {
    for (let i = 0; i < WMW; i++) {
      const x = i * WATER_CELL + WATER_CELL / 2, y = j * WATER_CELL + WATER_CELL / 2;
      const n = riverNearest(x, y), k = j * WMW + i;
      SHORE_D[k] = n.d - riverWidthAt(n.t);
      SHORE_T[k] = n.t;
      if (SHORE_D[k] < 0 && !inBridgeCorridor(x, y)) WATER_MASK[k] = 1;
    }
  }
}
function inWater(x, y) {
  if (!WATER_MASK) return false;
  const i = (x / WATER_CELL) | 0, j = (y / WATER_CELL) | 0;
  if (i < 0 || j < 0 || i >= WMW || j >= WMW) return false;
  return WATER_MASK[j * WMW + i] === 1;
}
// Distancia a la orilla (interpolada): < 0 es agua (sin contar puentes), 0 la linea
// de costa, y crece tierra adentro. Lejos del rio da un numero grande.
function shoreDist(x, y) {
  if (!SHORE_D) { const n = riverNearest(x, y); return n.d - riverWidthAt(n.t); }
  const fx = x / WATER_CELL - 0.5, fy = y / WATER_CELL - 0.5;
  const i = Math.max(0, Math.min(WMW - 2, Math.floor(fx))), j = Math.max(0, Math.min(WMW - 2, Math.floor(fy)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j)), k = j * WMW + i;
  const top = SHORE_D[k] * (1 - u) + SHORE_D[k + 1] * u;
  const bot = SHORE_D[k + WMW] * (1 - u) + SHORE_D[k + WMW + 1] * u;
  return top * (1 - v) + bot * v;
}
// t de la curva mas cercana (para el ancho de playa y el sentido de la corriente),
// interpolado como shoreDist: con la celda mas cercana el ancho de la playa saltaba
// de a 12px y el borde de la arena quedaba escalonado.
function shoreT(x, y) {
  if (!SHORE_T) return riverNearest(x, y).t;
  const fx = x / WATER_CELL - 0.5, fy = y / WATER_CELL - 0.5;
  const i = Math.max(0, Math.min(WMW - 2, Math.floor(fx))), j = Math.max(0, Math.min(WMW - 2, Math.floor(fy)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j)), k = j * WMW + i;
  const top = SHORE_T[k] * (1 - u) + SHORE_T[k + 1] * u;
  const bot = SHORE_T[k + WMW] * (1 - u) + SHORE_T[k + WMW + 1] * u;
  return top * (1 - v) + bot * v;
}
// Arena: la franja que rodea el cauce. Es transitable (no bloquea), pero ahi no
// se plantan edificios ni se pintan calles.
function onBeach(x, y) {
  if (inWater(x, y) || inBridgeCorridor(x, y)) return false;
  const d = shoreDist(x, y);
  return d >= 0 && d < beachBandAt(shoreT(x, y));
}
// Un puente sirve si toda su calzada quedo como calle viva: si la poda de callejones
// se comio una punta, el puente quedaria colgado sobre el agua.
function bridgeConnected(b, w) {
  const mid = b.line + b.w / 2;
  for (let u = b.a; u <= b.b; u += 6) {
    if (!w.onRoadCardinal(b.horiz ? u : mid, b.horiz ? mid : u)) return false;
  }
  return true;
}
// Tramos de calle: un tramo es el pedazo de calle entre dos bocacalles. Si el agua
// o la playa lo cortan, el tramo ENTERO deja de existir, asi la calle termina en la
// esquina anterior en vez de meterse en el rio y dejar un callejon sin salida.
// SEG_V[cx][cy] = tramo vertical de la columna cx que baja por la fila cy.
const SEG_N = GRID + 1;
let SEG_V = null, SEG_H = null;
function segIdx(cx, cy) { return cy * SEG_N + cx; }
function roadWidthCol(cx) { return cx === PLAZA_CX ? AVENUE_ROAD : ROAD; }
function roadWidthRow(cy) { return cy === PLAZA_CY ? AVENUE_ROAD : ROAD; }
function bakeRoadSegments() {
  SEG_V = new Uint8Array(SEG_N * SEG_N);
  SEG_H = new Uint8Array(SEG_N * SEG_N);
  const cut = (x, y) => inWater(x, y) || onBeach(x, y);
  // Se muestrea todo el ancho de la calzada, no solo el eje: si la arena le come
  // un borde, el tramo igual se va (y ese asfalto pasa a ser playa).
  for (let cy = 0; cy < GRID; cy++) {
    for (let cx = 0; cx <= GRID; cx++) {
      const w2 = roadWidthCol(cx);
      let ok = true;
      for (let y = cy * CELL; y <= (cy + 1) * CELL && ok; y += 3) {
        for (const f of [0.005, 0.25, 0.5, 0.75, 0.995]) if (cut(cx * CELL + w2 * f, y)) { ok = false; break; }
      }
      if (ok) SEG_V[segIdx(cx, cy)] = 1;
    }
  }
  for (let cx = 0; cx < GRID; cx++) {
    for (let cy = 0; cy <= GRID; cy++) {
      const h2 = roadWidthRow(cy);
      let ok = true;
      for (let x = cx * CELL; x <= (cx + 1) * CELL && ok; x += 3) {
        for (const f of [0.005, 0.25, 0.5, 0.75, 0.995]) if (cut(x, cy * CELL + h2 * f)) { ok = false; break; }
      }
      if (ok) SEG_H[segIdx(cx, cy)] = 1;
    }
  }
}
// Poda de callejones: un tramo que sobrevive pero cuya punta no conecta con ningun
// otro tramo deja una calle colgada contra el rio. Se borra y se repite, porque al
// borrarlo puede quedar colgado el de atras.
function pruneDeadEnds() {
  const conn = (nx, ny) =>
    (segAliveV(nx, ny) ? 1 : 0) + (segAliveV(nx, ny - 1) ? 1 : 0)
    + (segAliveH(nx, ny) ? 1 : 0) + (segAliveH(nx - 1, ny) ? 1 : 0);
  const borde = (nx, ny) => nx <= 0 || ny <= 0 || nx >= GRID || ny >= GRID;
  for (let pass = 0; pass < 24; pass++) {
    let cambio = false;
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx <= GRID; cx++) {
        if (!SEG_V[segIdx(cx, cy)]) continue;
        for (const [nx, ny] of [[cx, cy], [cx, cy + 1]]) {
          if (borde(nx, ny) || conn(nx, ny) >= 2) continue;
          SEG_V[segIdx(cx, cy)] = 0; cambio = true; break;
        }
      }
    }
    for (let cx = 0; cx < GRID; cx++) {
      for (let cy = 0; cy <= GRID; cy++) {
        if (!SEG_H[segIdx(cx, cy)]) continue;
        for (const [nx, ny] of [[cx, cy], [cx + 1, cy]]) {
          if (borde(nx, ny) || conn(nx, ny) >= 2) continue;
          SEG_H[segIdx(cx, cy)] = 0; cambio = true; break;
        }
      }
    }
    if (!cambio) break;
  }
}
function segAliveV(cx, cy) {
  if (!SEG_V || cx < 0 || cy < 0 || cx > GRID || cy >= GRID) return false;
  return SEG_V[segIdx(cx, cy)] === 1;
}
function segAliveH(cx, cy) {
  if (!SEG_H || cx < 0 || cy < 0 || cx >= GRID || cy > GRID) return false;
  return SEG_H[segIdx(cx, cy)] === 1;
}
// Punto que cae sobre un tramo muerto: ese asfalto ya no es calle, pasa a ser arena.
// Solo cuenta la franja de calzada; el interior de la manzana es vereda/pasto y se
// hornea despues, asi que ahi la arena no se ve.
function onDeadRoad(x, y) {
  if (!SEG_V) return false;
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const onV = (x % CELL) < roadWidthCol(cx), onH = (y % CELL) < roadWidthRow(cy);
  if (!onV && !onH) return false;
  const liveV = onV && segAliveV(cx, cy), liveH = onH && segAliveH(cx, cy);
  return !liveV && !liveH;
}
// Zona de arena: la orilla mas el asfalto liberado por los tramos que se borraron
function sandZone(x, y) {
  return !inWater(x, y) && !inBridgeCorridor(x, y) && (onBeach(x, y) || onDeadRoad(x, y));
}

// Tablero del puente: la parte del corredor que pasa por arriba del agua o la arena
// (las cabeceras en tierra firme son calle comun).
function overBridge(x, y) {
  return !!bridgeAt(x, y) && shoreDist(x, y) < beachBandAt(shoreT(x, y)) + 4;
}

// Donde no se pinta nada de calle: la calle muere en la costa, asi que ni lineas
// ni cebras siguen sobre el agua ni sobre la arena. Sobre el puente tampoco: el
// tablero trae su propia pintura y ahi no hay esquina, ni farol, ni semaforo.
function noRoadPaint(x, y) {
  return inWater(x, y) || onBeach(x, y) || onDeadRoad(x, y) || overBridge(x, y);
}
function rectHitsBeach(x, y, w, h) {
  return onBeach(x, y) || onBeach(x + w, y) || onBeach(x, y + h) || onBeach(x + w, y + h)
    || onBeach(x + w / 2, y + h / 2);
}

// Igual que rectHitsDiagonalBand: si el lote toca el agua por cualquier lado, no va edificio
function rectHitsWater(x, y, w, h) {
  return inWater(x, y) || inWater(x + w, y) || inWater(x, y + h) || inWater(x + w, y + h)
    || inWater(x + w / 2, y + h / 2);
}
const shops = [];

// Villas con su rectángulo en coordenadas del mundo (incluye las calles que las cruzan)
const villas = VILLAS.map(v => ({
  ...v,
  x0: v.cx0 * CELL,
  y0: v.cy0 * CELL,
  x1: (v.cx1 + 1) * CELL + ROAD,
  y1: (v.cy1 + 1) * CELL + ROAD,
  spots: [],
  angry: 0,
}));
const pick = arr => arr[(Math.random() * arr.length) | 0];

// Buffers gráficos pre-renderizados del mundo e iluminación
let GROUND = null, GCTX = null, MINI = null;
let LIGHT = null, LCTX = null, VIG = null;
let EMIT = null, ECTX = null;

class World {
  constructor() {
    this.buildings = buildings;
    this.props = props;
    this.lamps = lamps;
    this.lights = lights;
    this.hospitals = hospitals;
    this.water = water;
    this.river = [];
    this.bridges = bridges;
    this.carBlock = carBlock;
    this.casaRosada = casaRosada;
    this.cabildo = cabildo;
    this.shops = shops;
    this.bgrid = null;
  }

  villaCell(cx, cy) {
    return villas.find(v => cx >= v.cx0 && cx <= v.cx1 && cy >= v.cy0 && cy <= v.cy1) || null;
  }

  villaAt(x, y) {
    for (const v of villas) {
      if (x >= v.x0 && x < v.x1 && y >= v.y0 && y < v.y1) return v;
    }
    return null;
  }

  /**
   * Llena una manzana de la villa con casillas pegadas, de alturas dispares,
   * separadas por pasillos angostos. Devuelve el próximo id libre.
   */
  buildShacks(bx, by, inner, id) {
    let y = by + 2;
    while (y < by + inner - 12) {
      const rh = Math.min(rnd(16, 28), by + inner - 2 - y);
      let x = bx + 2;
      while (x < bx + inner - 8) {
        const w = Math.min(rnd(12, 24), bx + inner - 2 - x);
        const hh = rh - rnd(0, 4);
        if (w >= 6 && Math.random() < 0.9 && !rectHitsWater(x, y, w, hh) && !rectHitsBeach(x, y, w, hh)
          && !rectHitsDiagonalBand(x, y, w, hh)) {
          const two = Math.random() < 0.22;
          this.buildings.push({
            id: id++,
            x,
            y,
            w,
            h: hh,
            H: two ? rnd(18, 26) : rnd(8, 15),
            villa: true,
            ty: { k: 'casilla', detail: 'chapa' },
            col: pick(SHACK_WALLS),
            roofCol: two ? '#9a958a' : pick(SHACK_ROOFS),
            tire: Math.random() < 0.3,
            tank: two && Math.random() < 0.6,
            // Puerta al pasillo de abajo: los vecinos entran y salen de su casilla
            door: { x: x + w / 2, y: y + hh, ox: 0, oy: 7, s: 's' },
          });
        }
        x += w + (Math.random() < 0.35 ? rnd(4, 7) : 0);
      }
      const gap = rnd(5, 8);
      // Ropa colgada y algún tacho prendido en los pasillos
      if (Math.random() < 0.5 && y + rh + gap < by + inner) {
        const cols = [];
        for (let i = 0; i < 5; i++) cols.push(pick(['#e8e8e0', '#c8302a', '#2a5ab0', '#e8b52a', '#3f9a4a', '#c87a8a']));
        this.props.push({ t: 'ropa', x: bx + rnd(4, inner - 44), y: y + rh + gap / 2, w: rnd(22, 38), cols });
      }
      if (Math.random() < 0.18 && y + rh + gap < by + inner) {
        this.props.push({ t: 'barril', x: bx + rnd(6, inner - 6), y: y + rh + gap / 2 });
      }
      y += rh + gap;
    }
    return id;
  }

  /**
   * Genera proceduralmente la cuadrícula de la ciudad, edificios con alturas,
   * parques, palmeras, faroles y semáforos en cada bocacalle.
   */
  // La ciudad sale de una semilla: la misma semilla arma la misma ciudad en todas las
  // pantallas (el host le pasa la suya a los que se suman a la sala)
  buildCity(seed = (Math.random() * 2 ** 31) | 0) {
    this.seed = seed;
    withSeed(seed, () => this.generate());
  }

  generate() {
    this.buildings.length = 0;
    this.props.length = 0;
    this.lamps.length = 0;
    this.lights.length = 0;
    this.hospitals.length = 0;
    this.water.length = 0;
    this.carBlock.length = 0;
    this.casaRosada.length = 0;
    this.cabildo.length = 0;
    obelisco = null;

    // Primero los puentes, despues el cauce (que los respeta) y despues los tramos de
    // calle, que dependen de donde quedo el agua y la arena. Un puente que no termina
    // conectado a calles vivas en las dos puntas se descarta y se vuelve a hornear.
    const skip = new Set();
    for (let intento = 0; intento < 6; intento++) {
      planBridges(skip);
      bakeWaterMask();
      bakeRoadSegments();
      pruneDeadEnds();
      const malos = bridges.filter(b => !b.avenue && !bridgeConnected(b, this));
      if (!malos.length) break;
      for (const b of malos) skip.add(b.key);
    }
    // Cadena de circulos solapados sobre la curva: es el cauce que se hornea y se
    // muestra en el minimapa (la colision real va por WATER_MASK, no por esta lista).
    // this.river lleva todos los puntos (tambien los de abajo de los puentes) para el
    // renderer; this.water saltea los que quedan bajo un puente.
    this.river = riverPts.map(p => ({ x: p.x, y: p.y, r: riverWidthAt(p.t), band: beachBandAt(p.t), t: p.t, tx: p.tx, ty: p.ty }));
    for (const p of this.river) {
      if (inBridgeCorridor(p.x, p.y)) continue;
      this.water.push(p);
    }
    this.bridges = bridges;
    for (const br of bridges) {
      layoutBridge(br, this);
      this.props.push({ t: 'puente', horiz: br.horiz, a: br.a, b: br.b, base: br.line, w: br.w, avenue: br.avenue,
        style: br.style, br });
      // Faroles sobre las veredas del puente, del lado de afuera. El de hormigon los
      // lleva de a pares en cada pila (en los miradores); el resto, alternados.
      const at = (u, v) => br.horiz ? { x: u, y: v, puente: true } : { x: v, y: u, puente: true };
      const vIn = br.line + 4, vOut = br.line + br.w - 4;
      if (BRIDGE_STYLES[br.style].k === 'hormigon') {
        for (const p of br.piers) { this.lamps.push(at(p.u, vIn)); this.lamps.push(at(p.u, vOut)); }
      } else {
        const len = br.db - br.da, n = Math.max(1, Math.round(len / BRIDGE_LAMP_GAP));
        for (let i = 0; i <= n; i++) {
          const u = br.da + 10 + (len - 20) * i / n;
          this.lamps.push(at(u, i % 2 ? vOut : vIn));
        }
      }
    }
    this.shops.length = 0;

    let id = 0;
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        // Fila/columna de la avenida central: banda de camino mas ancha SOLO en ese eje
        // (el ancho de la calle vertical a la izquierda de la celda y el de la horizontal
        // arriba son independientes, no hay que agrandar el eje que no es avenida)
        const roadX = cx === PLAZA_CX ? AVENUE_ROAD : ROAD;
        const roadY = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
        const bx = cx * CELL + roadX, by = cy * CELL + roadY;
        const innerW = CELL - roadX, innerH = CELL - roadY;
        const inner = Math.min(innerW, innerH); // lotes siguen siendo cuadrados, tamano acotado por el eje mas angosto
        const cxCenter = bx + innerW / 2, cyCenter = by + innerH / 2;
        const isPlaza = cx === PLAZA_CX && cy === PLAZA_CY;
        const isRosada = isPlazaMayoCell(cx, cy);
        // El rio no saltea celdas enteras: la manzana se genera normal y despues
        // cada lote que toca el agua o la arena se descarta, asi la orilla muerde la
        // cuadra en vez de cortarla en un cuadrado de grilla.

        const villa = this.villaCell(cx, cy);
        const park = villa
          ? (villa.potrero[0] === cx && villa.potrero[1] === cy) // en la villa, la plaza es un potrero de tierra
          : !isPlaza && !isRosada && (cx + cy) % 9 === 4;

        if (park) {
          this.props.push({ t: 'park', x: bx, y: by, w: innerW, h: innerH, villa: !!villa });
          continue;
        }

        if (villa) {
          id = this.buildShacks(bx, by, inner, id);
          continue;
        }

        if (isPlaza) {
          // Va en el centro del CRUCE de avenidas, no en el de la manzana: usar
          // cxCenter lo corria 95px y el obelisco quedaba tirado sobre la calle
          // en vez de adentro de su rotonda.
          const rcx = cx * CELL + AVENUE_ROAD / 2, rcy = cy * CELL + AVENUE_ROAD / 2;
          obelisco = { x: rcx - 5, y: rcy - 5, w: 10, h: 10 };
          this.props.push({ t: 'rotonda', x: rcx, y: rcy, rIsland: ROTONDA_ISLAND_R, rRing: ROTONDA_R });
          this.props.push({ t: 'obelisco', x: rcx, y: rcy });
          continue;
        }

        // Las celdas de la Plaza de Mayo no generan nada: la explanada entera se empuja
        // una sola vez mas abajo, despues del loop, como un solo bloque macizo.
        if (isRosada) continue;

        const downtown = Math.abs(cx - GRID / 2) + Math.abs(cy - GRID / 2) < 5;
        const cols = downtown ? (Math.random() < 0.6 ? 1 : 2) : 1 + ((Math.random() * 2) | 0);
        const rows = downtown ? (Math.random() < 0.6 ? 1 : 2) : 1 + ((Math.random() * 2) | 0);
        const gap = 7, w = (inner - gap * (cols - 1)) / cols, h = (inner - gap * (rows - 1)) / rows;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.12) continue;
            const H = downtown ? rnd(52, 104) : rnd(14, 38);
            const pool = downtown
              ? BTYPE.filter(t => t.k === 'torre' || t.k === 'local')
              : BTYPE.filter(t => t.k !== 'torre');
            const ty = pool[(cx * 5 + cy * 3 + r * 2 + c) % pool.length];
            const b = {
              id: id++,
              x: bx + c * (w + gap) + 4,
              y: by + r * (h + gap) + 4,
              w: w - 8,
              h: h - 8,
              H,
              ty,
              col: ty.cols[(cx * 3 + cy * 7 + r + c * 2) % ty.cols.length],
              roofCol: ty.roof,
              ac: Math.random() < 0.6,
              tank: H > 40 && Math.random() < 0.5,
            };

            if (rectHitsDiagonalBand(b.x, b.y, b.w, b.h)) continue; // la diagonal corta el lote, no plantar edificio encima
            if (rectHitsWater(b.x, b.y, b.w, b.h)) continue; // el rio se come el lote
            if (rectHitsBeach(b.x, b.y, b.w, b.h)) continue; // ni encima de la playa
            if (inCabildoLote(b.x, b.y, b.w, b.h)) continue; // el lote del Cabildo es suyo solo

            // Puerta en el lado que da a la calle más cercana con felpudo exterior
            const side = ((cx * 3 + cy * 5 + r + c) % 4);
            if (side === 0)      b.door = { x: b.x + b.w * 0.5, y: b.y,          ox: 0,  oy: -7, s: 'n' };
            else if (side === 1) b.door = { x: b.x + b.w * 0.5, y: b.y + b.h,    ox: 0,  oy: 7,  s: 's' };
            else if (side === 2) b.door = { x: b.x,           y: b.y + b.h * 0.5, ox: -7, oy: 0,  s: 'w' };
            else                b.door = { x: b.x + b.w,     y: b.y + b.h * 0.5, ox: 7,  oy: 0,  s: 'e' };

            this.buildings.push(b);
          }
        }

        // Arbolitos y bancos en la vereda del bloque
        for (let i = 0; i < 2; i++) {
          const tx = bx + rnd(4, inner - 4);
          const ty2 = by + (Math.random() < 0.5 ? -SIDEWALK / 2 : inner + SIDEWALK / 2);
          if (inWater(tx, ty2) || bridgeAt(tx, ty2)) continue; // ni en el rio ni en la vereda de un puente
          this.props.push({
            t: 'palm',
            x: tx,
            y: ty2,
            s: rnd(0.85, 1.25),
          });
        }
      }
    }

    // Plaza de Mayo: explanada maciza de varias cuadras, sin calles adentro, con la
    // Casa Rosada plantada contra el borde este mirando al oeste (como la de verdad).
    {
      const px0 = PM_X0 + ROAD, py0 = PM_Y0 + ROAD;
      const pw = PM_X1 - px0, ph = PM_Y1 - py0;
      this.props.push({ t: 'plazaMayo', x: px0, y: py0, w: pw, h: ph });

      const rw2 = 110, rh2 = ph * 0.62;
      const rx2 = PM_X1 - rw2 - 14, ry2 = py0 + (ph - rh2) / 2;
      const b = {
        id: id++,
        x: rx2, y: ry2, w: rw2, h: rh2, H: 54,
        ty: BTYPE.find(t => t.k === 'local'), col: '#d88fa0', roofCol: '#f5ead6',
        ac: false, tank: false, casaRosada: true,
        door: { x: rx2, y: ry2 + rh2 / 2, ox: -7, oy: 0, s: 'w' },
      };
      this.buildings.push(b);
      this.casaRosada.push(b);

      // Cabildo: enfrentado a la Casa Rosada del otro lado de la plaza, con la
      // calle de por medio. Queda CABILDO | calle | PLAZA DE MAYO | CASA ROSADA,
      // igual que en la vida real.
      const cw = CAB_W, chh = CAB_H, cx2 = CAB_X, cy2 = CAB_Y;
      const cab = {
        id: id++,
        x: cx2, y: cy2, w: cw, h: chh, H: 40,
        ty: BTYPE.find(t => t.k === 'local'), col: '#e8e2d2', roofCol: '#cfc7b2',
        ac: false, tank: false, cabildo: true,
        door: { x: cx2 + cw, y: cy2 + chh / 2, ox: 7, oy: 0, s: 'e' }, // mira a la plaza
      };
      this.buildings.push(cab);
      this.cabildo.push(cab);

      // Piramide de Mayo: monumento al medio de la explanada, del lado libre
      this.props.push({ t: 'piramide', x: px0 + (rx2 - px0) / 2, y: py0 + ph / 2 });

      // Los autos no pueden cruzar la explanada, pero peatones y el jugador a pie si.
      // Por eso va una coleccion aparte en vez de un edificio comun.
      const ix = PM_X0 + CELL, iy = PM_Y0 + CELL; // calle interna que se borro
      this.carBlock.push({ x: px0, y: iy, w: pw, h: ROAD });
      this.carBlock.push({ x: ix, y: py0, w: ROAD, h: ph });
    }

    this.indexBuildings();

    // Puertas de las casillas: del lado que tenga el pasillo libre (si no, el vecino
    // sale y queda encajado en la casilla de enfrente)
    for (const b of this.buildings) {
      if (!b.villa) continue;
      const opts = [
        { x: b.x + b.w / 2, y: b.y + b.h, ox: 0, oy: 4, s: 's' },
        { x: b.x + b.w / 2, y: b.y, ox: 0, oy: -4, s: 'n' },
        { x: b.x + b.w, y: b.y + b.h / 2, ox: 4, oy: 0, s: 'e' },
        { x: b.x, y: b.y + b.h / 2, ox: -4, oy: 0, s: 'w' },
      ];
      b.door = opts.find(d => !this.hitBuilding(d.x + d.ox, d.y + d.oy, 3)) || opts[0];
    }

    // Armerías: una en cada esquina del mapa y otra en el centro, siempre con la puerta a la calle
    for (let zy = 0; zy < 3; zy++) {
      for (let zx = 0; zx < 3; zx++) {
        if ((zx + zy) % 2) continue;
        const zcx = (zx + 0.5) * WORLD / 3, zcy = (zy + 0.5) * WORLD / 3;
        let best = null, bd = Infinity;
        for (const b of this.buildings) {
          const d = b.door;
          if (!d || b.shop || b.casaRosada || b.cabildo || !this.onRoad(d.x + d.ox * 4, d.y + d.oy * 4)) continue;
          const dd = Math.hypot(d.x - zcx, d.y - zcy);
          if (dd < bd) { bd = dd; best = b; }
        }
        if (best) {
          best.shop = true;
          this.shops.push(best);
        }
      }
    }

    // Cosas de playa. No van tiradas al azar parejo sino en grupitos, como en una playa
    // de verdad: sombrillas con sus reposeras, toallas con gente tomando sol, palmeras
    // en bosquecito, kayaks varados en la orilla, carpas, fogones, puestos de choripan,
    // torres de guardavidas, canchitas de voley y algun muelle de pescadores. El playon
    // de la desembocadura es "la playa grande": ahi se amontona todo.
    // Nada se pisa entre si, nada cae al agua ni arriba de un edificio, y nada se acerca
    // a los puentes (la copa de una palmera o una sombrilla tapaba el tablero).
    // Cada cosa lleva su radio r (lo que ocupa en el piso) y su grupo g: dentro de un
    // grupo si se pueden tocar (la reposera va abajo de su sombrilla).
    {
      const SOMBRILLA = ['#e05a4a', '#3f8fd0', '#e0b83a', '#4faa62', '#e07fb0'];
      const TELA = ['#d94f4f', '#4f7fd9', '#d9c44f', '#57b06a', '#d97fb5', '#e8e2d2', '#f08a3a'];
      const MALLA = ['#d23c3c', '#2f5fb0', '#e0b83a', '#1d1d22', '#3fa060', '#d97fb5', '#f2f2ee'];
      const PIEL = ['#e8bf98', '#d0a07a', '#a8764e', '#7a5236', '#f0cfb0'];
      const KAYAK = ['#f08a3a', '#e0c03a', '#d94f4f', '#3fa0d0', '#57b06a'];
      const gente = () => ({ malla: pick(MALLA), piel: pick(PIEL) });
      const mundo = this;

      // Ocupacion del piso en una grilla gruesa, para no comparar contra todo
      const CEL = 64, celdas = new Map();
      const ocupar = (x, y, r, g) => {
        const k = ((x / CEL) | 0) * 4096 + ((y / CEL) | 0);
        if (!celdas.has(k)) celdas.set(k, []);
        celdas.get(k).push({ x, y, r, g });
      };
      const pisa = (x, y, r, g) => {
        const i0 = (x / CEL) | 0, j0 = (y / CEL) | 0;
        for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
          for (const o of celdas.get(i * 4096 + j) || []) {
            if (o.g === g) continue;
            const dx = o.x - x, dy = o.y - y, rr = o.r + r + 2;
            if (dx * dx + dy * dy < rr * rr) return true;
          }
        }
        return false;
      };
      // Corredor del puente agrandado en m: ahi no va nada
      const cercaDePuente = (x, y, m) => {
        for (const b of bridges) {
          const u = b.horiz ? x : y, v = b.horiz ? y : x;
          if (u > b.a - m && u < b.b + m && Math.abs(v - (b.line + b.w / 2)) < b.half + m) return true;
        }
        return false;
      };
      // Bocacalle viva (con farol y semaforo): no se le planta nada encima del poste
      const cercaDeEsquina = (x, y, r) => {
        const cx = Math.round((x - ROAD / 2) / CELL), cy = Math.round((y - ROAD / 2) / CELL);
        const hx = roadWidthCol(cx) / 2, hy = roadWidthRow(cy) / 2;
        const ex = cx * CELL + hx, ey = cy * CELL + hy;
        if (noRoadPaint(ex, ey)) return false;
        return Math.abs(x - ex) < hx + 14 + r && Math.abs(y - ey) < hy + 14 + r;
      };
      // Arena que se ve: bakeGround le come hasta 8px al borde contra el pasto
      const arena = (x, y) => x > 16 && y > 16 && x < WORLD - 16 && y < WORLD - 16 && sandZone(x, y)
        && (onDeadRoad(x, y) || shoreDist(x, y) < beachBandAt(shoreT(x, y)) - 8);
      const libre = (x, y, r, g, minD = 6, mp = BEACH_BRIDGE_CLEAR) => {
        if (!arena(x, y) || shoreDist(x, y) < minD) return false;
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * TAU;
          if (!arena(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false;
        }
        if (cercaDePuente(x, y, r + mp) || cercaDeEsquina(x, y, r)) return false;
        const hb = this.hitBuilding(x, y, r + 4);
        if (hb && !hb.water) return false;
        return !pisa(x, y, r, g);
      };
      const poner = (p, r, g) => {
        p.r = r; p.g = g;
        this.props.push(p);
        ocupar(p.x, p.y, r, g);
        return p;
      };
      let grupo = 0;

      // Grupitos. (ax, ay): donde arranca; (ux, uy): a lo largo de la costa;
      // (nx, ny): tierra adentro (el agua queda para el lado de -n).
      const alAgua = (nx, ny) => Math.atan2(-ny, -nx);
      const conservadora = (x, y, g) => {
        if (libre(x, y, 3, g)) poner({ t: 'conservadora', x, y, a: rnd(0, TAU), col: pick(['#3f8fd0', '#d94f4f', '#f2f2ee', '#e0b83a']) }, 3, g);
      };
      const G_ = {
        balneario(ax, ay, ux, uy, nx, ny) {
          const g = ++grupo, cant = 1 + ((Math.random() * 3) | 0);
          let n = 0;
          for (let k = 0; k < cant; k++) {
            const off = (k - (cant - 1) / 2) * 25 + rnd(-3, 3);
            const sx = ax + ux * off, sy = ay + uy * off;
            if (!libre(sx, sy, 11, g)) continue;
            poner({ t: 'sombrilla', x: sx, y: sy, s: rnd(0.9, 1.15), col: pick(SOMBRILLA) }, 11, g);
            n++;
            // Reposeras a la sombra, mirando al agua
            const nr = Math.random() < 0.7 ? 2 : 1, l0 = Math.random() < 0.5 ? 1 : -1;
            for (let q = 0; q < nr; q++) {
              const lado = nr === 2 ? (q ? 1 : -1) : l0;
              const rx = sx + ux * lado * 6 - nx * 2, ry = sy + uy * lado * 6 - ny * 2;
              if (!libre(rx, ry, 7, g)) continue;
              poner({ t: 'reposera', x: rx, y: ry, a: alAgua(nx, ny) + rnd(-0.15, 0.15), col: pick(TELA),
                gente: Math.random() < 0.6 ? gente() : null }, 7, g);
            }
            if (Math.random() < 0.45) conservadora(sx + nx * 10 + ux * rnd(-5, 5), sy + ny * 10 + uy * rnd(-5, 5), g);
          }
          return n > 0;
        },
        toallas(ax, ay, ux, uy, nx, ny) {
          const g = ++grupo, cant = 2 + ((Math.random() * 3) | 0);
          let n = 0;
          for (let k = 0; k < cant * 3 && n < cant; k++) {
            const a = rnd(-18, 18), b = rnd(-8, 8);
            const x = ax + ux * a + nx * b, y = ay + uy * a + ny * b;
            if (!libre(x, y, 8, g) || pisaDelGrupo(g, x, y, 13)) continue;
            poner({ t: 'toalla', x, y, a: alAgua(nx, ny) + rnd(-0.5, 0.5), col: pick(TELA),
              gente: Math.random() < 0.75 ? gente() : null }, 8, g);
            n++;
          }
          if (n && Math.random() < 0.35) conservadora(ax + nx * 12, ay + ny * 12, g);
          if (n && Math.random() < 0.25 && libre(ax + nx * 4, ay + ny * 4, 11, g)) {
            poner({ t: 'sombrilla', x: ax + nx * 4, y: ay + ny * 4, s: rnd(0.9, 1.1), col: pick(SOMBRILLA) }, 11, g);
          }
          return n > 0;
        },
        palmar(ax, ay, ux, uy, nx, ny) {
          const g = ++grupo, cant = 2 + ((Math.random() * 2) | 0);
          let n = 0;
          for (let k = 0; k < cant; k++) {
            const off = (k - (cant - 1) / 2) * 21 + rnd(-4, 4), b = rnd(-7, 7);
            const x = ax + ux * off + nx * b, y = ay + uy * off + ny * b;
            if (!libre(x, y, 9, g, 10, BEACH_PALM_CLEAR)) continue;
            poner({ t: 'palm', x, y, s: rnd(0.95, 1.3) }, 9, g);
            n++;
          }
          return n > 0;
        },
        kayaks(ax, ay, ux, uy, nx, ny) {
          // (ax, ay) ya viene pegado a la orilla
          const g = ++grupo, cant = 1 + ((Math.random() * 3) | 0), bote = Math.random() < 0.3;
          let n = 0;
          for (let k = 0; k < cant; k++) {
            const off = (k - (cant - 1) / 2) * (bote ? 13 : 8);
            const x = ax + ux * off, y = ay + uy * off;
            if (!libre(x, y, bote ? 9 : 7, g, 8)) continue;
            poner({ t: 'kayak', x, y, a: Math.atan2(ny, nx) + rnd(-0.25, 0.25), bote: bote && k === 0,
              col: pick(KAYAK) }, bote ? 9 : 7, g);
            n++;
          }
          return n > 0;
        },
        carpa(ax, ay) {
          const g = ++grupo;
          if (!libre(ax, ay, 11, g)) return false;
          poner({ t: 'carpa', x: ax, y: ay, horiz: Math.random() < 0.5, col: pick(['#3f8f4a', '#e07a2a', '#3a6fc0', '#c23b3b', '#e0c03a']) }, 11, g);
          return true;
        },
        fogata(ax, ay) {
          const g = ++grupo;
          if (!libre(ax, ay, 15, g, 10)) return false;
          const n = 3 + ((Math.random() * 2) | 0), a0 = rnd(0, TAU);
          const ronda = [];
          for (let k = 0; k < n; k++) ronda.push({ a: a0 + k / n * TAU + rnd(-0.3, 0.3), ...gente() });
          poner({ t: 'fogata', x: ax, y: ay, gente: ronda }, 15, g);
          return true;
        },
        chiringuito(ax, ay, ux, uy, nx, ny) {
          // Va con la espalda contra el borde de la arena (como los puestos de la
          // costanera): del lado de tierra alcanza con que no sea calle ni edificio.
          const g = ++grupo;
          if (!arena(ax, ay) || shoreDist(ax, ay) < 22 || pisa(ax, ay, 15, g)) return false;
          if (cercaDePuente(ax, ay, 15 + BEACH_BRIDGE_CLEAR) || cercaDeEsquina(ax, ay, 15)) return false;
          const hb = mundo.hitBuilding(ax, ay, 18);
          if (hb && !hb.water) return false;
          for (let k = 0; k < 8; k++) {
            const a = k / 8 * TAU, qx = ax + Math.cos(a) * 15, qy = ay + Math.sin(a) * 15;
            const haciaTierra = Math.cos(a) * nx + Math.sin(a) * ny > 0.3;
            if (haciaTierra ? (mundo.onRoad(qx, qy) || inWater(qx, qy) || inBridgeCorridor(qx, qy)) : !arena(qx, qy)) return false;
          }
          // El mostrador da al agua (al lado de la caja que mas mira para alla)
          const fx = Math.abs(nx) > Math.abs(ny) ? -Math.sign(nx) : 0, fy = fx ? 0 : -Math.sign(ny);
          const fila = [];
          const cola = 2 + ((Math.random() * 3) | 0);
          for (let k = 0; k < cola; k++) {
            const o = (k - (cola - 1) / 2) * 7 + rnd(-1, 1);
            fila.push({ dx: fx * rnd(13, 17) + (fx ? 0 : o), dy: fy * rnd(13, 17) + (fy ? 0 : o), ...gente() });
          }
          poner({ t: 'chiringuito', x: ax, y: ay, fx, fy, col: pick(['#d23c3c', '#2f6fc0', '#e0a020', '#3a9a52']),
            cartel: pick(['CHORI', 'CHORI', 'BIRRA', 'PATY', 'PANCHO']), gente: fila }, 15, g);
          // Sombrillas con mesitas al costado
          for (const lado of [-1, 1]) {
            if (Math.random() < 0.35) continue;
            G_.balneario(ax + ux * lado * 38 - nx * 6, ay + uy * lado * 38 - ny * 6, ux, uy, nx, ny);
          }
          return true;
        },
        guardavidas(ax, ay, ux, uy, nx, ny) {
          const g = ++grupo;
          if (!libre(ax, ay, 9, g, 12)) return false;
          poner({ t: 'guardavidas', x: ax, y: ay, a: alAgua(nx, ny) }, 9, g);
          return true;
        },
        voley(ax, ay, ux, uy) {
          const g = ++grupo;
          if (!libre(ax, ay, 25, g, 10)) return false;
          const jug = [];
          for (const [u, v] of [[-14, -5], [-11, 6], [12, -6], [15, 5]]) jug.push({ u: u + rnd(-2, 2), v: v + rnd(-2, 2), ...gente() });
          poner({ t: 'voley', x: ax, y: ay, a: Math.atan2(uy, ux), seed: rnd(0, 10), gente: jug }, 25, g);
          return true;
        },
      };
      // Para que las toallas de un mismo grupo no queden una encima de la otra
      const pisaDelGrupo = (g, x, y, d) => {
        for (const o of celdas.get(((x / CEL) | 0) * 4096 + ((y / CEL) | 0)) || []) {
          if (o.g === g && Math.hypot(o.x - x, o.y - y) < d) return true;
        }
        return false;
      };

      // Recorrido por la costa, de los dos lados del cauce. s: metros de rio recorridos
      const pts = this.river, ult = {};
      const espera = { chiringuito: [560, 170], guardavidas: [720, 300], voley: [640, 230], fogata: [380, 260] };
      const puede = (tipo, s, playon) => !(tipo in espera) || s - (ult[tipo] ?? -1e9) > espera[tipo][playon ? 1 : 0];
      let acc = 0, s = 0, sGav = 0;
      const gaviotas = [];
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i], paso = Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
        s += paso; acc += paso; sGav += paso;
        if (acc < BEACH_GROUP_STEP || inBridgeCorridor(p.x, p.y)) continue;
        acc = 0;
        const playon = p.t > 0.86;
        if (sGav > 380) {
          sGav = 0;
          const side = Math.random() < 0.5 ? 1 : -1, d = rnd(-p.r * 0.8, p.r + p.band * 0.6);
          gaviotas.push({ t: 'gaviotas', x: p.x - p.ty * side * d, y: p.y + p.tx * side * d,
            n: 2 + ((Math.random() * 3) | 0), seed: rnd(0, TAU) });
        }
        for (const side of [-1, 1]) {
          const nx = -p.ty * side, ny = p.tx * side, ux = p.tx, uy = p.ty;
          for (let c = 0; c < (playon ? 3 : 1); c++) {
            if (!playon && Math.random() < 0.2) continue; // tramos de arena libre
            const opciones = [['balneario', 3], ['toallas', playon ? 1.8 : 3], ['palmar', 1.5], ['kayaks', 1.1], ['carpa', 0.6]];
            if (p.band > 38) {
              opciones.push(['chiringuito', playon ? 2.5 : 1.4], ['guardavidas', 1.4], ['fogata', 0.9]);
              if (p.band > 50) opciones.push(['voley', playon ? 2.5 : 1.6]);
            }
            const ok = opciones.filter(([tipo]) => puede(tipo, s, playon));
            let tot = 0;
            for (const o of ok) tot += o[1];
            let r = Math.random() * tot, tipo = ok[0][0];
            for (const o of ok) { r -= o[1]; if (r <= 0) { tipo = o[0]; break; } }
            const prof = tipo === 'kayaks' ? rnd(11, 13)
              : playon ? p.band * (0.2 + 0.28 * c) + rnd(-6, 6)
              : tipo === 'guardavidas' ? p.band * rnd(0.3, 0.45)
              : tipo === 'chiringuito' ? p.band - rnd(10, 13) : p.band * rnd(0.3, 0.62);
            const al = rnd(-14, 14);
            const ax = p.x + nx * (p.r + prof) + ux * al, ay = p.y + ny * (p.r + prof) + uy * al;
            if (G_[tipo](ax, ay, ux, uy, nx, ny)) ult[tipo] = s;
            else if (tipo !== 'toallas' && tipo !== 'kayaks') G_.toallas(ax, ay, ux, uy, nx, ny);
          }
        }
      }
      // Lo que el recorrido no llego a poner (las cosas grandes piden playa ancha) se
      // busca al azar sobre la arena, sin amontonar dos del mismo tipo. El voley va
      // en la playa grande de la desembocadura.
      for (const [tipo, meta, tMin, sep] of [['voley', 3, 0.84, 130], ['chiringuito', 6, 0, 260],
        ['fogata', 6, 0, 240], ['guardavidas', 5, 0, 400]]) {
        const hay = this.props.filter(q => q.t === tipo);
        for (let i = 0; i < 4000 && hay.length < meta; i++) {
          const x = rnd(0, WORLD), y = rnd(0, WORLD);
          if (!arena(x, y) || shoreT(x, y) < tMin) continue;
          if (hay.some(q => Math.hypot(q.x - x, q.y - y) < sep)) continue;
          const q = riverNearest(x, y), nx = (x - this.river[q.i].x) / (q.d || 1), ny = (y - this.river[q.i].y) / (q.d || 1);
          if (G_[tipo](x, y, q.tx, q.ty, nx, ny)) hay.push({ x, y });
        }
      }
      // La arena que gano el asfalto de los tramos muertos (lejos de la costa) tambien se usa
      for (let i = 0, n = 0; i < 6000 && n < 40; i++) {
        const x = rnd(0, WORLD), y = rnd(0, WORLD);
        if (!onDeadRoad(x, y) || !arena(x, y)) continue;
        const horiz = (y % CELL) < roadWidthRow(Math.floor(y / CELL));
        const ux = horiz ? 1 : 0, uy = horiz ? 0 : 1;
        const tipo = pick(['balneario', 'toallas', 'palmar']);
        if (G_[tipo](x, y, ux, uy, uy, ux)) n++;
      }
      // Muelles de pescadores: tablones que salen de la arena y entran al agua. Se
      // dibujan arriba del agua pero no cambian la colision (al agua no se camina).
      for (const tObj of [0.2, 0.42, 0.62, 0.8, 0.94]) {
        for (let k = 0; k < 40; k++) {
          const p = pts[Math.min(pts.length - 1, Math.max(1, Math.round((tObj + rnd(-0.06, 0.06)) * (pts.length - 1))))];
          if (inBridgeCorridor(p.x, p.y) || p.band < 26) continue;
          const side = Math.random() < 0.5 ? 1 : -1, nx = -p.ty * side, ny = p.tx * side;
          const bx = p.x + nx * (p.r + 12), by = p.y + ny * (p.r + 12);
          const L = 12 + Math.min(p.r * 0.55, rnd(28, 40));
          const tx = bx - nx * L, ty = by - ny * L;
          if (!inWater(tx, ty) || !inWater(bx - nx * (L - 10), by - ny * (L - 10))) continue;
          if (cercaDePuente(tx, ty, 50) || cercaDePuente(bx, by, 50)) continue;
          const g = ++grupo;
          if (!libre(bx, by, 7, g, 4)) continue;
          const pesc = [{ f: 0.92, lado: 1, ...gente() }];
          if (Math.random() < 0.6) pesc.push({ f: rnd(0.5, 0.7), lado: -1, ...gente() });
          poner({ t: 'muelle', x: bx, y: by, dx: -nx, dy: -ny, L, gente: pesc }, 7, g);
          break;
        }
      }
      // Las gaviotas al final: vuelan por arriba de todo lo de la playa
      this.props.push(...gaviotas);
      // Las palmeras de vereda que quedaron pegadas a un puente tambien se van:
      // con la extrusion su copa caia arriba del tablero.
      for (let i = this.props.length - 1; i >= 0; i--) {
        const p = this.props[i];
        if (p.t === 'palm' && !p.g && cercaDePuente(p.x, p.y, BEACH_PALM_CLEAR)) this.props.splice(i, 1);
      }
    }

    // Lugares donde paran los tranzas: en la vereda de la villa, separados entre sí
    for (const v of villas) {
      v.spots.length = 0;
      v.angry = 0;
      for (let i = 0; i < 400 && v.spots.length < v.tranzas; i++) {
        const cx = v.cx0 + ((Math.random() * (v.cx1 - v.cx0 + 1)) | 0);
        const cy = v.cy0 + ((Math.random() * (v.cy1 - v.cy0 + 1)) | 0);
        const along = rnd(ROAD + 12, CELL - 12), side = (Math.random() * 4) | 0;
        const t = side === 0 ? { x: cx * CELL + ROAD - 5, y: cy * CELL + along }
          : side === 1 ? { x: (cx + 1) * CELL + 5, y: cy * CELL + along }
          : side === 2 ? { x: cx * CELL + along, y: cy * CELL + ROAD - 5 }
          : { x: cx * CELL + along, y: (cy + 1) * CELL + 5 };
        if (this.hitBuilding(t.x, t.y, 6) || noRoadPaint(t.x, t.y)) continue;
        if (v.spots.some(o => Math.hypot(o.x - t.x, o.y - t.y) < 90)) continue;
        v.spots.push(t);
      }
    }

    // Faroles en cada esquina (en la villa, pocos)
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        const lx = cx * CELL + ROAD - 5, ly = cy * CELL + ROAD - 5;
        if (noRoadPaint(lx, ly)) continue; // el rio se comio la esquina, no hay farol flotando
        if (this.villaCell(cx, cy) && (cx + cy) % 3) continue;
        this.lamps.push({ x: lx, y: ly });
      }
    }

    // Semáforos: uno por bocacalle con fases desfasadas en damero.
    // La bocacalle de la plaza no tiene semaforo (es una rotonda real) pero se empuja
    // `null` para no correr el indice `gy*GRID+gx` que usa lightAhead().
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        // Sin semaforo: la rotonda del obelisco y las bocacalles internas de la
        // Plaza de Mayo, que ya no existen como cruce.
        // Sin semaforo tampoco donde el rio se trago la bocacalle.
        if ((cx === PLAZA_CX && cy === PLAZA_CY) || (isPlazaMayoCell(cx, cy) && cx > ROSADA_CX && cy > ROSADA_CY)
          || noRoadPaint(cx * CELL + ROAD / 2, cy * CELL + ROAD / 2)) {
          this.lights.push(null);
          continue;
        }
        this.lights.push({
          cx,
          cy,
          x: cx * CELL + ROAD / 2,
          y: cy * CELL + ROAD / 2,
          phase: ((cx + cy) % 2) * (LIGHT_CYCLE / 2) + ((cx * 7 + cy * 3) % 5),
          off: !!this.villaAt(cx * CELL + ROAD / 2, cy * CELL + ROAD / 2), // en la villa no hay semáforos
        });
      }
    }

    // Hospitales: dos edificios existentes, uno en cada mitad del mapa, convertidos
    // en centro de salud (pintados de blanco/rojo, con puerta ya lista para entrar)
    const targets = [[WORLD * 0.28, WORLD * 0.32], [WORLD * 0.72, WORLD * 0.68]];
    for (const [tx, ty] of targets) {
      let best = null, bd = Infinity;
      for (const b of this.buildings) {
        // Ni monumentos, ni armerías, ni casillas de villa: no se pintan de hospital
        if (b.hospital || b.shop || b.villa || b.casaRosada || b.cabildo || b.ty.k === 'torre') continue;
        const d = Math.hypot(b.x + b.w / 2 - tx, b.y + b.h / 2 - ty);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) {
        best.hospital = true;
        best.col = '#e6e2d6';
        best.roofCol = '#c23b3b';
        this.hospitals.push(best);
      }
    }

  }

  // Índice espacial: edificios por celda de la grilla, para que las colisiones no recorran todo
  indexBuildings() {
    this.bgrid = Array.from({ length: GRID * GRID }, () => []);
    for (const b of this.buildings) {
      const cx0 = Math.floor(b.x / CELL), cx1 = Math.min(GRID - 1, Math.floor((b.x + b.w) / CELL));
      const cy0 = Math.floor(b.y / CELL), cy1 = Math.min(GRID - 1, Math.floor((b.y + b.h) / CELL));
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) this.bgrid[cy * GRID + cx].push(b);
      }
    }
  }

  /**
   * Hornea suelo, veredas, líneas, cebras, pasto y sombras en un canvas gigante
   * permitiendo renderizar el fondo a coste mínimo por frame.
   */
  bakeGround() {
    withSeed((this.seed || 0) + 1, () => this.paintGround());
  }

  paintGround() {
    GROUND = document.createElement('canvas');
    GROUND.width = GROUND.height = WORLD;
    const g = GCTX = GROUND.getContext('2d');

    // Asfalto base
    g.fillStyle = '#31343a';
    g.fillRect(0, 0, WORLD, WORLD);

    // Villas: calles de tierra
    for (const v of villas) {
      g.fillStyle = '#6b5b45';
      g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    }

    // Manzanas: vereda + interior
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        if (cx === PLAZA_CX && cy === PLAZA_CY) continue; // la rotonda se hornea aparte, mas abajo
        const roadX = cx === PLAZA_CX ? AVENUE_ROAD : ROAD;
        const roadY = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
        const bx = cx * CELL + roadX - SIDEWALK, by = cy * CELL + roadY - SIDEWALK;
        const sw = CELL - roadX + SIDEWALK * 2, sh = CELL - roadY + SIDEWALK * 2;
        if (this.villaCell(cx, cy)) {
          // Manzana de villa: vereda de tierra apisonada y pasillos de tierra
          g.fillStyle = '#7d6d55';
          g.fillRect(bx, by, sw, sh);
          g.fillStyle = '#6e5e48';
          g.fillRect(bx + SIDEWALK, by + SIDEWALK, sw - SIDEWALK * 2, sh - SIDEWALK * 2);
          continue;
        }
        g.fillStyle = '#8d8d86';
        g.fillRect(bx, by, sw, sh);
        g.fillStyle = '#7a7a73';
        g.fillRect(bx, by, sw, 2);
        g.fillRect(bx, by, 2, sh);
        g.fillStyle = '#5a6247';
        g.fillRect(bx + SIDEWALK, by + SIDEWALK, sw - SIDEWALK * 2, sh - SIDEWALK * 2);

        // Juntas de la vereda
        g.fillStyle = 'rgba(0,0,0,.10)';
        for (let i = 0; i < Math.max(sw, sh); i += 14) {
          if (i < sw) { g.fillRect(bx + i, by, 1, SIDEWALK); g.fillRect(bx + i, by + sh - SIDEWALK, 1, SIDEWALK); }
          if (i < sh) { g.fillRect(bx, by + i, SIDEWALK, 1); g.fillRect(bx + sw - SIDEWALK, by + i, SIDEWALK, 1); }
        }
      }
    }

    // Parques (y el potrero de la villa)
    for (const p of this.props) {
      if (p.t === 'park' && p.villa) {
        g.fillStyle = '#8a7656';
        g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = 'rgba(0,0,0,.08)';
        for (let i = 0; i < 60; i++) g.fillRect(p.x + rnd(0, p.w), p.y + rnd(0, p.h), rnd(3, 10), rnd(2, 5));
        const fx = p.x + 12, fy = p.y + 22, fw = p.w - 24, fh = p.h - 44;
        g.strokeStyle = 'rgba(235,235,225,.6)';
        g.lineWidth = 1.5;
        g.strokeRect(fx, fy, fw, fh);
        g.beginPath();
        g.moveTo(fx, fy + fh / 2);
        g.lineTo(fx + fw, fy + fh / 2);
        g.stroke();
        g.beginPath();
        g.arc(fx + fw / 2, fy + fh / 2, 12, 0, TAU);
        g.stroke();
        g.fillStyle = '#e8e8e0'; // Arcos
        g.fillRect(fx + fw / 2 - 12, fy - 3, 24, 3);
        g.fillRect(fx + fw / 2 - 12, fy + fh, 24, 3);
        continue;
      }
      if (p.t === 'park') {
        g.fillStyle = '#4d6b3a';
        g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#5c7d45';
        for (let i = 0; i < 70; i++) {
          g.fillRect(p.x + rnd(0, p.w), p.y + rnd(0, p.h), rnd(3, 9), rnd(2, 5));
        }
        g.fillStyle = '#9a8a6a'; // Senderito
        g.fillRect(p.x, p.y + p.h / 2 - 5, p.w, 10);
        g.fillRect(p.x + p.w / 2 - 5, p.y, 10, p.h);
      } else if (p.t === 'beach') {
        g.fillStyle = '#dfc98a';
        g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = 'rgba(150,120,60,.18)';
        for (let i = 0; i < 24; i++) {
          g.fillRect(p.x + rnd(0, p.w), p.y + rnd(0, p.h), rnd(2, 5), rnd(2, 4));
        }
      } else if (p.t === 'rotonda') {
        // Anillo de asfalto que circulan los autos
        g.fillStyle = '#33363c';
        g.beginPath();
        g.arc(p.x, p.y, p.rRing, 0, TAU);
        g.fill();
        // Marcas circulares concentricas (division de carriles del anillo)
        g.strokeStyle = 'rgba(235,235,235,.4)';
        g.lineWidth = 2;
        g.setLineDash([10, 8]);
        g.beginPath();
        g.arc(p.x, p.y, (p.rIsland + p.rRing) / 2, 0, TAU);
        g.stroke();
        g.setLineDash([]);
        // Cordon entre anillo e isla
        g.fillStyle = '#8d8d86';
        g.beginPath();
        g.arc(p.x, p.y, p.rIsland + 4, 0, TAU);
        g.fill();
        // Isla peatonal central
        g.fillStyle = '#5a6247';
        g.beginPath();
        g.arc(p.x, p.y, p.rIsland, 0, TAU);
        g.fill();
      }
    }

    // Plaza de Mayo: explanada maciza horneada ENCIMA de las manzanas, asi tapa
    // las calles internas que onRoad() ya no reconoce.
    for (const p of this.props) {
      if (p.t !== 'plazaMayo') continue;
      g.fillStyle = '#b9ac8e'; // baldoson claro de la explanada
      g.fillRect(p.x, p.y, p.w, p.h);
      g.fillStyle = 'rgba(0,0,0,.07)'; // juntas del baldoson
      for (let i = 0; i < p.w; i += 22) g.fillRect(p.x + i, p.y, 1, p.h);
      for (let j = 0; j < p.h; j += 22) g.fillRect(p.x, p.y + j, p.w, 1);
      // Canteros de pasto en las cuatro esquinas, como los de verdad
      g.fillStyle = '#4d6b3a';
      const gw = p.w * 0.26, gh = p.h * 0.3, pad = 16;
      g.fillRect(p.x + pad, p.y + pad, gw, gh);
      g.fillRect(p.x + p.w * 0.42, p.y + pad, gw, gh);
      g.fillRect(p.x + pad, p.y + p.h - pad - gh, gw, gh);
      g.fillRect(p.x + p.w * 0.42, p.y + p.h - pad - gh, gw, gh);
      g.fillStyle = '#5c7d45';
      for (let i = 0; i < 160; i++) {
        const gx2 = p.x + rnd(0, p.w), gy2 = p.y + rnd(0, p.h);
        g.fillRect(gx2, gy2, rnd(3, 8), rnd(2, 4));
      }
      // Sendero central que va de la diagonal a la puerta de la Casa Rosada
      g.fillStyle = '#9a8a6a';
      g.fillRect(p.x, p.y + p.h / 2 - 9, p.w, 18);
    }
    for (const p of this.props) {
      if (p.t !== 'piramide') continue;
      g.fillStyle = '#8d8d86';
      g.beginPath();
      g.arc(p.x, p.y, 26, 0, TAU);
      g.fill();
      g.fillStyle = '#e8e4d8';
      g.beginPath();
      g.arc(p.x, p.y, 13, 0, TAU);
      g.fill();
    }

    // Diagonal Norte: franja recta de plaza a Casa Rosada, horneada ENCIMA de manzanas/parques
    // (asi corta prolijo sobre vereda/pasto en vez de dejar un hueco de asfalto pelado)
    g.save();
    g.translate(PLAZA_PX, PLAZA_PY);
    g.rotate(DIAG_ANG);
    g.fillStyle = '#34373d';
    g.fillRect(0, -DIAG_WIDTH / 2, DIAG_LEN, DIAG_WIDTH);
    // La vereda va en tramos, no corrida: donde la diagonal cruza una calle cardinal
    // tiene que haber asfalto, no un cordon plantado en medio de la bocacalle.
    g.fillStyle = '#8d8d86';
    for (let t = 0; t < DIAG_LEN; t += 2) {
      for (const side of [-DIAG_WIDTH / 2 - SIDEWALK, DIAG_WIDTH / 2]) {
        const wx = PLAZA_PX + Math.cos(DIAG_ANG) * t - Math.sin(DIAG_ANG) * (side + SIDEWALK / 2);
        const wy = PLAZA_PY + Math.sin(DIAG_ANG) * t + Math.cos(DIAG_ANG) * (side + SIDEWALK / 2);
        if (this.onRoadCardinal(wx, wy)) continue; // es bocacalle, la vereda se interrumpe
        g.fillRect(t, side, 2, SIDEWALK);
      }
    }
    g.fillStyle = '#c9a227';
    g.fillRect(0, -1, DIAG_LEN, 2);
    for (let t = 0; t < DIAG_LEN; t += 16) g.fillRect(t, -1, 9, 2);
    g.fillStyle = 'rgba(235,235,235,.5)';
    for (let t = 0; t < DIAG_LEN; t += 16) {
      g.fillRect(t, -DIAG_WIDTH / 2 - 1, 2, 6);
      g.fillRect(t, DIAG_WIDTH / 2 - 5, 2, 6);
    }
    g.restore();

    // Playa: la arena se pinta pixel a pixel segun la distancia a la orilla
    // (shoreDist), no con circulos: compacta y oscura pegada al agua, la linea de
    // marea con algas, ramitas y caracoles, y seca y clara tierra adentro, con medanos
    // suaves y las ondas que deja el viento. El borde contra el pasto lo come el ruido,
    // asi no queda un arco de compas. Tambien es arena el asfalto de los tramos de
    // calle que se borraron (el espacio que dejo la calle al terminar en la esquina
    // anterior en vez de meterse en el rio). Lo de shoreDist < 4 (barro y agua) se
    // pinta despues, encima.
    // Se trabaja por bloques de S x S en un canvas chico (createImageData) que despues
    // se apoya sobre GROUND: leer el canvas gigante con getImageData lo saca de la GPU.
    {
      const h2 = (x, y) => {
        let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
      };
      // Ruido suave de escala s (value noise): medanos, borde y linea de marea
      const vn = (x, y, s) => {
        const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy);
        let u = fx - ix, v = fy - iy;
        u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
        const k = s * 7919;
        const a = h2(ix + k, iy), b = h2(ix + 1 + k, iy), c = h2(ix + k, iy + 1), d = h2(ix + 1 + k, iy + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
      // Bloques alineados con la grilla de la mascara (WATER_CELL): cada celda se
      // clasifica una vez (agua, lejos, borde, muerta) y solo se recorre pixel a pixel
      // lo que puede ser arena.
      const S = WATER_CELL * 12, tc = document.createElement('canvas');
      tc.width = tc.height = S;
      const tg = tc.getContext('2d');
      const img = tg.createImageData(S, S) || { data: new Uint8ClampedArray(S * S * 4) };
      const D = img.data;
      const ESQ = [0, 0, 11, 0, 0, 11, 11, 11, 6, 6]; // puntos de prueba de cada celda
      const ALGA = [122, 124, 80], RAMITA = [138, 112, 78], CARACOL = [244, 238, 224], CARACOL_ROSA = [228, 176, 164];
      const sd = (i, j) => SHORE_D[Math.max(0, Math.min(WMW - 1, j)) * WMW + Math.max(0, Math.min(WMW - 1, i))];
      for (let y0 = 0; y0 < WORLD; y0 += S) {
        for (let x0 = 0; x0 < WORLD; x0 += S) {
          let algo = false, limpio = false;
          for (let cj = 0; cj < S; cj += WATER_CELL) {
            for (let ci = 0; ci < S; ci += WATER_CELL) {
              const gi = (x0 + ci) / WATER_CELL, gj = (y0 + cj) / WATER_CELL;
              // shoreDist adentro de la celda interpola entre los centros vecinos
              let dmin = Infinity, dmax = -Infinity;
              for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
                const v = sd(gi + a, gj + b);
                if (v < dmin) dmin = v;
                if (v > dmax) dmax = v;
              }
              if (dmax < -3) continue; // todo agua
              const costa = dmin < beachBandAt(shoreT(x0 + ci + 6, y0 + cj + 6)) + 24;
              let muerta = false;
              for (let q = 0; q < 10; q += 2) {
                if (onDeadRoad(x0 + ci + ESQ[q], y0 + cj + ESQ[q + 1])) { muerta = true; break; }
              }
              if (!costa && !muerta) continue;
              if (!limpio) { D.fill(0); limpio = true; }
              // De a 2x2: la distancia, el color base, los medanos y la marea se sacan
              // una vez por bloquecito; el grano, las ondas y el borde van por pixel.
              for (let j = cj; j < cj + WATER_CELL; j += 2) {
                const y = y0 + j;
                for (let i = ci; i < ci + WATER_CELL; i += 2) {
                  const x = x0 + i;
                  let dd = 999, borde = 99;
                  const d = costa ? shoreDist(x + 1, y + 1) : 999;
                  if (d < -3) continue; // agua
                  const band = costa ? beachBandAt(shoreT(x + 1, y + 1)) : 0;
                  if (d < band - 9) dd = d;
                  else if (d < band + 9) {
                    const e = band + (vn(x, y, 26) - 0.5) * 12 + (vn(x, y, 7) - 0.5) * 4;
                    if (d < e && (d < band || !this.onRoad(x + 1, y + 1))) { dd = d; borde = e - d; }
                    else if (!muerta || !onDeadRoad(x + 1, y + 1)) continue;
                  } else if (!muerta || !onDeadRoad(x + 1, y + 1)) continue;
                  // Contra un tramo muerto no hay borde: abajo hay asfalto, no pasto
                  if (borde < 5 && muerta && onDeadRoad(x + 1, y + 1)) borde = 99;
                  const wet = 1 - smoothstep(3, 17, dd), dry = smoothstep(10, 36, dd);
                  // media (204,183,131) -> seca (229,211,157), y mojada (150,132,94) en la orilla
                  let R = 204 + 25 * dry, Gc = 183 + 28 * dry, B = 131 + 26 * dry;
                  R += (150 - R) * wet; Gc += (132 - Gc) * wet; B += (94 - B) * wet;
                  const med = vn(x, y, 40) - 0.5; // medanos
                  let l0 = med * 22 * (0.4 + dry);
                  if (borde < 5) l0 -= (5 - borde) * 2.2; // el borde, un poco mas tostado
                  // Linea de marea: algas y ramitas que dejo la crecida
                  const tl = dd > 7 && dd < 21 ? Math.abs(dd - 14 - (vn(x, y, 13) - 0.5) * 6) : 99;
                  if (tl < 2.6) l0 -= 6;
                  for (let b = 0; b < 2; b++) {
                    for (let a = 0; a < 2; a++) {
                      const xx = x + a, yy = y + b, r0 = h2(xx, yy);
                      // Borde picado contra el pasto: pixeles sueltos, como arena volada
                      if (borde < 3 && r0 < (3 - borde) / 3 * 0.85) continue;
                      let l = l0 + (r0 - 0.5) * 11, col = null;
                      if (dry > 0.2) { // ondas del viento en la arena seca, torcidas por los medanos
                        const rp = Math.sin(xx * 0.55 + yy * 0.32 + med * 14);
                        if (rp > 0.82) l -= 8 * dry; else if (rp < -0.9) l += 5 * dry;
                      }
                      if (tl < 1.1 && r0 < 0.3) col = h2(xx + 1, yy) < 0.6 ? ALGA : RAMITA;
                      else if (dd > 6 && dd < 60 && r0 > 0.9965) col = h2(xx, yy + 1) < 0.6 ? CARACOL : CARACOL_ROSA;
                      else if (r0 < 0.004) l -= 30; // piedritas
                      const k = ((j + b) * S + i + a) * 4;
                      if (col) { D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; }
                      else { D[k] = R + l; D[k + 1] = Gc + l; D[k + 2] = B + l; }
                      D[k + 3] = 255;
                      algo = true;
                    }
                  }
                }
              }
            }
          }
          if (!algo) continue;
          tg.putImageData(img, 0, 0);
          g.drawImage(tc, x0, y0);
        }
      }
      // Pisadas: hileras de huellitas que van y vienen del agua
      g.fillStyle = 'rgba(110,88,52,.32)';
      for (let i = 0, n = 0; i < 4000 && n < 140; i++) {
        let x = rnd(0, WORLD), y = rnd(0, WORLD);
        if (!sandZone(x, y) || shoreDist(x, y) < 8) continue;
        n++;
        let a = rnd(0, TAU);
        for (let k = 0; k < 26; k++) {
          a += rnd(-0.25, 0.25);
          x += Math.cos(a) * 3.2; y += Math.sin(a) * 3.2;
          if (!sandZone(x, y) || shoreDist(x, y) < 5) break;
          const sg = k % 2 ? 1.3 : -1.3;
          g.fillRect(px(x - Math.sin(a) * sg), px(y + Math.cos(a) * sg), 1, 1);
        }
      }
      // Lo chato de la playa va horneado: toallas (con gente tomando sol), reposeras,
      // conservadoras, kayaks varados, la cancha de voley y el circulo del fogon.
      const acostado = (x, y, a, gt, largo) => {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.fillRect(-largo / 2 + 1, -1, largo, 3.5);
        g.fillStyle = gt.piel;
        g.fillRect(-largo / 2, -1.5, largo * 0.42, 3);           // piernas
        g.fillRect(-largo / 2 + largo * 0.55, -2, largo * 0.3, 4); // torso
        g.fillRect(-largo / 2 + largo * 0.5, -3, 3, 1);           // brazos
        g.fillRect(-largo / 2 + largo * 0.5, 2, 3, 1);
        g.fillStyle = gt.malla;
        g.fillRect(-largo / 2 + largo * 0.4, -2, largo * 0.17, 4);
        g.beginPath();
        g.arc(largo / 2 - 1.5, 0, 1.9, 0, TAU);
        g.fillStyle = gt.piel;
        g.fill();
        g.fillStyle = 'rgba(40,28,18,.8)'; // pelo
        g.fillRect(largo / 2 - 1, -1.5, 1.5, 3);
        g.restore();
      };
      for (const p of this.props) {
        if (p.t === 'toalla') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.a);
          g.fillStyle = 'rgba(0,0,0,.14)';
          g.fillRect(-7, -3.5, 16, 9);
          g.fillStyle = p.col;
          g.fillRect(-8, -4.5, 16, 9);
          g.fillStyle = 'rgba(255,255,255,.3)'; // rayas y flecos
          g.fillRect(-4, -4.5, 2, 9);
          g.fillRect(3, -4.5, 2, 9);
          g.fillRect(-9, -4, 1, 8);
          g.fillRect(8, -4, 1, 8);
          g.restore();
          // tomando sol: la cabeza para el lado de tierra (a + PI)
          if (p.gente) acostado(p.x, p.y, p.a + Math.PI, p.gente, 13);
        } else if (p.t === 'reposera') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.a);
          g.fillStyle = 'rgba(0,0,0,.2)';
          g.fillRect(-6, -1, 15, 6);
          g.fillStyle = '#8a7a62'; // armazon
          g.fillRect(-7, -3.5, 14, 7);
          g.fillStyle = p.col;
          g.fillRect(-6.5, -2.5, 13, 5);
          g.fillStyle = 'rgba(255,255,255,.35)';
          g.fillRect(-6.5, -0.5, 13, 1);
          g.fillStyle = 'rgba(0,0,0,.22)'; // respaldo levantado
          g.fillRect(-7, -3.5, 4, 7);
          g.restore();
          if (p.gente) acostado(p.x, p.y, p.a + Math.PI, p.gente, 12);
        } else if (p.t === 'conservadora') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.a);
          g.fillStyle = 'rgba(0,0,0,.25)';
          g.fillRect(-2, -1, 6, 5);
          g.fillStyle = p.col;
          g.fillRect(-3, -2.5, 6, 5);
          g.fillStyle = '#f2f2ee';
          g.fillRect(-3, -2.5, 6, 1.5);
          g.restore();
        } else if (p.t === 'kayak') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.a);
          const L = p.bote ? 20 : 17, W = p.bote ? 8 : 4.5;
          g.fillStyle = 'rgba(0,0,0,.2)';
          g.beginPath();
          g.ellipse(1, 1.5, L / 2, W / 2, 0, 0, TAU);
          g.fill();
          g.fillStyle = p.bote ? '#7a5634' : p.col;
          g.beginPath();
          g.ellipse(0, 0, L / 2, W / 2, 0, 0, TAU);
          g.fill();
          if (p.bote) {
            g.fillStyle = '#a07a4e'; // adentro del bote y sus bancos
            g.beginPath();
            g.ellipse(0, 0, L / 2 - 1.5, W / 2 - 1.2, 0, 0, TAU);
            g.fill();
            g.fillStyle = '#5e4128';
            g.fillRect(-3, -W / 2 + 1, 1.5, W - 2);
            g.fillRect(3, -W / 2 + 1, 1.5, W - 2);
          } else {
            g.fillStyle = '#1d1d22'; // la cabina
            g.fillRect(-1.5, -1, 4, 2);
            g.fillStyle = 'rgba(255,255,255,.3)';
            g.fillRect(-L / 2 + 2, -0.5, L - 4, 0.8);
            g.fillStyle = '#d8d3c4'; // el remo tirado al lado
            g.fillRect(-6, W / 2 + 1, 12, 0.8);
          }
          g.restore();
        } else if (p.t === 'voley') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.a);
          g.fillStyle = 'rgba(120,96,58,.13)'; // arena pisoteada
          g.fillRect(-24, -12, 48, 24);
          g.strokeStyle = 'rgba(70,52,30,.45)';
          g.lineWidth = 1;
          g.strokeRect(-22.5, -10.5, 45, 21);
          g.restore();
        } else if (p.t === 'fogata') {
          for (const q of p.gente) { // troncos para sentarse
            g.fillStyle = 'rgba(0,0,0,.18)';
            g.fillRect(px(p.x + Math.cos(q.a) * 10 - 2), px(p.y + Math.sin(q.a) * 10), 5, 2);
          }
          g.fillStyle = 'rgba(40,30,22,.55)'; // ceniza
          g.beginPath();
          g.arc(p.x, p.y, 4.5, 0, TAU);
          g.fill();
          for (let k = 0; k < 9; k++) { // piedras
            const a = k / 9 * TAU;
            g.fillStyle = k % 2 ? '#8d8a80' : '#6f6c64';
            g.fillRect(px(p.x + Math.cos(a) * 5.5 - 1), px(p.y + Math.sin(a) * 5.5 - 1), 2, 2);
          }
        }
      }
    }
    // Agua horneada pixel a pixel con la distancia a la orilla (shoreDist, interpolada
    // de la grilla de 12px, asi la costa sale curva y no escalonada ni como cadena de
    // circulos; pegado a la costa se afina con shoreDistFine): barro humedo que oscurece la arena pegada al agua, una linea de espuma,
    // y adentro bandas de profundidad (orilla verdosa, centro hondo) mezcladas con un
    // dithering ordenado de 4x4 para que se lea pixel-art. Las vetas siguen la costa,
    // que es como corre la corriente. Se procesa por tiles y solo los que tocan el rio.
    {
      const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
      const PAL = WATER_PAL.map(hex), FOAM = hex(WATER_FOAM), MUD = hex(WATER_MUD);
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const T = 240, M = WATER_MUD_W, wc = (t) => riverWidthAt(t);
      let done = false;
      try {
        for (let ty = 0; ty < WORLD; ty += T) {
          for (let tx = 0; tx < WORLD; tx += T) {
            const w = Math.min(T, WORLD - tx), h = Math.min(T, WORLD - ty);
            // El tile se procesa solo si alguna celda de la mascara cae cerca del agua
            let near = false;
            for (let y = ty; y <= ty + h && !near; y += WATER_CELL) {
              for (let x = tx; x <= tx + w; x += WATER_CELL) if (shoreDist(x, y) < M + WATER_CELL) { near = true; break; }
            }
            if (!near) continue;
            const img = g.getImageData(tx, ty, w, h), d = img && img.data;
            if (!d) continue;
            for (let y = 0; y < h; y++) {
              const wy = ty + y + 0.5;
              for (let x = 0; x < w; x++) {
                const wx = tx + x + 0.5;
                let sd = shoreDist(wx, wy);
                if (sd > -8 && sd < M + 5) sd = shoreDistFine(wx, wy); // la costa, sin serrucho
                if (sd >= M) continue;
                const o = (y * w + x) * 4, b = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
                if (sd >= 0) {
                  // Barro humedo: mas oscuro cuanto mas pegado al agua, en escalones
                  const a = Math.floor((1 - sd / M) * 3 + b) / 3 * 0.8;
                  for (let c = 0; c < 3; c++) d[o + c] = d[o + c] + (MUD[c] - d[o + c]) * a;
                  continue;
                }
                let col;
                if (sd > -1.6 || (sd > -3.2 && b < 0.5)) col = FOAM; // espuma contra la orilla
                else {
                  const r = wc(shoreT(wx, wy));
                  const dep = Math.min(1, -sd / (r * 0.85));
                  // Ruido grueso (manchas) + vetas paralelas a la costa
                  const n = Math.sin(wx * 0.021 + Math.sin(wy * 0.013) * 2.1) * Math.sin(wy * 0.017 - wx * 0.007);
                  const veta = Math.sin(sd * 0.55 + n * 3) * Math.sin(wx * 0.004 + wy * 0.006);
                  const lv = Math.sqrt(dep) * (PAL.length - 1) + n * 0.45 + veta * 0.3;
                  col = PAL[clamp(Math.floor(lv + b - 0.5), 0, PAL.length - 1)];
                }
                d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
              }
            }
            g.putImageData(img, tx, ty);
          }
        }
        done = true;
      } catch (e) { done = false; }
      if (!done) {
        // Sin acceso a los pixeles (no deberia pasar): el agua plana de antes
        g.fillStyle = WATER_PAL[2];
        for (const w2 of this.river) {
          g.beginPath();
          g.arc(w2.x, w2.y, w2.r, 0, TAU);
          g.fill();
        }
      }
    }

    // Puentes: el tablero va horneado en el piso (sombra sobre el agua, pilas, estribos,
    // veredas, calzada pintada y juntas) y lo que tiene altura (barandas, reticulado,
    // mastil y tirantes, la espuma de las pilas) lo dibuja el renderer por frame con el
    // prop 'puente' (drawPuente). Todo en coordenadas del puente: u a lo largo de la
    // calle, v a lo ancho. Cada tramo viene de this.bridges, con da..db ya calculado.
    {
      const deck = (br) => {
        const S = BRIDGE_STYLES[br.style] || BRIDGE_STYLES.hormigon;
        const L = br.line, W = br.w, a = br.a, b = br.b, da = br.da, db = br.db;
        const SW = SIDEWALK, mid = L + W / 2;
        const E = 4;                       // viga de borde: va afuera de la franja, dentro del corredor
        const v0 = L - E, v1 = L + W + E;
        const su = br.horiz ? 6 : 10, sv = br.horiz ? 10 : 6; // sombra: el sol viene de arriba-izq
        const R = (u0, u1, w0, w1) => br.horiz ? g.fillRect(u0, w0, u1 - u0, w1 - w0) : g.fillRect(w0, u0, w1 - w0, u1 - u0);
        const XY = (u, v) => br.horiz ? [u, v] : [v, u];
        const poly = (pts) => {
          g.beginPath();
          pts.forEach(([u, v], i) => { const [x, y] = XY(u, v); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
          g.closePath();
          g.fill();
        };

        // Sombra del tablero sobre el agua y la arena
        g.fillStyle = 'rgba(8,18,28,.42)';
        R(da + su, db + su, v0 + sv, v1 + sv);

        // Pilas: tabique de hormigon a lo largo de la corriente, con tajamar en punta,
        // que asoma a los dos lados del tablero (la espuma la agrega el renderer)
        const NOSE = 10;
        for (const p of br.piers) {
          const pu = p.u;
          const shape = (du, dv) => [
            [pu - 4 + du, v0 - NOSE + 4 + dv], [pu + du, v0 - NOSE + dv], [pu + 4 + du, v0 - NOSE + 4 + dv],
            [pu + 4 + du, v1 + NOSE - 4 + dv], [pu + du, v1 + NOSE + dv], [pu - 4 + du, v1 + NOSE - 4 + dv],
          ];
          g.fillStyle = 'rgba(8,18,28,.30)';
          poly(shape(su * 0.6, sv * 0.6));
          g.fillStyle = '#7d776b';
          poly(shape(0, 0));
          g.fillStyle = '#a19b8e'; // cara al sol
          R(pu - 4, pu - 1, v0 - NOSE + 4, v1 + NOSE - 4);
          if (p.wet) {
            g.fillStyle = 'rgba(46,74,58,.55)'; // verdin en la linea de agua
            R(pu - 4, pu + 4, v0 - NOSE + 4, v0 - NOSE + 6);
            R(pu - 4, pu + 4, v1 + NOSE - 6, v1 + NOSE - 4);
          }
        }

        // Estribos: muro de hormigon donde el tablero apoya en tierra, con aleros a los
        // costados y talud de piedra
        for (const [u, s] of [[da, -1], [db, 1]]) {
          // Hacia tierra el alero no se mete en una bocacalle; hacia el agua apenas asoma
          let lim = 16;
          for (const [c0, c1] of br.cross) {
            if (s < 0 && c1 <= u) lim = Math.min(lim, u - c1 - 1);
            if (s > 0 && c0 >= u) lim = Math.min(lim, c0 - u - 1);
          }
          const uL = u + s * Math.max(3, lim), uW = u - s * 3;
          const lo = Math.min(uW, uL), hi = Math.max(uW, uL);
          g.fillStyle = '#9a9080';
          poly([[uW, v0 - 5], [uL, v0 - 5], [uL, v0 - 5 - Math.max(3, lim) * 0.6]]);
          poly([[uW, v1 + 5], [uL, v1 + 5], [uL, v1 + 5 + Math.max(3, lim) * 0.6]]);
          g.fillStyle = 'rgba(0,0,0,.14)';
          for (let k = 3; k < Math.max(3, lim); k += 4) {
            const p0 = Math.min(u + s * k, u + s * (k + 1));
            R(p0, p0 + 1, v0 - 5 - k * 0.6, v0 - 5);
            R(p0, p0 + 1, v1 + 5, v1 + 5 + k * 0.6);
          }
          g.fillStyle = '#8b8477';
          R(lo, hi, v0 - 5, v0);
          R(lo, hi, v1, v1 + 5);
          R(Math.min(uW, u + s * 2), Math.max(uW, u + s * 2), v0 - 5, v1 + 5);
          g.fillStyle = '#aaa395';
          R(lo, hi, v0 - 5, v0 - 4);
        }

        // Vigas de borde: donde se paran las barandas (el color depende del estilo)
        const beam = S.k === 'reticulado' ? S.dark : S.k === 'atirantado' ? '#d6d8d2'
          : S.k === 'transbordador' ? '#5d646b' : '#9a9486';
        g.fillStyle = beam;
        R(da, db, v0, L);
        R(da, db, L + W, v1);
        g.fillStyle = 'rgba(255,255,255,.18)';
        R(da, db, v0, v0 + 1);
        R(da, db, L + W, L + W + 1);

        // Miradores del puente de hormigon: balconcitos redondos sobre cada pila
        if (S.k === 'hormigon') {
          for (const p of br.piers) {
            for (const side of [-1, 1]) {
              const [cx, cy] = XY(p.u, side < 0 ? v0 : v1);
              const ang = br.horiz ? (side < 0 ? -Math.PI / 2 : Math.PI / 2) : (side < 0 ? Math.PI : 0);
              g.fillStyle = beam;
              g.beginPath(); g.arc(cx, cy, 11, ang - Math.PI / 2, ang + Math.PI / 2); g.fill();
              g.fillStyle = S.walk;
              g.beginPath(); g.arc(cx, cy, 9, ang - Math.PI / 2, ang + Math.PI / 2); g.fill();
            }
          }
        }

        // Lo que va a lo largo de la calle se corta en las bocacalles (br.cross)
        const RL = (u0, u1, w0, w1) => {
          let s0 = u0;
          for (const [c0, c1] of br.cross) {
            if (c1 <= s0 || c0 >= u1) continue;
            if (c0 > s0) R(s0, c0, w0, w1);
            s0 = Math.max(s0, c1);
          }
          if (s0 < u1) R(s0, u1, w0, w1);
        };
        const inCross = (u) => br.cross.some(([c0, c1]) => u > c0 && u < c1);

        // Calzada (de punta a punta, tambien en la bocacalle)
        g.fillStyle = '#383b41';
        R(a, b, L, L + W);

        // Veredas peatonales con baldosas y cordon
        g.fillStyle = S.walk;
        RL(a, b, L, L + SW);
        RL(a, b, L + W - SW, L + W);
        g.fillStyle = 'rgba(0,0,0,.12)';
        for (let u = a + 3; u < b; u += 7) {
          if (inCross(u)) continue;
          R(u, u + 1, L, L + SW);
          R(u, u + 1, L + W - SW, L + W);
        }
        RL(a, b, L + SW / 2, L + SW / 2 + 1);
        RL(a, b, L + W - SW / 2 - 1, L + W - SW / 2);
        g.fillStyle = '#d4d0c4';
        RL(a, b, L + SW - 1, L + SW);
        RL(a, b, L + W - SW, L + W - SW + 1);
        g.fillStyle = 'rgba(0,0,0,.10)'; // huellas de las ruedas
        for (const o of br.avenue ? [-45, -24, 24, 45] : [-13, 13]) {
          RL(a, b, mid + o - 4, mid + o - 2);
          RL(a, b, mid + o + 2, mid + o + 4);
        }
        g.fillStyle = 'rgba(230,230,220,.55)'; // lineas de borde
        RL(a, b, L + SW + 2, L + SW + 3);
        RL(a, b, L + W - SW - 3, L + W - SW - 2);
        if (br.avenue) {
          // Dos carriles por sentido y separador de hormigon (new jersey) al medio
          g.fillStyle = 'rgba(232,232,224,.8)';
          for (let u = a + 4; u < b - 9; u += 16) {
            if (inCross(u) || inCross(u + 9)) continue;
            R(u, u + 9, mid - AVENUE_LANE * 1.4 - 1, mid - AVENUE_LANE * 1.4 + 1);
            R(u, u + 9, mid + AVENUE_LANE * 1.4 - 1, mid + AVENUE_LANE * 1.4 + 1);
          }
          const hw = S.k === 'atirantado' ? 5 : 3;
          g.fillStyle = 'rgba(0,0,0,.35)';
          RL(a, b, mid + hw, mid + hw + 2);
          g.fillStyle = '#bdb8ac';
          RL(a, b, mid - hw, mid + hw);
          g.fillStyle = '#d8d4c8';
          RL(a, b, mid - hw, mid - hw + 1);
          g.fillStyle = 'rgba(0,0,0,.18)';
          RL(a, b, mid - 0.5, mid + 0.5);
          if (S.k === 'atirantado') { // base del mastil, al costado del tablero sobre la pila
            g.fillStyle = 'rgba(8,18,28,.35)';
            R(br.mast - 7 + su, br.mast + 7 + su, v0 - 14 + sv, v0 + sv);
            g.fillStyle = '#e6e8e2';
            R(br.mast - 7, br.mast + 7, v0 - 14, v0);
            g.fillStyle = '#b7bab4';
            R(br.mast + 3, br.mast + 7, v0 - 14, v0);
          }
        } else {
          // Doble mano: doble linea amarilla continua (en el puente no se pasa)
          g.fillStyle = '#c9a227';
          RL(a + 2, b - 2, mid - 2.5, mid - 1);
          RL(a + 2, b - 2, mid + 1, mid + 2.5);
        }

        // Juntas de dilatacion: en los estribos y sobre cada pila
        for (const u of [da, db, ...br.piers.map(p => p.u)]) {
          g.fillStyle = 'rgba(0,0,0,.35)';
          R(u - 1, u, L, L + W);
          g.fillStyle = 'rgba(170,174,180,.35)';
          R(u, u + 1, L + SW, L + W - SW);
        }

        // Transbordador: los dados de hormigon donde apoyan las patas de las torres
        if (S.k === 'transbordador') {
          for (const u of [da - 4, db + 4]) {
            for (const v of [v0 - 9, v1 + 9]) {
              g.fillStyle = 'rgba(0,0,0,.25)';
              R(u - 5 + su * 0.5, u + 5 + su * 0.5, v - 5 + sv * 0.5, v + 5 + sv * 0.5);
              g.fillStyle = '#8b8477';
              R(u - 5, u + 5, v - 5, v + 5);
              g.fillStyle = '#a8a193';
              R(u - 5, u + 5, v - 5, v - 4);
            }
          }
        }
      };
      for (const br of this.bridges) deck(br);
    }

    // Líneas divisoras y cebras
    for (let i = 0; i <= GRID; i++) {
      const isAveCol = i === PLAZA_CX, isAveRow = i === PLAZA_CY;
      const rx = i * CELL, ry = i * CELL;
      const rw = isAveCol ? AVENUE_ROAD : ROAD, rh = isAveRow ? AVENUE_ROAD : ROAD;
      g.fillStyle = '#c9a227';
      for (let y = 0; y < WORLD; y += 16) {
        if (this.onRoad(rx + rw / 2, y) && (y % CELL) > rw && !noRoadPaint(rx + rw / 2, y) && !this.villaAt(rx + rw / 2, y)) {
          if (!isAveCol) g.fillRect(rx + rw / 2 - 1, y, 2, 9); // avenida: sin raya al medio, va el cantero
          if (isAveCol) {
            g.fillRect(rx + rw / 2 - 1 - AVENUE_LANE * 1.4, y, 2, 9);
            g.fillRect(rx + rw / 2 - 1 + AVENUE_LANE * 1.4, y, 2, 9);
          }
        }
      }
      for (let x = 0; x < WORLD; x += 16) {
        if (this.onRoad(x, ry + rh / 2) && (x % CELL) > rh && !noRoadPaint(x, ry + rh / 2) && !this.villaAt(x, ry + rh / 2)) {
          if (!isAveRow) g.fillRect(x, ry + rh / 2 - 1, 9, 2);
          if (isAveRow) {
            g.fillRect(x, ry + rh / 2 - 1 - AVENUE_LANE * 1.4, 9, 2);
            g.fillRect(x, ry + rh / 2 - 1 + AVENUE_LANE * 1.4, 9, 2);
          }
        }
      }
    }

    // Bulevar central: cantero verde arbolado en el medio de la avenida (como la 9 de Julio real)
    {
      const midX = PLAZA_CX * CELL + AVENUE_ROAD / 2, midY = PLAZA_CY * CELL + AVENUE_ROAD / 2;
      const MW = AVENUE_LANE * 0.85;
      const medianOk = (x, y) => {
        if (bridgeAt(x, y)) return false; // sobre el puente no hay cantero
        if (obelisco) {
          const ox = obelisco.x + obelisco.w / 2, oy = obelisco.y + obelisco.h / 2;
          if (Math.hypot(x - ox, y - oy) < ROTONDA_R + 16) return false; // lo absorbe la rotonda
        }
        return true;
      };
      g.fillStyle = '#3f5a34';
      for (let y = 0; y < WORLD; y += 4) {
        if (this.onRoad(midX, y) && (y % CELL) > AVENUE_ROAD && medianOk(midX, y)) g.fillRect(midX - MW / 2, y, MW, 4);
      }
      for (let x = 0; x < WORLD; x += 4) {
        if (this.onRoad(x, midY) && (x % CELL) > AVENUE_ROAD && medianOk(x, midY)) g.fillRect(x, midY - MW / 2, 4, MW);
      }
      // Los arboles del cantero son props de verdad (se dibujan con volumen en el
      // renderer), aca solo va la sombra horneada al pie de cada uno.
      g.fillStyle = 'rgba(0,0,0,.22)';
      for (let y = 28; y < WORLD; y += 38) {
        if (this.onRoad(midX, y) && (y % CELL) > AVENUE_ROAD && medianOk(midX, y)) {
          this.props.push({ t: 'arbol', x: midX, y, s: rnd(0.9, 1.25) });
          g.beginPath(); g.ellipse(midX + 4, y + 5, MW * 0.8, MW * 0.5, 0, 0, TAU); g.fill();
        }
      }
      for (let x = 28; x < WORLD; x += 38) {
        if (this.onRoad(x, midY) && (x % CELL) > AVENUE_ROAD && medianOk(x, midY)) {
          this.props.push({ t: 'arbol', x, y: midY, s: rnd(0.9, 1.25) });
          g.beginPath(); g.ellipse(x + 4, midY + 5, MW * 0.8, MW * 0.5, 0, 0, TAU); g.fill();
        }
      }
    }

    g.fillStyle = 'rgba(235,235,235,.55)';
    for (let cy = 0; cy <= GRID; cy++) {
      for (let cx = 0; cx <= GRID; cx++) {
        if (cx === PLAZA_CX && cy === PLAZA_CY) continue; // sin cebras: es la rotonda
        const ix = cx * CELL, iy = cy * CELL;
        if (this.villaAt(ix + ROAD / 2, iy + ROAD / 2)) continue;
        const rw = cx === PLAZA_CX ? AVENUE_ROAD : ROAD, rh = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
        // Sin cebras sobre el agua: donde el rio se comio la bocacalle no hay nada que cruzar
        for (let k = 3; k < Math.min(rw, rh) - 3; k += 8) {
          if (!noRoadPaint(ix + k, iy - 9)) g.fillRect(ix + k, iy - 9, 5, 7);
          if (!noRoadPaint(ix + k, iy + rh + 2)) g.fillRect(ix + k, iy + rh + 2, 5, 7);
          if (!noRoadPaint(ix - 9, iy + k)) g.fillRect(ix - 9, iy + k, 7, 5);
          if (!noRoadPaint(ix + rw + 2, iy + k)) g.fillRect(ix + rw + 2, iy + k, 7, 5);
        }
      }
    }

    // Sucio del asfalto: parches, tapas de cloaca, grietas
    for (let i = 0; i < 4200; i++) {
      const x = rnd(0, WORLD), y = rnd(0, WORLD);
      if (!this.onRoad(x, y) || overBridge(x, y)) continue;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.05)';
      g.fillRect(x, y, rnd(4, 22), rnd(3, 12));
    }

    // Villa: pozos, charcos y basura en la tierra
    for (const v of villas) {
      const area = (v.x1 - v.x0) * (v.y1 - v.y0);
      for (let i = 0; i < area / 260; i++) {
        const x = rnd(v.x0, v.x1), y = rnd(v.y0, v.y1);
        g.fillStyle = Math.random() < 0.5 ? 'rgba(40,28,15,.18)' : 'rgba(255,240,210,.06)';
        g.fillRect(x, y, rnd(3, 16), rnd(2, 9));
      }
      for (let i = 0; i < area / 6000; i++) {
        const x = rnd(v.x0, v.x1), y = rnd(v.y0, v.y1);
        if (!this.onRoad(x, y)) continue;
        g.fillStyle = 'rgba(70,80,90,.55)';
        g.beginPath();
        g.ellipse(x, y, rnd(4, 11), rnd(2, 6), 0, 0, TAU);
        g.fill();
      }
      for (let i = 0; i < area / 1500; i++) {
        g.fillStyle = pick(['#c8302a', '#e8e8e0', '#2a5ab0', '#3f9a4a', '#1a1a1a']);
        g.fillRect(rnd(v.x0, v.x1), rnd(v.y0, v.y1), 2, 1);
      }
    }
    for (let i = 0; i < 420; i++) {
      const x = rnd(0, WORLD), y = rnd(0, WORLD);
      if (!this.onRoad(x, y) || overBridge(x, y)) continue;
      g.fillStyle = '#26282c';
      g.fillRect(x, y, 8, 8);
      g.fillStyle = '#1c1e21';
      g.fillRect(x + 1, y + 1, 6, 6);
    }

    // Sombras horneadas de edificios (sol arriba-izq) + árboles + faroles
    for (const b of this.buildings) {
      const o = b.H * 0.30;
      g.fillStyle = 'rgba(0,0,0,.30)';
      g.fillRect(b.x + o * 0.55, b.y + o * 0.8, b.w, b.h);
    }
    for (const p of this.props) {
      if (p.t === 'palm') {
        g.fillStyle = 'rgba(0,0,0,.22)';
        g.beginPath();
        g.ellipse(p.x + 7, p.y + 9, 11 * p.s, 6 * p.s, 0, 0, TAU);
        g.fill();
      }
    }
    for (const p of this.props) {
      if (p.t === 'barril') {
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.fillRect(p.x + 1, p.y + 2, 6, 3);
      }
    }
    for (const l of this.lamps) {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(l.x + 2, l.y + 3, 4, 10);
    }

    // Minimapa: versión chica horneada
    const MS = 320;
    MINI = document.createElement('canvas');
    MINI.width = MINI.height = MS;
    const m = MINI.getContext('2d'), k = MS / WORLD;
    m.fillStyle = '#23262b';
    m.fillRect(0, 0, MS, MS);
    for (const v of villas) {
      m.fillStyle = '#4a3e30';
      m.fillRect(v.x0 * k, v.y0 * k, (v.x1 - v.x0) * k, (v.y1 - v.y0) * k);
    }
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        const mrx = cx === PLAZA_CX ? AVENUE_ROAD : ROAD, mry = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
        m.fillStyle = this.villaCell(cx, cy) ? '#5a4a38' : '#4a5240';
        m.fillRect((cx * CELL + mrx) * k, (cy * CELL + mry) * k, (CELL - mrx) * k, (CELL - mry) * k);
      }
    }
    m.fillStyle = '#3f5a34'; // bulevar central sobre la avenida, para que se distinga de una calle comun
    m.fillRect(PLAZA_PX * k - k, 0, 2 * k, MS);
    m.fillRect(0, PLAZA_PY * k - k, MS, 2 * k);
    m.fillStyle = '#4a5240';
    m.save();
    m.translate(PLAZA_PX * k, PLAZA_PY * k);
    m.rotate(DIAG_ANG);
    m.fillRect(0, -DIAG_WIDTH * k / 2, DIAG_LEN * k, DIAG_WIDTH * k);
    m.restore();
    m.fillStyle = '#8f8a6e'; // Plaza de Mayo: bloque macizo, sin calles que la crucen
    for (const p of this.props) {
      if (p.t === 'plazaMayo') m.fillRect(p.x * k, p.y * k, p.w * k, p.h * k);
    }
    m.fillStyle = '#6c6c62';
    for (const b of this.buildings) {
      m.fillStyle = b.villa ? '#8a6e50' : '#6c6c62';
      m.fillRect(b.x * k, b.y * k, Math.max(1, b.w * k), Math.max(1, b.h * k));
    }
    m.fillStyle = WATER_MINI;
    for (const w2 of this.water) {
      m.beginPath();
      m.arc(w2.x * k, w2.y * k, Math.max(1, w2.r * k), 0, TAU);
      m.fill();
    }
    // Puentes en el minimapa: la calle (oscura, como todas) cruzando el agua entre dos
    // barandas claras, asi se ve por donde se pasa
    for (const br of this.bridges) {
      const u0 = br.a * k, len = (br.b - br.a) * k, v0 = (br.line - 4) * k, wd = (br.w + 8) * k;
      m.fillStyle = '#d8d3c4';
      if (br.horiz) m.fillRect(u0, v0, len, wd); else m.fillRect(v0, u0, wd, len);
      m.fillStyle = '#2c2f35';
      if (br.horiz) m.fillRect(u0, v0 + 1, len, wd - 2); else m.fillRect(v0 + 1, u0, wd - 2, len);
    }
    m.fillStyle = '#dfc98a';

    // Lightmap y viñeta
    LIGHT = document.createElement('canvas');
    LIGHT.width = RW;
    LIGHT.height = RH;
    LCTX = LIGHT.getContext('2d');

    EMIT = document.createElement('canvas');
    EMIT.width = RW;
    EMIT.height = RH;
    ECTX = EMIT.getContext('2d');

    VIG = document.createElement('canvas');
    VIG.width = RW;
    VIG.height = RH;
    const vg = VIG.getContext('2d');
    const rg = vg.createRadialGradient(RW / 2, RH / 2, RH * 0.35, RW / 2, RH / 2, RH * 0.95);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,.55)');
    vg.fillStyle = rg;
    vg.fillRect(0, 0, RW, RH);
  }

  // Solo la grilla cardinal, sin contar la diagonal: sirve para saber donde la
  // diagonal cruza una bocacalle y tiene que cortar su vereda.
  onRoadCardinal(x, y) {
    if (inPlazaMayo(x, y)) return false;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    const onV = (x % CELL) < roadWidthCol(cx), onH = (y % CELL) < roadWidthRow(cy);
    // Un tramo cortado por el rio no es calle: la calle termina en la esquina anterior
    return (onV && segAliveV(cx, cy)) || (onH && segAliveH(cx, cy));
  }

  onRoad(x, y) {
    if (inPlazaMayo(x, y)) return false; // la explanada se come las calles internas
    return this.onRoadCardinal(x, y) || inDiagonalBand(x, y);
  }

  inRotondaRing(x, y) {
    if (!obelisco) return false;
    const d = Math.hypot(x - (obelisco.x + obelisco.w / 2), y - (obelisco.y + obelisco.h / 2));
    return d > ROTONDA_ISLAND_R && d < ROTONDA_R;
  }

  lightState(L, horiz) {
    if (L.off) return 'verde';
    const time = (typeof G !== 'undefined' && G.t !== undefined) ? G.t : 0;
    const t = ((time + L.phase) % LIGHT_CYCLE + LIGHT_CYCLE) % LIGHT_CYCLE;
    const half = LIGHT_CYCLE / 2;
    const mine = horiz ? t : (t + half) % LIGHT_CYCLE;
    if (mine < GREEN) return 'verde';
    if (mine < GREEN + AMBER) return 'amarillo';
    return 'rojo';
  }

  lightAhead(x, y, ang) {
    const horiz = Math.abs(Math.cos(ang)) > 0.5;
    const gx = horiz ? Math.round((x + Math.cos(ang) * CELL * 0.5) / CELL) : Math.round(x / CELL);
    const gy = horiz ? Math.round(y / CELL) : Math.round((y + Math.sin(ang) * CELL * 0.5) / CELL);
    if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return null;
    const L = this.lights[gy * GRID + gx];
    if (!L) return null;
    const stopX = L.x - Math.cos(ang) * (ROAD / 2 + 3);
    const stopY = L.y - Math.sin(ang) * (ROAD / 2 + 3);
    const fwd = (stopX - x) * Math.cos(ang) + (stopY - y) * Math.sin(ang);
    return { L, horiz, fwd, stopX, stopY };
  }

  hitBuilding(x, y, r) {
    const cx0 = Math.max(0, Math.floor((x - r) / CELL)), cx1 = Math.min(GRID - 1, Math.floor((x + r) / CELL));
    const cy0 = Math.max(0, Math.floor((y - r) / CELL)), cy1 = Math.min(GRID - 1, Math.floor((y + r) / CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        for (const b of this.bgrid[cy * GRID + cx]) {
          if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
        }
      }
    }
    // Agua: consulta O(1) contra la mascara horneada, no contra la lista de circulos
    if (inWater(x, y) || inWater(x + r, y) || inWater(x - r, y) || inWater(x, y + r) || inWater(x, y - r)) {
      return { water: true, x, y };
    }
    if (obelisco && x + r > obelisco.x && x - r < obelisco.x + obelisco.w && y + r > obelisco.y && y - r < obelisco.y + obelisco.h) {
      return obelisco;
    }
    return null;
  }

  // Frena autos pero no peatones: la explanada de la Plaza de Mayo se camina,
  // pero ningun auto la puede cruzar aunque la grilla diga que ahi habia calle.
  hitCarBlock(x, y, r) {
    for (const z of this.carBlock) {
      if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return z;
    }
    return null;
  }

  // Tramo de calle que sigue después de la última esquina y muere contra el borde del mapa
  // (abajo y a la derecha; arriba y a la izquierda la primera calle va pegada al borde).
  // De ahí ningún auto puede salir: se choca el borde, da marcha atrás y traba la zona.
  inEdgeStub(x, y) {
    const last = (GRID - 1) * CELL;
    return (y >= last + roadWidthRow(GRID - 1) && (x % CELL) < roadWidthCol(Math.floor(x / CELL)))
      || (x >= last + roadWidthCol(GRID - 1) && (y % CELL) < roadWidthRow(Math.floor(y / CELL)));
  }

  freeRoadSpot() {
    for (let i = 0; i < 400; i++) {
      const x = rnd(ROAD, WORLD - ROAD), y = rnd(ROAD, WORLD - ROAD);
      if (this.onRoad(x, y) && !this.inEdgeStub(x, y) && !this.hitBuilding(x, y, 10)) return { x, y };
    }
    return { x: ROAD / 2, y: ROAD / 2 };
  }

  ringSpot(near, far, needRoad, center) {
    const c0 = spawnCenter(center), px0 = c0.x, py0 = c0.y;
    for (let i = 0; i < 120; i++) {
      const a = rnd(0, TAU), d = rnd(near, far);
      const x = clamp(px0 + Math.cos(a) * d, 12, WORLD - 12);
      const y = clamp(py0 + Math.sin(a) * d, 12, WORLD - 12);
      if (needRoad && (!this.onRoad(x, y) || this.inEdgeStub(x, y))) continue;
      if (this.hitBuilding(x, y, 10)) continue;
      return { x, y };
    }
    return null;
  }

  inPark(x, y) {
    for (const pk of this.props) {
      if ((pk.t === 'park' || pk.t === 'plazaMayo') && x > pk.x && x < pk.x + pk.w && y > pk.y && y < pk.y + pk.h) return true;
      if (pk.t === 'rotonda' && Math.hypot(x - pk.x, y - pk.y) < pk.rIsland) return true;
    }
    return false;
  }

  pedBlocked(x, y, r) {
    if (x < MARGIN || y < MARGIN || x > WORLD - MARGIN || y > WORLD - MARGIN) return true;
    return !!this.hitBuilding(x, y, r);
  }

  onSidewalk(x, y) {
    if (this.inPark(x, y)) return true;
    if (this.villaAt(x, y) && !this.onRoad(x, y)) return true; // en la villa se camina por los pasillos
    // Sobre un puente las veredas siguen de punta a punta, aunque abajo el rio se haya
    // comido una bocacalle (salvo en una bocacalle viva, donde manda la regla de siempre)
    const br = bridgeAt(x, y);
    if (br) {
      const u = br.horiz ? x : y, v = (br.horiz ? y : x) - br.line;
      if (v >= 0 && v < br.w && !(br.cross || []).some(([c0, c1]) => u > c0 && u < c1)) {
        return v < SIDEWALK || v >= br.w - SIDEWALK;
      }
    }
    // Como se dibuja (bakeGround): la vereda va sobre los dos bordes de la franja de cada
    // calle (los primeros y los últimos SIDEWALK px), el asfalto queda en el medio y el
    // interior de la manzana empieza donde termina la franja. En la bocacalle solo son
    // vereda las cuatro esquinas; el resto es asfalto (ahí se cruza).
    const ox = ((x % CELL) + CELL) % CELL, oy = ((y % CELL) + CELL) % CELL;
    const rw = roadWidthCol(Math.floor(x / CELL)), rh = roadWidthRow(Math.floor(y / CELL));
    const inV = ox < rw, inH = oy < rh;
    const edgeV = ox < SIDEWALK || (ox >= rw - SIDEWALK && inV);
    const edgeH = oy < SIDEWALK || (oy >= rh - SIDEWALK && inH);
    return (edgeV && !inH) || (edgeH && !inV) || (edgeV && edgeH);
  }

  toSidewalk(x, y) {
    const ox = ((x % CELL) + CELL) % CELL, oy = ((y % CELL) + CELL) % CELL;
    const bx = x - ox, by = y - oy;
    const rw = roadWidthCol(Math.floor(x / CELL)), rh = roadWidthRow(Math.floor(y / CELL));
    // Centro de la vereda más cercana sobre cada eje: el borde izquierdo o derecho de la franja
    // de esta calle, o el borde izquierdo de la franja de la calle siguiente (en CELL)
    const near = (o, w) => [SIDEWALK / 2, w - SIDEWALK / 2, CELL + SIDEWALK / 2]
      .reduce((a, t) => (Math.abs(o - t) < Math.abs(o - a) ? t : a));
    const tX = near(ox, rw), tY = near(oy, rh);
    // ¿La otra coordenada queda en el asfalto de la bocacalle? Entonces a la esquina
    const crossV = oy >= SIDEWALK && oy < rh - SIDEWALK, crossH = ox >= SIDEWALK && ox < rw - SIDEWALK;
    if (Math.abs(ox - tX) < Math.abs(oy - tY)) return crossV ? { x: bx + tX, y: by + tY } : { x: bx + tX, y };
    return crossH ? { x: bx + tX, y: by + tY } : { x, y: by + tY };
  }

  laneSnap(x, y, ang, laneBias = 0) {
    const horiz = Math.abs(Math.cos(ang)) > 0.5;
    // El ancho sale de la celda DESTINO, no de la de origen: si no, un auto que viene
    // por la avenida y se snapea a una calle comun de al lado usa el ancho de avenida
    // y termina fuera del asfalto.
    // Acotado a las calles que existen (0..GRID-1): cerca del borde de abajo o de la derecha
    // el redondeo daba la calle GRID, que cae afuera del mapa, y el auto aparecía ahí
    const idx = clamp(Math.round(((horiz ? y : x) - ROAD / 2) / CELL), 0, GRID - 1);
    const isAve = idx === (horiz ? PLAZA_CY : PLAZA_CX);
    const roadW = isAve ? AVENUE_ROAD : ROAD;
    const LANE = isAve ? AVENUE_LANE : ROAD * 0.24;
    const extra = isAve ? LANE * 1.4 * laneBias : 0;
    if (horiz) {
      const cy2 = idx * CELL + roadW / 2;
      return { x, y: cy2 + (Math.cos(ang) > 0 ? LANE + extra : -LANE - extra), ang: Math.cos(ang) > 0 ? 0 : Math.PI };
    }
    const cx2 = idx * CELL + roadW / 2;
    return { x: cx2 + (Math.sin(ang) > 0 ? -LANE - extra : LANE + extra), y, ang: Math.sin(ang) > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  nearestDoor(x, y, maxD) {
    let best = null, bd = maxD;
    for (const b of this.buildings) {
      if (!b.door) continue;
      const dx2 = b.door.x + b.door.ox - x, dy2 = b.door.y + b.door.oy - y;
      const d = Math.hypot(dx2, dy2);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  dayT() {
    const time = (typeof G !== 'undefined' && G.t !== undefined) ? G.t : 0;
    return (time / DAY + 0.34) % 1;
  }

  ambient() {
    const t = this.dayT();
    for (let i = 0; i < SKY.length - 1; i++) {
      if (t >= SKY[i][0] && t <= SKY[i + 1][0]) {
        return mix(SKY[i][1], SKY[i + 1][1], (t - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]));
      }
    }
    return '#ffffff';
  }

  darkness() {
    return clamp((Math.cos(this.dayT() * TAU) + 1) / 2, 0, 1);
  }
}

// Instancia global
const world = new World();

// Exportación de funciones y métodos para interoperabilidad total
const buildCity = seed => world.buildCity(seed);
const bakeGround = () => world.bakeGround();
const onRoad = (x, y) => world.onRoad(x, y);
const lightState = (L, horiz) => world.lightState(L, horiz);
const lightAhead = (x, y, ang) => world.lightAhead(x, y, ang);
const hitBuilding = (x, y, r) => world.hitBuilding(x, y, r);
const hitCarBlock = (x, y, r) => world.hitCarBlock(x, y, r);
const villaAt = (x, y) => world.villaAt(x, y);
const freeRoadSpot = () => world.freeRoadSpot();
const ringSpot = (near, far, needRoad, center) => world.ringSpot(near, far, needRoad, center);
const inPark = (x, y) => world.inPark(x, y);
const pedBlocked = (x, y, r) => world.pedBlocked(x, y, r);
const onSidewalk = (x, y) => world.onSidewalk(x, y);
const toSidewalk = (x, y) => world.toSidewalk(x, y);
const laneSnap = (x, y, ang, laneBias) => world.laneSnap(x, y, ang, laneBias);
const inRotondaRing = (x, y) => world.inRotondaRing(x, y);
const nearestDoor = (x, y, maxD) => world.nearestDoor(x, y, maxD);
const dayT = () => world.dayT();
const ambient = () => world.ambient();
const darkness = () => world.darkness();
const getObelisco = () => obelisco;
