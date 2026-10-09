/* =========================================================================
   GTA MERCALOCA - Fábrica y Gestión de Entidades (Jugador, Peatones, Autos, Efectos)
   ========================================================================= */

class EntityManager {
  // Todo lo que es de cada jugador vive acá (guita, búsqueda, arresto, hospital...):
  // en el estado global (G) solo queda el mundo compartido y la vista local.
  makePlayer(def, id = 0) {
    return {
      kind: 'player',
      id,
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
      wpn: 'pistola',
      inv: { pistola: Infinity },
      armor: 0,
      swing: 0,
      porros: 0,
      money: 0,
      wanted: 0,
      wantCool: 0,
      busted: 0,
      bustT: 0,
      bustFine: 0,
      healing: 0,
      healT: 0,
      nearShop: null,
      nearTranza: null,
      zone: null,
      slowmo: 0,
      high: 0,
      ctl: idleControls(),
      prev: idleControls(),
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

  // Un famoso es un peatón con nombre: camina como cualquiera, pero no entra a edificios,
  // dice sus frases y tiene sus propias reglas al caer
  makeFamous(def, x, y) {
    const p = this.makePedAt(x, y);
    return Object.assign(p, {
      famous: def,
      def: null,
      face: 'famous-' + def.id,
      shirt: def.shirt,
      pants: def.pants,
      hp: def.hp,
      sped: def.spd,
      life: FAMOUS_LIFE,
      talkT: 0,
      line: '',
      lineT: 0,
    });
  }

  sidewalkSpot(near, far, center) {
    const c0 = spawnCenter(center), px0 = c0.x, py0 = c0.y;
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

  makeCop(center) {
    const c0 = spawnCenter(center), px0 = c0.x, py0 = c0.y;
    // La yuta a pie no aparece adentro de la villa
    let x = 0, y = 0, ok = false;
    for (let i = 0; i < 20 && !ok; i++) {
      const a = rnd(0, TAU), d = rnd(200, 310);
      x = clamp(px0 + Math.cos(a) * d, 10, WORLD - 10);
      y = clamp(py0 + Math.sin(a) * d, 10, WORLD - 10);
      ok = !villaAt(x, y) && !hitBuilding(x, y, 6);
    }
    if (!ok) return null;
    return {
      kind: 'cop',
      x,
      y,
      ang: 0,
      r: 5,
      hp: 45,
      cool: rnd(0.4, 1.4),
      walk: 0,
      muzzle: 0,
      bustT: 0,
      tgt: center && center.kind === 'player' ? center : null,
    };
  }

  // Tranza parado en su esquina de la villa. Si lo atacan, la villa entera se pudre.
  makeTranza(villa, spot, i) {
    const look = TRANZA_LOOK[i % TRANZA_LOOK.length];
    return {
      kind: 'tranza',
      villa,
      home: spot,
      x: spot.x,
      y: spot.y,
      ang: rnd(0, TAU),
      r: 5,
      hp: 60,
      walk: 0,
      cool: rnd(0.3, 1),
      muzzle: 0,
      look: rnd(1, 4),
      dead: 0,
      face: 'tranza' + (i % TRANZA_LOOK.length),
      shirt: look.shirt,
      pants: look.pants,
      wpn: i % 3 === 2 ? 'uzi' : 'pistola',
    };
  }

  makeChaser(center) {
    const c0 = spawnCenter(center), px0 = c0.x, py0 = c0.y;
    // Aparece sobre una calle de verdad: un punto al azar caía a veces en el río o la explanada
    let c = null;
    for (let i = 0; i < 20 && !c; i++) {
      const a = rnd(0, TAU), d = rnd(240, 380);
      const t = this.makeCar(clamp(px0 + Math.cos(a) * d, 20, WORLD - 20), clamp(py0 + Math.sin(a) * d, 20, WORLD - 20), true);
      // makeCar lo acomoda al carril más cercano, que cerca del borde puede quedar afuera del
      // mapa (onRoad sigue dando true ahí): de afuera no vuelve y queda girando para siempre
      const adentro = t.x > 20 && t.y > 20 && t.x < WORLD - 20 && t.y < WORLD - 20;
      if (adentro && onRoad(t.x, t.y) && !hitBuilding(t.x, t.y, 8) && !hitCarBlock(t.x, t.y, 8)) c = t;
    }
    if (!c) {
      const fs = freeRoadSpot();
      c = this.makeCar(fs.x, fs.y, true);
    }
    c.ai = false;
    c.chase = true;
    c.tgt = center && center.kind === 'player' ? center : null;
    c.cruise = 150;
    return c;
  }

  makePickup() {
    const s = freeRoadSpot();
    const r = Math.random();
    const kind = r < 0.56 ? 'cash' : r < 0.74 ? 'hp' : 'weapon';
    const pk = {
      x: s.x,
      y: s.y,
      kind,
      food: kind === 'hp' ? FOODS[(Math.random() * FOODS.length) | 0] : null,
      t: 0,
    };
    if (pk.kind === 'weapon') {
      const l = this.pickLoot();
      pk.w = l.id;
      pk.ammo = l.ammo;
    }
    return pk;
  }

  pickLoot() {
    let r = Math.random() * LOOT.reduce((a, l) => a + l.w, 0);
    for (const l of LOOT) {
      if ((r -= l.w) <= 0) return l;
    }
    return LOOT[0];
  }

  // Fierro que suelta un enemigo: dura un rato en el piso y desaparece
  makeDrop(x, y, w, ammo) {
    return { x, y, kind: 'weapon', w, ammo, t: 0, drop: true };
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

// Alrededor de quién se reparte lo que aparece (autos, peatones, yuta): el punto dado,
// o el jugador local, o el centro del mapa si todavía no hay nadie jugando
function spawnCenter(center) {
  if (center) return center;
  if (typeof G !== 'undefined' && G.me) return G.me;
  return { x: WORLD / 2, y: WORLD / 2 };
}

// Exportación de funciones clásicas para compatibilidad
const makePlayer = (def, id) => entities.makePlayer(def, id);
const makePedAt = (x, y) => entities.makePedAt(x, y);
const makeFamous = (def, x, y) => entities.makeFamous(def, x, y);
const sidewalkSpot = (near, far, center) => entities.sidewalkSpot(near, far, center);
const makePed = () => entities.makePed();
const makeCar = (x, y, cop) => entities.makeCar(x, y, cop);
const makeCop = center => entities.makeCop(center);
const makeChaser = center => entities.makeChaser(center);
const makeTranza = (v, spot, i) => entities.makeTranza(v, spot, i);
const makePickup = () => entities.makePickup();
const makeGuard = (building, i, n) => entities.makeGuard(building, i, n);
const makeDrop = (x, y, w, ammo) => entities.makeDrop(x, y, w, ammo);
const boom = (x, y, n, col, pow) => entities.boom(x, y, n, col, pow);
const puff = (x, y, col, n, rise) => entities.puff(x, y, col, n, rise);
const decal = (x, y, r, col) => entities.decal(x, y, r, col);
