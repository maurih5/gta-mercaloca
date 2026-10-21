/* =========================================================================
   GTA MERCALOCA - Grafo de Calles
   ========================================================================= */

// Las calles como grafo: nodos (esquinas, puntas, cambios de tipo) y aristas con su
// polilínea (recta, diagonal o curva), ancho, carriles, mano y tipo. Se arma con datos
// planos (new Streets({ nodes, edges }), el literal que va a generar tools/osm2map.js)
// o desde la grilla de world.js con Streets.fromGrid(). No lee el estado del juego ni tira dados:
// con los mismos datos sale lo mismo en todas las pantallas. El juego todavía no lo usa.
//
// Nodo: { id, x, y }. Arista: { id, from, to, pts: [[x, y], ...] (de from a to),
//   roadW, sidewalkW, laneCount (carriles por mano), median, oneway (1 | -1 | null),
//   roadType (STREET_TYPES), level (0 tierra, 1 puente, -1 bajo nivel), bridgeStyle }
// roadW es la franja entera, como la mide onRoad; la vereda son los sidewalkW px de cada
// borde, adentro de la franja (igual que la grilla en world.onSidewalk).
// Dos aristas que se cruzan sin compartir nodo no son bocacalle (un puente sobre una
// calle): cada consulta puede filtrar por level.
// ponytail: fromGrid no arma la rotonda del obelisco (queda la bocacalle cuadrada), ni
// las villas (sus calles salen como calles comunes), ni manos únicas (oneway null).
// Los campos están: llenarlos cuando el mapa de Buenos Aires (osm2map) los traiga.
const STREET_TYPES = ['calle', 'avenida', 'autopista', 'rampa', 'puente'];
// Celda del índice espacial: una bocacalle de avenida (108 + veredas) entra en dos o
// tres celdas, así cada celda tiene solo las aristas de una esquina (ver el test).
const STREET_CELL = 64;

class Streets {
  constructor({ nodes, edges }) {
    this.nodes = new Map();
    this.edges = new Map();
    this.grid = new Map(); // "cx,cy" -> aristas que pueden cubrir algún punto de la celda
    this.errors = [];
    this.checked = 0; // aristas que miró la última consulta
    for (const n of nodes) {
      if (this.nodes.has(n.id)) this.errors.push('nodo ' + n.id + ' repetido');
      this.nodes.set(n.id, { ...n, edges: [] });
    }
    for (const e0 of edges) {
      const e = { sidewalkW: SIDEWALK, laneCount: 1, median: false, oneway: null, roadType: 'calle', level: 0, ...e0 };
      if (this.edges.has(e.id)) this.errors.push('arista ' + e.id + ' repetida');
      this.edges.set(e.id, e);
      for (const id of new Set([e.from, e.to])) { const n = this.nodes.get(id); if (n) n.edges.push(e.id); }
    }
    // Primero los tramos de todas, después las tapas: la tapa mira los tramos de las vecinas
    for (const e of this.edges.values()) this.shape(e);
    for (const e of this.edges.values()) this.caps(e);
    for (const e of this.edges.values()) this.index(e);
  }

  // Tramos de la polilínea. En cada punta la franja se estira con tapa cuadrada lo que
  // hace falta para tapar el ancho de las otras calles que llegan al nodo (así la
  // bocacalle queda cubierta entera, esquinas incluidas); en una punta sin salida, medio
  // ancho propio, como el cuadrado de la esquina de la grilla.
  shape(e) {
    e.segs = [];
    e.len = 0;
    const p = e.pts;
    if (!Array.isArray(p) || p.length < 2) return;
    for (let k = 0; k < p.length - 1; k++) {
      const [ax, ay] = p[k], [bx, by] = p[k + 1], len = Math.hypot(bx - ax, by - ay);
      if (!(len > 0)) continue;
      e.segs.push({ ax, ay, ux: (bx - ax) / len, uy: (by - ay) / len, s0: e.len, lo: 0, hi: len });
      e.len += len;
    }
  }

  caps(e) {
    if (!e.segs.length) return;
    e.segs[0].lo = -this.extAt(e, e.from, true);
    e.segs[e.segs.length - 1].hi += this.extAt(e, e.to, false);
  }

