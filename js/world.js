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

// Curva del riachuelo: entra por el borde norte, cruza el centro y sale por el este
const riverCurve = [
  { x: WORLD * 0.30, y: 0 },
  { x: WORLD * 0.55, y: WORLD * 0.55 },
  { x: WORLD, y: WORLD * 0.68 },
];
const riverPts = (() => {
  const [a, b, c] = riverCurve, pts = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, mt = 1 - t;
    pts.push({
      x: mt * mt * a.x + 2 * mt * t * b.x + t * t * c.x,
      y: mt * mt * a.y + 2 * mt * t * b.y + t * t * c.y,
      t,
    });
  }
  return pts;
})();
// Ancho del cauce segun el parametro t de la curva: dos senos desfasados dan
// tramos anchos y angostos sin que se note el patron
function riverWidthAt(t) {
  return RIVER_HALF * (0.80 + RIVER_WOBBLE * Math.sin(t * 7.3) + 0.20 * Math.sin(t * 17.1 + 1.7));
}
// Punto mas cercano de la curva junto con su t, para saber que ancho toca ahi
function riverNearest(x, y) {
  let best = Infinity, bt = 0;
  for (const p of riverPts) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < best) { best = d; bt = p.t; }
  }
  return { d: best, t: bt };
}
function distToRiver(x, y) {
  return riverNearest(x, y).d;
}
// Corredor del puente: sobre el eje de la avenida el agua se interrumpe
function inBridgeCorridor(x, y) {
  return Math.abs(x - (PLAZA_CX * CELL + AVENUE_ROAD / 2)) < BRIDGE_HALF
    || Math.abs(y - (PLAZA_CY * CELL + AVENUE_ROAD / 2)) < BRIDGE_HALF;
}

