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
const casaRosada = [];
let obelisco = null;

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
    });
  }
  return pts;
})();
function distToRiver(x, y) {
  let best = Infinity;
  for (const p of riverPts) best = Math.min(best, Math.hypot(x - p.x, y - p.y));
  return best;
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
    this.casaRosada.length = 0;
    obelisco = null;

    const plazaCx = GRID >> 1, plazaCy = GRID >> 1;

    let id = 0;
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        const bx = cx * CELL + ROAD, by = cy * CELL + ROAD;
        const inner = CELL - ROAD;
        const cxCenter = bx + inner / 2, cyCenter = by + inner / 2;
        const isPlaza = cx === plazaCx && cy === plazaCy;
        const d2River = distToRiver(cxCenter, cyCenter);

        if (d2River < RIVER_HALF) {
          this.water.push({ x: bx, y: by, w: inner, h: inner });
          continue;
        }
        if (d2River < RIVER_HALF + CELL * 0.4 && Math.hypot(cxCenter - WORLD, cyCenter - WORLD * 0.68) < BEACH_RADIUS) {
          this.props.push({ t: 'beach', x: bx, y: by, w: inner, h: inner });
          continue;
        }

        const park = !isPlaza && (cx + cy) % 9 === 4;

        if (park) {
          this.props.push({ t: 'park', x: bx, y: by, w: inner, h: inner });
          continue;
        }

        if (isPlaza) {
          this.props.push({ t: 'park', x: bx, y: by, w: inner, h: inner });
          obelisco = { x: cxCenter - 5, y: cyCenter - 5, w: 10, h: 10 };
          this.props.push({ t: 'obelisco', x: cxCenter, y: cyCenter });
          continue;
        }

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
          this.props.push({
            t: 'palm',
            x: bx + rnd(4, inner - 4),
            y: by + (Math.random() < 0.5 ? -SIDEWALK / 2 : inner + SIDEWALK / 2),
            s: rnd(0.85, 1.25),
          });
        }
      }
    }

    // Faroles en cada esquina
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
        this.lamps.push({ x: cx * CELL + ROAD - 5, y: cy * CELL + ROAD - 5 });
      }
    }

    // Semáforos: uno por bocacalle con fases desfasadas en damero
    for (let cy = 0; cy < GRID; cy++) {
      for (let cx = 0; cx < GRID; cx++) {
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

    // Casa Rosada: edificio existente cerca del centro, pintado de rosa
    {
      const tx = WORLD * 0.35, ty = WORLD * 0.55;
      let best = null, bd = Infinity;
      for (const b of this.buildings) {
        if (b.hospital || b.casaRosada || b.ty.k === 'torre') continue;
        const d = Math.hypot(b.x + b.w / 2 - tx, b.y + b.h / 2 - ty);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) {
        best.casaRosada = true;
        best.col = '#d88fa0';
        best.roofCol = '#f5ead6';
        this.casaRosada.push(best);
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
        const bx = cx * CELL + ROAD - SIDEWALK, by = cy * CELL + ROAD - SIDEWALK;
        const s = CELL - ROAD + SIDEWALK * 2;
        g.fillStyle = '#8d8d86';
        g.fillRect(bx, by, s, s);
        g.fillStyle = '#7a7a73';
        g.fillRect(bx, by, s, 2);
        g.fillRect(bx, by, 2, s);
        g.fillStyle = '#5a6247';
        g.fillRect(bx + SIDEWALK, by + SIDEWALK, s - SIDEWALK * 2, s - SIDEWALK * 2);

        // Juntas de la vereda
        g.fillStyle = 'rgba(0,0,0,.10)';
        for (let i = 0; i < s; i += 14) {
          g.fillRect(bx + i, by, 1, SIDEWALK);
          g.fillRect(bx + i, by + s - SIDEWALK, 1, SIDEWALK);
          g.fillRect(bx, by + i, SIDEWALK, 1);
          g.fillRect(bx + s - SIDEWALK, by + i, SIDEWALK, 1);
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
      }
    }

    // Riachuelo: cauce azul horneado
    for (const w2 of this.water) {
      g.fillStyle = '#3f7ea6';
      g.fillRect(w2.x, w2.y, w2.w, w2.h);
      g.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 0; i < 12; i++) {
        g.fillRect(w2.x + rnd(0, w2.w), w2.y + rnd(0, w2.h), rnd(6, 16), 2);
      }
    }

    // Líneas divisoras y cebras
    for (let i = 0; i <= GRID; i++) {
      const rx = i * CELL, ry = i * CELL;
      g.fillStyle = '#c9a227';
      for (let y = 0; y < WORLD; y += 16) {
        if (this.onRoad(rx + ROAD / 2, y) && (y % CELL) > ROAD) {
          g.fillRect(rx + ROAD / 2 - 1, y, 2, 9);
        }
      }
      for (let x = 0; x < WORLD; x += 16) {
        if (this.onRoad(x, ry + ROAD / 2) && (x % CELL) > ROAD) {
          g.fillRect(x, ry + ROAD / 2 - 1, 9, 2);
        }
      }
    }

    g.fillStyle = 'rgba(235,235,235,.55)';
    for (let cy = 0; cy <= GRID; cy++) {
      for (let cx = 0; cx <= GRID; cx++) {
        const ix = cx * CELL, iy = cy * CELL;
        for (let k = 3; k < ROAD - 3; k += 8) {
          g.fillRect(ix + k, iy - 9, 5, 7);
          g.fillRect(ix + k, iy + ROAD + 2, 5, 7);
          g.fillRect(ix - 9, iy + k, 7, 5);
          g.fillRect(ix + ROAD + 2, iy + k, 7, 5);
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
        m.fillRect((cx * CELL + ROAD) * k, (cy * CELL + ROAD) * k, (CELL - ROAD) * k, (CELL - ROAD) * k);
      }
    }
    m.fillStyle = '#6c6c62';
    for (const b of this.buildings) {
      m.fillRect(b.x * k, b.y * k, Math.max(1, b.w * k), Math.max(1, b.h * k));
    }
    m.fillStyle = '#3f7ea6';
    for (const w2 of this.water) {
      m.fillRect(w2.x * k, w2.y * k, Math.max(1, w2.w * k), Math.max(1, w2.h * k));
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

  onRoad(x, y) {
    return (x % CELL) < ROAD || (y % CELL) < ROAD;
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
    for (const w of this.water) {
      if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) {
        return w;
      }
    }
    if (obelisco && x + r > obelisco.x && x - r < obelisco.x + obelisco.w && y + r > obelisco.y && y - r < obelisco.y + obelisco.h) {
      return obelisco;
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
      if (pk.t === 'park' && x > pk.x && x < pk.x + pk.w && y > pk.y && y < pk.y + pk.h) return true;
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

  laneSnap(x, y, ang) {
    const horiz = Math.abs(Math.cos(ang)) > 0.5;
    const LANE = ROAD * 0.24;
    if (horiz) {
      const cy2 = Math.round((y - ROAD / 2) / CELL) * CELL + ROAD / 2;
      return { x, y: cy2 + (Math.cos(ang) > 0 ? LANE : -LANE), ang: Math.cos(ang) > 0 ? 0 : Math.PI };
    }
    const cx2 = Math.round((x - ROAD / 2) / CELL) * CELL + ROAD / 2;
    return { x: cx2 + (Math.sin(ang) > 0 ? -LANE : LANE), y, ang: Math.sin(ang) > 0 ? Math.PI / 2 : -Math.PI / 2 };
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
const freeRoadSpot = () => world.freeRoadSpot();
const ringSpot = (near, far, needRoad) => world.ringSpot(near, far, needRoad);
const inPark = (x, y) => world.inPark(x, y);
const pedBlocked = (x, y, r) => world.pedBlocked(x, y, r);
const onSidewalk = (x, y) => world.onSidewalk(x, y);
const toSidewalk = (x, y) => world.toSidewalk(x, y);
const laneSnap = (x, y, ang) => world.laneSnap(x, y, ang);
const nearestDoor = (x, y, maxD) => world.nearestDoor(x, y, maxD);
const dayT = () => world.dayT();
const ambient = () => world.ambient();
const darkness = () => world.darkness();
const getObelisco = () => obelisco;