  // La tapa usa roadW/2·|sen θ| de cada vecina, que es aproximada: con una diagonal que
  // llega a un cruce cardinal puede pasarse 3-4 px de lo que dice onRoad (el test usa 5 px).
  // Diferencia conocida con onRoad: la bocacalle con ≤1 tramo vivo (en la ciudad actual, la
  // (6,0)) sale distinta; tolerancia 0,1% de la muestra (ver muestrear en selfcheck.js).
  extAt(e, nodeId, atFrom) {
    const n = this.nodes.get(nodeId);
    if (!n) return 0;
    const [ux, uy] = streetDir(e, atFrom);
    let ext = 0, others = 0;
    for (const id of n.edges) {
      const o = this.edges.get(id);
      if (o === e || !o.segs.length) continue;
      const [ox, oy] = streetDir(o, o.from === nodeId);
      others++;
      ext = Math.max(ext, o.roadW / 2 * Math.abs(ux * oy - uy * ox)); // medio ancho de la otra, visto desde esta
    }
    return others ? ext : e.roadW / 2;
  }

  // La arista va en todas las celdas que toca su franja ensanchada por la vereda: una
  // consulta mira una sola celda y nunca recorre el grafo.
  index(e) {
    const C = STREET_CELL, pad = e.roadW / 2 + e.sidewalkW, reach = pad + C * Math.SQRT1_2, seen = new Set();
    for (const g of e.segs) {
      const x0 = g.ax + g.ux * g.lo, y0 = g.ay + g.uy * g.lo, x1 = g.ax + g.ux * g.hi, y1 = g.ay + g.uy * g.hi;
      for (let i = Math.floor((Math.min(x0, x1) - pad) / C); i <= Math.floor((Math.max(x0, x1) + pad) / C); i++) {
        for (let j = Math.floor((Math.min(y0, y1) - pad) / C); j <= Math.floor((Math.max(y0, y1) + pad) / C); j++) {
          const cx = (i + 0.5) * C, cy = (j + 0.5) * C;
          const a = clamp((cx - x0) * g.ux + (cy - y0) * g.uy, 0, g.hi - g.lo);
          if (Math.hypot(cx - x0 - g.ux * a, cy - y0 - g.uy * a) > reach) continue;
          const k = i + ',' + j;
          if (seen.has(k)) continue;
          seen.add(k);
          if (!this.grid.has(k)) this.grid.set(k, []);
          this.grid.get(k).push(e);
        }
      }
    }
  }

  cell(x, y) {
    const c = this.grid.get(Math.floor(x / STREET_CELL) + ',' + Math.floor(y / STREET_CELL)) || [];
    this.checked = c.length;
    return c;
  }

  // Punto de la línea central de e más cercano a (x, y): d es la distancia, t cuánto se
  // recorrió desde from y lat el corrimiento (> 0 a la derecha yendo de from a to).
  // Pasada la tapa de una punta el punto no es de esta calle (d = Infinity).
  probe(e, x, y) {
    let best = { edge: e, d: Infinity };
    const last = e.segs.length - 1;
    e.segs.forEach((g, k) => {
      const rx = x - g.ax, ry = y - g.ay, along = rx * g.ux + ry * g.uy, lat = ry * g.ux - rx * g.uy;
      if ((k === 0 && along < g.lo) || (k === last && along > g.hi)) return;
      const a = clamp(along, g.lo, g.hi), px = g.ax + g.ux * a, py = g.ay + g.uy * a, d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { edge: e, d, t: clamp(g.s0 + a, 0, e.len), px, py, lat: a === along ? lat : Math.sign(lat) * d };
    });
    return best;
  }

  // La calle que hay en (x, y): la de franja más cercana, contando hasta sidewalkW px
  // afuera del cordón (lo que cubre el índice). null si no hay ninguna.
  near(x, y, level) {
    let best = null;
    for (const e of this.cell(x, y)) {
      if (level !== undefined && e.level !== level) continue;
      const h = this.probe(e, x, y);
      if (h.d <= e.roadW / 2 + e.sidewalkW && (!best || h.d - e.roadW / 2 < best.d - best.edge.roadW / 2)) best = h;
    }
    return best;
  }

  // Sobre la franja de alguna calle (lo mismo que mide onRoad)
  onRoadAt(x, y, level) {
    for (const e of this.cell(x, y)) {
      if ((level === undefined || e.level === level) && this.probe(e, x, y).d <= e.roadW / 2) return true;
    }
    return false;
  }

