/* =========================================================================
   GTA MERCALOCA - IA de manejo de los autos civiles
   -------------------------------------------------------------------------
   Cada auto sigue su carril (o un camino de puntos cuando dobla) con un
   volante de verdad: apunta a un punto un poco más adelante y gira con un
   radio mínimo, sin teletransportarse. La velocidad sale del modelo IDM
   (Intelligent Driver Model): acelera hasta su crucero, mantiene distancia
   con el de adelante y frena suave para el semáforo, la curva o la gente.
   El de adelante se busca sobre el camino que va a hacer (también en la curva).

   Las bocacalles se reservan: nadie entra si adentro hay una maniobra que se le
   cruza, ni dobla a la izquierda si viene alguien de frente. En la Diagonal la
   bocacalle es más grande (la banda pisa las calles) y el semáforo tiene una
   tercera fase para ella. La rotonda del obelisco se circula en sentido
   antihorario: se cede el paso a los que ya están adentro.

   Cada chofer tiene su estilo (tranquilo, normal o picante) y reacciona a lo
   que pasa: se asusta con los tiros y las explosiones (y a veces se baja y sale
   corriendo), se calienta si lo chocan, pega un volantazo si se le viene alguien
   encima y se tira al cordón cuando viene la yuta.
   ========================================================================= */

// Sentidos: 0 este, 1 sur, 2 oeste, 3 norte (y crece hacia abajo); 4 y 5 son la
// Diagonal, hacia la Casa Rosada (sudeste) y hacia el obelisco (noroeste)
const DIRS = [0, Math.PI / 2, Math.PI, -Math.PI / 2, DIAG_ANG, DIAG_ANG + Math.PI];
const DXS = [1, 0, -1, 0, DIAG_UX, -DIAG_UX], DYS = [0, 1, 0, -1, DIAG_UY, -DIAG_UY];
const DIAG_LANE = DIAG_WIDTH / 4; // un carril por mano, centrado en su mitad
const isDiag = d => d >= 4;
const backOf = d => (d < 4 ? (d + 2) % 4 : 9 - d);

// Parámetros de manejo (px y segundos)
const DRV = {
  A: 80,        // aceleración máxima
  B: 90,        // frenada cómoda
  RMIN: 11,     // radio de giro mínimo (limita cuánto dobla por segundo)
  A_LAT: 150,   // aceleración de costado que se banca en una curva
  V_RIGHT: 24,  // velocidad para doblar a la derecha (curva cerrada)
  V_LEFT: 30,   // velocidad para doblar a la izquierda (curva abierta)
  V_DIAG: 36,   // entrar o salir de la Diagonal (curva de 45°)
  V_ROT: 30,    // velocidad dentro de la rotonda
  YIELD_MAX: 3, // segundos cediendo el paso antes de mandarse
  LINE: 9,      // en una bocacalle común se frena antes de la cebra
  PANIC: 1.5,   // cuánto más rápido maneja uno asustado
};

// Estilos de manejo: cuánto acelera respecto de su crucero, a cuántos segundos sigue
// al de adelante (T) y a qué distancia para (S0), si se manda con el amarillo, cuánto
// toca bocina y las ganas de cambiar de carril
const STYLES = {
  tranqui: { k: 'tranqui', v: 0.88, T: 0.85, S0: 5, amber: 0, horn: 0.2, lc: 0.25, rage: 0.05 },
  normal:  { k: 'normal',  v: 1,    T: 0.6,  S0: 4, amber: 6, horn: 0.45, lc: 0.45, rage: 0.25 },
  picante: { k: 'picante', v: 1.14, T: 0.42, S0: 3, amber: 16, horn: 0.9, lc: 0.8, rage: 0.55 },
};

// Reserva de bocacalles: quién está comprometido adentro de cada una y quién reclama turno
const BOXES = new Map();
const CLAIMS = new Map();

// Puntos del rectángulo de un auto (en mitades de largo y ancho) para ver si pisa una zona
const FOOT = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 0], [0, 1], [0, -1]];

// Clave de la bocacalle (i, j). Empieza en 1: la de la esquina del mapa no puede ser 0,
// que es "sin reserva" (ahí nadie la reservaba nunca y entraban todos a la vez)
const jkey = (i, j) => i * 1000 + j + 1;
const jij = key => [((key - 1) / 1000) | 0, (key - 1) % 1000];

const angDiff = (a, b) => ((((a - b) % TAU) + TAU * 1.5) % TAU) - Math.PI;
const dirOf = a => ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4;

class TrafficAI {
  constructor() {
    this.zcache = new Map();
    this.dj = null;
    this.djKeys = null;
  }

  colW(i) { return i === PLAZA_CX ? AVENUE_ROAD : ROAD; }
  rowH(j) { return j === PLAZA_CY ? AVENUE_ROAD : ROAD; }

  isAveRoad(dir, idx) { return !isDiag(dir) && idx === (dir % 2 === 0 ? PLAZA_CY : PLAZA_CX); }
  onAve(c) { return this.isAveRoad(c.dir, this.roadIdx(c.dir, c.x, c.y)); }

  // Índice de la calle por la que va un auto en el sentido `dir` (fila si va horizontal, columna si va vertical)
  roadIdx(dir, x, y) {
    if (isDiag(dir)) return 0;
    return clamp(Math.round(((dir % 2 === 0 ? y : x) - ROAD / 2) / CELL), 0, GRID - 1);
  }

  // Hacia dónde crece la coordenada de avance, y la coordenada de avance de un punto
  // (x o y en una calle, la distancia desde la plaza en la Diagonal)
  sgn(d) { return d === 0 || d === 1 || d === 4 ? 1 : -1; }
  alongOf(d, x, y) {
    if (isDiag(d)) return (x - PLAZA_PX) * DIAG_UX + (y - PLAZA_PY) * DIAG_UY;
    return d % 2 === 0 ? x : y;
  }

  // Coordenada lateral del carril: siempre a la derecha del sentido de marcha, centrado
  // entre la raya y el cordón. En la avenida hay dos por mano: 0 el de adentro, 1 el de la vereda.
  laneCoord(dir, idx, lane) {
    const isAve = this.isAveRoad(dir, idx);
    const off = isAve ? AVE_LANES[lane ? 1 : 0] : LANE_OFF;
    const center = idx * CELL + (isAve ? AVENUE_ROAD : ROAD) / 2;
    if (dir % 2 === 0) return center + (dir === 0 ? off : -off);
    return center + (dir === 1 ? -off : off);
  }

  // Punto del carril de `dir` sobre la calle `idx`, a la altura `along` del eje de marcha
  lanePoint(dir, idx, lane, along) {
    if (isDiag(dir)) {
      return {
        x: PLAZA_PX + DIAG_UX * along - DYS[dir] * DIAG_LANE,
        y: PLAZA_PY + DIAG_UY * along + DXS[dir] * DIAG_LANE,
      };
    }
    const lc = this.laneCoord(dir, idx, lane);
    return dir % 2 === 0 ? { x: along, y: lc } : { x: lc, y: along };
  }

  // Cuánto está corrido el auto del centro de su carril (positivo: hacia la derecha)
  latOf(c, d, idx, lane) {
    const q = this.lanePoint(d, idx, lane, this.alongOf(d, c.x, c.y));
    return (c.x - q.x) * -DYS[d] + (c.y - q.y) * DXS[d];
  }

  // Carril para las cuentas: en una calle común hay uno solo por mano
  laneKey(d, idx, lane) { return this.isAveRoad(d, idx) ? (lane ? 1 : 0) : 0; }

  // ¿(x, y) está sobre el asfalto de una calle de la grilla? (sin las veredas)
  asphalt(x, y) {
    const i = Math.floor(x / CELL), j = Math.floor(y / CELL);
    const ox = x - i * CELL, oy = y - j * CELL;
    return (ox >= SIDEWALK && ox < this.colW(i) - SIDEWALK) || (oy >= SIDEWALK && oy < this.rowH(j) - SIDEWALK);
  }

