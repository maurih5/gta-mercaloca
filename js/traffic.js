/* =========================================================================
   GTA MERCALOCA - IA de manejo de los autos civiles
   -------------------------------------------------------------------------
   Cada auto sigue su carril (o un camino de puntos cuando dobla) con un
   volante de verdad: apunta a un punto un poco más adelante y gira con un
   radio mínimo, sin teletransportarse. La velocidad sale del modelo IDM
   (Intelligent Driver Model): acelera hasta su crucero, mantiene distancia
   con el de adelante y frena suave para el semáforo, la curva o la gente.
   La rotonda del obelisco se circula en sentido antihorario: se cede el paso
   a los que ya están adentro y se sale por cualquiera de las cuatro salidas.
   ========================================================================= */

// Sentidos cardinales: 0 este, 1 sur, 2 oeste, 3 norte (y crece hacia abajo)
const DIRS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
const DXS = [1, 0, -1, 0], DYS = [0, 1, 0, -1];

// Parámetros de manejo (px y segundos)
const DRV = {
  A: 80,        // aceleración máxima
  B: 90,        // frenada cómoda
  S0: 4,        // distancia mínima parado detrás de otro
  T: 0.6,       // tiempo de seguimiento
  RMIN: 11,     // radio de giro mínimo (limita cuánto dobla por segundo)
  V_RIGHT: 26,  // velocidad para doblar a la derecha (curva cerrada)
  V_LEFT: 32,   // velocidad para doblar a la izquierda (curva abierta)
  V_ROT: 30,    // velocidad dentro de la rotonda
  YIELD_MAX: 3, // segundos cediendo el paso antes de mandarse
};

// Reserva de bocacalles: quién está comprometido adentro de cada una y quién reclama turno
const BOXES = new Map();
const CLAIMS = new Map();

const angDiff = (a, b) => ((((a - b) % TAU) + TAU * 1.5) % TAU) - Math.PI;
const dirOf = a => ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4;

class TrafficAI {
  colW(i) { return i === PLAZA_CX ? AVENUE_ROAD : ROAD; }
  rowH(j) { return j === PLAZA_CY ? AVENUE_ROAD : ROAD; }

  isAveRoad(dir, idx) { return idx === (dir % 2 === 0 ? PLAZA_CY : PLAZA_CX); }

  // Índice de la calle por la que va un auto en el sentido `dir` (fila si va horizontal, columna si va vertical)
  roadIdx(dir, x, y) {
    return clamp(Math.round(((dir % 2 === 0 ? y : x) - ROAD / 2) / CELL), 0, GRID - 1);
  }

  // Coordenada lateral del carril: siempre a la derecha del sentido de marcha.
  // En la avenida hay dos carriles por mano: 0 el de adentro, 1 el de la vereda.
  laneCoord(dir, idx, lane) {
    const isAve = this.isAveRoad(dir, idx);
    // Avenida: cantero al medio, raya divisoria a 1.4 carriles del eje y cordón a 54 px.
    // Los dos carriles quedan centrados entre esas marcas (el de la vereda no se sube al cordón).
    const off = isAve ? AVENUE_LANE * (lane ? 1.75 : 0.92) : ROAD * 0.24;
    const center = idx * CELL + (isAve ? AVENUE_ROAD : ROAD) / 2;
    if (dir % 2 === 0) return center + (dir === 0 ? off : -off);
    return center + (dir === 1 ? -off : off);
  }

  // Punto del carril de `dir` sobre la calle `idx`, a la altura `along` del eje de marcha
  lanePoint(dir, idx, lane, along) {
    const lc = this.laneCoord(dir, idx, lane);
    return dir % 2 === 0 ? { x: along, y: lc } : { x: lc, y: along };
  }

  // Próxima bocacalle hacia adelante y distancia hasta su borde de entrada
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

