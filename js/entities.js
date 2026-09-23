/* =========================================================================
   GTA MERCALOCA - Fábrica y Gestión de Entidades (Jugador, Peatones, Autos, Efectos)
   ========================================================================= */

class EntityManager {
  makePlayer(def) {
    return {
      kind: 'player',
      def,
      x: 0,
      y: 0,
      ang: 0,
      r: 5,
      hp: 100,
      maxhp: 100,
      car: null,
      cool: 0,
      walk: 0,
      dead: false,
      muzzle: 0,
      run: 0,
    };
  }

  makePedAt(x, y) {
    const ty = PEDTYPE[(Math.random() * PEDTYPE.length) | 0];
    const useFace = Math.random() < 0.28; // Algunos son del crew, el resto anónimos
    const def = useFace ? CREW[(Math.random() * CREW.length) | 0] : null;
    return {
      kind: 'ped',
      ty,
      def,
      face: def ? def.id : ('ped' + ((Math.random() * 4) | 0)),
      shirt: def ? def.shirt : ty.shirt,
      pants: def ? def.pants : ty.pants,
      x,
      y,
      ang: rnd(0, TAU),
      r: 5,
      hp: 30,
      walk: 0,
      tt: 0,
      sped: ty.spd * rnd(0.85, 1.15),
      chat: 0,
      inside: null,
      doorT: rnd(6, 26),
      fade: 1,
      target: null,
    };
  }

  sidewalkSpot(near, far) {
    const px0 = (typeof G !== 'undefined' && G.player) ? G.player.x : WORLD / 2;
    const py0 = (typeof G !== 'undefined' && G.player) ? G.player.y : WORLD / 2;
    for (let i = 0; i < 150; i++) {
      const a = rnd(0, TAU), d = rnd(near, far);
      const x = clamp(px0 + Math.cos(a) * d, 12, WORLD - 12);
      const y = clamp(py0 + Math.sin(a) * d, 12, WORLD - 12);
      const t = toSidewalk(x, y);
      if (!hitBuilding(t.x, t.y, 6)) return t;
    }
    return null;
  }

  makePed() {
    const s = this.sidewalkSpot(OFFSCREEN, SIM_R) || freeRoadSpot();
    return this.makePedAt(s.x, s.y);
  }

  makeGuard(building, i, n) {
    const door = building.door;
    const tx = (door.s === 'n' || door.s === 's') ? 1 : 0;
    const ty = (door.s === 'n' || door.s === 's') ? 0 : 1;
    const off = (i - (n - 1) / 2) * 14;
    const x = door.x + tx * off + door.ox * 1.4;
    const y = door.y + ty * off + door.oy * 1.4;
    return {
      kind: 'ped',
      ty: PEDTYPE[0],
      def: null,
      face: 'ped0',
      shirt: '#1d1d22',
      pants: '#14213d',
      x,
      y,
      ang: Math.atan2(-door.oy, -door.ox),
      r: 5,
      hp: 30,
      walk: 0,
      tt: 0,
      sped: 0,
      chat: 0,
      inside: null,
      doorT: 0,
      fade: 1,
      target: null,
    };
  }

  makeCar(x, y, cop = false) {
    const m = cop
      ? { k: 'patrol', w: 24, h: 11, cruise: 78 }
      : CARMODEL[(Math.random() * CARMODEL.length) | 0];
    const ang = Math.round(rnd(0, 4)) * Math.PI / 2;
    const L = laneSnap(x, y, ang);
    return {
      kind: 'car',
      x: L.x,
      y: L.y,
      ang: L.ang,
      spd: 0,
      hp: cop ? 140 : 100,
      col: cop ? '#e9e9ef' : (m.col || CARCOL[(Math.random() * CARCOL.length) | 0]),
      cop,
      model: m,
      w: m.w,
      h: m.h,
      cruise: m.cruise * rnd(0.9, 1.1),
      ai: !cop,
      steer: 0,
      seed: Math.random() * 100,
      horn: 0,
      stopT: 0,
    };
  }

  makeCop() {
    const px0 = (typeof G !== 'undefined' && G.player) ? G.player.x : WORLD / 2;
    const py0 = (typeof G !== 'undefined' && G.player) ? G.player.y : WORLD / 2;
    const a = rnd(0, TAU), d = rnd(200, 310);
    return {
      kind: 'cop',
      x: clamp(px0 + Math.cos(a) * d, 10, WORLD - 10),
      y: clamp(py0 + Math.sin(a) * d, 10, WORLD - 10),
      ang: 0,
      r: 5,
      hp: 45,
      cool: rnd(0.4, 1.4),
      walk: 0,
      muzzle: 0,
      bustT: 0,
    };
  }

  makeChaser() {
    const px0 = (typeof G !== 'undefined' && G.player) ? G.player.x : WORLD / 2;
    const py0 = (typeof G !== 'undefined' && G.player) ? G.player.y : WORLD / 2;
    const a = rnd(0, TAU), d = rnd(240, 380);
    const sp = {
      x: clamp(px0 + Math.cos(a) * d, 20, WORLD - 20),
      y: clamp(py0 + Math.sin(a) * d, 20, WORLD - 20),
    };
    const c = this.makeCar(sp.x, sp.y, true);
    c.ai = false;
    c.chase = true;
    c.cruise = 150;
    return c;
  }

  makePickup() {
    const s = freeRoadSpot();
    const isHp = Math.random() < 0.22;
    return {
      x: s.x,
      y: s.y,
      kind: isHp ? 'hp' : 'cash',
      food: isHp ? FOODS[(Math.random() * FOODS.length) | 0] : null,
      t: 0,
    };
  }

  boom(x, y, n, col, pow = 1) {
    if (typeof G === 'undefined' || !G.fx) return;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), v = rnd(20, 80) * pow;
      G.fx.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rnd(0.25, 0.75),
        max: 0.75,
        col,
        sz: rnd(1, 2.6),
      });
    }
  }

  puff(x, y, col, n = 1, rise = 14) {
    if (typeof G === 'undefined' || !G.smoke) return;
    for (let i = 0; i < n; i++) {
      G.smoke.push({
        x: x + rnd(-3, 3),
        y: y + rnd(-3, 3),
        vx: rnd(-6, 6),
        vy: -rise + rnd(-4, 4),
        life: rnd(0.6, 1.5),
        max: 1.5,
        r: rnd(2, 4),
        col,
      });
    }
  }

  decal(x, y, r, col) {
    if (!GCTX) return;
    GCTX.fillStyle = col;
    GCTX.beginPath();
    GCTX.ellipse(x, y, r, r * 0.72, Math.random() * TAU, 0, TAU);
    GCTX.fill();
  }
}

const entities = new EntityManager();

// Exportación de funciones clásicas para compatibilidad
const makePlayer = def => entities.makePlayer(def);
const makePedAt = (x, y) => entities.makePedAt(x, y);
const sidewalkSpot = (near, far) => entities.sidewalkSpot(near, far);
const makePed = () => entities.makePed();
const makeCar = (x, y, cop) => entities.makeCar(x, y, cop);
const makeCop = () => entities.makeCop();
const makeChaser = () => entities.makeChaser();
const makePickup = () => entities.makePickup();
const makeGuard = (building, i, n) => entities.makeGuard(building, i, n);
const boom = (x, y, n, col, pow) => entities.boom(x, y, n, col, pow);
const puff = (x, y, col, n, rise) => entities.puff(x, y, col, n, rise);
const decal = (x, y, r, col) => entities.decal(x, y, r, col);
