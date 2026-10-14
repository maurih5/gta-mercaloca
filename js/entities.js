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
      seat: 0,         // en el auto: 0 maneja, 1+ acompañante
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
      food: 100,       // hambre: 100 lleno, 0 muerto de hambre
      drink: 100,      // sed
      bag: {},         // mochila: comida y bebida por id (FOOD)
      respect: 0,      // respeto (RANKS)
      wantPeak: 0,     // estrellas máximas desde la última vez en 0 (para el respeto al perderlos)
      trapo: null,     // la barra cuyo trapo lleva encima
      trapoT: 0,
      trapos: 0,       // trapos aguantados
      hitBy: null,     // el último jugador que le pegó (para darle el respeto si cae)
      hitT: 0,
      money: 0,
      bank: 0,         // guita en el banco: no se pierde al morir ni al caer
      wanted: 0,
      wantCool: 0,
      busted: 0,
      bustT: 0,
      bustFine: 0,
      healing: 0,
      healT: 0,
      nearShop: null,
      nearTranza: null,
      nearSuper: null,
      nearBank: null,
      nearGrill: null,
      nearTrapo: null,
      nearBoliche: null,
      party: 0,        // boliche donde está adentro (índice en boliches + 1)
      partyT: 0,
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
      air: !!def.heli,
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
    // Para un lado al azar, pero que el carril caiga en una calle que existe: en una
    // esquina con una calle cortada (por el río, en el borde) se pasaba a esa y el auto
    // aparecía fuera del asfalto. Se prueban los cuatro sentidos, empezando por el sorteado.
    const ang0 = Math.round(rnd(0, 4)) * Math.PI / 2;
    let L = laneSnap(x, y, ang0);
    for (let i = 1; i < 4 && !onRoad(L.x, L.y); i++) {
      const L2 = laneSnap(x, y, ang0 + i * Math.PI / 2);
      if (onRoad(L2.x, L2.y)) L = L2;
    }
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
  // Las barras (mundo compartido): su estadio, dónde cuelga el trapo y en qué anda
  makeBarras() {
    const out = [];
    for (const def of BARRAS) {
      const st = stadiums.find(b => b.stadium === def.stadium);
      if (!st) continue;
      const d = st.door;
      out.push({
        def, stadium: st,
        flag: { x: d.x + d.ox * 1.6, y: d.y + d.oy * 1.6 }, // en la vereda, frente a la puerta
        trapo: 'hung', // 'hung' colgado · 'carried' lo lleva alguien · 'gone' robado
        by: null, backT: 0, angry: 0, tgt: null,
        owner: null, ctl: 0, chal: null, payT: 0, // territorio: dueño (jugador), control 0..1, el que lo está tomando
      });
    }
    return out;
  }

  // Un hincha de la barra: para alrededor del trapo; con bronca, sale a cazar
  makeHincha(barra, i) {
    const f = barra.flag, n = barra.def.n;
    let home = null;
    for (let k = 0; k < 12 && !home; k++) {
      const a = Math.PI * (0.15 + 0.7 * ((i + k * 0.37) % n) / n), r = rnd(16, 30);
      const p = { x: f.x + Math.cos(a) * r * 1.6, y: f.y + Math.sin(a) * r * 0.6 };
      if (!hitBuilding(p.x, p.y, 6)) home = p;
    }
    home = home || { x: f.x + rnd(-20, 20), y: f.y + 8 };
    return {
      kind: 'hincha', barra, home, x: home.x, y: home.y, ang: rnd(0, TAU), r: 5,
      hp: HINCHA_HP, walk: 0, cool: 0, look: rnd(1, 3), dead: 0,
      face: 'ped' + ((Math.random() * 4) | 0),
    };
  }

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

  // Chispas, humo y manchas: el host las repite en la pantalla de los demás (js/net.js)
  boom(x, y, n, col, pow = 1) {
    if (typeof G === 'undefined' || !G.fx) return;
    net.fx(['b', x, y, n, col, pow]);
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
    net.fx(['p', x, y, col, n, rise]);
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
    net.fx(['d', x, y, r, col]);
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
const makeBarras = () => entities.makeBarras();
const makeHincha = (b, i) => entities.makeHincha(b, i);
const makePickup = () => entities.makePickup();
const makeGuard = (building, i, n) => entities.makeGuard(building, i, n);
const makeDrop = (x, y, w, ammo) => entities.makeDrop(x, y, w, ammo);
const boom = (x, y, n, col, pow) => entities.boom(x, y, n, col, pow);
const puff = (x, y, col, n, rise) => entities.puff(x, y, col, n, rise);
const decal = (x, y, r, col) => entities.decal(x, y, r, col);