// Mascara de agua: hitBuilding() se llama muchisimo por frame y no puede recorrer
// los 100 puntos de la curva, asi que el cauce se rasteriza una sola vez a una
// grilla gruesa y las consultas quedan O(1).
const WATER_CELL = 12;
const WMW = Math.ceil(WORLD / WATER_CELL);
let WATER_MASK = null;
function bakeWaterMask() {
  WATER_MASK = new Uint8Array(WMW * WMW);
  for (let j = 0; j < WMW; j++) {
    for (let i = 0; i < WMW; i++) {
      const x = i * WATER_CELL + WATER_CELL / 2, y = j * WATER_CELL + WATER_CELL / 2;
      if (inBridgeCorridor(x, y)) continue;
      const n = riverNearest(x, y);
      if (n.d < riverWidthAt(n.t)) WATER_MASK[j * WMW + i] = 1;
    }
  }
}
function inWater(x, y) {
  if (!WATER_MASK) return false;
  const i = (x / WATER_CELL) | 0, j = (y / WATER_CELL) | 0;
  if (i < 0 || j < 0 || i >= WMW || j >= WMW) return false;
  return WATER_MASK[j * WMW + i] === 1;
}
// Igual que rectHitsDiagonalBand: si el lote toca el agua por cualquier lado, no va edificio
function rectHitsWater(x, y, w, h) {
  return inWater(x, y) || inWater(x + w, y) || inWater(x, y + h) || inWater(x + w, y + h)
    || inWater(x + w / 2, y + h / 2);
}

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
    this.carBlock = carBlock;
    this.casaRosada = casaRosada;
  }

  /**
   * Genera proceduralmente la cuadrícula de la ciudad, edificios con alturas,
   * parques, palmeras, faroles y semáforos en cada bocacalle.
   */
  buildCity() {
    this.buildings.length = 0;
    this.props.length = 0;
    this.lamps.length = 0;
    this.lights.length = 0;
    this.hospitals.length = 0;
    this.water.length = 0;
    this.carBlock.length = 0;
    this.casaRosada.length = 0;
    obelisco = null;

    // El cauce se rasteriza primero: el resto de la generacion lo consulta con inWater()
    bakeWaterMask();
    // Cadena de circulos solapados sobre la curva: es el cauce que se hornea y se
    // muestra en el minimapa (la colision real va por WATER_MASK, no por esta lista)
    for (let i = 0; i < riverPts.length; i++) {
      const p = riverPts[i];
      if (inBridgeCorridor(p.x, p.y)) continue;
      this.water.push({ x: p.x, y: p.y, r: riverWidthAt(p.t) });
    }

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
        // El rio ya no saltea celdas enteras: la manzana se genera normal y despues
        // cada lote que toca el agua se descarta, asi la orilla muerde la cuadra
        // en vez de cortarla en un cuadrado de grilla.
        const rn = riverNearest(cxCenter, cyCenter);
        const d2River = rn.d - riverWidthAt(rn.t);

        if (d2River < CELL * 0.4 && Math.hypot(cxCenter - WORLD, cyCenter - WORLD * 0.68) < BEACH_RADIUS) {
          this.props.push({ t: 'beach', x: bx, y: by, w: innerW, h: innerH });
          continue;
        }

        const park = !isPlaza && !isRosada && (cx + cy) % 9 === 4;

        if (park) {
          this.props.push({ t: 'park', x: bx, y: by, w: innerW, h: innerH });
          continue;
        }

        if (isPlaza) {
          obelisco = { x: cxCenter - 5, y: cyCenter - 5, w: 10, h: 10 };
          this.props.push({ t: 'rotonda', x: cxCenter, y: cyCenter, rIsland: ROTONDA_ISLAND_R, rRing: ROTONDA_R });
          this.props.push({ t: 'obelisco', x: cxCenter, y: cyCenter });
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
          if (inWater(tx, ty2)) continue; // no hay palmeras plantadas en el rio
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

      // Piramide de Mayo: monumento al medio de la explanada, del lado libre
      this.props.push({ t: 'piramide', x: px0 + (rx2 - px0) / 2, y: py0 + ph / 2 });

      // Los autos no pueden cruzar la explanada, pero peatones y el jugador a pie si.
      // Por eso va una coleccion aparte en vez de un edificio comun.
      const ix = PM_X0 + CELL, iy = PM_Y0 + CELL; // calle interna que se borro
      this.carBlock.push({ x: px0, y: iy, w: pw, h: ROAD });
      this.carBlock.push({ x: ix, y: py0, w: ROAD, h: ph });
    }

    // Faroles en cada esquina
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        const lx = cx * CELL + ROAD - 5, ly = cy * CELL + ROAD - 5;
        if (inWater(lx, ly)) continue; // el rio se comio la esquina, no hay farol flotando
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
          || inWater(cx * CELL + ROAD / 2, cy * CELL + ROAD / 2)) {
          this.lights.push(null);
          continue;
        }
        this.lights.push({
          cx,
          cy,
          x: cx * CELL + ROAD / 2,
          y: cy * CELL + ROAD / 2,
          phase: ((cx + cy) % 2) * (LIGHT_CYCLE / 2) + ((cx * 7 + cy * 3) % 5),
        });
      }
    }

    // Hospitales: dos edificios existentes, uno en cada mitad del mapa, convertidos
    // en centro de salud (pintados de blanco/rojo, con puerta ya lista para entrar)
    const targets = [[WORLD * 0.28, WORLD * 0.32], [WORLD * 0.72, WORLD * 0.68]];
    for (const [tx, ty] of targets) {
      let best = null, bd = Infinity;
      for (const b of this.buildings) {
        if (b.hospital || b.ty.k === 'torre') continue;
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

  /**
   * Hornea suelo, veredas, líneas, cebras, pasto y sombras en un canvas gigante
   * permitiendo renderizar el fondo a coste mínimo por frame.
   */
  bakeGround() {
    GROUND = document.createElement('canvas');
    GROUND.width = GROUND.height = WORLD;
    const g = GCTX = GROUND.getContext('2d');

    // Asfalto base
    g.fillStyle = '#31343a';
    g.fillRect(0, 0, WORLD, WORLD);

    // Manzanas: vereda + interior
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        if (cx === PLAZA_CX && cy === PLAZA_CY) continue; // la rotonda se hornea aparte, mas abajo
        const roadX = cx === PLAZA_CX ? AVENUE_ROAD : ROAD;
        const roadY = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
        const bx = cx * CELL + roadX - SIDEWALK, by = cy * CELL + roadY - SIDEWALK;
        const sw = CELL - roadX + SIDEWALK * 2, sh = CELL - roadY + SIDEWALK * 2;
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

    // Parques
    for (const p of this.props) {
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

    // Riachuelo: cadena de circulos solapados sobre la curva. Como cada uno tiene
    // su propio radio, la orilla queda irregular en vez de escalonada por celda.
    g.fillStyle = '#7d7256'; // barro de la orilla, un cachito mas ancho que el agua
    for (const w2 of this.water) {
      g.beginPath();
      g.arc(w2.x, w2.y, w2.r + 5, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#3f7ea6';
    for (const w2 of this.water) {
      g.beginPath();
      g.arc(w2.x, w2.y, w2.r, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.12)'; // reflejos, solo donde realmente hay agua
    for (let i = 0; i < 900; i++) {
      const x = rnd(0, WORLD), y = rnd(0, WORLD);
      if (!inWater(x, y)) continue;
      g.fillRect(x, y, rnd(6, 16), 2);
    }

    // Puentes: donde el agua cruzaria el eje de la avenida va deck de asfalto con baranda.
    // Se barre el corredor entero (no por celda) porque el cauce ancho lo cruza en tramos
    // de varias celdas de largo.
    {
      const colX = PLAZA_CX * CELL, rowY = PLAZA_CY * CELL;
      const floods = (x, y) => { const n = riverNearest(x, y); return n.d < riverWidthAt(n.t); };
      for (let y = 0; y < WORLD; y++) {
        if (!floods(colX + AVENUE_ROAD / 2, y)) continue;
        g.fillStyle = '#57534a';
        g.fillRect(colX, y, AVENUE_ROAD, 1);
        g.fillStyle = '#c9a227';
        g.fillRect(colX - 5, y, 4, 1);
        g.fillRect(colX + AVENUE_ROAD + 1, y, 4, 1);
      }
      for (let x = 0; x < WORLD; x++) {
        if (!floods(x, rowY + AVENUE_ROAD / 2)) continue;
        g.fillStyle = '#57534a';
        g.fillRect(x, rowY, 1, AVENUE_ROAD);
        g.fillStyle = '#c9a227';
        g.fillRect(x, rowY - 5, 1, 4);
        g.fillRect(x, rowY + AVENUE_ROAD + 1, 1, 4);
      }
    }

    // Líneas divisoras y cebras
    for (let i = 0; i <= GRID; i++) {
      const isAveCol = i === PLAZA_CX, isAveRow = i === PLAZA_CY;
      const rx = i * CELL, ry = i * CELL;
      const rw = isAveCol ? AVENUE_ROAD : ROAD, rh = isAveRow ? AVENUE_ROAD : ROAD;
      g.fillStyle = '#c9a227';
      for (let y = 0; y < WORLD; y += 16) {
        if (this.onRoad(rx + rw / 2, y) && (y % CELL) > rw && !inWater(rx + rw / 2, y)) {
          if (!isAveCol) g.fillRect(rx + rw / 2 - 1, y, 2, 9); // avenida: sin raya al medio, va el cantero
          if (isAveCol) {
            g.fillRect(rx + rw / 2 - 1 - AVENUE_LANE * 1.4, y, 2, 9);
            g.fillRect(rx + rw / 2 - 1 + AVENUE_LANE * 1.4, y, 2, 9);
          }
        }
      }
      for (let x = 0; x < WORLD; x += 16) {
        if (this.onRoad(x, ry + rh / 2) && (x % CELL) > rh && !inWater(x, ry + rh / 2)) {
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
        const n = riverNearest(x, y);
        if (n.d < riverWidthAt(n.t) + 8) return false; // sobre el puente no hay cantero
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
      for (let y = 28; y < WORLD; y += 30) {
        if (this.onRoad(midX, y) && (y % CELL) > AVENUE_ROAD && medianOk(midX, y)) {
          this.props.push({ t: 'arbol', x: midX, y, s: rnd(0.9, 1.25) });
          g.beginPath(); g.ellipse(midX + 4, y + 5, MW * 0.8, MW * 0.5, 0, 0, TAU); g.fill();
        }
      }
      for (let x = 28; x < WORLD; x += 30) {
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
        const rw = cx === PLAZA_CX ? AVENUE_ROAD : ROAD, rh = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
        // Sin cebras sobre el agua: donde el rio se comio la bocacalle no hay nada que cruzar
        for (let k = 3; k < Math.min(rw, rh) - 3; k += 8) {
          if (!inWater(ix + k, iy - 9)) g.fillRect(ix + k, iy - 9, 5, 7);
          if (!inWater(ix + k, iy + rh + 2)) g.fillRect(ix + k, iy + rh + 2, 5, 7);
          if (!inWater(ix - 9, iy + k)) g.fillRect(ix - 9, iy + k, 7, 5);
          if (!inWater(ix + rw + 2, iy + k)) g.fillRect(ix + rw + 2, iy + k, 7, 5);
        }
      }
    }

    // Sucio del asfalto: parches, tapas de cloaca, grietas
    for (let i = 0; i < 4200; i++) {
      const x = rnd(0, WORLD), y = rnd(0, WORLD);
      if (!this.onRoad(x, y)) continue;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.05)';
      g.fillRect(x, y, rnd(4, 22), rnd(3, 12));
    }
    for (let i = 0; i < 420; i++) {
      const x = rnd(0, WORLD), y = rnd(0, WORLD);
      if (!this.onRoad(x, y)) continue;
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
    m.fillStyle = '#4a5240';
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        const mrx = cx === PLAZA_CX ? AVENUE_ROAD : ROAD, mry = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
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
      m.fillRect(b.x * k, b.y * k, Math.max(1, b.w * k), Math.max(1, b.h * k));
    }
    m.fillStyle = '#3f7ea6';
    for (const w2 of this.water) {
      m.beginPath();
      m.arc(w2.x * k, w2.y * k, Math.max(1, w2.r * k), 0, TAU);
      m.fill();
    }
    m.fillStyle = '#dfc98a';
    for (const p of this.props) {
      if (p.t === 'beach') m.fillRect(p.x * k, p.y * k, Math.max(1, p.w * k), Math.max(1, p.h * k));
    }

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
    const rx = cx === PLAZA_CX ? AVENUE_ROAD : ROAD;
    const ry = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
    return (x % CELL) < rx || (y % CELL) < ry;
  }

  onRoad(x, y) {
    if (inPlazaMayo(x, y)) return false; // la explanada se come las calles internas
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    const rx = cx === PLAZA_CX ? AVENUE_ROAD : ROAD;
    const ry = cy === PLAZA_CY ? AVENUE_ROAD : ROAD;
    return (x % CELL) < rx || (y % CELL) < ry || inDiagonalBand(x, y);
  }

  inRotondaRing(x, y) {
    if (!obelisco) return false;
    const d = Math.hypot(x - (obelisco.x + obelisco.w / 2), y - (obelisco.y + obelisco.h / 2));
    return d > ROTONDA_ISLAND_R && d < ROTONDA_R;
  }

  lightState(L, horiz) {
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
    for (const b of this.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
        return b;
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

  freeRoadSpot() {
    for (let i = 0; i < 400; i++) {
      const x = rnd(ROAD, WORLD - ROAD), y = rnd(ROAD, WORLD - ROAD);
      if (this.onRoad(x, y) && !this.hitBuilding(x, y, 10)) return { x, y };
    }
    return { x: ROAD / 2, y: ROAD / 2 };
  }

  ringSpot(near, far, needRoad) {
    const px0 = (typeof G !== 'undefined' && G.player) ? G.player.x : WORLD / 2;
    const py0 = (typeof G !== 'undefined' && G.player) ? G.player.y : WORLD / 2;
    for (let i = 0; i < 120; i++) {
      const a = rnd(0, TAU), d = rnd(near, far);
      const x = clamp(px0 + Math.cos(a) * d, 12, WORLD - 12);
      const y = clamp(py0 + Math.sin(a) * d, 12, WORLD - 12);
      if (needRoad && !this.onRoad(x, y)) continue;
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
    const ox = ((x % CELL) + CELL) % CELL, oy = ((y % CELL) + CELL) % CELL;
    const inX = ox >= ROAD - 2 && ox <= ROAD + SIDEWALK + 2;
    const inY = oy >= ROAD - 2 && oy <= ROAD + SIDEWALK + 2;
    const farX = ox >= CELL - SIDEWALK - 2, farY = oy >= CELL - SIDEWALK - 2;
    return inX || inY || farX || farY;
  }

  toSidewalk(x, y) {
    const ox = ((x % CELL) + CELL) % CELL, oy = ((y % CELL) + CELL) % CELL;
    const bx = x - ox, by = y - oy;
    const tX = ox < CELL / 2 ? ROAD + SIDEWALK * 0.5 : CELL - SIDEWALK * 0.5;
    const tY = oy < CELL / 2 ? ROAD + SIDEWALK * 0.5 : CELL - SIDEWALK * 0.5;
    return Math.abs(ox - tX) < Math.abs(oy - tY) ? { x: bx + tX, y } : { x, y: by + tY };
  }

  laneSnap(x, y, ang, laneBias = 0) {
    const horiz = Math.abs(Math.cos(ang)) > 0.5;
    // El ancho sale de la celda DESTINO, no de la de origen: si no, un auto que viene
    // por la avenida y se snapea a una calle comun de al lado usa el ancho de avenida
    // y termina fuera del asfalto.
    const idx = Math.round(((horiz ? y : x) - ROAD / 2) / CELL);
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
const buildCity = () => world.buildCity();
const bakeGround = () => world.bakeGround();
const onRoad = (x, y) => world.onRoad(x, y);
const lightState = (L, horiz) => world.lightState(L, horiz);
const lightAhead = (x, y, ang) => world.lightAhead(x, y, ang);
const hitBuilding = (x, y, r) => world.hitBuilding(x, y, r);
const hitCarBlock = (x, y, r) => world.hitCarBlock(x, y, r);
const freeRoadSpot = () => world.freeRoadSpot();
const ringSpot = (near, far, needRoad) => world.ringSpot(near, far, needRoad);
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