  // Bocacalles por las que pasa la Diagonal (sin la rotonda), ordenadas desde el obelisco.
  // La primera y la última son las puntas: ahí se entra y se sale doblando.
  diagJ() {
    if (this.dj) return this.dj;
    const out = [];
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        if (i === PLAZA_CX && j === PLAZA_CY) continue;
        const x = i * CELL + this.colW(i) / 2, y = j * CELL + this.rowH(j) / 2;
        if (!inDiagonalBand(x, y)) continue;
        out.push({ i, j, key: jkey(i, j), u: this.alongOf(4, x, y) });
      }
    }
    out.sort((a, b) => a.u - b.u);
    this.dj = out.length > 1 ? out : [];
    this.djKeys = new Set(this.dj.map(J => J.key));
    return this.dj;
  }
  isDiagKey(key) { this.diagJ(); return this.djKeys.has(key); }

  boxCenter(key) {
    const [i, j] = jij(key);
    return { i, j, x: i * CELL + this.colW(i) / 2, y: j * CELL + this.rowH(j) / 2 };
  }

  // Bocacalle en la que está parado el auto ahora mismo (o null si está en una cuadra)
  boxAt(x, y) {
    const i = Math.floor(x / CELL), j = Math.floor(y / CELL);
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) return null;
    if (x - i * CELL < this.colW(i) && y - j * CELL < this.rowH(j)) return { i, j };
    return null;
  }

  // Zona de conflicto de una bocacalle: el cruce, y en la Diagonal además la parte de
  // la banda que pisa el asfalto de las calles alrededor
  inZone(key, x, y) {
    const [i, j] = jij(key);
    const x0 = i * CELL, y0 = j * CELL, x1 = x0 + this.colW(i), y1 = y0 + this.rowH(j);
    if (x >= x0 && x < x1 && y >= y0 && y < y1) return true;
    if (!this.isDiagKey(key)) return false;
    if (Math.abs(x - (x0 + x1) / 2) > 110 || Math.abs(y - (y0 + y1) / 2) > 110) return false;
    return inDiagonalBand(x, y) && this.asphalt(x, y);
  }

  // ¿Alguna parte del auto (w x h, con rumbo a) pisa la zona de la bocacalle?
  footIn(key, x, y, a, w, h) {
    const ca = Math.cos(a), sa = Math.sin(a), hw = w / 2, hh = h / 2;
    for (const [u, v] of FOOT) {
      if (this.inZone(key, x + u * hw * ca - v * hh * sa, y + u * hw * sa + v * hh * ca)) return true;
    }
    return false;
  }

  // Coordenada de avance donde el carril (con un margen de costado lat) entra a la zona de
  // la bocacalle, o donde termina de salir (out). En una común es el borde del cruce.
  zoneAlong(key, d, lane, lat = 0, out = false) {
    const ck = (((key * 8 + d) * 2 + lane) * 2 + (lat ? 1 : 0)) * 2 + (out ? 1 : 0);
    let v = this.zcache.get(ck);
    if (v !== undefined) return v;
    const b = this.boxCenter(key), s = this.sgn(d);
    const idx = isDiag(d) ? 0 : d % 2 === 0 ? b.j : b.i;
    const a0 = this.alongOf(d, b.x, b.y), rx = -DYS[d], ry = DXS[d];
    const hit = al => {
      const p = this.lanePoint(d, idx, lane, al);
      return this.inZone(key, p.x, p.y)
        || (lat > 0 && (this.inZone(key, p.x + rx * lat, p.y + ry * lat) || this.inZone(key, p.x - rx * lat, p.y - ry * lat)));
    };
    v = a0;
    if (out) {
      for (let k = 0; k <= 170; k++) if (!hit(a0 + s * k)) { v = a0 + s * k; break; }
    } else {
      for (let k = 170; k >= 0; k--) if (hit(a0 - s * k)) { v = a0 - s * k; break; }
    }
    this.zcache.set(ck, v);
    return v;
  }

  // Borde del cruce (sin la banda de la Diagonal) por donde se entra o se sale en el sentido d
  boxEdge(key, d, out) {
    const b = this.boxCenter(key);
    const half = d % 2 === 0 ? this.colW(b.i) / 2 : this.rowH(b.j) / 2;
    return this.alongOf(d, b.x, b.y) + this.sgn(d) * (out ? half : -half);
  }

  // Distancia del paragolpes delantero a la raya de la bocacalle `key` llegando en el sentido d
  toLine(c, key, d) {
    const idx = this.roadIdx(d, c.x, c.y);
    const inA = this.zoneAlong(key, d, this.laneKey(d, idx, c.lane), 7, false);
    const margin = this.isDiagKey(key) ? 2 : DRV.LINE;
    return this.sgn(d) * (inA - this.alongOf(d, c.x, c.y)) - c.w / 2 - margin;
  }

  // Próxima bocacalle hacia adelante y distancia (del centro del auto) hasta su borde de entrada
  nextCross(c) {
    const d = c.dir, horiz = d % 2 === 0;
    const p = horiz ? c.x : c.y;
    const wOf = k => (horiz ? this.colW(k) : this.rowH(k));
    let k, edge, dist;
    if (d === 0 || d === 1) {
      k = Math.floor(p / CELL) + 1;
      edge = k * CELL;
      dist = edge - p;
    } else {
      k = Math.floor(p / CELL);
      if (p < k * CELL + wOf(k)) k -= 1;
      edge = k * CELL + wOf(k);
      dist = p - edge;
    }
    const idx = this.roadIdx(d, c.x, c.y);
    const i = horiz ? k : idx, j = horiz ? idx : k;
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) return null;
    return { i, j, dist };
  }

  // Próxima bocacalle adelante, también yendo por la Diagonal: {i, j, key}
  nextJ(c) {
    const d = c.dir;
    if (isDiag(d)) {
      const u = this.alongOf(d, c.x, c.y), s = this.sgn(d);
      let best = null;
      for (const J of this.diagJ()) {
        const ahead = s * (J.u - u);
        if (ahead > -6 && (!best || ahead < s * (best.u - u))) best = J;
      }
      return best;
    }
    const nc = this.nextCross(c);
    if (!nc) return null;
    // Todavía en la zona de la bocacalle de la Diagonal que acaba de cruzar: la próxima es esa
    return { i: nc.i, j: nc.j, key: jkey(nc.i, nc.j) };
  }

  roadOK(x, y) {
    return x > 10 && y > 10 && x < WORLD - 10 && y < WORLD - 10
      && onRoad(x, y) && !hitBuilding(x, y, 4) && !hitCarBlock(x, y, 4);
  }

  // Hay calle para salir de la bocacalle (i,j) en el sentido nd?
  exitOK(i, j, nd, lane) {
    if (isDiag(nd)) {
      const dj = this.diagJ(), k = dj.findIndex(J => J.i === i && J.j === j);
      return k >= 0 && (nd === 4 ? k < dj.length - 1 : k > 0);
    }
    const x0 = i * CELL, y0 = j * CELL, x1 = x0 + this.colW(i), y1 = y0 + this.rowH(j);
    const idx = nd % 2 === 0 ? j : i;
    const edge = nd === 0 ? x1 : nd === 2 ? x0 : nd === 1 ? y1 : y0;
    // Hasta casi la próxima bocacalle: nadie se mete en una calle cortada por el río o el borde
    for (const s of [12, 45, 90, CELL - ROAD - 4]) {
      const p = this.lanePoint(nd, idx, lane, edge + (nd === 0 || nd === 1 ? s : -s));
      if (!this.roadOK(p.x, p.y)) return false;
    }
    return true;
  }

  // No bloquear la bocacalle: ¿hay alguien parado justo donde voy a salir?
  exitBlocked(c, x, y) {
    for (const o of G.cars) {
      if (o === c || o.hp <= 0) continue;
      if (Math.abs(o.x - x) < 15 && Math.abs(o.y - y) < 15 && (o.rv === undefined ? Math.abs(o.spd) : o.rv) < 5) return true;
    }
    return false;
  }

  // ¿El carril `lane` de la avenida está libre al lado del auto? (para cambiarse) El que
  // viene atrás más rápido necesita lugar para frenar; al de adelante más lento, no comérselo.
  laneFree(c, lane, back = 30, ahead = 40) {
    const d = c.dir, idx = this.roadIdx(d, c.x, c.y);
    const lc = this.laneCoord(d, idx, lane);
    for (const o of G.cars) {
      if (o === c || o.hp <= 0) continue;
      const fwd = (o.x - c.x) * DXS[d] + (o.y - c.y) * DYS[d];
      const lat = d % 2 === 0 ? o.y : o.x;
      if (Math.abs(lat - lc) >= 10) continue;
      const ov = Math.max(0, o.spd * Math.cos(o.ang - DIRS[d]));
      const b = back + Math.max(0, ov - c.spd) * 1.1 + ov * 0.3;
      const a = ahead + Math.max(0, c.spd - ov) * 1.1;
      if (fwd > -b && fwd < a) return false;
    }
    return true;
  }

  // Curva de Bézier cúbica muestreada: arranca con el rumbo de entrada y termina con el de salida
  curve(p0, a0, p3, a1, k, n = 10, extra = {}) {
    const p1 = { x: p0.x + Math.cos(a0) * k, y: p0.y + Math.sin(a0) * k };
    const p2 = { x: p3.x - Math.cos(a1) * k, y: p3.y - Math.sin(a1) * k };
    const pts = [];
    for (let s = 1; s <= n; s++) {
      const t = s / n, m = 1 - t;
      pts.push({
        x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x,
        y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y,
        ...extra,
      });
    }
    return pts;
  }

  // Salidas posibles de la bocacalle `key` llegando en el sentido d, con sus ganas
  exitsFor(key, d) {
    const [i, j] = jij(key), out = [];
    const dj = this.diagJ(), J = dj.find(q => q.key === key);
    const first = !!J && J === dj[0], last = !!J && J === dj[dj.length - 1];
    if (isDiag(d)) {
      // Por la Diagonal se sigue derecho hasta la punta, y ahí se dobla a una calle
      if (!J) return out;
      if (d === 4 ? !last : !first) out.push({ e: d, w: 1 });
      else for (const e of d === 4 ? [0, 1] : [2, 3]) if (this.exitOK(i, j, e, e === (d === 4 ? 0 : 2) ? 0 : 1)) out.push({ e, w: 1 });
      return out;
    }
    const R = (d + 1) % 4, Lt = (d + 3) % 4;
    for (const [e, w] of [[d, 0.56], [R, 0.23], [Lt, 0.21]]) {
      if (this.exitOK(i, j, e, e === Lt ? 0 : 1)) out.push({ e, w });
    }
    // En las puntas de la Diagonal se puede agarrar para la Casa Rosada o para el obelisco
    if (first && (d === 0 || d === 1)) out.push({ e: 4, w: 0.3 });
    if (last && (d === 2 || d === 3)) out.push({ e: 5, w: 0.3 });
    return out;
  }

  // Elige qué hacer en la bocacalle (i,j) y arma el camino de giro
  planCross(c, i, j) {
    const key = jkey(i, j);
    c.planKey = key;
    c.move = null;
    if (i === PLAZA_CX && j === PLAZA_CY && getObelisco()) {
      this.planRotonda(c);
      return;
    }
    const d = c.dir;
    const opts = this.exitsFor(key, d);
    let e;
    const forced = c.forceE;
    c.forceE = undefined;
    if (forced !== undefined && opts.some(o => o.e === forced)) {
      e = forced; // se va por otro lado (ver reroute)
    } else if (!opts.length) {
      e = backOf(d); // calle sin salida: pegar la vuelta
    } else if (c.panic > 0 && c.fear) {
      // Asustado: agarra para el lado que más lo aleja de lo que lo asustó
      let best = -Infinity;
      for (const o of opts) {
        const sc = DXS[o.e] * (c.x - c.fear.x) + DYS[o.e] * (c.y - c.fear.y) + rnd(0, 40);
        if (sc > best) { best = sc; e = o.e; }
      }
    } else {
      let r = Math.random() * opts.reduce((a, o) => a + o.w, 0);
      e = opts[opts.length - 1].e;
      for (const o of opts) if ((r -= o.w) <= 0) { e = o.e; break; }
    }
    // En la avenida, para doblar primero se acomoda en el carril que corresponde. Si al
    // lado viene alguien, no se le tira encima: hace otra cosa que pueda hacer desde su
    // carril (seguir derecho, o doblar para el otro lado) y dobla en la próxima.
    const turnTo = x => angDiff(DIRS[x], DIRS[d]); // + derecha, - izquierda
    if (e !== d && Math.abs(turnTo(e)) <= 2.5 && this.onAve(c)) {
      const need = turnTo(e) > 0 ? 1 : 0;
      if (need !== c.lane) {
        if (this.laneFree(c, need)) c.lane = need;
        else {
          const alt = opts.find(o => o.e === d) || opts.find(o => o.e !== e && (turnTo(o.e) > 0 ? 1 : 0) === c.lane);
          if (alt) e = alt.e;
          else c.lane = need; // no le queda otra: se cambia igual
        }
      }
    }
    const turn = turnTo(e);
    const U = Math.abs(turn) > 2.5;
    c.move = { i, j, key, d, e };
    if (e === d) {
      c.signal = 0;
      return;
    }

    const s = this.sgn(d), idxIn = this.roadIdx(d, c.x, c.y);
    const viaDiag = isDiag(d) || isDiag(e);
    // La curva arranca en el borde del cruce; si entra o sale de la Diagonal, en el borde de la
    // zona, que es más largo y da para una curva suave de 45°
    const inA = viaDiag ? this.zoneAlong(key, d, this.laneKey(d, idxIn, c.lane), 0, false) : this.boxEdge(key, d, false);
    let entry = this.lanePoint(d, idxIn, c.lane, inA), a0 = DIRS[d];
    // Ya pasó donde empieza la curva (apareció o quedó adentro): la arma desde donde está
    if (s * (this.alongOf(d, c.x, c.y) - inA) > -3) {
      entry = { x: c.x, y: c.y };
      a0 = c.ang;
    }
    const laneOut = U || isDiag(e) ? 0 : turn > 0 ? 1 : 0;
    let exit;
    if (U) {
      exit = this.lanePoint(e, idxIn, 0, inA);
    } else {
      const idxOut = isDiag(e) ? 0 : e % 2 === 0 ? j : i;
      const outA = viaDiag ? this.zoneAlong(key, e, this.laneKey(e, idxOut, laneOut), 0, true) : this.boxEdge(key, e, true);
      exit = this.lanePoint(e, idxOut, laneOut, outA);
    }
    const span = Math.max(Math.abs(exit.x - entry.x), Math.abs(exit.y - entry.y));
    const k = U ? span * 0.7 : Math.abs(turn) < 1 ? span * 0.42 : span * 0.55;
    c.path = [entry].concat(this.curve(entry, a0, exit, DIRS[e], k));
    c.pi = 0;
    c.entry = entry;
    c.after = { dir: e, lane: laneOut };
    c.turnV = U ? DRV.V_RIGHT * 0.8 : Math.abs(turn) < 1 ? DRV.V_DIAG : turn > 0 ? DRV.V_RIGHT : DRV.V_LEFT;
    c.signal = U || turn < 0 ? -1 : 1;
  }

  // Rotonda del obelisco: cede el paso, entra al anillo, lo circula en sentido
  // antihorario y sale por la salida elegida, siempre sin teletransportarse.
  planRotonda(c, fromRing, avoid) {
    const ob = getObelisco();
    const ox = ob.x + ob.w / 2, oy = ob.y + ob.h / 2;
    const rr = (ROTONDA_ISLAND_R + ROTONDA_R) / 2;
    const ringPt = th => ({ x: ox + Math.cos(th) * rr, y: oy + Math.sin(th) * rr, ring: true });
    const outR = ROTONDA_R + 16;

    const d = isDiag(c.dir) ? dirOf(c.ang) : c.dir;
    const r = Math.random();
    let nd = r < 0.3 ? (d + 1) % 4 : r < 0.72 ? d : r < 0.95 ? (d + 3) % 4 : (d + 2) % 4;
    const iC = PLAZA_CX, jC = PLAZA_CY;
    // Su salida estaba tapada: sigue dando la vuelta y sale por la siguiente
    if (avoid !== undefined) {
      nd = (avoid + 3) % 4;
      for (let k = 0; k < 3 && !this.exitOK(iC, jC, nd, 0); k++) nd = (nd + 3) % 4;
    }
    if (!this.exitOK(iC, jC, nd, 0)) nd = [0, 1, 2, 3].find(o => this.exitOK(iC, jC, o, 0)) ?? (d + 2) % 4;

    const path = [];
    let thIn;
    c.entry = null;
    c.mergePt = null;
    if (fromRing) {
      thIn = Math.atan2(c.y - oy, c.x - ox);
    } else {
      // Línea de ceda el paso sobre el carril de llegada, antes del anillo
      const idx = this.roadIdx(d, c.x, c.y);
      const along = (d % 2 === 0 ? ox : oy) - (d === 0 || d === 1 ? outR : -outR);
      const yieldPt = this.lanePoint(d, idx, c.lane, along);
      thIn = DIRS[d] + Math.PI - 0.55;
      const merge = ringPt(thIn);
      c.mergePt = merge;
      path.push(yieldPt);
      path.push(...this.curve(yieldPt, DIRS[d], merge, thIn - Math.PI / 2, 14, 5));
      path[path.length - 1].ring = true;
      c.entry = yieldPt;
      c.mergeTh = thIn;
    }

    // Vuelta por el anillo: el ángulo baja (antihorario en pantalla) hasta la salida.
    // Si la salida elegida quedó justo atrás (apareció en el anillo), toma la siguiente
    // en vez de dar la vuelta entera.
    let thOut = DIRS[nd] + 0.55;
    let arc = ((thIn - thOut) % TAU + TAU) % TAU;
    if (arc < 0.35 && avoid === undefined) {
      nd = (nd + 3) % 4;
      thOut = DIRS[nd] + 0.55;
      arc = ((thIn - thOut) % TAU + TAU) % TAU;
    }
    for (let a = 0.22; a < arc; a += 0.22) path.push(ringPt(thIn - a));
    const last = ringPt(thIn - arc);
    path.push(last);

    // Salida: se abre del anillo al carril de la avenida
    const idxOut = nd % 2 === 0 ? jC : iC;
    const alongOut = (nd % 2 === 0 ? ox : oy) + (nd === 0 || nd === 1 ? outR : -outR);
    const exit = this.lanePoint(nd, idxOut, 0, alongOut);
    const exitPts = this.curve(last, thOut - Math.PI / 2, exit, DIRS[nd], 14, 5, { exit: true });
    path.push(...exitPts);

    c.dir = d;
    c.path = path;
    c.pi = 0;
    c.rot = true;
    c.ringOut = { nd, th: thOut, pt: exit };
    c.after = { dir: nd, lane: 0 }; // sale por el de adentro; si quiere, después se cambia mirando
    c.turnV = DRV.V_ROT;
    c.signal = 0;
  }

  // La maniobra cruza la mano contraria (dobla a la izquierda o pega la vuelta)
  across(m) {
    if (m.e === m.d) return false;
    const t = angDiff(DIRS[m.e], DIRS[m.d]);
    return t < -0.3 || Math.abs(t) > 2.5;
  }

  // ¿Se pisan dos maniobras adentro de la bocacalle? Las que vienen por la misma mano no (van
  // en fila); las de manos opuestas solo si alguna cruza; todas las demás se cruzan.
  conflicts(a, b) {
    if (!a || !b || a.d === b.d) return false;
    if (backOf(a.d) === b.d) return this.across(a) || this.across(b);
    return true;
  }

  lightAllows(c, m, toLine) {
    if (c.panic > 0) return true; // asustado no mira el semáforo
    const L = lights[m.j * GRID + m.i];
    if (!L) return true;
    const st = lightState(L, isDiag(m.d) ? 'd' : m.d % 2 === 0);
    if (st === 'verde') return true;
    if (st !== 'amarillo') return false;
    // En amarillo sigue el que ya no llega a frenar (y el picante que viene rápido, aunque
    // llegue). El que está parado en la raya espera el verde.
    const need = (c.spd * c.spd) / (2 * DRV.B);
    return toLine <= need + (c.drv && c.spd > 25 ? c.drv.amber : 0);
  }

  // Punto justo después de la bocacalle donde va a quedar el auto al salir
  exitSpot(c, m) {
    const e = m.e, laneOut = c.path && c.after ? c.after.lane : c.lane;
    const b = this.boxCenter(m.key);
    const idx = isDiag(e) ? 0 : e % 2 === 0 ? b.j : b.i;
    const outA = this.zoneAlong(m.key, e, this.laneKey(e, idx, laneOut), 7, true);
    return this.lanePoint(e, idx, laneOut, outA + this.sgn(e) * (c.w * 0.5 + 4));
  }

  // Doblar a la izquierda (o pegar la vuelta) cruza la mano contraria: espera un hueco entre
  // los que vienen de frente (a los que ya están adentro los ordena la reserva)
  oncomingBusy(c, m) {
    if (!this.across(m) || CLAIMS.get(m.key) === c) return false;
    const opp = backOf(m.d), b = this.boxCenter(m.key);
    for (const o of G.cars) {
      if (o === c || o.hp <= 0 || !o.ai || o.chase || o.rage || o.dir !== opp || o.commit === m.key) continue;
      if (Math.abs(o.x - b.x) > 190 || Math.abs(o.y - b.y) > 190) continue;
      const om = o.move && o.move.key === m.key ? o.move : null;
      if (om && !this.conflicts(m, om)) continue;
      const line = this.toLine(o, m.key, opp);
      if (line < -4 || line > 160) continue;
      // Parado en la raya (con rojo o esperando) no viene
      if (o.spd < 4 && line < 25) continue;
      if (line / Math.max(o.spd, 10) < 2.6) return true;
    }
    return false;
  }

  // ¿Hay lugar para salir de la bocacalle `key` hacia e? (el carril de llegada como en planCross)
  exitFreeFor(c, key, d, e) {
    const t = angDiff(DIRS[e], DIRS[d]);
    const laneOut = Math.abs(t) > 2.5 || isDiag(e) ? 0 : e === d ? c.lane : t > 0 ? 1 : 0;
    const b = this.boxCenter(key), idx = isDiag(e) ? 0 : e % 2 === 0 ? b.j : b.i;
    const outA = this.zoneAlong(key, e, this.laneKey(e, idx, laneOut), 7, true);
    const p = this.lanePoint(e, idx, laneOut, outA + this.sgn(e) * (c.w * 0.5 + 4));
    return !this.exitBlocked(c, p.x, p.y);
  }

  // Hace rato que no puede salir para donde quería (la cuadra de enfrente está llena): se va
  // por otro lado que tenga lugar. Así una ronda de filas que se esperan entre sí (todos
  // doblando alrededor de la misma manzana) se desarma sola.
  reroute(c, m) {
    const opts = this.exitsFor(m.key, m.d).filter(o => o.e !== m.e && this.exitFreeFor(c, m.key, m.d, o.e));
    if (!opts.length) return false;
    c.forceE = opts[(Math.random() * opts.length) | 0].e;
    c.path = null;
    this.planCross(c, m.i, m.j);
    return true;
  }

  // Motivo por el que todavía no puede entrar, o null si puede comprometerse
  commitBlock(c, m, toLine) {
    if (!this.lightAllows(c, m, toLine)) return 'semaforo';
    const out = this.exitSpot(c, m);
    if (this.exitBlocked(c, out.x, out.y)) return 'bocacalle';
    const set = BOXES.get(m.key);
    if (set) {
      for (const o of set) {
        const om = o.commit === m.key ? o.cmove : o.commit2 === m.key ? o.cmove2 : null;
        if (!om || o.hp <= 0 || !G.cars.includes(o)) { set.delete(o); continue; }
        if (this.conflicts(m, om)) return 'cruce';
      }
    }
    // Turno reclamado por alguien que espera hace rato (el que dobla a la izquierda contra
    // un chorro de autos, o la calle sin semáforo): los que se le cruzan lo dejan pasar
    const cl = CLAIMS.get(m.key);
    if (cl && cl !== c) {
      const alive = cl.hp > 0 && cl.move && cl.move.key === m.key && !cl.commit && G.cars.includes(cl);
      if (!alive) CLAIMS.delete(m.key);
      // (el que ya no llega a frenar pasa: se compromete y el que reclamó lo espera)
      else if (this.conflicts(m, cl.move) && this.lightAllows(cl, cl.move, 0) && toLine > (c.spd * c.spd) / (2 * DRV.B)) return 'cruce';
    }
    if (this.oncomingBusy(c, m)) return 'cruce';
    return null;
  }

  // Reserva la bocacalle. Si todavía está saliendo de la anterior (en la Diagonal las zonas
  // casi se tocan), esa queda reservada aparte hasta que termine de dejarla.
  commitTo(c, m) {
    if (c.commit2 && c.commit2 === m.key) {
      // La que estaba dejando vuelve a ser la actual (lo empujaron para atrás, replaneó)
      [c.commit, c.commit2, c.cmove, c.cmove2] = [c.commit2, c.commit, m, c.cmove];
      c.commitT = 0;
      c.boxSeen = false;
      return;
    }
    if (c.commit && c.commit !== m.key) {
      this.drop(c, 2);
      c.commit2 = c.commit;
      c.cmove2 = c.cmove;
      c.commit = 0;
    }
    let set = BOXES.get(m.key);
    if (!set) BOXES.set(m.key, set = new Set());
    set.add(c);
    c.commit = m.key;
    c.cmove = m; // la maniobra a la que se comprometió (move ya puede apuntar a la próxima)
    c.commitT = 0;
    c.boxSeen = false;
    c.lineT = 0;
    if (CLAIMS.get(m.key) === c) CLAIMS.delete(m.key);
  }

  // Suelta la reserva actual (k = 1) o la de la bocacalle que está dejando (k = 2)
  drop(c, k) {
    const key = k === 2 ? c.commit2 : c.commit;
    if (!key) return;
    const set = BOXES.get(key);
    if (set && c.commit !== c.commit2) set.delete(c);
    // La maniobra de esa bocacalle ya está hecha: que no se vuelva a comprometer con ella
    if (c.move && c.move.key === key) c.move = null;
    if (k === 2) { c.commit2 = 0; c.cmove2 = null; } else c.commit = 0;
  }

  release(c) {
    this.drop(c, 2);
    this.drop(c, 1);
  }

  // Vuelta en U en la misma calle (calle cortada por el río o la explanada)
  planUTurn(c) {
    const d = c.dir, U = backOf(d), idx = this.roadIdx(d, c.x, c.y);
    const vt = DRV.V_RIGHT * 0.8;
    // Arranca la vuelta recién cuando le da para frenar hasta la velocidad de giro
    const brake = Math.max(4, (c.spd * c.spd - vt * vt) / (2 * 45));
    const along = this.alongOf(d, c.x, c.y) + this.sgn(d) * brake;
    const entry = this.lanePoint(d, idx, c.lane, along);
    const exit = this.lanePoint(U, idx, 0, along);
    const span = Math.max(Math.abs(exit.x - entry.x), Math.abs(exit.y - entry.y));
    c.path = [entry].concat(this.curve(entry, DIRS[d], exit, DIRS[U], span * 0.7));
    c.pi = 0;
    c.entry = entry;
    c.after = { dir: U, lane: 0 };
    c.turnV = vt;
    c.signal = -1;
    c.planKey = -1;
    c.move = null;
  }

  // Esquivar algo parado (patrullero, auto roto, el jugador, alguien en la calle):
  // en la avenida se cambia de carril; en una calle común se usa la mano contraria si viene libre
  tryDodge(c, obst) {
    const d = c.dir, idx = this.roadIdx(d, c.x, c.y);
    if (this.isAveRoad(d, idx)) {
      if (!this.laneFree(c, 1 - c.lane, 15, 110)) return false;
      c.lane = 1 - c.lane;
      return true;
    }
    const off = -2 * (isDiag(d) ? DIAG_LANE : LANE_OFF); // la mano contraria
    const fx = DXS[d], fy = DYS[d], rx = -fy, ry = fx;
    const myLat = this.latOf(c, d, idx, c.lane);
    for (const o of G.cars) {
      if (o === c || o === obst || o.hp <= 0) continue;
      const ox = o.x - c.x, oy = o.y - c.y;
      const fwd = ox * fx + oy * fy, lat = ox * rx + oy * ry + myLat;
      if (fwd > -15 && fwd < 130 && Math.abs(lat - off) < 12) return false;
    }
    const oAlong = (obst.x - c.x) * fx + (obst.y - c.y) * fy;
    const until = oAlong + (obst.w || 6) / 2 + c.w + 8;
    // Que haya calle de ese lado todo el tramo
    for (const s of [10, until * 0.5, until]) {
      const q = this.lanePoint(d, idx, c.lane, this.alongOf(d, c.x, c.y) + this.sgn(d) * s);
      if (!this.roadOK(q.x + rx * off, q.y + ry * off)) return false;
    }
    c.dodge = { off, obst, until, from: 0 };
    c.signal = -1;
    return true;
  }

  // Cada chofer maneja a su manera: los colectivos y las camionetas tranquilos, los
  // deportivos y los tacheros picantes
  pickStyle(c) {
    const k = c.model && c.model.k;
    const r = Math.random();
    let s;
    if (k === 'bus' || k === 'van') s = r < 0.65 ? 'tranqui' : 'normal';
    else if (k === 'deport' || k === 'taxi') s = r < 0.6 ? 'picante' : 'normal';
    else s = r < 0.22 ? 'tranqui' : r < 0.78 ? 'normal' : 'picante';
    c.drv = STYLES[s];
  }

  // Primer uso (o cuando lo dejan de manejar a lo loco): rumbo y carril según dónde está
  initNav(c) {
    c.nav = true;
    if (!c.drv) this.pickStyle(c);
    c.dir = dirOf(c.ang);
    if (inDiagonalBand(c.x, c.y) && !this.asphalt(c.x, c.y)) {
      const k = Math.cos(c.ang - DIAG_ANG);
      if (Math.abs(k) > 0.5) c.dir = k > 0 ? 4 : 5;
    }
    // En la avenida, el carril más cercano (no se cruza de golpe al otro)
    const idx = this.roadIdx(c.dir, c.x, c.y);
    c.lane = this.isAveRoad(c.dir, idx)
      ? (Math.abs(this.latOf(c, c.dir, idx, 1)) < Math.abs(this.latOf(c, c.dir, idx, 0)) ? 1 : 0)
      : 0;
    c.path = null;
    c.rot = false;
    c.inRing = false;
    c.ringArc = 0;
    c.planKey = -1;
    c.signal = 0;
    c.yieldT = 0;
    c.bold = 0;
    c.laneT = rnd(4, 12);
    c.dodge = null;
    c.blockT = 0;
    c.pedIgn = 0;
    c.evT = 0;
    this.release(c);
    c.move = null;
    c.lineT = 0;
    const ob = getObelisco();
    if (ob && Math.hypot(c.x - ob.x - ob.w / 2, c.y - ob.y - ob.h / 2) < ROTONDA_R + 6) {
      this.planRotonda(c, true); // apareció adentro de la rotonda: la termina de circular
    }
  }

  // Corrimiento lateral buscado respecto del centro del carril
  latWant(c) {
    if (c.dodge) return c.dodge.off;
    let off = 0;
    // Contra el cordón: el costado del auto pegado a la vereda (en la avenida, solo desde el
    // carril de la vereda; desde el de adentro se le metería encima al de al lado)
    if (c.pullOver > 0 && !isDiag(c.dir) && (!this.onAve(c) || c.lane === 1)) {
      const half = this.onAve(c) ? AVE_CURB - AVE_LANES[1] : ROAD / 2 - SIDEWALK - LANE_OFF;
      off = Math.max(0, half - c.h / 2 - 1);
    }
    if (c.evT > 0) off += c.evSide * 9;
    return off;
  }

  // Punto al que apunta el volante: el siguiente del camino o un punto del carril más adelante
  target(c, Ld) {
    if (c.path) {
      const hx = Math.cos(c.ang), hy = Math.sin(c.ang);
      while (c.pi < c.path.length - 1) {
        const q = c.path[c.pi], qx = q.x - c.x, qy = q.y - c.y;
        if (Math.hypot(qx, qy) >= Ld && qx * hx + qy * hy > 0) break; // adelante y lejos: ese es
        c.pi++;
      }
      const p = c.path[c.pi];
      const behind = (p.x - c.x) * hx + (p.y - c.y) * hy <= 0;
      if (c.pi === c.path.length - 1 && (Math.hypot(p.x - c.x, p.y - c.y) < 6 || behind)) {
        // Terminó la maniobra: vuelve a seguir carril en el nuevo sentido
        c.dir = c.after.dir;
        c.lane = c.after.lane;
        c.path = null;
        c.rot = false;
        c.inRing = false;
        c.ringArc = 0;
        c.signal = 0;
        c.entry = null;
      } else {
        return p;
      }
    }
    const d = c.dir, idx = this.roadIdx(d, c.x, c.y);
    const rx = -DYS[d], ry = DXS[d];
    const e = this.latOf(c, d, idx, c.lane);
    // El corrimiento lateral se limita: un cambio de carril es una diagonal suave, no un volantazo
    const corr = clamp(this.latWant(c) - e, -Ld * 0.35, Ld * 0.35);
    return { x: c.x + DXS[d] * Ld + rx * corr, y: c.y + DYS[d] * Ld + ry * corr };
  }

  // Por dónde va a pasar en los próximos `len` px: puntos {x, y, a, s} sobre el camino de
  // giro (y la salida) o sobre el carril
  course(c, len) {
    const pts = [];
    if (c.path) {
      let px = c.x, py = c.y, s = 0;
      const walk = (tx, ty) => {
        let dx = tx - px, dy = ty - py, L = Math.hypot(dx, dy);
        if (L < 0.01) return;
        const a = Math.atan2(dy, dx);
        dx /= L; dy /= L;
        while (L > 0.01 && s < len) {
          const k = Math.min(5, L, len - s);
          px += dx * k; py += dy * k; L -= k; s += k;
          pts.push({ x: px, y: py, a, s });
        }
      };
      for (let k = c.pi; k < c.path.length && s < len; k++) walk(c.path[k].x, c.path[k].y);
      if (s < len && c.after) {
        const a = DIRS[c.after.dir];
        walk(px + Math.cos(a) * (len - s), py + Math.sin(a) * (len - s));
      }
      return pts;
    }
    const d = c.dir, idx = this.roadIdx(d, c.x, c.y), sg = this.sgn(d);
    const al = this.alongOf(d, c.x, c.y), rx = -DYS[d], ry = DXS[d];
    const e0 = this.latOf(c, d, idx, c.lane), want = this.latWant(c);
    // Corrimiento de costado como lo hace el volante (a lo sumo ~1 px por cada 3 de avance):
    // un cambio de carril no es instantáneo, y mientras tanto el de adelante sigue ahí
    const blend = Math.max(20, Math.abs(want - e0) * 3);
    for (let k = 5; k <= len; k += 5) {
      const q = this.lanePoint(d, idx, c.lane, al + sg * k);
      const lat = e0 + (want - e0) * Math.min(1, k / blend);
      pts.push({ x: q.x + rx * lat, y: q.y + ry * lat, a: DIRS[d], s: k });
    }
    // Cambiándose de carril todavía ocupa el de origen un buen trecho (el volante lo lleva
    // de a poco): ese tramo también se mira, así no se le mete de costado al que tiene adelante
    if (Math.abs(want - e0) > 3) {
      const keep = Math.min(len, Math.abs(want - e0) * 4 + 12);
      for (let k = 5; k <= keep; k += 5) {
        const q = this.lanePoint(d, idx, c.lane, al + sg * k);
        pts.push({ x: q.x + rx * e0, y: q.y + ry * e0, a: DIRS[d], s: k });
      }
    }
    return pts;
  }

  // Festejo del Mundial: la zona del obelisco queda cortada. Distancia hasta donde tiene que frenar
  // (Infinity si no hay festejo, o si ya está en la rotonda o se está yendo)
  festejoStop(c, pts) {
    const ob = G.festejo && getObelisco();
    if (!ob) return Infinity;
    const ox = ob.x + ob.w / 2, oy = ob.y + ob.h / 2, d = Math.hypot(c.x - ox, c.y - oy);
    if (d < ROTONDA_R + 10) return Infinity;
    if (d < FESTEJO_CUT && (ox - c.x) * Math.cos(c.ang) + (oy - c.y) * Math.sin(c.ang) < 0) return Infinity;
    for (const p of pts) if (Math.hypot(p.x - ox, p.y - oy) < FESTEJO_CUT) return Math.max(0, p.s - c.w / 2 - 2);
    return Infinity;
  }

  // Lo más cercano que hay adelante sobre el camino: auto, jugador o peatón
  leader(c, pts) {
    let s = Infinity, v = 0, who = null, obj = null;
    if (!pts.length) return { s, v, who, obj };
    let x0 = c.x, y0 = c.y, x1 = c.x, y1 = c.y;
    for (const p of pts) {
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    const near = (o, m) => o.x > x0 - m && o.x < x1 + m && o.y > y0 - m && o.y < y1 + m;
    // El punto del camino más cercano a o, su distancia de costado y cuánto adelante está
    const proj = o => {
      let bi = 0, bd = Infinity;
      for (let k = 0; k < pts.length; k++) {
        const dx = o.x - pts[k].x, dy = o.y - pts[k].y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; bi = k; }
      }
      const p = pts[bi], ca = Math.cos(p.a), sa = Math.sin(p.a);
      return { p, lat: Math.abs(-(o.x - p.x) * sa + (o.y - p.y) * ca), lon: (o.x - p.x) * ca + (o.y - p.y) * sa };
    };
    const skip = c.dodge ? c.dodge.obst : null;
    for (const o of G.cars) {
      if (o === c || o === skip || o.hp <= 0 || !near(o, 22)) continue;
      const { p, lat, lon } = proj(o);
      const rel = angDiff(o.ang, p.a), cr = Math.cos(rel), sr = Math.abs(Math.sin(rel));
      const across = sr * o.w / 2 + Math.abs(cr) * o.h / 2;
      if (lat > c.h / 2 + across + 1) continue;
      const gap = p.s + lon - c.w / 2 - (Math.abs(cr) * o.w / 2 + sr * o.h / 2);
      if (gap < -c.w * 0.5) continue; // lo tengo al lado o ya lo pasé
      const ov = Math.min(Math.abs(o.spd), o.rv === undefined ? Infinity : o.rv);
      let vo;
      if (cr > 0.5) {
        vo = Math.max(0, ov * cr); // va para el mismo lado: el de adelante
      } else if (ov < 3 || cr < -0.5) {
        vo = 0; // parado en mi camino, o viene de frente por mi carril
      } else {
        // Cruzando: de eso se ocupan la reserva de bocacalles y la cesión de paso. Si se
        // lo tratara como obstáculo, dos autos doblando en la misma bocacalle se esperarían
        // para siempre. Solo si ya está encima, frena.
        if (gap > 5) continue;
        vo = 0;
      }
      if (gap < s) { s = gap; v = vo; who = o; obj = o; }
    }
    for (const P of G.players) {
      if (P.dead || P.healing || P.party || P.car || P === skip || !near(P, 10)) continue;
      if (onSidewalk(P.x, P.y)) continue;
      const { p, lat, lon } = proj(P);
      if (lat > c.h / 2 + 4.5) continue;
      const gap = p.s + lon - c.w / 2 - 3;
      if (gap > -c.w * 0.5 && gap < s) { s = gap; v = 0; who = 'player'; obj = P; }
    }
    // Peatones cruzando: se frena, pero si se queda plantado en la calle, bocinazo y pasa.
    // El que va por la vereda no corta el paso (el jugador parado en el cordón trababa la fila)
    if (c.pedIgn <= 0) {
      for (const q of G.peds) {
        if (q.hp <= 0 || q.inside || q.air || q === skip || !near(q, 10)) continue;
        if (onSidewalk(q.x, q.y)) continue;
        const { p, lat, lon } = proj(q);
        if (lat > c.h / 2 + 4.5) continue;
        const gap = p.s + lon - c.w / 2 - 3;
        if (gap > -c.w * 0.5 && gap < s) { s = gap; v = 0; who = 'ped'; obj = q; }
      }
    }
    return { s, v, who, obj };
  }

  // Cesión de paso en los cruces sin prioridad clara: proyecta las dos trayectorias
  // y frena el que llega después (desempate estable por seed para no trabarse los dos)
  crossConflict(c, o) {
    // El que está parado (en el semáforo, cediendo) no va a cruzar: no hay conflicto de paso.
    // Si está quieto adentro de mi camino, lo ve leader() como obstáculo.
    if ((o.rv === undefined ? Math.abs(o.spd) : o.rv) < 3 && Math.abs(o.spd) < 3) return null;
    // Mi velocidad "de intención": si freno para ceder, la cuenta tiene que seguir diciendo
    // que choco si arranco. Con la velocidad actual (0) el que cede arrancaba y frenaba en loop.
    const vI = Math.max(c.spd, Math.min(c.cruise, 26));
    const mvx = Math.cos(c.ang) * vI, mvy = Math.sin(c.ang) * vI;
    const ovx = Math.cos(o.ang) * o.spd, ovy = Math.sin(o.ang) * o.spd;
    // Radio de choque según el ángulo: dos que se cruzan de frente por carriles opuestos
    // solo se rozan si se superponen de costado (anchos); recién cruzándose cuentan los largos
    const cross = Math.abs(Math.sin(o.ang - c.ang));
    const rad = (c.h + o.h) / 2 + 3 + cross * (c.w + o.w) / 4;
    for (let t = 0.1; t <= 1.15; t += 0.12) {
      const ex = c.x + mvx * t - (o.x + ovx * t), ey = c.y + mvy * t - (o.y + ovy * t);
      if (ex * ex + ey * ey < rad * rad) {
        const myD = vI * t, oD = Math.max(0, o.spd) * t;
        if (myD < -2) return null;
        const yieldMe = Math.abs(myD - oD) < 3 ? c.seed > o.seed : myD > oD;
        return yieldMe ? Math.max(0.5, myD - rad * 0.6) : null;
      }
    }
    return null;
  }

  // ¿Viene alguien por el anillo que llegue al punto donde me quiero meter?
  ringBusy(c) {
    const ob = getObelisco();
    const ox = ob.x + ob.w / 2, oy = ob.y + ob.h / 2;
    for (const o of G.cars) {
      if (o === c || o.hp <= 0) continue;
      const d = Math.hypot(o.x - ox, o.y - oy);
      if (d < ROTONDA_ISLAND_R || d > ROTONDA_R + 4) continue;
      if (!o.inRing && !o.chase && o.ai && !o.rage) continue;
      const th = Math.atan2(o.y - oy, o.x - ox);
      const up = ((th - c.mergeTh) % TAU + TAU) % TAU; // cuánto le falta para llegar a mi entrada
      if (up < 1.5 || up > TAU - 0.2) return true;
    }
    return false;
  }

  // Los dos carriles de la avenida desembocan en el anillo, que es de uno solo: el de afuera
  // espera al de adentro que llega a la par o ya se está metiendo (de a uno, sin rozarse)
  mergeBusy(c) {
    if (!c.mergePt) return false;
    const dm = Math.hypot(c.x - c.mergePt.x, c.y - c.mergePt.y);
    for (const o of G.cars) {
      if (o === c || o.hp <= 0 || !o.rot || o.inRing || !o.mergePt || o.lane === c.lane) continue;
      if (Math.abs(angDiff(o.mergeTh, c.mergeTh)) > 0.1) continue;
      const om = Math.hypot(o.x - o.mergePt.x, o.y - o.mergePt.y);
      if (om > 45) continue;
      if (om < dm - 4 || (Math.abs(om - dm) <= 4 && c.lane === 1)) return true;
    }
    return false;
  }

  // Cambio de carril en la avenida: para pasar a uno lento o de vez en cuando
  tryLaneChange(c, dt, lead) {
    c.laneT -= dt;
    if (c.path || c.dodge || c.laneT > 0 || c.pullOver > 0 || !this.onAve(c)) return;
    // Con la bocacalle encima ya no se cambia (y si va a doblar, ya está en su carril)
    if (c.move && (c.move.e !== c.move.d || c.commit)) return;
    const nj = this.nextJ(c);
    if (nj && this.toLine(c, nj.key, c.dir) < 40) return;
    const slowLead = lead.s < 50 && lead.v < c.cruise * 0.7;
    // Encima del de adelante ya no da para cambiarse: primero frena y después ve
    if (lead.s < 8 + Math.max(0, c.spd - lead.v) * 0.9) return;
    c.laneT = rnd(4, 10);
    if (!slowLead && Math.random() > (c.drv ? c.drv.lc : 0.5) * 0.5) return;
    const to = 1 - c.lane;
    if (!this.laneFree(c, to)) return;
    c.lane = to;
    c.signal = to === 1 ? 1 : -1; // el carril de la vereda siempre queda a la derecha
    c.signalT = 1.4;
  }

  // Bocinazo (con su sonido), sin repetirlo a cada rato
  honk(c, t = 1.1) {
    if ((c.hornCD || 0) > 0) return;
    c.horn = t;
    c.hornCD = rnd(2.2, 4.5);
    sfx('bocina', c.x, c.y, t);
  }

  // Tiros, explosiones, choques: los choferes de alrededor se asustan. Asustados manejan
  // rápido, sin mirar el semáforo y alejándose; el que está atascado cerca a veces se
  // baja y sale corriendo. k: qué tan fuerte fue (1 un tiro, 2 una explosión)
  alarm(x, y, r, from = null, k = 1) {
    for (const c of G.cars) {
      if (!c.ai || c.chase || c.hp <= 0 || c.rage) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > r) continue;
      const fresh = !(c.panic > 0);
      c.panic = Math.max(c.panic || 0, rnd(6, 10) * (0.8 + k * 0.2));
      c.fear = { x, y };
      c.pullOver = 0;
      if (!fresh) continue;
      this.honk(c, 0.8);
      // Atrapado (en la fila, en el semáforo) y con el lío encima: abandona el auto
      if (c.spd < 10 && d < 75 + k * 30 && Math.random() < 0.3 * k) this.bailOut(c, from || { x, y });
    }
  }

  // El chofer se baja (por su puerta, o por la otra si da contra una pared) y sale corriendo
  // lejos de `from` (un jugador o un punto)
  dropDriver(c, from) {
    // Por su puerta, o por la otra; si las dos dan contra una pared, por atrás del auto
    let x = c.x - Math.cos(c.ang) * (c.w / 2 + 6), y = c.y - Math.sin(c.ang) * (c.w / 2 + 6);
    for (const side of [-1, 1]) {
      const a = c.ang + side * Math.PI / 2;
      const px = c.x + Math.cos(a) * (c.h / 2 + 6), py = c.y + Math.sin(a) * (c.h / 2 + 6);
      if (!hitBuilding(px, py, 4)) { x = px; y = py; break; }
    }
    if (hitBuilding(x, y, 4)) { x = c.x; y = c.y; }
    const p = makePedAt(clamp(x, 12, WORLD - 12), clamp(y, 12, WORLD - 12));
    p.fleeT = rnd(8, 13);
    p.fleeFrom = from;
    p.fade = 1;
    G.peds.push(p);
    return p;
  }

  bailOut(c, from) {
    this.dropDriver(c, from);
    sfx('puerta', c.x, c.y);
    this.release(c);
    c.ai = false;
    c.nav = false;
    c.panic = 0;
    c.hazard = true; // queda con las balizas puestas
  }

  // Lo chocó un jugador: bocinazo; si fue fuerte, según el chofer se calienta y lo corre,
  // o se asusta
  rammed(c, P, impact) {
    if (!c.ai || c.chase || c.hp <= 0) return;
    if (c.rage) { c.rage.t = Math.max(c.rage.t, 8); return; }
    this.honk(c, 1.4);
    if (impact < 30) return;
    const style = c.drv || STYLES.normal;
    if (P && P.car && Math.random() < style.rage) this.enrage(c, P);
    else if (Math.random() < 0.6) {
      c.panic = rnd(5, 8);
      c.fear = { x: P ? P.x : c.x, y: P ? P.y : c.y };
    }
  }

  // Se calentó: sale a buscar al auto del jugador para chocarlo, sin mirar semáforos
  enrage(c, P) {
    this.release(c);
    c.rage = { P, t: rnd(10, 16) };
    c.panic = 0;
    c.path = null;
    c.dodge = null;
    c.signal = 0;
    c.hazard = false;
    c.slot = undefined;
  }

  // Se le pasó la bronca: vuelve a manejar normal desde donde está
  calm(c) {
    c.rage = null;
    c.revT = 0;
    c.nav = false;
  }

  // Volantazo: si el auto de un jugador, un patrullero o uno que se volvió loco viene derecho
  // a chocarlo, se corre para el costado libre (y frena, o acelera si lo vienen a buscar de atrás)
  evade(c) {
    if (c.evT > 0 || c.path) return;
    for (const o of G.cars) {
      if (o === c || o.hp <= 0 || (o.ai && !o.rage)) continue;
      if (Math.abs(o.spd) < 45) continue;
      const rx = c.x - o.x, ry = c.y - o.y;
      if (rx * rx + ry * ry > 130 * 130) continue;
      const wx = Math.cos(o.ang) * o.spd - Math.cos(c.ang) * c.spd;
      const wy = Math.sin(o.ang) * o.spd - Math.sin(c.ang) * c.spd;
      const w2 = wx * wx + wy * wy;
      if (w2 < 100) continue;
      const t = (rx * wx + ry * wy) / w2; // cuándo pasa más cerca
      if (t < 0.05 || t > 0.9) continue;
      const mx = rx - wx * t, my = ry - wy * t;
      if (mx * mx + my * my > 15 * 15) continue;
      // Hacia el lado en que ya está corrido respecto de la trayectoria del otro
      let side = -Math.sin(c.ang) * mx + Math.cos(c.ang) * my >= 0 ? 1 : -1;
      const ok = sd => this.roadOK(c.x - Math.sin(c.ang) * sd * 12 + Math.cos(c.ang) * 10, c.y + Math.cos(c.ang) * sd * 12 + Math.sin(c.ang) * 10);
      if (!ok(side)) side = -side;
      if (!ok(side)) side = 0;
      const behind = Math.cos(o.ang - c.ang) > 0.5 && (rx * Math.cos(c.ang) + ry * Math.sin(c.ang)) > 0; // viene de atrás
      if (behind && o.chase) continue; // la yuta con la sirena: se tira al cordón (pullOver)
      c.evT = 0.8;
      c.evSide = side;
      c.evGo = behind;
      this.honk(c, 0.9);
      return;
    }
  }

  // ¿Un auto en (x, y) yendo en el sentido d pisaría una bocacalle (o su zona en la
  // Diagonal) estirándolo m px para adelante y para atrás? ¿O está en la rotonda?
  nearJunction(x, y, m, d) {
    const ob = getObelisco();
    if (ob && Math.hypot(x - ob.x - ob.w / 2, y - ob.y - ob.h / 2) < ROTONDA_R + 50) return true;
    const keys = [];
    const i0 = Math.floor(x / CELL), j0 = Math.floor(y / CELL);
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        if (i >= 0 && j >= 0 && i < GRID && j < GRID) keys.push(jkey(i, j));
      }
    }
    for (const J of this.diagJ()) {
      const b = this.boxCenter(J.key);
      if (Math.abs(x - b.x) < 220 && Math.abs(y - b.y) < 220) keys.push(J.key);
    }
    for (const key of keys) if (this.footIn(key, x, y, DIRS[d], 24 + m * 2, 14)) return true;
    return false;
  }

  // Lugar para que aparezca un auto cerca de sp: sobre un carril, a mitad de cuadra (nunca
  // adentro de una bocacalle, donde salía doblando a toda velocidad y se estampaba), con
  // lugar adelante y atrás, y ya andando a una velocidad con la que puede frenar a tiempo
  spawnAt(sp) {
    const cands = [];
    if (inDiagonalBand(sp.x, sp.y) && !this.asphalt(sp.x, sp.y)) {
      const dj = this.diagJ();
      const u = this.alongOf(4, sp.x, sp.y);
      if (dj.length > 1 && u > dj[0].u && u < dj[dj.length - 1].u) {
        for (const d of [4, 5]) cands.push({ ...this.lanePoint(d, 0, 0, u), dir: d });
      }
    } else {
      for (const d of [0, 1, 2, 3]) {
        const idx = this.roadIdx(d, sp.x, sp.y);
        const lanes = this.isAveRoad(d, idx) ? [0, 1] : [0];
        for (const ln of lanes) {
          const al = this.alongOf(d, sp.x, sp.y);
          cands.push({ ...this.lanePoint(d, idx, ln, al), dir: d });
        }
      }
    }
    for (let k = cands.length - 1; k > 0; k--) {
      const r = (Math.random() * (k + 1)) | 0;
      [cands[k], cands[r]] = [cands[r], cands[k]];
    }
    for (const p of cands) {
      const gap = this.spawnGap(p);
      if (gap < 0) continue;
      const c = makeCar(p.x, p.y);
      c.x = p.x;
      c.y = p.y;
      c.ang = DIRS[p.dir];
      c.spd = Math.min(c.cruise * 0.6, Math.sqrt(2 * DRV.B * Math.max(0, gap - 22)));
      return c;
    }
    return null;
  }

  // Lugar libre adelante (px) si en p se puede poner un auto, o -1
  spawnGap(p) {
    const d = p.dir, fx = DXS[d], fy = DYS[d];
    if (p.x < 20 || p.y < 20 || p.x > WORLD - 20 || p.y > WORLD - 20) return -1;
    if (!this.roadOK(p.x, p.y) || this.nearJunction(p.x, p.y, 18, d)) return -1;
    if (!this.roadOK(p.x + fx * 30, p.y + fy * 30) || !this.roadOK(p.x - fx * 16, p.y - fy * 16)) return -1;
    let gap = 200;
    for (const o of G.cars) {
      const dx = o.x - p.x, dy = o.y - p.y;
      if (dx * dx + dy * dy < 32 * 32) return -1;
      const fwd = dx * fx + dy * fy, lat = -dx * fy + dy * fx;
      if (Math.abs(lat) > 10) continue;
      if (fwd > -40 && fwd < 50) return -1; // -40: entra un colectivo (36) detrás
      if (fwd > 0 && fwd < gap) gap = fwd;
    }
    for (const P of G.players) if (Math.hypot(P.x - p.x, P.y - p.y) < 34) return -1;
    return gap;
  }

  update(c, dt) {
    if (!c.nav) this.initNav(c);
    c.horn = Math.max(0, c.horn - dt);
    c.hornCD = Math.max(0, (c.hornCD || 0) - dt);
    c.panic = Math.max(0, (c.panic || 0) - dt);
    c.hazard = false;
    if (c.rage) {
      const P = c.rage.P;
      c.rage.t -= dt;
      if (!G.players.includes(P) || !inPlay(P) || !P.car || c.rage.t <= 0 || dist(c, P) > SIM_R * 0.8) {
        this.calm(c);
      } else {
        // Caliente: lo va a buscar por las calles, a los bocinazos
        if (c.hornCD <= 0 && Math.random() < dt * 2) this.honk(c, 0.7);
        const nav = copNav.target(c, P, dt) || { x: P.x, y: P.y, turn: false };
        this.pursue(c, nav, P, dt, dist(c, P), false);
        c.why = 'bronca';
        c.queued = false;
        c.stopT = 0;
        return;
      }
    }
    if (c.revT > 0) {
      // Marcha atrás girando, para despegarse de la pared y quedar apuntando al carril
      c.revT -= dt;
      const T0 = this.target(c, 14);
      const side = Math.sign(angDiff(Math.atan2(T0.y - c.y, T0.x - c.x), c.ang)) || 1;
      c.ang += side * 1.3 * dt;
      const bx = c.x - Math.cos(c.ang) * 16 * dt, by = c.y - Math.sin(c.ang) * 16 * dt;
      if (!hitBuilding(bx, by, c.h * 0.5 + 1) && !hitCarBlock(bx, by, c.h * 0.5 + 1)) { c.x = bx; c.y = by; }
      c.spd = 0;
      c.brake = false;
      c.why = 'maniobra';
      c.queued = true;
      c.x = clamp(c.x, 10, WORLD - 10);
      c.y = clamp(c.y, 10, WORLD - 10);
      if (c.revT <= 0) { c.path = null; c.rot = false; c.inRing = false; c.dodge = null; c.planKey = -1; c.move = null; this.release(c); c.nav = false; }
      return;
    }
    c.bold = Math.max(0, c.bold - dt);
    c.evT = Math.max(0, (c.evT || 0) - dt);
    if (c.signalT > 0 && (c.signalT -= dt) <= 0 && !c.path) c.signal = 0;
    const panic = c.panic > 0;
    if (panic && c.hornCD <= 0 && Math.random() < dt * 1.2) this.honk(c, 0.6);

    // Sirena atrás: se tira contra el cordón y afloja (o para) para dejar pasar al patrullero
    c.pullOver = Math.max(0, (c.pullOver || 0) - dt);
    c.yieldCop = false;
    if (!c.path && !c.inRing && !panic) {
      const hx = Math.cos(c.ang), hy = Math.sin(c.ang);
      for (const o of G.cars) {
        if (!o.chase || o.hp <= 0 || driverOf(o)) continue;
        const rx = o.x - c.x, ry = o.y - c.y;
        const fwd = rx * hx + ry * hy;
        if (fwd < 0 && fwd > -140 && Math.abs(-rx * hy + ry * hx) < 26 && Math.cos(o.ang - c.ang) > 0.3) {
          c.pullOver = 1.5;
          c.yieldCop = fwd > -60;
          // En la avenida se pasa al carril de la vereda
          if (this.onAve(c) && c.lane === 0 && this.laneFree(c, 1, 20, 30)) c.lane = 1;
          break;
        }
      }
    }

    // Se le viene alguien encima: volantazo
    this.evade(c);

    // Planificación: decide el giro con tiempo para acomodarse y frenar
    let stopAt = Infinity;
    if (!c.path) {
      const nj = this.nextJ(c);
      if (nj) {
        const planDist = (this.onAve(c) ? 90 : 45) + c.spd * 0.6;
        const tl = nj.key === jkey(PLAZA_CX, PLAZA_CY) ? this.nextCross(c).dist : this.toLine(c, nj.key, c.dir);
        if (tl < planDist && c.planKey !== nj.key) this.planCross(c, nj.i, nj.j);
      } else if (isDiag(c.dir)) {
        this.planUTurn(c); // la Diagonal no sigue para ese lado
      }
      // Apareció o quedó adentro de una bocacalle sin planear (esquivando, después de una maniobra)
      // (si ya está cruzando esa, comprometido, no: puede que ya esté planeando la siguiente)
      const box = !c.path ? this.boxAt(c.x, c.y) : null;
      const bkey = box ? jkey(box.i, box.j) : -1;
      if (box && c.planKey !== bkey && c.commit !== bkey && c.commit2 !== bkey && !(box.i === PLAZA_CX && box.j === PLAZA_CY)) {
        this.planCross(c, box.i, box.j);
      }
      // Calle cortada antes de la próxima bocacalle: pega la vuelta con tiempo
      if (!c.path && !c.dodge && !box && !isDiag(c.dir)) {
        const probe = 40 + c.spd * 0.4 + (c.spd * c.spd) / 90;
        const nc = this.nextCross(c);
        if (!nc || nc.dist > probe) {
          const idx = this.roadIdx(c.dir, c.x, c.y);
          const p = this.lanePoint(c.dir, idx, c.lane, this.alongOf(c.dir, c.x, c.y) + this.sgn(c.dir) * probe);
          if (!this.roadOK(p.x, p.y)) this.planUTurn(c);
        }
      }
    }
    let toEntry = -1;
    if (c.path && c.entry) toEntry = (c.entry.x - c.x) * DXS[c.dir] + (c.entry.y - c.y) * DYS[c.dir];

    // Bocacalle: con semáforo en verde, salida libre y sin nadie adentro que se le cruce,
    // se compromete y entra; comprometido ya no frena por los que cruzan, así la
    // bocacalle siempre se vacía y no se puede armar un nudo.
    c.waitLight = 0;
    c.boxWait = false;
    let lineWhy = null;
    if (c.commit2 && !this.footIn(c.commit2, c.x, c.y, c.ang, c.w, c.h)) this.drop(c, 2);
    if (c.commit) {
      c.commitT += dt;
      const inside = this.footIn(c.commit, c.x, c.y, c.ang, c.w, c.h);
      if (inside) c.boxSeen = true;
      if ((c.boxSeen && !inside) || (!c.boxSeen && c.commitT > 4) || c.commitT > 10) this.drop(c, 1);
    }
    if (c.move && !c.rot && c.move.key !== c.commit) {
      const m = c.move;
      if (!c.path && c.dir !== m.d) {
        c.move = null; // cambió de sentido (vuelta en U, esquive): plan viejo
      } else {
        const tl = this.toLine(c, m.key, m.d);
        if (this.footIn(m.key, c.x, c.y, c.ang, c.w, c.h)) {
          this.commitTo(c, m); // ya está adentro (apareció ahí, o lo empujaron): que salga
        } else if (tl < -DRV.LINE - 4) {
          c.move = null; // esa bocacalle ya quedó atrás: plan viejo
        } else if (tl < 90) {
          // (si se pasó un poco de la raya sin poder entrar, se queda ahí: no se mete igual)
          const block = this.commitBlock(c, m, tl);
          if (!block) {
            if (tl < (c.spd * c.spd) / (2 * DRV.B) + 10) this.commitTo(c, m);
            c.lineT = 0;
          } else {
            lineWhy = block;
            stopAt = Math.max(0.3, tl);
            if (block === 'semaforo') { if (c.spd < 20) c.waitLight = 1; c.lineT = 0; }
            else {
              c.boxWait = block === 'bocacalle';
              if (tl < 12 && c.spd < 8) {
                c.lineT += dt;
                if (block === 'bocacalle') { if (c.lineT > 4 && this.reroute(c, m)) c.lineT = 0; }
                else if (c.lineT > 3 && !CLAIMS.get(m.key)) CLAIMS.set(m.key, c);
              }
            }
          }
        } else if (tl > 260) {
          c.move = null; // se alejó de esa bocacalle
        }
      }
    }

    // Volante: apunta a un punto adelante, con radio de giro mínimo según la velocidad
    const Ld = c.path ? 7 + c.spd * 0.22 : 12 + c.spd * 0.35;
    const T = this.target(c, Ld);
    const want = Math.atan2(T.y - c.y, T.x - c.x);
    const diff = angDiff(want, c.ang);
    const maxYaw = clamp(c.spd / DRV.RMIN, 0.5, 4);
    c.ang += clamp(diff, -maxYaw * dt, maxYaw * dt);
    c.steer = lerp(c.steer || 0, clamp(diff * 3, -1, 1), clamp(dt * 8, 0, 1));

    // Velocidad deseada: crucero (según el chofer), la de la curva si se viene un giro, y
    // nunca tan rápido que el volante no llegue a doblar lo que hace falta
    const style = c.drv || STYLES.normal;
    let v0 = c.cruise * style.v;
    if (panic) v0 = Math.min(c.cruise * DRV.PANIC, 112);
    if (c.path) {
      const dIn = toEntry > 0 ? toEntry : 0;
      v0 = Math.min(v0, Math.sqrt(c.turnV * c.turnV * (panic ? 1.5 : 1) + 2 * 45 * dIn));
    }
    const kappa = (2 * Math.abs(Math.sin(diff))) / Math.max(Ld, 4);
    if (kappa > 0.004) v0 = Math.min(v0, Math.max(14, Math.sqrt(DRV.A_LAT / kappa)));
    if (c.pullOver > 0) v0 = Math.min(v0, c.yieldCop ? 0 : 14);
    if (c.evT > 0 && !c.evGo) v0 = Math.min(v0, c.spd * 0.5);

    // Quién está adelante, sobre el camino que va a hacer
    const pts = this.course(c, 30 + c.spd * 1.5 + (c.spd * c.spd) / (2 * DRV.B));
    const lead = this.leader(c, pts);
    let s = lead.s, vl = lead.v;
    let why = lead.who ? (lead.who === 'ped' || lead.who === 'player' ? lead.who : 'car') : 'libre';
    c.queued = false;
    // Alguien plantado en la calle: espera, toca bocina y pasa despacio (los peatones se corren)
    c.pedIgn = Math.max(0, (c.pedIgn || 0) - dt);
    if (lead.who === 'ped' && c.spd < 5) c.pedT = (c.pedT || 0) + dt;
    else c.pedT = Math.max(0, (c.pedT || 0) - dt);
    if (c.pedT > (panic ? 0.6 : 1.6)) { c.pedIgn = 2.5; c.pedT = 0; this.honk(c, 1.1); }
    // En la fila: detrás de uno que espera, o de uno que recién arranca (la ola de arranque del verde)
    if (lead.who && typeof lead.who === 'object' && lead.s < 30 && c.spd < 20
      && ((lead.who.waitLight || 0) > 0 || lead.who.queued || (Math.abs(lead.who.spd) < 12 && (lead.who.stopT || 0) < 1))) c.queued = true;
    const blocker = lead.who === 'player' || (lead.who && lead.who.kind === 'car' && driverOf(lead.who));
    if (blocker && lead.s < 20 && c.spd < 8 && Math.random() < dt * style.horn * 2) this.honk(c, 1.1);
    if (stopAt < s) { s = stopAt; vl = 0; why = lineWhy || 'semaforo'; }
    const fStop = this.festejoStop(c, pts);
    if (fStop < s) {
      s = fStop; vl = 0; why = 'festejo';
      if (c.spd < 8) { c.queued = true; if (Math.random() < dt * style.horn * 2) this.honk(c, 1.1); }
    }
    if ((why === 'bocacalle' || why === 'cruce') && c.spd < 8) c.queued = true;
    if (c.yieldCop && c.spd < 8) { c.queued = true; why = 'sirena'; }

    // Esquive: termina cuando ya pasó el obstáculo; empieza si algo quieto le tapa el carril
    if (c.dodge) {
      c.dodge.from += c.spd * dt;
      // Trabado a mitad del esquive (algo más se le cruzó en el otro carril): el esquive solo
      // avanza si el auto anda, así que quedaba esperando para siempre. Marcha atrás y replanea.
      c.dodge.stall = c.spd < 2 ? (c.dodge.stall || 0) + dt : 0;
      if (c.dodge.from > c.dodge.until || c.path) { c.dodge = null; c.signal = 1; c.signalT = 1; }
      else if (c.dodge.stall > 3) { c.dodge = null; c.signal = 0; c.revT = 0.9; c.blockT = 0; }
    }
    const lo = lead.who;
    // Algo quieto (o un patrullero haciendo un operativo) que no está esperando el semáforo ni la fila
    const isCop = typeof lo === 'object' && lo && (lo.chase || lo.cop);
    const stuckBehind = lo && why !== 'semaforo' && why !== 'bocacalle' && why !== 'sirena' && lead.s < 25 && lead.v < (isCop ? 12 : 6) && c.spd < 4
      && !(typeof lo === 'object' && ((lo.waitLight || 0) > 0 || lo.queued));
    c.blockT = stuckBehind ? (c.blockT || 0) + dt * (panic ? 2.5 : 1) : 0;
    if (c.blockT > (isCop ? 1.2 : 2.2) && !c.path && !c.dodge) {
      const obst = lo === 'player' ? lead.obj : lo === 'ped' ? { x: c.x + Math.cos(c.ang) * (lead.s + c.w / 2 + 3), y: c.y + Math.sin(c.ang) * (lead.s + c.w / 2 + 3), w: 6 } : lo;
      if (this.tryDodge(c, obst)) { c.blockT = 0; if (lo === 'ped') c.pedIgn = 2.5; }
      else c.blockT = 1.2; // viene gente de frente: reintenta en un rato
    }
    // Doblando no puede esquivar: si el que le tapa no se va (p. ej. un patrullero parado en
    // un operativo), da marcha atrás y replanea en vez de esperar para siempre
    if (c.blockT > 5 && c.path && !c.dodge) { c.revT = 0.9; c.blockT = 0; }

    // Ceder el paso: en la rotonda al que ya circula; en los cruces a los que no respetan
    // la reserva (patrulleros, jugadores, uno que se volvió loco) o a un esquive de frente
    let yielding = false;
    if (c.bold <= 0) {
      if (c.rot && c.entry && !c.inRing && c.pi <= 1) {
        const dy = Math.hypot(c.entry.x - c.x, c.entry.y - c.y);
        if (dy < 30 && (this.ringBusy(c) || this.mergeBusy(c))) {
          yielding = true;
          if (dy - 2 < s) { s = Math.max(0.3, dy - 2); vl = 0; why = 'rotonda'; }
        }
      } else if (!c.inRing) {
        for (const o of G.cars) {
          if (o === c || o.hp <= 0 || o.inRing) continue;
          if (o.ai && !o.chase && !o.rage && !c.dodge && !o.dodge) continue;
          if (Math.abs(o.x - c.x) > 70 || Math.abs(o.y - c.y) > 70) continue;
          if (Math.cos(c.ang) * Math.cos(o.ang) + Math.sin(c.ang) * Math.sin(o.ang) > 0.3) continue;
          const cs = this.crossConflict(c, o);
          if (cs !== null) {
            yielding = true;
            if (cs < s) { s = cs; vl = 0; why = 'cruce'; }
          }
        }
      }
    }
    if (yielding && c.spd < 8) {
      c.queued = true;
      c.yieldT += dt;
      if (c.yieldT > DRV.YIELD_MAX) { c.bold = 1.5; c.yieldT = 0; } // se cansó de esperar: se manda
    } else {
      c.yieldT = 0;
    }

    // IDM: aceleración libre hacia v0 menos la interacción con el de adelante
    const v = Math.max(0, c.spd);
    const T0 = panic ? 0.35 : style.T, S0 = panic ? 2.5 : style.S0;
    const A = panic ? DRV.A * 1.4 : DRV.A;
    let acc = v > v0 ? -Math.min(DRV.B * 1.5, (v - v0) * 3) : A * (1 - Math.pow(v / Math.max(v0, 1), 4));
    if (s < Infinity) {
      const sStar = S0 + Math.max(0, v * T0 + (v * (v - vl)) / (2 * Math.sqrt(A * DRV.B)));
      acc -= A * Math.pow(sStar / Math.max(s, 0.3), 2);
    }
    if (c.evT > 0 && c.evGo) acc = Math.max(acc, A * 0.6);
    acc = clamp(acc, -DRV.B * 3, A);
    c.why = why; // qué lo está frenando (útil para depurar)
    c.leadCar = why === 'car' ? lead.who : null;
    c.brake = acc < -25 || (v < 1 && s < 20);
    // Frenada de golpe a buena velocidad: chillan las gomas
    if (acc < -DRV.B * 2.4 && v > 45 && !c.skidT) { c.skidT = 1.2; sfx('frenada', c.x, c.y); }
    c.skidT = Math.max(0, (c.skidT || 0) - dt);
    c.spd = Math.max(0, v + acc * dt);

    this.tryLaneChange(c, dt, lead);

    // Avanzar. Si igual se iba contra una pared, frena y busca otro sentido despacio
    const nx = c.x + Math.cos(c.ang) * c.spd * dt, ny = c.y + Math.sin(c.ang) * c.spd * dt;
    const CR = c.h * 0.5 + 1;
    if (hitBuilding(nx, ny, CR) || hitCarBlock(nx, ny, CR) || nx < 10 || ny < 10 || nx > WORLD - 10 || ny > WORLD - 10) {
      c.spd = 0;
      c.why = 'pared';
      c.wallT = (c.wallT || 0) + dt;
      if (c.wallT > 0.6) {
        if (farFromPlayers(c, OFFSCREEN)) c.hp = 0;
        else { c.revT = 0.9; c.wallT = 0; } // marcha atrás y vuelve a intentar
      }
    } else {
      c.x = nx;
      c.y = ny;
      c.wallT = 0;
    }
    // Un choque puede empujarlo afuera: nunca sale del mapa
    c.x = clamp(c.x, 10, WORLD - 10);
    c.y = clamp(c.y, 10, WORLD - 10);

    // Estado de la rotonda (para el radar de vueltas y la cesión de paso de los demás)
    if (c.rot && c.path) {
      const cur = c.path[c.pi];
      c.inRing = !!(cur && cur.ring && !cur.exit);
      // Llegando a su salida y está tapada: no frena adentro del anillo (lo trabaría para
      // todos), da otra vuelta y sale por la siguiente
      if (c.inRing && c.ringOut) {
        const ob = getObelisco(), th = Math.atan2(c.y - ob.y - ob.h / 2, c.x - ob.x - ob.w / 2);
        const left = ((th - c.ringOut.th) % TAU + TAU) % TAU;
        if (left < 0.6 && c.ringArc < Math.PI * 1.6 && this.exitBlocked(c, c.ringOut.pt.x, c.ringOut.pt.y)) {
          const arc = c.ringArc;
          this.planRotonda(c, true, c.ringOut.nd);
          c.ringArc = arc;
        }
      }
      if (c.inRing) c.ringArc = (c.ringArc || 0) + (c.spd * dt) / ((ROTONDA_ISLAND_R + ROTONDA_R) / 2);
      if (cur && cur.exit) c.signal = 1; // guiño a la derecha para salir
    }

    // Trabado sin motivo (ni semáforo ni cola ni cediendo): lo mide el selfcheck y el despawn
    if (c.spd < 4 && !c.waitLight && !c.queued) c.stopT += dt;
    else c.stopT = 0;
    if (c.stopT > 9 && farFromPlayers(c, OFFSCREEN)) c.hp = 0;
    // Fila eterna fuera de cámara (esquina del mapa, costa del río): se metió en un garaje.
    // Libera la calle y el spawner pone otro donde haya lugar.
    c.idleT = c.spd < 4 ? (c.idleT || 0) + dt : 0;
    if (c.idleT > 12 && farFromPlayers(c, OFFSCREEN)) { this.release(c); c.hp = 0; }
  }

  // Algo adelante en el camino de uno que maneja a lo loco (patrullero, uno caliente): hacia
  // qué lado correrse, o cuánto aflojar si no hay lado. `target` es al que va a buscar: a ese no lo esquiva.
  avoidAhead(c, target) {
    const hx = Math.cos(c.ang), hy = Math.sin(c.ang);
    const range = 22 + Math.abs(c.spd) * 0.6;
    let best = null;
    for (const o of G.cars) {
      if (o === c || o === target || o.hp <= 0) continue;
      const rx = o.x - c.x, ry = o.y - c.y;
      const fwd = rx * hx + ry * hy;
      if (fwd <= 0 || fwd > range) continue;
      const lat = -rx * hy + ry * hx;
      const need = (c.h + Math.abs(Math.sin(o.ang - c.ang)) * o.w + Math.abs(Math.cos(o.ang - c.ang)) * o.h) / 2 + 3;
      if (Math.abs(lat) > need) continue;
      if (!best || fwd < best.fwd) best = { fwd, lat, need };
    }
    if (!best) return null;
    const pref = best.lat > 0 ? -1 : 1;
    const amount = clamp((best.need - Math.abs(best.lat)) / best.need, 0.2, 0.65);
    for (const side of [pref, -pref]) {
      const a = c.ang + side * amount;
      const px2 = c.x + Math.cos(a) * (best.fwd + 8), py2 = c.y + Math.sin(a) * (best.fwd + 8);
      if (!hitBuilding(px2, py2, c.h * 0.5 + 1) && !hitCarBlock(px2, py2, c.h * 0.5 + 1)) return { steer: side * amount, slow: null };
    }
    return { steer: 0, slow: Math.max(0, best.fwd - c.w * 0.6) * 1.6 };
  }

  // Manejo a lo loco hacia nav (patrulleros y el que se calentó): sin carriles ni semáforos,
  // apuntándole adelante al auto que persigue, esquivando lo que se cruza y despegándose
  // de las paredes. d: distancia al jugador P.
  pursue(c, nav, P, dt, d, cop) {
    if (c.revT > 0) {
      // Marcha atrás girando hacia donde quiere ir, para salir de donde se trabó
      c.revT -= dt;
      const side = Math.sign(angDiff(Math.atan2(nav.y - c.y, nav.x - c.x), c.ang)) || 1;
      c.ang += side * 1.4 * dt;
      const CR0 = c.h * 0.5 + 1;
      const bx = c.x - Math.cos(c.ang) * 22 * dt, by = c.y - Math.sin(c.ang) * 22 * dt;
      if (!hitBuilding(bx, by, CR0) && !hitCarBlock(bx, by, CR0)) { c.x = clamp(bx, 10, WORLD - 10); c.y = clamp(by, 10, WORLD - 10); }
      c.spd = -22;
      c.brake = false;
      return;
    }
    c.detourT = Math.max(0, (c.detourT || 0) - dt);
    let tx = nav.x, ty = nav.y;
    const car = P.car;
    // A la vista y el otro en auto: le apunta adelante, para cortarle el paso o chocarlo de costado
    if (!nav.park && car && (c.los || d < 90) && Math.abs(car.spd) > 20) {
      const lead = clamp(d / Math.max(60, Math.abs(c.spd)), 0, 0.6);
      tx += Math.cos(car.ang) * car.spd * lead;
      ty += Math.sin(car.ang) * car.spd * lead;
    }
    let want = c.detourT > 0 ? c.detourAng : Math.atan2(ty - c.y, tx - c.x);
    const av = c.detourT > 0 || nav.park ? null : this.avoidAhead(c, car);
    if (av) want += av.steer;
    const diff = angDiff(want, c.ang);
    const rate = 2.6 * clamp(Math.abs(c.spd) / 70, 0.3, 1);
    c.ang += clamp(diff, -rate * dt, rate * dt);
    c.steer = lerp(c.steer || 0, clamp(diff, -1, 1), clamp(dt * 8, 0, 1));

    const top = cop ? c.cruise : Math.min(c.cruise * 1.5, 118);
    // La yuta llega y lo encajona; el que está caliente se le tira encima a toda velocidad
    // (rebota con el choque y vuelve a embestir)
    let target = !cop ? (d > 60 ? top : 75) : d > 70 ? top : (d > 26 ? 70 : 26);
    // Frena antes de doblar en una esquina, o si tiene que girar mucho: a toda velocidad
    // el radio de giro no entra en la calle y se come la esquina
    if (nav.turn) target = Math.min(target, 55);
    if (nav.park) target = Math.hypot(nav.x - c.x, nav.y - c.y) > 6 ? 30 : 0;
    if (Math.abs(diff) > 0.8) target = Math.min(target, 45);
    if (av && av.slow !== null) target = Math.min(target, av.slow);
    c.brake = target < c.spd - 10;
    c.spd += (target - c.spd) * 1.5 * dt;
    const CR2 = c.h * 0.5 + 1;
    const nx2 = c.x + Math.cos(c.ang) * c.spd * dt;
    const ny2 = c.y + Math.sin(c.ang) * c.spd * dt;

    if (hitBuilding(nx2, ny2, CR2) || hitCarBlock(nx2, ny2, CR2) || nx2 < 10 || ny2 < 10 || nx2 > WORLD - 10 || ny2 > WORLD - 10) {
      let got = false;
      for (const t2 of [0.7, -0.7, 1.5, -1.5, 2.4, -2.4, Math.PI]) {
        const a2 = c.ang + t2;
        const tx3 = c.x + Math.cos(a2) * (Math.abs(c.spd) * dt + CR2 + 6);
        const ty3 = c.y + Math.sin(a2) * (Math.abs(c.spd) * dt + CR2 + 6);
        if (!hitBuilding(tx3, ty3, CR2) && !hitCarBlock(tx3, ty3, CR2) && tx3 > 10 && ty3 > 10 && tx3 < WORLD - 10 && ty3 < WORLD - 10) {
          c.ang = a2;
          // Se compromete con el desvío: si al frame siguiente vuelve a apuntar al jugador,
          // choca contra la misma pared y queda girando en el lugar para siempre
          c.detourAng = a2;
          c.detourT = 0.6;
          // Y sale ya hacia ese lado: si quedó medio metido en el obstáculo, un paso corto
          // sigue chocando y no se despega nunca; el punto libre está más adelante
          const step = Math.max(Math.abs(c.spd) * dt, 1.5);
          c.x += Math.cos(a2) * step;
          c.y += Math.sin(a2) * step;
          got = true;
          break;
        }
      }
      c.spd *= got ? 0.8 : 0.35;
      if (!got) {
        c.revT = 0.7;
        if (farFromPlayers(c, OFFSCREEN)) c.hp = 0;
      }
    } else {
      c.x = nx2;
      c.y = ny2;
    }
    // Un choque puede empujarlo afuera del mapa, y desde ahí todo movimiento choca con el
    // borde y queda girando en el lugar para siempre
    c.x = clamp(c.x, 10, WORLD - 10);
    c.y = clamp(c.y, 10, WORLD - 10);

    // Si en 2s no se movió y no está encima del jugador, se trabó (callejón, encajonado
    // entre autos): fuera de pantalla desaparece; a la vista hace marcha atrás y reintenta
    c.progT = (c.progT || 0) + dt;
    if (c.progT >= 2) {
      const moved = Math.hypot(c.x - (c.progX ?? c.x + 99), c.y - (c.progY ?? c.y + 99));
      if (moved < 6 && d > 80) {
        if (farFromPlayers(c, OFFSCREEN)) c.hp = 0;
        else { c.revT = 0.9; c.detourT = 0; }
      }
      c.progT = 0; c.progX = c.x; c.progY = c.y;
    }
  }
}