  // Bocacalle en la que está parado el auto ahora mismo (o null si está en una cuadra)
  boxAt(x, y) {
    const i = Math.floor(x / CELL), j = Math.floor(y / CELL);
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) return null;
    if (x - i * CELL < this.colW(i) && y - j * CELL < this.rowH(j)) return { i, j };
    return null;
  }

  roadOK(x, y) {
    return x > 10 && y > 10 && x < WORLD - 10 && y < WORLD - 10
      && onRoad(x, y) && !hitBuilding(x, y, 4) && !hitCarBlock(x, y, 4);
  }

  // Hay calle para salir de la bocacalle (i,j) en el sentido nd?
  exitOK(i, j, nd, lane) {
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

  // Elige qué hacer en la bocacalle (i,j) y arma el camino de giro
  planCross(c, i, j) {
    c.planKey = i * 1000 + j;
    c.move = null;
    if (i === PLAZA_CX && j === PLAZA_CY && getObelisco()) {
      this.planRotonda(c);
      return;
    }
    const d = c.dir, R = (d + 1) % 4, Lt = (d + 3) % 4, U = (d + 2) % 4;
    const onAve = this.isAveRoad(d, this.roadIdx(d, c.x, c.y));
    const r = Math.random();
    let want = r < 0.56 ? d : r < 0.79 ? R : Lt;
    const order = [want, d, R, Lt].filter((v, k, a) => a.indexOf(v) === k);
    let nd = order.find(o => this.exitOK(i, j, o, o === Lt ? 0 : 1));
    if (nd === undefined) nd = U; // calle sin salida: pegar la vuelta
    c.move = { i, j, key: c.planKey, d, e: nd };
    if (nd === d) {
      c.signal = 0;
      return;
    }

    // Para doblar en la avenida primero se acomoda en el carril que corresponde
    if (onAve) c.lane = nd === R ? 1 : 0;
    const lane2 = nd === Lt || nd === U ? 0 : 1;
    const x0 = i * CELL, y0 = j * CELL, x1 = x0 + this.colW(i), y1 = y0 + this.rowH(j);
    const idxIn = d % 2 === 0 ? j : i;
    const entryAlong = d === 0 ? x0 : d === 2 ? x1 : d === 1 ? y0 : y1;
    const entry = this.lanePoint(d, idxIn, c.lane, entryAlong);
    let exit;
    if (nd === U) {
      exit = this.lanePoint(U, idxIn, 0, entryAlong);
    } else {
      const idxOut = nd % 2 === 0 ? j : i;
      const exitAlong = nd === 0 ? x1 : nd === 2 ? x0 : nd === 1 ? y1 : y0;
      exit = this.lanePoint(nd, idxOut, lane2, exitAlong);
    }
    const span = Math.max(Math.abs(exit.x - entry.x), Math.abs(exit.y - entry.y));
    const k = nd === U ? span * 0.7 : span * 0.55;
    c.path = [entry].concat(this.curve(entry, DIRS[d], exit, DIRS[nd], k));
    c.pi = 0;
    c.entry = entry;
    c.after = { dir: nd, lane: lane2 };
    c.turnV = nd === R ? DRV.V_RIGHT : nd === U ? DRV.V_RIGHT * 0.8 : DRV.V_LEFT;
    c.signal = nd === R ? 1 : -1;
  }

  // Rotonda del obelisco: cede el paso, entra al anillo, lo circula en sentido
  // antihorario y sale por la salida elegida, siempre sin teletransportarse.
  planRotonda(c, fromRing) {
    const ob = getObelisco();
    const ox = ob.x + ob.w / 2, oy = ob.y + ob.h / 2;
    const rr = (ROTONDA_ISLAND_R + ROTONDA_R) / 2;
    const ringPt = th => ({ x: ox + Math.cos(th) * rr, y: oy + Math.sin(th) * rr, ring: true });
    const outR = ROTONDA_R + 16;

    const d = c.dir;
    const r = Math.random();
    let nd = r < 0.3 ? (d + 1) % 4 : r < 0.72 ? d : r < 0.95 ? (d + 3) % 4 : (d + 2) % 4;
    const iC = PLAZA_CX, jC = PLAZA_CY;
    if (!this.exitOK(iC, jC, nd, 0)) nd = [0, 1, 2, 3].find(o => this.exitOK(iC, jC, o, 0)) ?? (d + 2) % 4;

    const path = [];
    let thIn;
    if (fromRing) {
      thIn = Math.atan2(c.y - oy, c.x - ox);
    } else {
      // Línea de ceda el paso sobre el carril de llegada, antes del anillo
      const idx = this.roadIdx(d, c.x, c.y);
      const along = (d % 2 === 0 ? ox : oy) - (d === 0 || d === 1 ? outR : -outR);
      const yieldPt = this.lanePoint(d, idx, c.lane, along);
      thIn = DIRS[d] + Math.PI - 0.55;
      const merge = ringPt(thIn);
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
    if (arc < 0.35) {
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

    c.path = path;
    c.pi = 0;
    c.rot = true;
    c.after = { dir: nd, lane: Math.random() < 0.5 ? 0 : 1 };
    c.turnV = DRV.V_ROT;
    c.signal = 0;
  }

  // ¿Se pisan dos maniobras adentro de la bocacalle? Las de la misma mano no (van en fila);
  // las de mano contraria solo si alguna dobla a la izquierda o pega la vuelta; las cruzadas siempre.
  conflicts(a, b) {
    if (!a || !b || a.d === b.d) return false;
    if ((a.d + 2) % 4 === b.d) {
      const across = m => m.e === (m.d + 3) % 4 || m.e === (m.d + 2) % 4;
      return across(a) || across(b);
    }
    return true;
  }

  lightAllows(c, m, dist) {
    const L = lights[m.j * GRID + m.i];
    if (!L) return true;
    const st = lightState(L, m.d % 2 === 0);
    if (st === 'verde') return true;
    // En amarillo sigue solo el que ya no llega a frenar
    return st === 'amarillo' && dist - 4 <= (c.spd * c.spd) / (2 * DRV.B);
  }

  // Punto justo después de la bocacalle donde va a quedar el auto al salir
  exitSpot(c, m) {
    if (c.path) return c.path[c.path.length - 1];
    const boxLen = m.d % 2 === 0 ? this.colW(m.i) : this.rowH(m.j);
    const x0 = m.i * CELL, y0 = m.j * CELL;
    const far = m.d === 0 ? x0 + boxLen : m.d === 2 ? x0 : m.d === 1 ? y0 + boxLen : y0;
    const along = far + (m.d === 0 || m.d === 1 ? 1 : -1) * (c.w * 0.5 + 6);
    return this.lanePoint(m.d, this.roadIdx(m.d, c.x, c.y), c.lane, along);
  }

  // Motivo por el que todavía no puede entrar, o null si puede comprometerse
  commitBlock(c, m, dist) {
    if (!this.lightAllows(c, m, dist)) return 'semaforo';
    const out = this.exitSpot(c, m);
    if (this.exitBlocked(c, out.x, out.y)) return 'bocacalle';
    const set = BOXES.get(m.key);
    if (set) {
      for (const o of set) {
        if (o.hp <= 0 || o.commit !== m.key || !G.cars.includes(o)) { set.delete(o); continue; }
        if (this.conflicts(m, o.cmove)) return 'cruce';
      }
    }
    // Turno reclamado por alguien que espera hace rato (el que dobla a la izquierda contra
    // un chorro de autos, o la calle sin semáforo): los que se le cruzan lo dejan pasar
    const cl = CLAIMS.get(m.key);
    if (cl && cl !== c) {
      const alive = cl.hp > 0 && cl.move && cl.move.key === m.key && !cl.commit && G.cars.includes(cl);
      if (!alive) CLAIMS.delete(m.key);
      else if (this.conflicts(m, cl.move) && this.lightAllows(cl, cl.move, 0)) return 'cruce';
    }
    return null;
  }

  commitTo(c, m) {
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

  release(c) {
    if (!c.commit) return;
    const set = BOXES.get(c.commit);
    if (set) set.delete(c);
    c.commit = 0;
  }

  // Vuelta en U en la misma calle (calle cortada por el río o la explanada)
  planUTurn(c) {
    const d = c.dir, U = (d + 2) % 4, idx = this.roadIdx(d, c.x, c.y);
    const vt = DRV.V_RIGHT * 0.8;
    // Arranca la vuelta recién cuando le da para frenar hasta la velocidad de giro
    const brake = Math.max(4, (c.spd * c.spd - vt * vt) / (2 * 45));
    const along = (d % 2 === 0 ? c.x : c.y) + (d === 0 || d === 1 ? brake : -brake);
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
    const fx = DXS[d], fy = DYS[d];
    const isAve = this.isAveRoad(d, idx);
    const lc = isAve ? this.laneCoord(d, idx, 1 - c.lane) : this.laneCoord((d + 2) % 4, idx, 0);
    for (const o of G.cars) {
      if (o === c || o === obst || o.hp <= 0) continue;
      const fwd = (o.x - c.x) * fx + (o.y - c.y) * fy;
      const lat = d % 2 === 0 ? o.y : o.x;
      if (fwd > -15 && fwd < 110 && Math.abs(lat - lc) < 11) return false;
    }
    if (isAve) {
      c.lane = 1 - c.lane;
      return true;
    }
    const oAlong = (obst.x - c.x) * fx + (obst.y - c.y) * fy;
    c.dodge = { lc, obst, until: oAlong + (obst.w || 6) / 2 + c.w + 8, from: 0 };
    c.signal = -1;
    return true;
  }

  // Primer uso (o cuando el jugador larga el auto): rumbo cardinal y carril al azar
  initNav(c) {
    // Un auto recién aparecido (fuera de cámara) ya viene andando; uno que larga el jugador arranca de cero
    if (!c.navOnce) c.spd = Math.max(c.spd, c.cruise * 0.6);
    c.navOnce = true;
    c.nav = true;
    c.dir = dirOf(c.ang);
    c.lane = Math.random() < 0.5 ? 0 : 1;
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
    this.release(c);
    c.move = null;
    c.lineT = 0;
    const ob = getObelisco();
    if (ob && Math.hypot(c.x - ob.x - ob.w / 2, c.y - ob.y - ob.h / 2) < ROTONDA_R + 6) {
      this.planRotonda(c, true); // apareció adentro de la rotonda: la termina de circular
    }
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
    if (c.diag) {
      const h = c.diag > 0 ? DIAG_ANG : DIAG_ANG + Math.PI;
      const u = (c.x - PLAZA_PX) * DIAG_UX + (c.y - PLAZA_PY) * DIAG_UY;
      const off = DIAG_WIDTH * 0.24;
      return {
        x: PLAZA_PX + DIAG_UX * (u + c.diag * Ld) - Math.sin(h) * off,
        y: PLAZA_PY + DIAG_UY * (u + c.diag * Ld) + Math.cos(h) * off,
      };
    }
    const d = c.dir;
    let lc = this.laneCoord(d, this.roadIdx(d, c.x, c.y), c.lane);
    if (c.dodge) lc = c.dodge.lc;
    else if (c.pullOver > 0) {
      // Hacia la derecha del sentido de marcha (el cordón)
      const right = d === 0 || d === 3 ? 1 : -1;
      lc += right * (this.isAveRoad(d, this.roadIdx(d, c.x, c.y)) ? 6 : 7);
    }
    // El corrimiento lateral se limita: un cambio de carril es una diagonal suave, no un volantazo
    if (d % 2 === 0) return { x: c.x + DXS[d] * Ld, y: c.y + clamp(lc - c.y, -Ld * 0.35, Ld * 0.35) };
    return { x: c.x + clamp(lc - c.x, -Ld * 0.35, Ld * 0.35), y: c.y + DYS[d] * Ld };
  }

  // Lo más cercano que hay adelante en la trayectoria: auto, jugador o peatón
  leader(c, fx, fy, P) {
    let s = Infinity, v = 0, who = null;
    const scan = 26 + c.spd * 1.6;
    const consider = (o, w, h, ov, kind) => {
      const rx = o.x - c.x, ry = o.y - c.y;
      const fwd = rx * fx + ry * fy;
      if (fwd <= 0 || fwd > scan) return;
      if (Math.abs(-rx * fy + ry * fx) > (c.h + h) * 0.5 + 1.5) return;
      const gap = fwd - (c.w + w) / 2;
      if (gap < s) { s = gap; v = ov; who = kind; }
    };
    // Solo cuenta como "el de adelante" el que va para el mismo lado. El que cruza o
    // viene de frente se resuelve con la prioridad de paso (crossConflict): si se lo
    // tratara como obstáculo, dos autos doblando en la misma bocacalle se esperarían
    // mutuamente para siempre.
    const skip = c.dodge ? c.dodge.obst : null;
    for (const o of G.cars) {
      if (o === c || o === skip || o.hp <= 0) continue;
      const along = Math.cos(o.ang) * fx + Math.sin(o.ang) * fy;
      if (along <= 0.3) {
        // Atravesado y quieto en mi camino: es un obstáculo, salvo que me esté esperando a mí
        const still = (o.rv === undefined ? Math.abs(o.spd) : o.rv) < 3;
        if (still && (!o.ai || o.chase || o.hp <= 0)) {
          const rx = o.x - c.x, ry = o.y - c.y, fwd = rx * fx + ry * fy;
          if (fwd > 0 && fwd < 40 && Math.abs(-rx * fy + ry * fx) < (c.h + o.w) / 2) {
            const gap = fwd - (c.w + o.h) / 2;
            if (gap < s) { s = gap; v = 0; who = o; }
          }
        }
        continue;
      }
      const ov = Math.min(Math.abs(o.spd), o.rv === undefined ? Infinity : o.rv);
      consider(o, o.w, o.h, Math.max(0, ov * along), o);
    }
    if (!P.dead) {
      if (P.car && P.car !== skip) consider(P.car, P.car.w, P.car.h, 0, P.car);
      else if (!P.car && skip !== P) consider(P, 6, 6, 0, 'player');
    }
    // Peatones cruzando: se frena, pero si se queda plantado en la calle, bocinazo y pasa
    if (c.pedIgn <= 0) {
      for (const p of G.peds) {
        if (p.hp <= 0 || p.inside || p === skip) continue;
        if (Math.abs(p.x - c.x) > scan || Math.abs(p.y - c.y) > scan) continue;
        consider(p, 6, 6, 0, 'ped');
      }
    }
    return { s, v, who };
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
      if (!o.inRing && !o.chase && o.ai) continue;
      const th = Math.atan2(o.y - oy, o.x - ox);
      const up = ((th - c.mergeTh) % TAU + TAU) % TAU; // cuánto le falta para llegar a mi entrada
      if (up < 1.5 || up > TAU - 0.2) return true;
    }
    return false;
  }

  // Lane change en la avenida: para pasar a uno lento o de vez en cuando
  tryLaneChange(c, dt, lead) {
    c.laneT -= dt;
    if (c.path || c.diag || c.laneT > 0) return;
    const idx = this.roadIdx(c.dir, c.x, c.y);
    if (!this.isAveRoad(c.dir, idx)) return;
    const slowLead = lead.s < 50 && lead.v < c.cruise * 0.7;
    c.laneT = rnd(5, 12);
    if (!slowLead && Math.random() < 0.6) return;
    const to = 1 - c.lane;
    const lc = this.laneCoord(c.dir, idx, to);
    const fx = DXS[c.dir], fy = DYS[c.dir];
    for (const o of G.cars) {
      if (o === c || o.hp <= 0) continue;
      const fwd = (o.x - c.x) * fx + (o.y - c.y) * fy;
      const lat = c.dir % 2 === 0 ? o.y : o.x;
      if (fwd > -30 && fwd < 40 && Math.abs(lat - lc) < 10) return; // carril ocupado
    }
    c.lane = to;
    c.signal = (c.dir === 0 || c.dir === 3) === (to === 1) ? 1 : -1;
    c.signalT = 1.4;
  }

  update(c, dt, P) {
    if (!c.nav) this.initNav(c);
    c.horn = Math.max(0, c.horn - dt);
    if (c.revT > 0) {
      // Marcha atrás girando, para despegarse de la pared y quedar apuntando al carril
      c.revT -= dt;
      const T0 = this.target(c, 14);
      const side = Math.sign(angDiff(Math.atan2(T0.y - c.y, T0.x - c.x), c.ang)) || 1;
      c.ang -= side * 1.3 * dt;
      const bx = c.x - Math.cos(c.ang) * 16 * dt, by = c.y - Math.sin(c.ang) * 16 * dt;
      if (!hitBuilding(bx, by, c.h * 0.5 + 1) && !hitCarBlock(bx, by, c.h * 0.5 + 1)) { c.x = bx; c.y = by; }
      c.spd = 0;
      c.brake = false;
      c.why = 'maniobra';
      c.queued = true;
      c.x = clamp(c.x, 10, WORLD - 10);
      c.y = clamp(c.y, 10, WORLD - 10);
      if (c.revT <= 0) { c.path = null; c.rot = false; c.inRing = false; c.dodge = null; c.planKey = -1; c.move = null; this.release(c); }
      return;
    }
    c.bold = Math.max(0, c.bold - dt);
    if (c.signalT > 0 && (c.signalT -= dt) <= 0 && !c.path) c.signal = 0;

    // Sirena atrás: se tira contra el cordón y afloja para dejar pasar al patrullero
    c.pullOver = Math.max(0, (c.pullOver || 0) - dt);
    if (!c.path && !c.diag && !c.inRing) {
      const hx = Math.cos(c.ang), hy = Math.sin(c.ang);
      for (const o of G.cars) {
        if (!o.chase || o.hp <= 0) continue;
        const rx = o.x - c.x, ry = o.y - c.y;
        const fwd = rx * hx + ry * hy;
        if (fwd < 0 && fwd > -80 && Math.abs(-rx * hy + ry * hx) < 22) { c.pullOver = 1.5; break; }
      }
    }

    // Diagonal Norte: solo la usa el que viene alineado con ella; los que la cruzan pasan derecho
    const inDiag = inDiagonalBand(c.x, c.y);
    if (inDiag && !c.path) {
      const dot = Math.cos(c.ang) * DIAG_UX + Math.sin(c.ang) * DIAG_UY;
      if (c.diag || Math.abs(dot) > 0.8) c.diag = dot >= 0 ? 1 : -1;
    } else if (c.diag) {
      c.diag = 0;
      c.dir = dirOf(c.ang);
      c.planKey = -1;
    }

    // Planificación: decide el giro con tiempo para acomodarse y frenar
    let stopAt = Infinity, light = null;
    if (!c.path && !c.diag) {
      const nc = this.nextCross(c);
      if (nc) {
        const key = nc.i * 1000 + nc.j;
        const planDist = (this.isAveRoad(c.dir, this.roadIdx(c.dir, c.x, c.y)) ? 90 : 45) + c.spd * 0.6;
        if (nc.dist < planDist && c.planKey !== key) this.planCross(c, nc.i, nc.j);
        if (!c.path) light = { i: nc.i, j: nc.j, dist: nc.dist };
      }
      // Calle cortada antes de la próxima bocacalle: pega la vuelta con tiempo
      const box = !c.path ? this.boxAt(c.x, c.y) : null;
      if (box && c.planKey !== box.i * 1000 + box.j && !(box.i === PLAZA_CX && box.j === PLAZA_CY)) {
        this.planCross(c, box.i, box.j); // apareció o quedó adentro de una bocacalle sin planear
      }
      if (!c.path && !c.dodge && !box) {
        const probe = 40 + c.spd * 0.4 + (c.spd * c.spd) / 90;
        if (!nc || nc.dist > probe) {
          const idx = this.roadIdx(c.dir, c.x, c.y);
          const along = (c.dir % 2 === 0 ? c.x : c.y) + (c.dir === 0 || c.dir === 1 ? probe : -probe);
          const p = this.lanePoint(c.dir, idx, c.lane, along);
          if (!this.roadOK(p.x, p.y)) this.planUTurn(c);
        }
      }
    }
    let toEntry = -1;
    if (c.path && c.entry) {
      toEntry = (c.entry.x - c.x) * DXS[c.dir] + (c.entry.y - c.y) * DYS[c.dir];
      if (toEntry > 0 && !c.rot) {
        const nc = this.nextCross(c);
        if (nc) light = { i: nc.i, j: nc.j, dist: toEntry };
      }
    }

    // Bocacalle: con semáforo en verde, salida libre y sin nadie adentro que se le cruce,
    // se compromete y entra; comprometido ya no frena por los que cruzan, así la
    // bocacalle siempre se vacía y no se puede armar un nudo.
    c.waitLight = 0;
    c.boxWait = false;
    let lineWhy = null;
    if (c.commit) {
      c.commitT += dt;
      const bx = this.boxAt(c.x, c.y);
      const inside = bx && bx.i * 1000 + bx.j === c.commit;
      if (inside) c.boxSeen = true;
      if ((c.boxSeen && !inside) || (!c.boxSeen && c.commitT > 4) || c.commitT > 10) this.release(c);
    } else if (c.move && !c.rot && !c.diag) {
      const m = c.move;
      let entryD;
      if (c.path && c.entry) entryD = toEntry;
      else {
        const nc = this.nextCross(c);
        entryD = nc && nc.i * 1000 + nc.j === m.key ? nc.dist : -1;
      }
      const bx = this.boxAt(c.x, c.y);
      if (bx && bx.i * 1000 + bx.j === m.key) entryD = 0;
      if (entryD <= 0 && entryD !== -1) {
        this.commitTo(c, m); // ya está adentro (apareció ahí o se pasó la línea): que salga
      } else if (entryD > 0 && entryD < 75) {
        const block = this.commitBlock(c, m, entryD);
        if (!block) {
          if (entryD < (c.spd * c.spd) / (2 * DRV.B) + 10) this.commitTo(c, m);
          c.lineT = 0;
        } else {
          lineWhy = block;
          stopAt = Math.max(0.3, entryD - 3);
          if (block === 'semaforo') { if (c.spd < 20) c.waitLight = 1; c.lineT = 0; }
          else {
            c.boxWait = block === 'bocacalle';
            if (entryD < 12 && c.spd < 8) {
              c.lineT += dt;
              if (c.lineT > 3 && !CLAIMS.get(m.key)) CLAIMS.set(m.key, c);
            }
          }
        }
      } else if (entryD === -1 && !c.path) {
        c.move = null; // se fue de esa bocacalle (esquive, vuelta en U): plan viejo
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
    const fx = Math.cos(want), fy = Math.sin(want);

    // Velocidad deseada: crucero, o la de la curva si se viene un giro
    let v0 = c.cruise;
    if (c.path) {
      const dIn = toEntry > 0 ? toEntry : 0;
      v0 = Math.min(v0, Math.sqrt(c.turnV * c.turnV + 2 * 45 * dIn));
    }
    if (c.diag) v0 = Math.min(v0, 55);
    if (c.pullOver > 0) v0 = Math.min(v0, 14);

    // Quién está adelante
    const lead = this.leader(c, fx, fy, P);
    let s = lead.s, vl = lead.v;
    let why = lead.who ? (lead.who === 'ped' || lead.who === 'player' ? lead.who : 'car') : 'libre';
    c.queued = false;
    // Alguien plantado en la calle: espera, toca bocina y pasa despacio (los peatones se corren)
    c.pedIgn = Math.max(0, (c.pedIgn || 0) - dt);
    if (lead.who === 'ped' && c.spd < 5) c.pedT = (c.pedT || 0) + dt;
    else c.pedT = Math.max(0, (c.pedT || 0) - dt);
    if (c.pedT > 1.6) { c.pedIgn = 2.5; c.pedT = 0; c.horn = 1.1; }
    // En la fila: detrás de uno que espera, o de uno que recién arranca (la ola de arranque del verde)
    if (lead.who && lead.who !== 'ped' && lead.who !== 'player' && lead.s < 30 && c.spd < 20
      && ((lead.who.waitLight || 0) > 0 || lead.who.queued || (Math.abs(lead.who.spd) < 12 && (lead.who.stopT || 0) < 1))) c.queued = true;
    if ((lead.who === 'player' || lead.who === P.car) && lead.s < 20 && c.horn <= 0 && Math.random() < 0.5) c.horn = 1.1;
    if (stopAt < s) { s = stopAt; vl = 0; why = lineWhy || 'semaforo'; }
    if ((why === 'bocacalle' || why === 'cruce') && c.spd < 8) c.queued = true;

    // Esquive: termina cuando ya pasó el obstáculo; empieza si algo quieto le tapa el carril
    if (c.dodge) {
      c.dodge.from += c.spd * dt;
      if (c.dodge.from > c.dodge.until || c.path) { c.dodge = null; c.signal = 1; c.signalT = 1; }
    }
    const lo = lead.who;
    // Algo quieto (o un patrullero haciendo un operativo) que no está esperando el semáforo ni la fila
    const isCop = typeof lo === 'object' && lo && (lo.chase || lo.cop);
    const stuckBehind = lo && why !== 'semaforo' && why !== 'bocacalle' && lead.s < 25 && lead.v < (isCop ? 12 : 6) && c.spd < 4
      && !(typeof lo === 'object' && ((lo.waitLight || 0) > 0 || lo.queued));
    c.blockT = stuckBehind ? (c.blockT || 0) + dt : 0;
    if (c.blockT > (isCop ? 1.2 : 2.2) && !c.path && !c.diag && !c.dodge) {
      const obst = lo === 'player' ? P : lo === 'ped' ? { x: c.x + fx * (lead.s + c.w / 2 + 3), y: c.y + fy * (lead.s + c.w / 2 + 3), w: 6 } : lo;
      if (this.tryDodge(c, obst)) { c.blockT = 0; if (lo === 'ped') c.pedIgn = 2.5; }
      else c.blockT = 1.2; // viene gente de frente: reintenta en un rato
    }

    // Ceder el paso: en la rotonda al que ya circula; en los cruces al que llega primero
    let yielding = false;
    if (c.bold <= 0) {
      if (c.rot && c.entry && !c.inRing && c.pi <= 1) {
        const dy = Math.hypot(c.entry.x - c.x, c.entry.y - c.y);
        if (dy < 30 && this.ringBusy(c)) {
          yielding = true;
          if (dy - 2 < s) { s = Math.max(0.3, dy - 2); vl = 0; why = 'rotonda'; }
        }
      } else if (!c.inRing) {
        // Los autos de la IA se ordenan con la reserva de bocacalles; acá solo se cede a los
        // que no la respetan (patrulleros, el auto del jugador) o a un esquive de frente
        for (const o of G.cars) {
          if (o === c || o.hp <= 0 || o.inRing) continue;
          if (o.ai && !o.chase && !c.dodge && !o.dodge) continue;
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
    let acc = v > v0 ? -Math.min(DRV.B * 1.5, (v - v0) * 3) : DRV.A * (1 - Math.pow(v / Math.max(v0, 1), 4));
    if (s < Infinity) {
      const sStar = DRV.S0 + Math.max(0, v * DRV.T + (v * (v - vl)) / (2 * Math.sqrt(DRV.A * DRV.B)));
      acc -= DRV.A * Math.pow(sStar / Math.max(s, 0.3), 2);
    }
    acc = clamp(acc, -DRV.B * 3, DRV.A);
    c.why = why; // qué lo está frenando (útil para depurar)
    c.leadCar = why === 'car' ? lead.who : null;
    c.brake = acc < -25 || (v < 1 && s < 20);
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
        if (dist(c, P) > OFFSCREEN) c.hp = 0;
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
      if (c.inRing) c.ringArc = (c.ringArc || 0) + (c.spd * dt) / ((ROTONDA_ISLAND_R + ROTONDA_R) / 2);
      if (cur && cur.exit) c.signal = 1; // guiño a la derecha para salir
    }

    // Trabado sin motivo (ni semáforo ni cola ni cediendo): lo mide el selfcheck y el despawn
    if (c.spd < 4 && !c.waitLight && !c.queued) c.stopT += dt;
    else c.stopT = 0;
    if (c.stopT > 9 && dist(c, P) > OFFSCREEN) c.hp = 0;
    // Fila eterna fuera de cámara (esquina del mapa, costa del río): se metió en un garaje.
    // Libera la calle y el spawner pone otro donde haya lugar.
    c.idleT = c.spd < 4 ? (c.idleT || 0) + dt : 0;
    if (c.idleT > 12 && dist(c, P) > OFFSCREEN) { this.release(c); c.hp = 0; }
  }
}

const trafficAI = new TrafficAI();