  // Vereda: el borde de alguna franja, salvo que caiga en el asfalto de otra (en la
  // bocacalle solo quedan de vereda las cuatro esquinas, como en la grilla)
  onSidewalkAt(x, y, level) {
    let side = false;
    for (const e of this.cell(x, y)) {
      if (level !== undefined && e.level !== level) continue;
      const d = this.probe(e, x, y).d;
      if (d > e.roadW / 2) continue;
      if (d < e.roadW / 2 - e.sidewalkW) return false;
      side = true;
    }
    return side;
  }

  // Carril y sentido en (x, y): dir 1 va de from a to, -1 al revés (se maneja por la
  // derecha); lane 0 es el de adentro (el del cantero o la raya del medio). En una
  // mano única los carriles se cuentan desde la izquierda de la marcha.
  laneAt(x, y, level) {
    const h = this.near(x, y, level);
    if (!h || h.d > h.edge.roadW / 2) return null;
    const e = h.edge, half = e.roadW / 2 - e.sidewalkW, mid = e.median ? AVE_MEDIAN : 0;
    const dir = e.oneway || (h.lat >= 0 ? 1 : -1);
    const lane = e.oneway ? Math.floor((h.lat * dir + half) / (2 * half / e.laneCount))
      : Math.floor((Math.abs(h.lat) - mid) / ((half - mid) / e.laneCount));
    return { edge: e, dir, lane: clamp(lane, 0, e.laneCount - 1), lat: h.lat, t: h.t };
  }

  edgesOf(nodeId) {
    const n = this.nodes.get(nodeId);
    return n ? n.edges.map(id => this.edges.get(id)) : [];
  }

  // Lista de problemas del grafo (vacía si está bien)
  validate() {
    const err = [...this.errors];
    for (const e of this.edges.values()) {
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      if (!a || !b) { err.push('arista ' + e.id + ' rota: no existe el nodo ' + (a ? e.to : e.from)); continue; }
      if (e.len < 4 || e.pts.length < 2) err.push('arista ' + e.id + ': necesita 2 puntos y medir 4px o más');
      else if (!(Math.hypot(e.pts[0][0] - a.x, e.pts[0][1] - a.y) <= 0.5)
        || !(Math.hypot(e.pts[e.pts.length - 1][0] - b.x, e.pts[e.pts.length - 1][1] - b.y) <= 0.5)) {
        err.push('arista ' + e.id + ': las puntas de la polilínea no caen en sus nodos');
      }
      if (!(e.roadW >= 30 && e.roadW <= 180)) err.push('arista ' + e.id + ': ancho inválido ' + e.roadW);
      if (!(e.sidewalkW >= 0 && e.sidewalkW * 2 < e.roadW)) err.push('arista ' + e.id + ': vereda inválida ' + e.sidewalkW);
      if (!(e.laneCount >= 1 && e.laneCount <= 3)) err.push('arista ' + e.id + ': carriles inválidos ' + e.laneCount);
      if (e.oneway != null && e.oneway !== 1 && e.oneway !== -1) err.push('arista ' + e.id + ': mano inválida ' + e.oneway);
      if (![-1, 0, 1].includes(e.level)) err.push('arista ' + e.id + ': nivel inválido ' + e.level);
      if (!STREET_TYPES.includes(e.roadType)) err.push('arista ' + e.id + ': tipo inválido ' + e.roadType);
      if (e.roadType === 'puente' && a.edges.length < 2 && b.edges.length < 2) {
        err.push('puente ' + e.id + ' colgado: ninguna punta conecta con otra calle');
      }
    }
    for (const n of this.nodes.values()) if (!n.edges.length) err.push('nodo ' + n.id + ' huérfano');
    // Conexo: desde el primer nodo se tiene que llegar a todos
    const first = this.nodes.values().next().value;
    if (first) {
      const seen = new Set([first.id]), q = [first];
      while (q.length) {
        for (const id of q.pop().edges) {
          const e = this.edges.get(id);
          for (const m of [e.from, e.to]) {
            if (!seen.has(m) && this.nodes.has(m)) { seen.add(m); q.push(this.nodes.get(m)); }
          }
        }
      }
      if (seen.size < this.nodes.size) {
        err.push('grafo disconexo: ' + (this.nodes.size - seen.size) + ' de ' + this.nodes.size + ' nodos no se alcanzan desde el nodo ' + first.id);
      }
    }
    return err;
  }