const trafficAI = new TrafficAI();

/* -------------------------------------------------------------------------
   Navegación de los patrulleros: van por la grilla de calles hacia el jugador.
   Yendo derecho se metían en callejones sin salida y quedaban girando contra
   una pared, con la fila de autos civiles trabada atrás.
   ------------------------------------------------------------------------- */
class CopNav {
  constructor() { this.reset(); }

  // Se recalcula todo en la próxima consulta (la ciudad pudo cambiar)
  reset() {
    this.open = null;
    this.field = null;
    this.goal = null;
    // Un campo de distancias por tramo destino: con varios jugadores buscados, cada
    // patrullero va hacia el suyo y no se rehace la BFS cada vez que cambia de objetivo
    this.fields = new Map();
  }

  nodeX(i) { return i * CELL + trafficAI.colW(i) / 2; }
  nodeY(j) { return j * CELL + trafficAI.rowH(j) / 2; }

  // Línea recta libre de edificios, agua y bloqueos para autos (muestreada cada 8 px).
  // Con road, además tiene que ser calle todo el camino (no la arena de un tramo cortado por el río).
  clear(x0, y0, x1, y1, r, road = false) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
      if (hitBuilding(x, y, r) || hitCarBlock(x, y, r) || (road && !onRoad(x, y))) return false;
    }
    return true;
  }

  // open[n]: bit 1 = tramo hacia el este transitable, bit 2 = hacia el sur
  build() {
    this.open = new Uint8Array(GRID * GRID);
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const x = this.nodeX(i), y = this.nodeY(j);
        let b = 0;
        if (i + 1 < GRID && this.clear(x, y, this.nodeX(i + 1), y, 5, true)) b |= 1;
        if (j + 1 < GRID && this.clear(x, y, x, this.nodeY(j + 1), 5, true)) b |= 2;
        this.open[j * GRID + i] = b;
      }
    }
  }

  neighbors(n) {
    const i = n % GRID, j = (n / GRID) | 0, out = [];
    if (this.open[n] & 1) out.push(n + 1);
    if (i > 0 && this.open[n - 1] & 1) out.push(n - 1);
    if (this.open[n] & 2) out.push(n + GRID);
    if (j > 0 && this.open[n - GRID] & 2) out.push(n - GRID);
    return out;
  }

  // Punto de calle más cercano al jugador: su proyección sobre la línea central de alguna
  // de las cuatro calles que rodean su manzana, en un tramo transitable. Devuelve ese punto
  // y las dos esquinas del tramo, que son el destino de la búsqueda.
  roadGoal(P) {
    const i0 = clamp(Math.floor((P.x - ROAD / 2) / CELL), 0, GRID - 2);
    const j0 = clamp(Math.floor((P.y - ROAD / 2) / CELL), 0, GRID - 2);
    let best = null, bd = Infinity;
    for (const j of [j0, j0 + 1]) { // calles horizontales: tramo (i0,j)-(i0+1,j)
      const n = j * GRID + i0;
      if (!(this.open[n] & 1)) continue;
      const x = clamp(P.x, this.nodeX(i0), this.nodeX(i0 + 1)), y = this.nodeY(j);
      const d = Math.hypot(x - P.x, y - P.y);
      if (d < bd) { bd = d; best = { x, y, ends: [n, n + 1] }; }
    }
    for (const i of [i0, i0 + 1]) { // calles verticales: tramo (i,j0)-(i,j0+1)
      const n = j0 * GRID + i;
      if (!(this.open[n] & 2)) continue;
      const x = this.nodeX(i), y = clamp(P.y, this.nodeY(j0), this.nodeY(j0 + 1));
      const d = Math.hypot(x - P.x, y - P.y);
      if (d < bd) { bd = d; best = { x, y, ends: [n, n + GRID] }; }
    }
    return best;
  }

  // Distancia en tramos desde cada esquina hasta el tramo de calle del jugador (BFS desde
  // sus dos esquinas). Solo se recalcula cuando el jugador cambia de tramo.
  updateField(P) {
    if (!this.open) this.build();
    const g = this.roadGoal(P);
    const key = g ? g.ends.join(',') : 'x';
    // El punto sigue al jugador siempre; la BFS solo se hace la primera vez que alguien está en ese tramo
    this.goal = g;
    this.field = this.fields.get(key);
    if (this.field) return;
    const field = new Int16Array(GRID * GRID).fill(-1);
    if (g) {
      const q = [];
      for (const n of g.ends) { field[n] = 0; q.push(n); }
      for (let h = 0; h < q.length; h++) {
        for (const m of this.neighbors(q[h])) {
          if (field[m] < 0) { field[m] = field[q[h]] + 1; q.push(m); }
        }
      }
    }
    if (this.fields.size >= 16) this.fields.delete(this.fields.keys().next().value);
    this.fields.set(key, field);
    this.field = field;
  }

  // Lugar para estacionar contra el cordón, del lado del jugador, en la calle por la que va
  // el patrullero: así el carril queda libre y los autos civiles siguen pasando. Cada uno
  // tiene su lugar (c.slot): el primero a la altura del jugador y los demás alternando
  // adelante y atrás; todos al mismo punto se chocaban y rebotaban de vuelta al carril.
  curb(c, P) {
    const jr = clamp(Math.round((c.y - ROAD / 2) / CELL), 0, GRID - 1);
    const ic = clamp(Math.round((c.x - ROAD / 2) / CELL), 0, GRID - 1);
    const cy = this.nodeY(jr), hy = trafficAI.rowH(jr) / 2;
    const cx = this.nodeX(ic), hx = trafficAI.colW(ic) / 2;
    const onRow = Math.abs(c.y - cy) < hy + 4, onCol = Math.abs(c.x - cx) < hx + 4;
    if (!onRow && !onCol) return null;
    // En una bocacalle se estaciona sobre la calle por la que viene, no en el medio del cruce
    const horiz = onRow && (!onCol || Math.abs(Math.cos(c.ang)) > Math.abs(Math.sin(c.ang)));
    const CR = c.h * 0.5 + 1;
    const k = c.slot || 0;
    const along = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 30;
    const pt = horiz
      ? { x: P.x + along, y: cy + Math.sign(P.y - cy || 1) * (hy - CR - 0.5) }
      : { x: cx + Math.sign(P.x - cx || 1) * (hx - CR - 0.5), y: P.y + along };
    if (hitBuilding(pt.x, pt.y, CR) || hitCarBlock(pt.x, pt.y, CR)) return null;
    return { x: pt.x, y: pt.y, turn: false, park: true };
  }

  // A dónde apuntar: {x, y, turn}. turn = la esquina siguiente obliga a doblar (frenar antes).
  target(c, P, dt) {
    this.updateField(P);
    const d = dist(c, P);
    // Cerca y a la vista: directo al jugador
    c.losT = (c.losT || 0) - dt;
    if (c.losT <= 0) { c.losT = 0.2; c.los = d < CELL * 2.2 && this.clear(c.x, c.y, P.x, P.y, 5); }
    if (c.los) { c.navNode = -1; c.onGoal = false; return { x: P.x, y: P.y, turn: false }; }

    const f = this.field;
    // Elegir (o revisar cada medio segundo) la esquina a la que va: la que más lo acerca
    // entre las de su manzana y las vecinas, siempre que llegue a ella en línea recta
    c.navT = (c.navT || 0) - dt;
    if (c.navNode === undefined || c.navNode < 0 || c.navT <= 0) {
      c.navT = 0.5;
      const i0 = clamp(Math.round((c.x - ROAD / 2) / CELL), 0, GRID - 1);
      const j0 = clamp(Math.round((c.y - ROAD / 2) / CELL), 0, GRID - 1);
      let best = -1, bs = Infinity;
      for (let j = Math.max(0, j0 - 1); j <= Math.min(GRID - 1, j0 + 1); j++) {
        for (let i = Math.max(0, i0 - 1); i <= Math.min(GRID - 1, i0 + 1); i++) {
          const n = j * GRID + i;
          if (f[n] < 0) continue;
          const nx = this.nodeX(i), ny = this.nodeY(j);
          const score = f[n] * CELL + Math.hypot(nx - c.x, ny - c.y);
          if (score < bs && this.clear(c.x, c.y, nx, ny, 5)) { bs = score; best = n; }
        }
      }
      c.navNode = best;
    }
    // Último tramo: por la calle hasta el punto más cercano al jugador (de ahí lo ve)
    if (c.onGoal || (c.navNode >= 0 && f[c.navNode] === 0 && this.goal &&
        this.clear(c.x, c.y, this.goal.x, this.goal.y, 5))) {
      const g = this.goal;
      c.onGoal = false;
      if (g && Math.hypot(g.x - c.x, g.y - c.y) <= 14) return { x: P.x, y: P.y, turn: false }; // llegó: de ahí al jugador
      if (g && this.clear(c.x, c.y, g.x, g.y, 5)) {
        c.onGoal = true;
        return { x: g.x, y: g.y, turn: false };
      }
      // El jugador se movió y el punto ya no está a la vista: vuelve a navegar por las esquinas
    }
    if (c.navNode < 0) return null; // sin camino por las calles: que vaya derecho

    let n = c.navNode;
    let nx = this.nodeX(n % GRID), ny = this.nodeY((n / GRID) | 0);
    // Llegó a la esquina: sigue por el tramo que baja la distancia
    if (Math.hypot(nx - c.x, ny - c.y) < 26) {
      // Esquina del tramo del jugador: por la calle hasta el punto más cercano a él
      if (f[n] === 0) { c.navNode = -1; c.onGoal = true; }
      let next = -1;
      for (const m of this.neighbors(n)) if (f[m] === f[n] - 1 && (next < 0 || Math.random() < 0.5)) next = m;
      if (next < 0) { c.navNode = -1; return null; }
      c.navNode = n = next;
      nx = this.nodeX(n % GRID);
      ny = this.nodeY((n / GRID) | 0);
    }
    // ¿Dobla en la esquina que viene? Si el tramo siguiente cambia de eje, frena antes
    let turn = false;
    if (f[n] > 0 && Math.hypot(nx - c.x, ny - c.y) < 80) {
      const inX = Math.abs(nx - c.x) > Math.abs(ny - c.y);
      for (const m of this.neighbors(n)) {
        if (f[m] !== f[n] - 1) continue;
        const outX = (m % GRID) !== (n % GRID);
        if (outX !== inX) turn = true;
        break;
      }
    }
    return { x: nx, y: ny, turn };
  }
}

const copNav = new CopNav();