  // El grafo de la ciudad que armó buildCity: los tramos vivos de la grilla (los nodos
  // en el centro de cada bocacalle), la avenida, la Diagonal y los puentes, que cortan
  // su tramo en tres (calle, tablero en level 1, calle).
  static fromGrid() {
    if (!SEG_V) throw new Error('Streets.fromGrid: primero hay que armar la ciudad (buildCity)');
    const nodes = [], edges = [], ids = new Map();
    const node = (x, y) => {
      const k = Math.round(x) + ',' + Math.round(y);
      if (!ids.has(k)) { ids.set(k, nodes.length); nodes.push({ id: nodes.length, x, y }); }
      return ids.get(k);
    };
    const add = (a, b, props) => {
      if (inPlazaMayo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) return; // la explanada se come las calles internas
      edges.push({ id: edges.length, from: node(...a), to: node(...b), pts: [a, b], sidewalkW: SIDEWALK, ...props });
    };
    const cX = cx => cx * CELL + roadWidthCol(cx) / 2, cY = cy => cy * CELL + roadWidthRow(cy) / 2;
    // Tramo k de la calle `line` (fila si horiz, columna si no)
    // (el último tramo muere contra el borde del mapa, como en la grilla)
    const tramo = (horiz, line, k) => {
      const u0 = horiz ? cX(k) : cY(k), u1 = Math.min(horiz ? cX(k + 1) : cY(k + 1), horiz ? WORLD_W : WORLD_H);
      const v = horiz ? cY(line) : cX(line);
      if (u1 - u0 < 4 || v > (horiz ? WORLD_H : WORLD_W)) return;
      const ave = line === (horiz ? PLAZA_CY : PLAZA_CX);
      const at = u => (horiz ? [u, v] : [v, u]);
      const base = { roadW: horiz ? roadWidthRow(line) : roadWidthCol(line), laneCount: ave ? 2 : 1, median: ave,
        roadType: ave ? 'avenida' : 'calle' };
      const br = bridges.find(b => b.horiz === horiz && b.line === line * CELL && b.db > u0 && b.da < u1);
      let s = u1, f = u1;
      if (br) {
        s = clamp(br.da, u0, u1); f = clamp(br.db, u0, u1);
        if (s - u0 < 4) s = u0;
        if (u1 - f < 4) f = u1;
        if (f - s < 4) s = f = u1;
      }
      if (s > u0) add(at(u0), at(s), base);
      if (f > s) add(at(s), at(f), { ...base, roadType: 'puente', level: 1, bridgeStyle: br.style });
      if (u1 > f) add(at(f), at(u1), base);
    };
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        if (segAliveV(cx, cy)) tramo(false, cx, cy);
        if (segAliveH(cx, cy)) tramo(true, cy, cx);
      }
    }
    // Diagonal: sale a 45° del obelisco y pasa justo por el centro de las bocacalles que
    // cruza, así que va de esquina en esquina (la grilla la corta en la última antes de
    // la plaza, donde termina la franja)
    const diag = [];
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const dx = cX(i) - PLAZA_PX, dy = cY(j) - PLAZA_PY, u = dx * DIAG_UX + dy * DIAG_UY;
        if (Math.abs(dy * DIAG_UX - dx * DIAG_UY) < 1 && u > -CELL && u < DIAG_LEN) diag.push({ p: [cX(i), cY(j)], u });
      }
    }
    diag.sort((a, b) => a.u - b.u);
    for (let k = 0; k < diag.length - 1; k++) {
      add(diag[k].p, diag[k + 1].p, { roadW: DIAG_WIDTH, sidewalkW: 0, roadType: 'avenida' });
    }
    return new Streets({ nodes, edges });
  }
}

// Dirección con la que la arista sale de su punta from (atFrom) o to. Sale de los tramos,
// que ya saltean los puntos repetidos (OSM suele traerlos en las puntas).
function streetDir(e, atFrom) {
  const g = atFrom ? e.segs[0] : e.segs[e.segs.length - 1];
  return atFrom ? [g.ux, g.uy] : [-g.ux, -g.uy];
}
