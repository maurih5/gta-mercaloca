/* =========================================================================
   GTA MERCALOCA - Lógica Central del Juego, Estado y Simulación Física
   ========================================================================= */

// El juego es multijugador: G guarda el mundo compartido (autos, peatones, yuta, balas)
// y la vista local (cámara, temblor, mensajes, menús). Todo lo de cada jugador (guita,
// búsqueda, arresto, hospital, armas) vive en su objeto, en G.players. G.me es el jugador
// de esta pantalla: la cámara, el HUD y el teclado son suyos y de nadie más.
const G = {
  state: 'load',
  t: 0,
  cam: { x: 0, y: 0 },
  shake: 0,
  players: [],
  me: null,
  faces: {},
  cars: [],
  peds: [],
  guards: [],
  cops: [],
  bullets: [],
  nades: [],
  pickups: [],
  fx: [],
  smoke: [],
  msg: '',
  msgT: 0,
  paused: false,
  mapOpen: false,
  mapZoom: MAP_MIN_ZOOM,
  mapX: 0,          // centro del mapa (se mueve con flechas o arrastrando)
  mapY: 0,
  mapLegend: true,  // las referencias al costado (L)
  flash: 0,
  shopOpen: false,
  tranzas: [],
  barras: [],      // LA DOCENA y LOS BORRACHOS DEL TABLERO: su trapo y su bronca
  hinchas: [],
  ts: 1,
};

// En juego: ni muerto, ni en la secuencia de arresto, ni adentro del hospital.
// La IA solo persigue, apunta y arresta a los que están en juego.
function inPlay(P) {
  return !!P && !P.dead && !P.busted && !P.healing && !P.party;
}

// Eventos aleatorios: cada uno es { id, weight, when?(), run() }. Solo corren en el host.
const EVENTS = [];

// El jugador más cercano a o (entre los que cumplen ok), con su distancia
function nearestPlayer(o, ok = null) {
  let p = null, d = Infinity;
  for (const P of G.players) {
    if (ok && !ok(P)) continue;
    const dp = dist(o, P);
    if (dp < d) { d = dp; p = P; }
  }
  return { p, d };
}

const distToPlayers = o => nearestPlayer(o).d;
const farFromPlayers = (o, r) => distToPlayers(o) > r;
// ¿o se ve en la pantalla de P (con margen m)? La cámara sigue al jugador pero se frena
// contra el borde del mapa, así que ahí el jugador no está en el centro
function inView(P, o, m = 0) {
  const cx = clamp(P.x - RW / 2, 0, WORLD_W - RW), cy = clamp(P.y - RH / 2, 0, WORLD_H - RH);
  return o.x > cx - m && o.x < cx + RW + m && o.y > cy - m && o.y < cy + RH + m;
}
// Ninguno de los otros jugadores lo ve (para aparecer gente alrededor de uno sin que se vea en la pantalla del otro)
const offscreenForOthers = (o, P) => G.players.every(q => q === P || dist(q, o) > OFFSCREEN);

// Choque de dos autos como rectángulos girados (largo w, ancho h): cuánto se pisan y para
// qué lado conviene separarlos (de a hacia b), o null si no se tocan
function carOverlap(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, R = (a.w + b.w) / 2 + 2;
  if (Math.abs(dx) > R || Math.abs(dy) > R) return null;
  const ext = (c, ux, uy) => Math.abs(Math.cos(c.ang) * ux + Math.sin(c.ang) * uy) * c.w / 2
    + Math.abs(-Math.sin(c.ang) * ux + Math.cos(c.ang) * uy) * c.h / 2;
  let o = Infinity, nx = 0, ny = 0;
  for (const t of [a.ang, a.ang + Math.PI / 2, b.ang, b.ang + Math.PI / 2]) {
    const ux = Math.cos(t), uy = Math.sin(t), d = dx * ux + dy * uy;
    const k = ext(a, ux, uy) + ext(b, ux, uy) - Math.abs(d);
    if (k <= 0) return null;
    if (k < o) { o = k; nx = d >= 0 ? ux : -ux; ny = d >= 0 ? uy : -uy; }
  }
  return { o, ux: nx, uy: ny };
}

// El que maneja es el del asiento 0; los demás que tengan P.car === car van de acompañantes
function driverOf(car) {
  for (const P of G.players) if (P.car === car && !P.seat) return P;
  return null;
}
const ridersOf = car => G.players.filter(P => P.car === car);

class Game {
  constructor() {
    this.state = G;
  }

  // Los mensajes y el temblor son de la pantalla local: lo que le pasa a otro jugador
  // se le manda a su pantalla por la red (con P = null es para esta pantalla)
  say(t, s = 2.6, P = null) {
    if (P && P !== G.me) {
      net.to(P, ['m', t, s]);
      return;
    }
    G.msg = t;
    G.msgT = s;
  }

  shakeFor(P, n) {
    if (P === G.me) G.shake += n;
    else if (P) net.to(P, ['k', n]);
  }

  nearMe(x, y) {
    return !!G.me && Math.hypot(x - G.me.x, y - G.me.y) < OFFSCREEN * 1.5;
  }

  shakeAt(x, y, n) {
    if (this.nearMe(x, y)) G.shake += n;
    net.fx(['K', x, y, n]);
  }

  // Fogonazo blanco en la pantalla de P, o en la de todos los que estén cerca de (x, y)
  flashFor(P, v) {
    if (P === G.me) G.flash = Math.max(G.flash, v);
    else if (P) net.to(P, ['f', v]);
  }

  flashAt(x, y, v) {
    if (this.nearMe(x, y)) G.flash = Math.max(G.flash, v);
    net.fx(['F', x, y, v]);
  }

  // La armería, el tranza y los supers se abren en la pantalla del jugador que entró
  openShop(P, kind) {
    if (P === G.me) shop.open(kind);
    else net.to(P, ['shop', kind]);
  }

  snapCam() {
    if (!G.me) return;
    G.cam.x = clamp(G.me.x - RW / 2, 0, WORLD_W - RW);
    G.cam.y = clamp(G.me.y - RH / 2, 0, WORLD_H - RH);
  }

  startGame(def) {
    G.me = makePlayer(def, 0);
    G.players = [G.me];
    const s = freeRoadSpot();
    G.me.x = s.x;
    G.me.y = s.y;
    this.snapCam();
    G.cars = [];
    this.resetSupers();
    for (const g of parrillas) Object.assign(g, { cooking: false, t: 0, portions: 0, owner: null });
    copNav.reset();
    G.corralitoT = undefined;
    G.eventT = undefined;
    G.lastEvent = null;
    G.festejo = null;
    G.peds = [];
    G.guards = [];
    G.cops = [];
    G.bullets = [];
    G.nades = [];
    G.pickups = [];
    G.fx = [];
    G.smoke = [];
    G.shopOpen = false;
    G.ts = 1;
    G.tranzas = [];
    for (const v of villas) {
      v.angry = 0;
      v.spots.forEach((sp, i) => G.tranzas.push(makeTranza(v, sp, i)));
    }
    G.barras = makeBarras();
    G.hinchas = [];
    for (const b of G.barras) for (let i = 0; i < b.def.n; i++) G.hinchas.push(makeHincha(b, i));

    // Cada auto en un carril a mitad de cuadra, con lugar adelante (js/traffic.js)
    for (let k = 0; G.cars.length < CAR_TARGET && k < CAR_TARGET * 60; k++) {
      // Si alrededor no entran (una esquina del mapa), el resto en cualquier calle
      const sp = (k < CAR_TARGET * 40 && ringSpot(60, SIM_R, true)) || freeRoadSpot();
      const car = trafficAI.spawnAt(sp);
      if (car) G.cars.push(car);
    }
    for (let i = 0; i < PED_TARGET; i++) {
      const sp = sidewalkSpot(40, SIM_R) || freeRoadSpot();
      G.peds.push(makePedAt(sp.x, sp.y));
    }
    for (let i = 0; i < 18; i++) {
      G.pickups.push(makePickup());
    }
    if (casaRosada.length) {
      for (let i = 0; i < CASA_ROSADA_GUARDS; i++) {
        G.guards.push(makeGuard(casaRosada[0], i, CASA_ROSADA_GUARDS));
      }
    }

    G.state = 'play';
    G.paused = false;
    G.mapOpen = false;
    G.mapZoom = MAP_MIN_ZOOM;
    G.shake = 0;
    this.say('MERCALOCA EN LA CALLE. JUNTA GUITA.', 3.4);
    if (typeof touchController !== 'undefined') {
      touchController.updateVisibility();
    }
  }

  // Suma un jugador a la partida en curso, cerca del local. Devuelve null si está llena.
  addPlayer(def) {
    if (G.players.length >= MAX_PLAYERS) return null;
    const id = G.players.reduce((m, p) => Math.max(m, p.id), -1) + 1;
    const P = makePlayer(def, id);
    const s = (G.me && ringSpot(20, 120, true, G.me)) || freeRoadSpot();
    P.x = s.x;
    P.y = s.y;
    G.players.push(P);
    return P;
  }

  removePlayer(P) {
    if (P.car) this.exitCar(P);
    G.players = G.players.filter(p => p !== P);
    if (G.me === P) G.me = G.players[0] || null;
    // La yuta que lo buscaba se busca otro objetivo en el próximo frame
    for (const c of G.cops) if (c.tgt === P) c.tgt = null;
    for (const c of G.cars) if (c.tgt === P) c.tgt = null;
  }

  // Volver al barrio después de morir con otros jugando: no se reinicia el mundo de
  // todos, reaparece solo él, sin fierros, ni estrellas, ni la guita que llevaba encima
  // (la del banco la conserva)
  respawn(P) {
    const s = freeRoadSpot();
    Object.assign(P, {
      x: s.x, y: s.y, hp: P.maxhp, dead: false, car: null, seat: 0, cool: 0.5, money: 0,
      inv: { pistola: Infinity }, wpn: 'pistola', armor: 0,
      wanted: 0, wantCool: 0, wantPeak: 0, slowmo: 0, food: 80, drink: 80, bag: {}, trapo: null,
    });
    if (P === G.me) this.snapCam();
    this.say('DE VUELTA EN EL BARRIO', 2.6, P);
  }

  bust(P = G.me) {
    if (!P || P.dead || P.busted) return;
    P.busted = 1;
    P.bustT = 0;
    P.bustFine = Math.round(P.money * 0.35) + 200 * P.wanted;
    if (P.car) {
      this.exitCar(P);
    }
    P.hp = Math.max(P.hp, 1);
    this.shakeFor(P, 6);
    sfxFor(P, 'arresto');
    this.say('QUEDATE QUIETO!', 2.2, P);
  }

  finishBust(P = G.me) {
    if (!P) return;
    P.money = Math.max(0, P.money - P.bustFine);
    P.wanted = 0;
    P.wantCool = 0;
    // Se van los que lo buscaban a él; la yuta de los otros jugadores sigue en lo suyo
    G.cops = G.cops.filter(c => c.tgt !== P);
    G.cars = G.cars.filter(c => !c.chase || c.tgt !== P || driverOf(c));
    const s = freeRoadSpot();
    P.x = s.x;
    P.y = s.y;
    P.hp = P.maxhp;
    P.car = null;
    P.cool = 0.5;
    this.dropTrapo(P);
    this.loseRespect(P, RESPECT_BUST);
    this.addScore(P, -SCORE.bust);
    P.wantPeak = 0;
    // En la comisaria te sacan los fierros y el chaleco, y te dan un mate cocido
    P.food = Math.max(P.food, 50);
    P.drink = Math.max(P.drink, 50);
    P.inv = { pistola: Infinity };
    P.wpn = 'pistola';
    P.armor = 0;
    if (P === G.me) this.snapCam();
    P.busted = 0;
    P.bustT = 0;
    this.say('TE SOLTARON SIN LOS FIERROS. PERDISTE $' + P.bustFine, 3.4, P);
  }

  // Bajarse: el auto queda ahí, sin nadie adentro (rueda hasta frenar si venía andando),
  // y es tuyo para volver a subirte sin que nadie llame a la yuta
  // Si se baja el que maneja y quedan acompañantes, pasa a manejar el de asiento más bajo
  exitCar(P = G.me) {
    if (!P || !P.car) return;
    const car = P.car, seat = P.seat;
    sfx('puerta', car.x, car.y);
    const side = Math.PI / 2 * (seat % 2 ? -1 : 1);
    P.x = car.x + Math.cos(car.ang + side) * 15;
    P.y = car.y + Math.sin(car.ang + side) * 15;
    P.car = null;
    P.seat = 0;
    const rest = ridersOf(car);
    if (rest.length) {
      if (!seat) rest.reduce((a, b) => (b.seat < a.seat ? b : a)).seat = 0;
      return;
    }
    car.ai = false;
    car.chase = false;
    car.nav = false;
    car.parked = P;
    car.brake = false;
    car.steer = 0;
  }

  wantUp(P, n) {
    if (!P) return;
    const old = P.wanted;
    P.wanted = Math.min(5, P.wanted + n);
    P.wantPeak = Math.max(P.wantPeak || 0, P.wanted);
    P.wantCool = 0;
    if (P.wanted > old && P.wanted >= 2) {
      sfxFor(P, 'busqueda');
      this.say('NIVEL DE BUSQUEDA ' + '*'.repeat(P.wanted), 2.6, P);
    }
  }

  wreckCar(car) {
    const P = driverOf(car), riders = ridersOf(car);
    sfx('explosion', car.x, car.y);
    trafficAI.alarm(car.x, car.y, 170, P, 2);
    boom(car.x, car.y, P ? 34 : 24, '255,150,40', 2);
    puff(car.x, car.y, '40,40,40', 10, 26);
    decal(car.x, car.y, P ? 14 : 12, 'rgba(10,10,10,.5)');
    if (P) {
      for (const q of riders) {
        this.shakeFor(q, 12);
        this.flashFor(q, 0.8);
        q.hp -= 25;
        this.exitCar(q);
      }
    } else {
      this.shakeAt(car.x, car.y, 4);
    }
  }

  // Da un arma (o le suma balas si ya la tenía). Si es nueva, la pone en la mano.
  giveWeapon(P, id, ammo) {
    const isNew = !(P.inv[id] > 0);
    P.inv[id] = WEAPONS[id].melee ? Infinity : (P.inv[id] || 0) + ammo;
    if (isNew) P.wpn = id;
  }

  hurtPlayer(P, n, by = null) {
    if (by && by.kind === 'player' && by !== P) {
      P.hitBy = by;
      P.hitT = G.t;
    }
    if (P.armor > 0) {
      const a = Math.min(P.armor, n * 0.7);
      P.armor -= a;
      n -= a;
    }
    P.hp -= n;
  }

  // Un balazo a un jugador: en el auto lo absorbe casi todo la chapa
  shootPlayer(P, dmg, by = null) {
    this.shakeFor(P, 1.6);
    sfx('impacto', P.x, P.y);
    if (P.car) {
      P.car.hp -= dmg;
      this.hurtPlayer(P, (dmg * 2) / 7, by);
    } else {
      this.hurtPlayer(P, dmg, by);
    }
    boom(P.x, P.y, 5, '190,35,35');
  }

  // Un balazo a un auto que no maneja ningún jugador: si tiene chofer, se asusta y sale
  // rajando (o se baja corriendo); si la chapa no da más, revienta
  shootCar(c, dmg, by = null) {
    const alive = c.hp > 0;
    c.hp -= dmg * 0.6;
    boom(c.x, c.y, 5, '255,220,150');
    sfx('pared', c.x, c.y);
    trafficAI.alarm(c.x, c.y, 40, by, 1.5);
    if (alive && c.hp <= 0) {
      c.spd = 0;
      this.explode(c.x, c.y, 30, 60, by);
    }
  }

  // Daño a peatón o policía, con premio y búsqueda para el jugador que lo bajó (by)
  hurt(e, dmg, by = null) {
    if (e.hp <= 0) return;
    if (e.famous) {
      this.famousLine(e, e.famous.hurt);
      // El inmortal acusa el golpe y sigue como si nada
      if (e.famous.immortal) {
        boom(e.x, e.y, 5, '255,255,255');
        sfx('impacto', e.x, e.y);
        return;
      }
    }
    e.hp -= dmg;
    boom(e.x, e.y, 7, '190,35,35');
    sfx('impacto', e.x, e.y);
    if (e.kind === 'hincha') {
      // Tocar a uno es meterse con toda la barra
      const B = e.barra;
      if (by && B.tgt !== by) this.say(B.def.name + ' TE QUIERE MATAR', 2.6, by);
      B.angry = Math.max(B.angry, BARRA_ANGRY);
      if (by) B.tgt = by;
      if (e.hp <= 0) {
        decal(e.x, e.y, rnd(4, 7), 'rgba(95,12,12,.5)');
        if (by) by.money += 60;
        this.wantUp(by, 1);
      }
      return;
    }
    if (e.kind === 'tranza') {
      // Con respeto (CAPO o más), el primer golpe no prende la villa: avisan
      if (by && e.hp > 0 && e.villa.angry <= 0 && this.rankOf(by) >= RANK_CALM && !(e.villa.warnT > 0)) {
        e.villa.warnT = 25;
        this.say('EL TRANZA TE RESPETA... NO TE ZARPES', 2.6, by);
        return;
      }
      if (e.villa.angry <= 0) this.say('SE PUDRIO TODO EN ' + e.villa.name, 3, by);
      e.villa.angry = 45;
      if (e.hp <= 0) {
        decal(e.x, e.y, rnd(4, 7), 'rgba(95,12,12,.5)');
        if (by) by.money += 150;
        if (Math.random() < 0.4) G.pickups.push(makeDrop(e.x, e.y, 'uzi', 30));
      }
      return;
    }
    if (e.hp <= 0) {
      decal(e.x, e.y, rnd(4, 7), 'rgba(95,12,12,.5)');
      if (e.famous) this.famousDown(e, by);
      if (e.air) this.explode(e.x, e.y, 26, 40, by); // el helicóptero se viene abajo
      this.wantUp(by, e.kind === 'cop' ? 2 : 1);
      if (by) by.money += e.kind === 'cop' ? 120 : 40;
      if (e.kind === 'cop' && Math.random() < 0.3) G.pickups.push(makeDrop(e.x, e.y, 'escopeta', 6));
    }
  }

  // Lo que un jugador le puede pegar: la gente de la calle y, con PVP, los otros jugadores
  targetsOf(P) {
    const out = [];
    for (const list of [G.cops, G.peds, G.tranzas, G.hinchas]) {
      for (const e of list) if (e.hp > 0 && !e.inside && !e.air) out.push(e);
    }
    if (PVP) {
      for (const q of G.players) if (q !== P && inPlay(q) && !q.car) out.push(q);
    }
    return out;
  }

  damage(e, dmg, by) {
    if (e.kind === 'player') this.hurtPlayer(e, dmg, by);
    else this.hurt(e, dmg, by);
  }

  // Q rota entre las armas con balas, 1-6 elige directo
  switchWeapon(P) {
    const owned = WEAPON_ORDER.filter(id => P.inv[id] > 0);
    let next = null;
    if (P.ctl.next && !P.prev.next) next = owned[(owned.indexOf(P.wpn) + 1) % owned.length];
    const slot = WEAPON_ORDER[P.ctl.slot - 1];
    if (slot && P.inv[slot] > 0) next = slot;
    if (next && next !== P.wpn) {
      P.wpn = next;
      this.say(WEAPONS[next].name, 1.2, P);
    }
  }

  attack(P) {
    let id = P.wpn, W = WEAPONS[id];
    // Desde el auto solo se tira con armas de fuego
    if (P.car && (W.melee || W.thrown)) {
      id = 'pistola';
      W = WEAPONS.pistola;
    }
    P.cool = P.car ? W.cool * 0.8 : W.cool;
    if (W.melee) {
      this.swing(P, W);
      return;
    }

    if (W.thrown) {
      const a = P.ang;
      G.nades.push({
        x: P.x + Math.cos(a) * 8,
        y: P.y + Math.sin(a) * 8,
        vx: Math.cos(a) * 190,
        vy: Math.sin(a) * 190,
        z: 4,
        vz: 70,
        t: 1.15,
        owner: P,
      });
      sfx('granada', P.x, P.y);
    } else {
      for (let i = 0; i < W.pellets; i++) {
        const a = P.ang + rnd(-W.spread, W.spread);
        const v = W.spd * (W.pellets > 1 ? rnd(0.85, 1.1) : 1);
        G.bullets.push({
          x: P.x + Math.cos(a) * 10,
          y: P.y + Math.sin(a) * 10,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: W.life,
          owner: P,
          dmg: W.dmg,
        });
      }
      P.muzzle = 1;
      sfx(id, P.x, P.y);
      trafficAI.alarm(P.x, P.y, 120, P, 1); // los tiros asustan a los que manejan cerca
      this.shakeFor(P, W.shake);
      boom(P.x + Math.cos(P.ang) * W.barrel, P.y + Math.sin(P.ang) * W.barrel, 3, '255,225,150');
    }

    if (P.inv[id] !== Infinity && --P.inv[id] <= 0) {
      P.inv[id] = 0;
      P.wpn = 'pistola';
      this.say('SIN ' + W.short + '. VOLVES A LA 9MM', 1.8, P);
    }
    if (P.wanted < 1) this.wantUp(P, 1);
  }

  // Bastonazo: pega a todo lo que esté adelante y lo empuja
  swing(P, W) {
    P.swing = 1;
    sfx('swing', P.x, P.y);
    let hit = false;
    for (const e of this.targetsOf(P)) {
      const d = dist(e, P);
      if (d > W.reach) continue;
      const a = Math.atan2(e.y - P.y, e.x - P.x);
      const da = Math.abs(((a - P.ang + Math.PI * 3) % TAU) - Math.PI);
      if (da > 1.1 && d > 7) continue;
      this.damage(e, W.dmg, P);
      const nx = e.x + Math.cos(a) * 7, ny = e.y + Math.sin(a) * 7;
      if (!pedBlocked(nx, ny, e.r)) {
        e.x = nx;
        e.y = ny;
      }
      hit = true;
    }
    if (hit) {
      sfx('golpe', P.x, P.y);
      this.shakeFor(P, 2);
      if (P.wanted < 1) this.wantUp(P, 1);
    }
  }

  // by: el jugador que la provocó (granada, auto que revienta), o null
  explode(x, y, R, dmg, by = null) {
    const at = { x, y };
    sfx('explosion', x, y);
    boom(x, y, 40, '255,150,40', 2.2);
    boom(x, y, 16, '255,230,160', 1.2);
    puff(x, y, '40,40,40', 12, 24);
    decal(x, y, 13, 'rgba(10,10,10,.5)');
    this.shakeAt(x, y, 10);
    this.flashAt(x, y, 0.7);
    for (const list of [G.cops, G.peds, G.tranzas, G.hinchas]) {
      for (const e of list) {
        if (e.hp <= 0 || e.inside) continue;
        const d = dist(e, at);
        if (d < R) this.hurt(e, dmg * (1 - (d / R) * 0.6), by);
      }
    }
    // Los autos que revientan hacen explotar a los de al lado
    for (const c of G.cars) {
      const d = dist(c, at);
      if (c.hp <= 0 || d >= R + 8) continue;
      c.hp -= dmg * (1 - (d / (R + 8)) * 0.5);
      if (c.hp <= 0 && !driverOf(c)) {
        c.spd = 0;
        this.explode(c.x, c.y, 30, 60, by);
      }
    }
    for (const P of G.players) {
      if (!inPlay(P) || P.car) continue;
      if (by && P !== by && !PVP) continue;
      const d = dist(P, at);
      if (d < R) this.hurtPlayer(P, dmg * 0.6 * (1 - (d / R) * 0.6), by);
    }
    if (by && by.wanted < 1) this.wantUp(by, 1);
    // Después del daño: los choferes que se bajan corriendo no salen ya heridos por la misma explosión
    trafficAI.alarm(x, y, R * 5, by, 2);
  }

  updateNades(dt) {
    for (const n of G.nades) {
      n.t -= dt;
      const nx = n.x + n.vx * dt, ny = n.y + n.vy * dt;
      if (hitBuilding(nx, n.y, 2)) n.vx *= -0.5;
      else n.x = clamp(nx, 4, WORLD_W - 4);
      if (hitBuilding(n.x, ny, 2)) n.vy *= -0.5;
      else n.y = clamp(ny, 4, WORLD_H - 4);
      n.vz -= 260 * dt;
      n.z += n.vz * dt;
      if (n.z <= 0) {
        n.z = 0;
        n.vz = -n.vz * 0.4;
        n.vx *= 1 - 4 * dt;
        n.vy *= 1 - 4 * dt;
      }
      if (n.t <= 0) this.explode(n.x, n.y, WEAPONS.granada.radius, WEAPONS.granada.dmg, n.owner || null);
    }
    G.nades = G.nades.filter(n => n.t > 0);
  }

  updateTranzas(dt) {
    for (const v of villas) {
      v.angry = Math.max(0, v.angry - dt);
      v.warnT = Math.max(0, (v.warnT || 0) - dt);
    }
    for (const t of G.tranzas) {
      t.muzzle = Math.max(0, t.muzzle - dt * 14);

      // Al rato vuelve otro a la esquina, si nadie lo está mirando
      if (t.hp <= 0) {
        t.dead += dt;
        if (t.dead > 90 && farFromPlayers(t.home, OFFSCREEN)) {
          Object.assign(t, { x: t.home.x, y: t.home.y, hp: 60, dead: 0 });
        }
        continue;
      }

      const { p: P, d } = nearestPlayer(t, inPlay);
      if (P && t.villa.angry > 0 && d < 170) {
        // Modo guerra: le apunta al más cercano, se acerca un poco y tira
        t.ang = Math.atan2(P.y - t.y, P.x - t.x);
        if (d > 60) {
          const nx = t.x + Math.cos(t.ang) * 40 * dt, ny = t.y + Math.sin(t.ang) * 40 * dt;
          if (!pedBlocked(nx, t.y, t.r)) t.x = nx;
          if (!pedBlocked(t.x, ny, t.r)) t.y = ny;
          t.walk += (dt * 40) / 8;
        }
        t.cool -= dt;
        if (t.cool <= 0) {
          const uzi = t.wpn === 'uzi';
          t.cool = uzi ? rnd(0.09, 0.16) : rnd(0.5, 1.1);
          if (uzi && Math.random() < 0.08) t.cool = rnd(0.8, 1.4); // pausa entre ráfagas
          const a = t.ang + rnd(-0.18, 0.18);
          t.muzzle = 1;
          sfx(t.wpn === 'uzi' ? 'uzi' : 'pistola', t.x, t.y);
          trafficAI.alarm(t.x, t.y, 100, t, 1);
          G.bullets.push({
            x: t.x + Math.cos(a) * 9,
            y: t.y + Math.sin(a) * 9,
            vx: Math.cos(a) * 340,
            vy: Math.sin(a) * 340,
            life: 0.7,
            owner: null,
            dmg: 7,
          });
        }
      } else {
        // Tranqui: vuelve a su esquina y mira para los costados
        const dh = dist(t, t.home);
        if (dh > 3) {
          t.ang = Math.atan2(t.home.y - t.y, t.home.x - t.x);
          t.x += Math.cos(t.ang) * 30 * dt;
          t.y += Math.sin(t.ang) * 30 * dt;
          t.walk += (dt * 30) / 8;
        } else {
          t.look -= dt;
          if (t.look <= 0) {
            t.look = rnd(1.5, 4);
            t.ang = P && d < 60 ? Math.atan2(P.y - t.y, P.x - t.x) : rnd(0, TAU);
          }
        }
      }
    }
  }

  // ---- Famosos ----

  // Dice una de sus frases (la ven todos los que estén cerca: es un globito en el mundo)
  famousLine(p, lines) {
    if (!lines || !lines.length || p.lineT > 1.2) return;
    p.line = lines[(Math.random() * lines.length) | 0];
    p.lineT = 2.6;
  }

  // ---- Hambre y sed ----

  // Bajan solas; en 0 se pierde vida de a poco y, bien comido y tomado, la vida sube
  updateNeeds(P, dt) {
    const f0 = P.food, d0 = P.drink;
    P.food = Math.max(0, P.food - HUNGER_RATE * dt);
    P.drink = Math.max(0, P.drink - THIRST_RATE * dt);
    // Avisos al cruzar el umbral (una vez por bajada)
    if (f0 > NEED_LOW && P.food <= NEED_LOW) this.say('TENES HAMBRE. C PARA COMER', 2.6, P);
    if (d0 > NEED_LOW && P.drink <= NEED_LOW) this.say('TENES SED. C PARA TOMAR ALGO', 2.6, P);
    if ((f0 > 0 && P.food <= 0) || (d0 > 0 && P.drink <= 0)) {
      this.say(P.food <= 0 ? 'TE ESTAS MURIENDO DE HAMBRE' : 'TE ESTAS MURIENDO DE SED', 3, P);
    }
    if (P.food <= 0 || P.drink <= 0) P.hp -= NEED_HURT * dt;
    else if (P.food > NEED_GOOD && P.drink > NEED_GOOD && P.hp > 0 && P.hp < P.maxhp) {
      P.hp = Math.min(P.maxhp, P.hp + NEED_REGEN * dt);
    }
  }

  // Lo que más le sirve ahora de lo que tiene en la mochila (null si nada le sirve)
  bestBite(P) {
    let best = null, bs = 0;
    for (const id in P.bag) {
      const F = FOOD[id];
      if (!F || !(P.bag[id] > 0)) continue;
      const s = Math.min(F.food, 100 - P.food) + Math.min(F.drink, 100 - P.drink)
        + Math.min(F.heal, P.maxhp - P.hp) * 0.5;
      if (s > bs) { bs = s; best = id; }
    }
    return best;
  }

  eat(P, id = this.bestBite(P)) {
    if (!Object.keys(P.bag).some(k => FOOD[k] && P.bag[k] > 0)) {
      this.say('NO TENES NADA PARA COMER. PASA POR UN SUPER', 2.2, P);
      return false;
    }
    const F = FOOD[id];
    if (!F || !(P.bag[id] > 0)) {
      this.say('ESTAS LLENO', 1.8, P);
      return false;
    }
    if (--P.bag[id] <= 0) delete P.bag[id];
    P.food = Math.min(100, P.food + F.food);
    P.drink = Math.min(100, P.drink + F.drink);
    P.hp = Math.min(P.maxhp, P.hp + F.heal);
    sfxFor(P, 'comida');
    this.say((F.drink > F.food ? 'TE TOMASTE ' : 'TE COMISTE ') + (FOOD_NAME[id] || id.toUpperCase()), 2, P);
    return true;
  }

  // Cuántas cosas lleva en la mochila
  bagCount(P) {
    let n = 0;
    for (const k in P.bag) n += P.bag[k];
    return n;
  }

  // ---- Respeto ----

  rankOf(P) {
    let r = 0;
    RANKS.forEach(([min], i) => { if ((P.respect || 0) >= min) r = i; });
    return r;
  }

  // quiet: sin cartel (el que llama ya avisa), salvo que suba de rango
  gainRespect(P, n, why, quiet = false) {
    if (!P || !n) return;
    const r0 = this.rankOf(P);
    P.respect = (P.respect || 0) + n;
    const r1 = this.rankOf(P);
    if (r1 > r0) {
      this.say('AHORA SOS ' + RANKS[r1][1] + '!', 3.4, P);
      sfxFor(P, 'guita');
      this.flashFor(P, 0.35);
    } else if (!quiet) {
      this.say('+' + n + ' RESPETO' + (why ? ' (' + why + ')' : ''), 2.4, P);
    }
  }

  // Boliche: abre de noche, sin la yuta encima y pagando la entrada
  enterBoliche(P, b) {
    const D = bolicheOf(b);
    if (!bolicheOpen()) return this.say(D.name + ' ABRE A LA NOCHE', 2.4, P);
    if (P.wanted >= 2) return this.say('EL PATOVICA NO TE DEJA PASAR', 2.6, P);
    if (P.money < D.entry) return this.say('LA ENTRADA SALE $' + D.entry, 2.4, P);
    P.money -= D.entry;
    P.party = boliches.indexOf(b) + 1;
    P.partyT = 0;
    sfxFor(P, 'puerta');
    this.say('ADENTRO DE ' + D.name + '...', 2.4, P);
  }

  leaveBoliche(P) {
    const D = bolicheOf(boliches[P.party - 1]);
    P.party = 0;
    if (D.respect) this.gainRespect(P, D.respect, D.name);
    if (D.food) {
      P.food = Math.max(P.food, D.food);
      P.drink = Math.max(P.drink, D.drink);
      this.say('SALISTE COMIDO Y CON LA SED SACADA', 2.6, P);
    }
    if (D.bet) {
      const won = Math.random() < 0.5;
      if (won) P.money += D.bet;
      sfxFor(P, won ? 'guita' : 'puerta');
      this.say(won ? 'LE GANASTE LA MESA: +$' + D.bet : 'TE LIMPIARON EN EL POOL', 2.6, P);
    }
  }

  addScore(P, n) {
    if (P && n) P.score = Math.max(0, (P.score || 0) + n);
  }

  loseRespect(P, frac, n = 0) {
    P.respect = Math.max(0, Math.round((P.respect || 0) * (1 - frac)) - n);
  }

  // Precio con el descuento del rango (armería y tranzas)
  price(P, base) {
    return Math.round(base * (1 - RANK_DISCOUNT * this.rankOf(P)) / 10) * 10;
  }

  // Cayó un jugador: pierde respeto; si lo bajó otro jugador, ese se lleva respeto y el
  // trapo (si lo tenía). Si no, el trapo vuelve a su barra.
  playerDown(P) {
    const by = P.hitBy && G.t - P.hitT < 6 && G.players.includes(P.hitBy) && inPlay(P.hitBy) ? P.hitBy : null;
    this.loseRespect(P, RESPECT_DEATH, by ? RESPECT.pvpLoss : 0);
    this.addScore(P, -SCORE.death - (by ? SCORE.pvpLoss : 0));
    P.wantPeak = 0;
    if (by) {
      this.addScore(by, SCORE.pvp);
      this.gainRespect(by, RESPECT.pvp, 'BAJASTE A ' + P.def.name);
      if (P.trapo && !by.trapo) {
        const B = P.trapo;
        P.trapo = null;
        Object.assign(by, { trapo: B, trapoT: 0 });
        Object.assign(B, { by, tgt: by });
        this.say('LE SACASTE EL TRAPO DE ' + B.def.name + '! AGUANTALO', 3, by);
      }
    }
    this.dropTrapo(P);
    P.hitBy = null;
  }

  // ---- Barras y trapos ----

  takeTrapo(P, B) {
    if (B.trapo !== 'hung' || P.trapo) return false;
    Object.assign(B, { trapo: 'carried', by: P, tgt: P, angry: BARRA_ANGRY });
    Object.assign(P, { trapo: B, trapoT: 0 });
    this.say('TE LLEVASTE EL TRAPO DE ' + B.def.name + '! AGUANTALO ' + TRAPO_TIME + ' SEGUNDOS', 3.2, P);
    for (const q of G.players) if (q !== P) this.say(P.def.name + ' LE ROBO EL TRAPO A ' + B.def.name, 2.8, q);
    sfx('arma', B.flag.x, B.flag.y);
    return true;
  }

  // Si lo tenía encima, el trapo vuelve a colgarse en su estadio
  dropTrapo(P) {
    const B = P.trapo;
    if (!B) return;
    P.trapo = null;
    P.trapoT = 0;
    Object.assign(B, { trapo: 'hung', by: null });
  }

  // Territorio de cada barra: ver TERR_*. Un solo jugador en la zona toma o disputa; dos, se traban.
  updateTerritorios(dt) {
    for (const B of G.barras) {
      if (B.owner && !G.players.includes(B.owner)) Object.assign(B, { owner: null, ctl: 0 });
      if (B.chal && !G.players.includes(B.chal)) B.chal = null;
      const inside = G.players.filter(p => inPlay(p) && dist(p, B.flag) < TERR_R);
      const guards = !B.owner && G.hinchas.some(h => h.barra === B && h.hp > 0 && dist(h, B.flag) < TERR_R);
      const rivals = inside.filter(p => p !== B.owner);
      const ownerIn = !!B.owner && inside.includes(B.owner);
      if (B.owner) {
        B.chal = null;
        if (ownerIn && !rivals.length) B.ctl = 1;
        else if (!ownerIn && rivals.length === 1) {
          B.ctl -= dt / TERR_TIME;
          if (B.ctl <= 0) {
            const old = B.owner, P = rivals[0];
            Object.assign(B, { owner: P, ctl: 1, payT: 0 });
            this.say('TE SACARON ' + B.def.club, 3, old);
            this.takenMsg(P, B);
          }
        } else if (!inside.length && (B.ctl -= dt / TERR_HOLD) <= 0) {
          this.say('LA BARRA RECUPERO ' + B.def.stadium.toUpperCase(), 3, B.owner);
          Object.assign(B, { owner: null, ctl: 0 });
        }
        if (B.owner && (B.payT += dt) >= TERR_PAY) {
          B.payT = 0;
          B.owner.money += TERR_CASH;
          sfxFor(B.owner, 'guita');
          this.say('TERRITORIO: +$' + TERR_CASH, 2, B.owner);
          this.gainRespect(B.owner, TERR_RESPECT, '', true);
        }
      } else if (guards || !rivals.length) {
        B.ctl = Math.max(0, B.ctl - dt / TERR_TIME);
        if (!B.ctl) B.chal = null;
        if (guards && rivals.length) { B.angry = Math.max(B.angry, 20); B.tgt = rivals[0]; }
      } else if (rivals.length === 1) {
        if (B.chal !== rivals[0]) Object.assign(B, { chal: rivals[0], ctl: 0 });
        if ((B.ctl += dt / TERR_TIME) >= 1) {
          Object.assign(B, { owner: rivals[0], ctl: 1, chal: null, payT: 0 });
          this.takenMsg(rivals[0], B);
        }
      }
    }
  }

  takenMsg(P, B) {
    this.say('TOMASTE ' + B.def.stadium.toUpperCase() + '! COBRAS $' + TERR_CASH + ' CADA ' + TERR_PAY + 's', 3.2, P);
    for (const q of G.players) if (q !== P) this.say(P.def.name + ' SE QUEDO CON EL TERRITORIO DE ' + B.def.name, 2.8, q);
    sfx('arma', B.flag.x, B.flag.y);
  }

  updateBarras(dt) {
    this.updateTerritorios(dt);
    for (const B of G.barras) {
      B.angry = Math.max(0, B.angry - dt);
      if (B.trapo === 'gone' && (B.backT -= dt) <= 0) Object.assign(B, { trapo: 'hung', by: null });
      if (B.trapo !== 'carried') continue;
      const P = B.by;
      if (!P || !G.players.includes(P) || P.trapo !== B || P.dead || P.busted) {
        if (P && P.trapo === B) this.dropTrapo(P);
        else Object.assign(B, { trapo: 'hung', by: null });
        continue;
      }
      // Mientras lo lleva, la barra entera lo busca
      B.tgt = P;
      B.angry = Math.max(B.angry, 20);
      P.trapoT += dt;
      if (P.trapoT >= TRAPO_TIME) {
        P.trapo = null;
        P.trapoT = 0;
        P.trapos++;
        Object.assign(B, { trapo: 'gone', by: null, backT: TRAPO_BACK, angry: BARRA_ANGRY });
        { this.gainRespect(P, RESPECT.trapo, 'EL TRAPO DE ' + B.def.name); this.addScore(P, SCORE.trapo); }
        for (const q of G.players) if (q !== P) this.say(P.def.name + ' SE QUEDO CON EL TRAPO DE ' + B.def.name, 2.8, q);
      }
    }

    // La barra pega con un solo ritmo: como mucho HINCHA_FRONT golpes cada HINCHA_HIT segundos,
    // por más que te rodeen todos (los demás empujan y rodean)
    for (const B of G.barras) {
      B.hitT = Math.max(0, (B.hitT || 0) - dt);
      B.near = B.nearNow || 0;
      B.nearNow = 0;
    }
    for (const h of G.hinchas) {
      // El que cayó vuelve al rato, si nadie lo está mirando
      if (h.hp <= 0) {
        h.dead += dt;
        if (h.dead > 60 && !h.barra.owner && h.barra.angry <= 0 && farFromPlayers(h.home, OFFSCREEN)) {
          Object.assign(h, { x: h.home.x, y: h.home.y, hp: HINCHA_HP, dead: 0 });
        }
        continue;
      }
      const B = h.barra, T = B.tgt;
      const chase = B.angry > 0 && T && inPlay(T) && dist(h, T) < BARRA_CHASE;
      if (chase) {
        const d = dist(h, T);
        h.ang = Math.atan2(T.y - h.y, T.x - h.x);
        if (d > 11) {
          const nx = h.x + Math.cos(h.ang) * HINCHA_SPD * dt, ny = h.y + Math.sin(h.ang) * HINCHA_SPD * dt;
          if (!pedBlocked(nx, h.y, h.r)) h.x = nx;
          if (!pedBlocked(h.x, ny, h.r)) h.y = ny;
          h.walk += (dt * HINCHA_SPD) / 8;
        }
        if (d < 14) B.nearNow++;
        if (d < 14 && B.hitT <= 0) {
          B.hitT = HINCHA_HIT / clamp(B.near, 1, HINCHA_FRONT) * rnd(0.85, 1.15);
          h.swing = 1;
          sfx('golpe', T.x, T.y);
          boom(T.x, T.y, 4, '190,35,35');
          if (T.car) T.car.hp -= HINCHA_DMG * 0.5;
          else this.hurtPlayer(T, HINCHA_DMG);
          this.shakeFor(T, 2);
        }
      } else {
        // Tranqui: a su lugar alrededor del trapo, mirando para los costados
        const dh = dist(h, h.home);
        if (dh > 3) {
          h.ang = Math.atan2(h.home.y - h.y, h.home.x - h.x);
          h.x += Math.cos(h.ang) * 40 * dt;
          h.y += Math.sin(h.ang) * 40 * dt;
          h.walk += (dt * 40) / 8;
        } else if ((h.look -= dt) <= 0) {
          h.look = rnd(1.5, 4);
          h.ang = rnd(0, TAU);
        }
      }
      h.swing = Math.max(0, (h.swing || 0) - dt * 5);
    }
  }

  // ---- Asado ----

  // E en la parrilla: si está apagada, se prende con carne y carbón de la mochila; si hay
  // asado, se lleva una porción (cruda, a punto o quemada según cuánto lleva)
  useGrill(P, g) {
    if (!g.cooking) {
      if (!(P.bag.carne > 0) || !(P.bag.carbon > 0)) {
        this.say('PARA EL ASADO: CARNE DEL CHOTO Y CARBON', 2.6, P);
        return false;
      }
      for (const k of ['carne', 'carbon']) if (--P.bag[k] <= 0) delete P.bag[k];
      Object.assign(g, { cooking: true, t: 0, portions: ASADO_PORCIONES, owner: P });
      puff(g.x, g.y - 4, '200,200,200', 6, 12);
      this.say('A LA PARRILLA! VOLVE A PUNTO, NO TE COLGUES', 2.8, P);
      return true;
    }
    if (this.bagCount(P) >= BAG_MAX) {
      this.say('NO TE ENTRA EN LA MOCHILA', 2, P);
      return false;
    }
    const q = g.t < ASADO_PUNTO ? 'crudo' : g.t < ASADO_QUEMA ? 'asado' : 'quemado';
    P.bag[q] = (P.bag[q] || 0) + 1;
    g.portions--;
    sfxFor(P, 'comida');
    this.say('TE LLEVASTE ' + FOOD_NAME[q] + (g.portions ? ' (QUEDAN ' + g.portions + ')' : ''), 2.4, P);
    if (g.owner && g.owner !== P && G.players.includes(g.owner)) {
      this.say('TE ESTAN COMIENDO EL ASADO! +' + RESPECT.asado + ' RESPETO', 2.6, g.owner);
      this.gainRespect(g.owner, RESPECT.asado, 'BUEN ASADOR', true);
    }
    if (g.portions <= 0) Object.assign(g, { cooking: false, t: 0, owner: null });
    return true;
  }

  // El asado se va haciendo solo: avisos al dueño cuando está a punto y cuando se quema
  updateGrills(dt) {
    for (const g of parrillas) {
      if (!g.cooking) continue;
      const t0 = g.t;
      g.t += dt;
      const P = G.players.includes(g.owner) ? g.owner : null;
      if (t0 < ASADO_PUNTO && g.t >= ASADO_PUNTO) this.say('EL ASADO ESTA A PUNTO!', 3, P);
      if (t0 < ASADO_QUEMA && g.t >= ASADO_QUEMA) this.say('SE TE QUEMA EL ASADO!', 3, P);
      if (g.t >= ASADO_CARBON) {
        puff(g.x, g.y - 4, '40,40,40', 10, 18);
        this.say('SE HIZO CARBON. NO QUEDO NADA', 3, P);
        Object.assign(g, { cooking: false, t: 0, portions: 0, owner: null });
      }
    }
  }

  // ---- Robo al super ----

  // Disparar en la puerta: arranca el asalto (o te avisa que ya está cerrado)
  robSuper(P, b) {
    if (b.robbing) return; // ya lo están robando: se suma solo con quedarse en la puerta
    if (b.closed > 0) {
      this.say('CERRADO. YA LO ROBARON', 2.6, P);
      return;
    }
    const d = b.door, dx = d.x + d.ox, dy = d.y + d.oy;
    Object.assign(b, {
      robbing: true, robT: 0, robIdle: 0, robbers: [], alarm: SUPER_ALARM, alarmT: 0,
      witnesses: G.peds.filter(p => p.hp > 0 && !p.inside && Math.hypot(p.x - dx, p.y - dy) < ROB_WITNESS_R),
    });
    this.say('ESTO ES UN ASALTO! QUEDATE EN LA PUERTA', 2.6, P);
    this.flashAt(dx, dy, 0.3);
  }

  // Todo lo que pasa en los supers: alarma, persiana, el asalto en curso y los testigos.
  // Es mundo compartido: cualquier jugador en la puerta con el asalto en marcha se suma.
  updateSupers(dt) {
    for (const b of supers) {
      const d = b.door, dx = d.x + d.ox, dy = d.y + d.oy;
      b.closed = Math.max(0, (b.closed || 0) - dt);
      if (b.alarm > 0) {
        b.alarm -= dt;
        b.alarmT -= dt;
        if (b.alarmT <= 0) {
          b.alarmT = 0.9;
          sfx('alarma', dx, dy);
        }
      }
      if (b.witnessT > 0) {
        b.witnessT -= dt;
        if (b.witnessT <= 0 && b.witnesses.some(p => p.hp > 0 && G.peds.includes(p))) {
          for (const q of b.robbers) {
            if (!G.players.includes(q)) continue;
            this.wantUp(q, 1);
            this.say('UN TESTIGO LLAMO A LA YUTA', 2.6, q);
          }
        }
      }
      if (!b.robbing) continue;

      const here = G.players.filter(q => inPlay(q) && !q.car && Math.hypot(q.x - dx, q.y - dy) < ROB_R);
      for (const q of here) {
        if (b.robbers.includes(q)) continue;
        b.robbers.push(q);
        this.wantUp(q, ROB_STARS);
      }
      if (!here.length) {
        b.robIdle += dt;
        if (b.robIdle > ROB_GRACE) {
          for (const q of b.robbers) this.say('SE CORTO EL ASALTO', 2.6, q);
          this.endRobbery(b);
        }
        continue;
      }
      b.robIdle = 0;
      b.robT += dt * here.length;
      if (b.robT >= ROB_TIME) this.lootSuper(b);
    }
  }

  // La caja vacía: los fajos saltan a la vereda y se los lleva el que los junta
  lootSuper(b) {
    const d = b.door, L = ROB_LOOT[b.super];
    const ax = Math.sign(d.ox), ay = Math.sign(d.oy);
    for (let i = 0; i < L.n; i++) {
      const out = rnd(10, 26), side = rnd(-22, 22);
      G.pickups.push({
        x: d.x + ax * out + ay * side, y: d.y + ay * out + ax * side,
        kind: 'cash', value: Math.round(rnd(L.v[0], L.v[1]) / 10) * 10, t: 0, drop: true,
      });
    }
    const msg = b.super === 'lanus' ? 'LA CAJA ESTABA VACIA. YA LA ROBARON AYER' : 'CAJA VACIA! JUNTA LA GUITA Y RAJA';
    for (const q of b.robbers) {
      this.say(msg, 3, q);
      if (G.players.includes(q)) { this.gainRespect(q, RESPECT[b.super], 'ROBO'); this.addScore(q, SCORE[b.super]); }
    }
    boom(d.x + ax * 12, d.y + ay * 12, 10, '120,220,120');
    b.witnessT = ROB_WITNESS;
    this.endRobbery(b);
  }

  endRobbery(b) {
    b.robbing = false;
    b.robT = 0;
    b.closed = SUPER_CLOSED;
  }

  // Partida nueva: los supers abiertos y sin alarma
  resetSupers() {
    for (const b of supers) {
      Object.assign(b, { robbing: false, robT: 0, robIdle: 0, closed: 0, alarm: 0, witnessT: 0, robbers: [], witnesses: [] });
    }
  }

  // Cayó un famoso: suelta lo suyo y el que lo bajó se entera
  famousDown(e, by) {
    const d = e.famous.drop;
    if (d) {
      for (let i = 0; i < d.n; i++) {
        const a = (i / d.n) * TAU + rnd(-0.3, 0.3), r = rnd(14, 26); // desparramados: se juntan de a uno
        let at = { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r };
        if (e.air) at = toSidewalk(at.x, at.y); // del helicóptero cae a la calle, no a un techo
        G.pickups.push({ x: at.x, y: at.y, kind: d.kind, value: d.value, food: d.food, t: 0, drop: true });
      }
    }
    this.say('BAJASTE A ' + e.famous.name, 2.6, by);
    if (by && by.kind === 'player') { this.gainRespect(by, RESPECT.famoso, e.famous.name); this.addScore(by, SCORE.famoso); }
  }

  // Aparecen cerca de cada jugador cada tanto (sin que otro jugador los vea aparecer),
  // hablan cuando alguien se les acerca y se van cuando ya pasearon y nadie los mira
  // Corralito: timer del mundo; le saca la mitad de la plata del BANCO (no del efectivo) a todos los que estan jugando (no a muertos/arrestados/en hospital)
  updateCorralito(dt) {
    if (G.corralitoT === undefined) G.corralitoT = rnd(CORRALITO_EVERY[0], CORRALITO_EVERY[1]);
    G.corralitoT -= dt;
    if (G.corralitoT > 0) return;
    const hit = G.players.filter(P => inPlay(P) && P.bank >= CORRALITO_MIN);
    if (!hit.length) { G.corralitoT = 5; return; } // nadie con plata en el banco: se prueba de nuevo enseguida
    G.corralitoT = rnd(CORRALITO_EVERY[0], CORRALITO_EVERY[1]);
    for (const P of hit) {
      const loss = Math.floor(P.bank / 2);
      P.bank -= loss;
      this.say('CORRALITO! EL GOBIERNO TE AGARRO LA MITAD DEL BANCO (-$' + loss + ')', 4, P);
      this.shakeFor(P, 4);
    }
  }

  // Festejo del Mundial: en el obelisco se junta gente con banderas, suenan bocinazos y la zona queda
  // cortada al tránsito (lo frena trafficAI.festejoStop). La gente aparece cuando hay un jugador cerca.
  startFestejo() {
    G.festejo = { t: FESTEJO_TIME, spawn: 0 };
    for (const P of G.players) if (inPlay(P)) this.say('SOMOS CAMPEONES DEL MUNDO! TODOS AL OBELISCO', 4, P);
  }

  updateFestejo(dt) {
    const f = G.festejo, ob = getObelisco();
    if (!f) return;
    const crowd = G.peds.filter(p => p.fest && p.hp > 0);
    f.t -= dt;
    if (f.t <= 0 || !ob) {
      for (const p of crowd) p.fest = false; // se van a su casa
      G.festejo = null;
      return;
    }
    const ox = ob.x + ob.w / 2, oy = ob.y + ob.h / 2, c = { x: ox, y: oy };
    if (distToPlayers(c) > SIM_R * 0.9) return; // nadie lo ve: no se simula la gente
    f.spawn -= dt;
    if (crowd.length < FESTEJO_PEDS && f.spawn <= 0) {
      f.spawn = 0.25;
      const a = rnd(0, TAU), r = FESTEJO_CUT + rnd(15, 320);
      const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r, d = distToPlayers({ x, y });
      if (d > OFFSCREEN && d < SIM_R && !pedBlocked(x, y, 5)) { // llegan caminando, nadie los ve aparecer
        const p = makePedAt(x, y);
        G.peds.push(Object.assign(p, { fest: true, shirt: Math.random() < 0.5 ? '#75aadb' : '#f2f2f2', pants: '#2a3552', face: 'ped' + ((Math.random() * 4) | 0), def: null }));
      }
    }
    // Bocinazos y papel picado
    if (Math.random() < dt * 1.5) {
      const a = rnd(0, TAU), r = rnd(ROTONDA_ISLAND_R, FESTEJO_CUT);
      sfx('bocina', ox + Math.cos(a) * r, oy + Math.sin(a) * r, rnd(0.4, 1));
    }
    if (Math.random() < dt * 6) {
      const a = rnd(0, TAU), r = rnd(0, FESTEJO_CUT);
      puff(ox + Math.cos(a) * r, oy + Math.sin(a) * r, Math.random() < 0.5 ? '117,170,219' : '255,255,255', 1, 20);
    }
  }

  // Un festejante: va hacia el obelisco, se queda saltando en su lugar y de a ratos se mueve un poco
  festPed(p, dt) {
    const ob = getObelisco();
    if (!ob) { p.fest = false; return; }
    const ox = ob.x + ob.w / 2, oy = ob.y + ob.h / 2;
    p.tt -= dt;
    if (!p.fdest || p.tt <= 0) {
      const a = rnd(0, TAU), r = rnd(ROTONDA_ISLAND_R + 4, FESTEJO_CUT);
      p.fdest = p.fdest && dist(p, { x: ox, y: oy }) < FESTEJO_CUT + 10 ? { x: p.x + rnd(-18, 18), y: p.y + rnd(-18, 18) } : { x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r };
      p.tt = rnd(1.5, 4);
    }
    const d = dist(p, p.fdest);
    if (d < 4) { p.ang += dt * 4; p.walk += dt * 4; return; } // bailando
    p.ang = Math.atan2(p.fdest.y - p.y, p.fdest.x - p.x);
    const s = p.sped * 1.3, nx = p.x + Math.cos(p.ang) * s * dt, ny = p.y + Math.sin(p.ang) * s * dt;
    if (pedBlocked(nx, ny, p.r)) { p.fdest = null; p.tt = 0; return; }
    p.x = nx; p.y = ny; p.walk += (dt * s) / 8;
  }

  registerEvent(def) {
    EVENTS.push({ weight: 1, ...def });
  }

  // Timer del mundo: al llegar a 0 elige por peso entre los eventos que cumplan when() (sin repetir el ultimo si hay otro) y lo corre
  updateEvents(dt) {
    if (G.eventT === undefined) G.eventT = rnd(EVENT_EVERY[0], EVENT_EVERY[1]);
    G.eventT -= dt;
    if (G.eventT > 0) return;
    let ok = G.players.some(inPlay) ? EVENTS.filter(e => e.weight > 0 && (!e.when || e.when())) : [];
    if (ok.length > 1) ok = ok.filter(e => e.id !== G.lastEvent);
    if (!ok.length) { G.eventT = 5; return; } // nada para disparar: se prueba de nuevo enseguida
    G.eventT = rnd(EVENT_EVERY[0], EVENT_EVERY[1]);
    let r = Math.random() * ok.reduce((a, e) => a + e.weight, 0), ev = ok[ok.length - 1];
    for (const e of ok) { if ((r -= e.weight) < 0) { ev = e; break; } }
    G.lastEvent = ev.id;
    ev.run();
  }

  updateFamous(dt) {
    for (const p of G.peds) {
      if (!p.famous || p.hp <= 0) continue;
      p.life -= dt;
      p.lineT = Math.max(0, p.lineT - dt);
      p.talkT -= dt;
      const { p: P, d } = nearestPlayer(p, inPlay);
      if (P && d < (p.air ? FAMOUS_TALK * 3 : FAMOUS_TALK) && p.talkT <= 0) {
        this.famousLine(p, p.famous.near);
        p.talkT = rnd(5, 9);
      }
      // Rastro cómico: solo si camina y alguien lo ve
      const moved = p.lx !== undefined && Math.hypot(p.x - p.lx, p.y - p.ly) > 0.01;
      p.lx = p.x; p.ly = p.y;
      p.trailT = (p.trailT || 0) - dt;
      if (p.famous.trail && moved && p.trailT <= 0 && !farFromPlayers(p, OFFSCREEN)) {
        p.trailT = 0.12;
        boom(p.x, p.y, 2, p.famous.trail, 0.4);
      }
    }
    G.peds = G.peds.filter(p => !p.famous || p.hp <= 0 || p.life > 0 || !farFromPlayers(p, OFFSCREEN));

    for (const P of G.players) {
      if (!inPlay(P)) continue;
      if (P.famousT === undefined) P.famousT = rnd(FAMOUS_EVERY[0], FAMOUS_EVERY[1]);
      P.famousT -= dt;
      if (P.famousT > 0) continue;
      P.famousT = rnd(FAMOUS_EVERY[0], FAMOUS_EVERY[1]);
      const around = G.peds.filter(q => q.famous && q.hp > 0);
      if (around.some(q => dist(q, P) < SIM_R)) continue;
      // Cada famoso es uno solo en todo el mapa
      const pool = FAMOUS.filter(f => !around.some(q => q.famous === f));
      if (!pool.length) continue;
      const def = pool[(Math.random() * pool.length) | 0];
      const sp = def.beach ? this.beachSpot(P) : sidewalkSpot(OFFSCREEN, SIM_R * 0.8, P);
      if (!sp || !offscreenForOthers(sp, P)) {
        P.famousT = 3; // no hubo lugar: se prueba de nuevo enseguida
        continue;
      }
      G.peds.push(makeFamous(def, sp.x, sp.y));
      this.say(def.name + (def.heli ? ' SOBREVUELA EL BARRIO' : def.beach ? ' ANDA POR LA PLAYA' : ' ANDA POR EL BARRIO'), 2.8, P);
    }
  }

  // Punto de arena fuera de pantalla cerca de P (null si no hay playa cerca)
  beachSpot(P) {
    for (let i = 0; i < 50; i++) {
      const a = rnd(0, TAU), r = rnd(OFFSCREEN, SIM_R * 0.8);
      const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (onBeach(x, y) && !hitBuilding(x, y, 6)) return { x, y };
    }
    return null;
  }

  // El helicóptero vuela por arriba de todo: da vueltas sobre el jugador más cercano y,
  // cuando ya paseó, se aleja para irse sin que nadie lo vea desaparecer
  flyHeli(p, dt) {
    const { p: P } = nearestPlayer(p, inPlay);
    if (!P) return;
    p.orbit = (p.orbit || rnd(0, TAU)) + dt * 0.6;
    const away = Math.atan2(p.y - P.y, p.x - P.x);
    const tx = p.life > 0 ? P.x + Math.cos(p.orbit) * 70 : p.x + Math.cos(away) * 100;
    const ty = p.life > 0 ? P.y + Math.sin(p.orbit) * 70 : p.y + Math.sin(away) * 100;
    // Sorteo para el chat: cada tanto tira un billete a la calle, cerca del jugador
    p.giftT = (p.giftT === undefined ? rnd(8, 14) : p.giftT) - dt;
    if (p.giftT <= 0 && p.life > 0 && dist(p, P) < 110) {
      p.giftT = rnd(14, 24);
      const at = toSidewalk(P.x + rnd(-30, 30), P.y + rnd(-30, 30));
      G.pickups.push({ x: at.x, y: at.y, kind: 'cash', value: 100, t: 0, drop: true });
      p.line = 'SORTEO PARA EL CHAT!';
      p.lineT = 2.6;
    }
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    if (d > 1) {
      const s = Math.min(d, p.sped * dt);
      p.x = clamp(p.x + (dx / d) * s, 8, WORLD_W - 8);
      p.y = clamp(p.y + (dy / d) * s, 8, WORLD_H - 8);
      p.ang = Math.atan2(dy, dx);
    }
  }

  // Lo que hace un jugador en su frame: moverse, manejar, tirar, entrar a lugares.
  // Solo lee P.ctl (sus controles), nunca el teclado. Devuelve 'reset' si se reinició la partida.
  updatePlayer(P, rdt, dt) {
    // ---- Secuencia de arresto: 3.2s de corte, después comisaría. El mundo sigue andando.
    if (P.busted) {
      P.bustT += dt;
      if (P.bustT > 3.2) this.finishBust(P);
      return;
    }

    // ---- Secuencia de curacion: entraste a un hospital, unos segundos y salis con la vida llena
    if (P.healing) {
      P.healT += dt;
      if (P.healT > HOSPITAL_TIME) {
        P.hp = P.maxhp;
        P.food = Math.max(P.food, 60); // suero y un sanguchito de miga
        P.drink = Math.max(P.drink, 60);
        P.healing = 0;
        sfxFor(P, 'hospital');
        this.say('LISTO. A LA CALLE.', 2.6, P);
      }
      return;
    }

    // ---- Adentro de un boliche: unos segundos y sale con lo que da el lugar
    if (P.party && (P.dead || P.busted)) P.party = 0;
    if (P.party) {
      P.partyT += dt;
      if (P.partyT > BOLICHE_TIME) this.leaveBoliche(P);
      return;
    }

    const ctl = P.ctl;
    const ix = ctl.x;
    const iy = ctl.y;
    P.muzzle = Math.max(0, P.muzzle - rdt * 14);
    P.swing = Math.max(0, P.swing - rdt * 5);
    P.nearShop = null;
    P.nearTranza = null;
    P.nearSuper = null;
    P.nearBank = null;
    P.nearGrill = null;
    P.nearTrapo = null;
    P.nearBoliche = null;
    if (!P.dead) this.switchWeapon(P);

    if (!P.dead) this.updateNeeds(P, dt);

    // Comer o tomar algo de la mochila: C (o el botón 🍖)
    if (ctl.eat && !P.prev.eat && !P.dead) this.eat(P);

    // Fumarse un porro: F (o el botón 🌿)
    if (ctl.porro && !P.prev.porro && !P.dead) {
      if (P.porros > 0 && P.slowmo <= 0) {
        P.porros--;
        P.slowmo = PORRO_TIME;
        P.hp = Math.min(P.maxhp, P.hp + 15);
        puff(P.x, P.y - 6, '200,220,200', 6, 10);
        sfxFor(P, 'porro');
        this.say('TE BAJASTE UN CAMBIO...', 2.2, P);
      } else if (P.porros <= 0) {
        this.say('NO TENES PORROS. BUSCA UN TRANZA', 1.8, P);
      }
    }

    // Cartel de zona al entrar a una villa
    const zone = villaAt(P.x, P.y);
    if (zone !== P.zone) {
      P.zone = zone;
      if (zone) this.say(zone.name + (zone.angry > 0 ? ' - TE ESTAN ESPERANDO' : ' - LA YUTA NO ENTRA'), 2.8, P);
    }

    if (P.dead) {
      P.hp = 0;
      if (ctl.respawn) {
        // Solo: se arranca de cero como siempre. Con otros jugando, reaparece él nomás.
        if (G.players.length <= 1) {
          this.startGame(P.def);
          G.me.bank = P.bank;
          return 'reset';
        }
        this.respawn(P);
      }
    } else if (P.car && P.seat) {
      // Acompañante: el auto lo maneja otro; con sus controles apunta (y tira más abajo)
      P.x = P.car.x;
      P.y = P.car.y;
      if (Math.abs(ix) > 0.1 || Math.abs(iy) > 0.1) P.ang = Math.atan2(iy, ix);
      if (ctl.use && P.cool <= 0) {
        this.exitCar(P);
        P.cool = 0.4;
      }
    } else if (P.car) {
      const car = P.car;
      const acc = ctl.run ? 200 : 145;
      if (iy < -0.1) car.spd += acc * rdt * Math.min(1, Math.abs(iy));
      else if (iy > 0.1) car.spd -= acc * 1.25 * rdt * Math.min(1, Math.abs(iy));
      else car.spd *= (1 - 1.6 * rdt);
      car.spd = clamp(car.spd, -70, 195);
      const turning = Math.abs(car.spd) > 4 && Math.abs(ix) > 0.1 ? ix : 0;
      car.steer = lerp(car.steer, turning, rdt * 9);
      if (turning) {
        car.ang += turning * 2.3 * rdt * (car.spd > 0 ? 1 : -1) * clamp(Math.abs(car.spd) / 90, 0.35, 1);
      }

      // Marcas de derrape
      if (Math.abs(car.spd) > 120 && Math.abs(car.steer) > 0.55) {
        const pxx = Math.cos(car.ang + Math.PI / 2) * 5, pyy = Math.sin(car.ang + Math.PI / 2) * 5;
        decal(car.x + pxx, car.y + pyy, 1.6, 'rgba(15,15,18,.32)');
        decal(car.x - pxx, car.y - pyy, 1.6, 'rgba(15,15,18,.32)');
        if (Math.random() < 0.5) puff(car.x, car.y, '180,180,180', 1, 5);
      }

      const nx = car.x + Math.cos(car.ang) * car.spd * rdt;
      const ny = car.y + Math.sin(car.ang) * car.spd * rdt;
      if (hitBuilding(nx, ny, 9) || hitCarBlock(nx, ny, 9)) {
        const dmg = Math.abs(car.spd) / 12;
        if (dmg > 3) {
          car.hp -= dmg;
          P.hp -= dmg * 0.5;
          boom(car.x, car.y, 8, '255,190,90');
          sfx('choque', car.x, car.y, dmg);
          this.shakeFor(P, dmg * 0.5);
        }
        car.spd *= -0.25;
      } else {
        car.x = clamp(nx, 8, WORLD_W - 8);
        car.y = clamp(ny, 8, WORLD_H - 8);
      }
      for (const q of ridersOf(car)) {
        q.x = car.x;
        q.y = car.y;
      }
      P.ang = car.ang;

      if (car.hp < 45) {
        puff(
          car.x - Math.cos(car.ang) * 10,
          car.y - Math.sin(car.ang) * 10,
          car.hp < 18 ? '255,140,40' : '90,90,90',
          1,
          16
        );
      }

      // Atropellar: a la gente de la calle y, con PVP, a los otros jugadores a pie
      for (const e of this.targetsOf(P)) {
        if (Math.abs(car.spd) > 40 && dist(car, e) < 14) {
          decal(e.x, e.y, rnd(3, 6), 'rgba(90,12,12,.45)');
          this.damage(e, Math.abs(car.spd) / 6, P);
        }
      }

      if (car.hp <= 0) this.wreckCar(car);

      if (ctl.use && P.cool <= 0) {
        this.exitCar(P);
        P.cool = 0.4;
      }
    } else {
      const running = ctl.run;
      const spd = (running ? 94 : 58) * (P.def.spd || 1);
      P.run = lerp(P.run, running ? 1 : 0, rdt * 8);
      const m = Math.hypot(ix, iy) || 1;
      const nx = P.x + (ix / m) * spd * rdt;
      const ny = P.y + (iy / m) * spd * rdt;
      if (!hitBuilding(nx, P.y, P.r)) P.x = clamp(nx, 6, WORLD_W - 6);
      if (!hitBuilding(P.x, ny, P.r)) P.y = clamp(ny, 6, WORLD_H - 6);
      if (ix || iy) {
        P.ang = Math.atan2(iy, ix);
        P.walk += (rdt * spd) / 8;
      }

      for (const b of shops) {
        const d = b.door;
        if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 16) P.nearShop = b;
      }
      for (const t of G.tranzas) {
        if (t.hp > 0 && t.villa.angry <= 0 && dist(t, P) < 16) P.nearTranza = t;
      }
      for (const b of supers) {
        const d = b.door;
        if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 16) P.nearSuper = b;
      }
      for (const b of boliches) {
        const d = b.door;
        if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 16) P.nearBoliche = b;
      }
      for (const b of banks) {
        const d = b.door;
        if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 16) P.nearBank = b;
      }
      for (const g of parrillas) {
        if (dist(g, P) < GRILL_R) P.nearGrill = g;
      }
      for (const B of G.barras) {
        if (B.trapo === 'hung' && !P.trapo && dist(B.flag, P) < TRAPO_R) P.nearTrapo = B;
      }

      // Los menús (armería, tranza) se abren en la pantalla del que entró
      if (ctl.use && P.cool <= 0 && P.nearShop) {
        P.cool = 0.4;
        if (P.wanted >= 2) this.say('EL ARMERO NO ATIENDE CON LA YUTA ENCIMA', 2.6, P);
        else this.openShop(P, 'armeria');
      } else if (ctl.use && P.cool <= 0 && P.nearTranza) {
        P.cool = 0.4;
        P.nearTranza.ang = Math.atan2(P.y - P.nearTranza.y, P.x - P.nearTranza.x);
        this.openShop(P, 'tranza');
      } else if (ctl.use && P.cool <= 0 && P.nearSuper) {
        P.cool = 0.4;
        if (P.nearSuper.robbing || P.nearSuper.closed > 0) this.say('CERRADO POR ROBO', 2.6, P);
        else if (P.wanted >= 2) this.say('EL DE SEGURIDAD NO TE DEJA PASAR', 2.6, P);
        else this.openShop(P, P.nearSuper.super);
      } else if (ctl.use && P.cool <= 0 && P.nearBank) {
        P.cool = 0.4;
        if (P.wanted >= 2) this.say('EL BANCO NO ATIENDE CON LA YUTA ENCIMA', 2.6, P);
        else this.openShop(P, 'banco');
      } else if (ctl.use && P.cool <= 0 && P.nearTrapo) {
        P.cool = 0.4;
        this.takeTrapo(P, P.nearTrapo);
      } else if (ctl.use && P.cool <= 0 && P.nearGrill) {
        P.cool = 0.4;
        this.useGrill(P, P.nearGrill);
      } else if (ctl.use && P.cool <= 0 && P.nearBoliche) {
        P.cool = 0.4;
        this.enterBoliche(P, P.nearBoliche);
      } else if (ctl.use && P.cool <= 0) {
        P.cool = 0.4;
        let best = null, bd = 26;
        for (const c of G.cars) {
          const d = dist(c, P);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        const riders = best ? ridersOf(best) : [];
        if (riders.length) {
          // El auto de otro jugador no se roba: si hay lugar, se sube de acompañante
          if (riders.length >= CAR_SEATS) {
            this.say('NO HAY LUGAR', 1.6, P);
          } else {
            const used = new Set(riders.map(q => q.seat));
            P.seat = 1;
            while (used.has(P.seat)) P.seat++;
            P.car = best;
            sfx('puerta', best.x, best.y);
            this.say('DE ACOMPAÑANTE', 1.8, P);
          }
        } else if (best) {
          // Con chofer: lo bajás de una y sale corriendo (y alguien llama a la yuta).
          // Uno estacionado o abandonado se agarra sin escándalo.
          const jacked = best.ai && !best.cop && best.hp > 0, mine = best.parked === P;
          if (jacked) trafficAI.dropDriver(best, P);
          trafficAI.release(best);
          best.ai = false;
          best.chase = false; // un patrullero robado deja de perseguir
          best.rage = null;
          best.panic = 0;
          best.hazard = false;
          best.parked = null;
          P.car = best;
          P.seat = 0;
          sfx('puerta', best.x, best.y);
          if (jacked) this.wantUp(P, 1);
          if (!mine) this.say(best.cop ? 'AUTO DE LA YUTA' : 'AUTO ROBADO', 2.6, P);
        }
      }

      if (P.hp < P.maxhp) {
        for (const h of hospitals) {
          const d = h.door;
          if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 10) {
            P.healing = 1;
            P.healT = 0;
            this.say('ENTRANDO AL HOSPITAL...', 2.4, P);
            break;
          }
        }
      }
    }
    P.cool -= rdt;

    if (ctl.fire && !(P.prev && P.prev.fire) && P.nearSuper && !P.car && !P.dead) this.robSuper(P, P.nearSuper);
    if (ctl.fire && !P.dead && P.cool <= 0) this.attack(P);
  }

  update(rdt) {
    // Porro: jugando solo, el mundo va en cámara lenta (dt) mientras el jugador se mueve a
    // tiempo real (rdt). Con otros no se le puede frenar el mundo a nadie: queda el efecto
    // en pantalla y la curación, nada más.
    for (const P of G.players) {
      P.slowmo = Math.max(0, P.slowmo - rdt);
      P.high = lerp(P.high, P.slowmo > 0 ? 1 : 0, clamp(rdt * 4, 0, 1));
    }
    G.ts = G.players.length === 1 ? 1 - (1 - SLOWMO) * G.players[0].high : 1;
    const dt = rdt * G.ts;
    G.t += dt;
    if (G.msgT > 0) G.msgT -= rdt;
    G.shake = Math.max(0, G.shake - rdt * 22);
    G.flash = Math.max(0, G.flash - rdt * 4);
    G.guards = G.guards.filter(g => g.hp > 0);
    if (!G.players.length) return;

    // Controles: el jugador local los lee del teclado; los remotos llegan por la red
    if (G.me) G.me.ctl = G.paused || G.mapOpen || G.shopOpen ? idleControls() : input.readControls();
    net.applyControls();

    for (const P of G.players.slice()) {
      if (this.updatePlayer(P, rdt, dt) === 'reset') return;
      P.prev = { ...P.ctl };
    }

    this.updateNades(dt);
    this.updateTranzas(dt);

    for (const b of G.bullets) {
      b.ox = b.x;
      b.oy = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      // El helicóptero vuela sobre los techos: se le pega antes de que la bala dé en la pared
      const heli = b.owner && G.peds.find(e => e.air && e.hp > 0 && segDist(b, e) < 12);
      if (heli) {
        b.life = 0;
        this.hurt(heli, b.dmg, b.owner);
        continue;
      }
      if (hitBuilding(b.x, b.y, 1)) {
        b.life = 0;
        boom(b.x, b.y, 4, '220,220,200');
        sfx('pared', b.x, b.y);
        continue;
      }
      if (b.owner) {
        for (const list of [G.cops, G.peds, G.tranzas, G.hinchas]) {
          for (const e of list) {
            if (b.life > 0 && e.hp > 0 && !e.air && segDist(b, e) < 7) {
              b.life = 0;
              this.hurt(e, b.dmg, b.owner);
            }
          }
        }
      }
      // Los autos paran las balas: chapa, chispas y el chofer que se asusta. Al auto de un
      // jugador lo ve el bloque de abajo (la chapa absorbe y algo le llega a él).
      for (const c of G.cars) {
        if (b.life <= 0) break;
        // (las de la yuta y los tranzas no le pegan a los patrulleros: si no, los de a pie
        // terminaban volando su propio auto estacionado al lado del jugador)
        if (c.hp <= 0 || driverOf(c) || (b.owner ? b.owner.car === c : c.cop)) continue;
        if (Math.abs(c.x - b.x) > 40 || Math.abs(c.y - b.y) > 40 || !segHitsCar(b, c)) continue;
        b.life = 0;
        this.shootCar(c, b.dmg, b.owner);
      }
      // Las balas de la yuta y los tranzas le pegan a cualquier jugador; las de un
      // jugador, con PVP, a los otros (nunca a él mismo)
      for (const P of G.players) {
        if (b.life <= 0) break;
        if (P === b.owner || (b.owner && !PVP) || !inPlay(P) || (b.owner && P.car && b.owner.car === P.car)) continue;
        if (segDist(b, P) < (P.car ? 12 : 7)) {
          b.life = 0;
          this.shootPlayer(P, b.dmg, b.owner);
        }
      }
    }
    G.bullets = G.bullets.filter(b => b.life > 0);

    for (const p of G.peds) {
      if (p.hp <= 0) continue;
      if (p.air) {
        this.flyHeli(p, dt);
        continue;
      }

      // Adentro de un edificio: invisible, sale al cumplirse el tiempo
      if (p.inside) {
        p.doorT -= dt;
        p.fade = Math.min(1, p.fade + dt * 3);
        if (p.doorT <= 0) {
          const d = p.inside.door;
          p.x = d.x + d.ox;
          p.y = d.y + d.oy;
          p.ang = Math.atan2(d.oy, d.ox);
          p.inside = null;
          p.fade = 0;
          p.doorT = rnd(12, 40);
          p.target = null;
        }
        continue;
      }
      p.fade = Math.min(1, p.fade + dt * 2.6);
      if (p.fest) { this.festPed(p, dt); continue; }

      p.tt -= dt;
      // Algún jugador con la yuta encima cerca: nadie se va a un edificio, todos atentos.
      // threat: el que lo asusta (buscado cerca, o pasando fuerte con el auto)
      let busy = false, threat = null;
      for (const q of G.players) {
        const dq = dist(p, q);
        if (q.wanted > 0 && dq < 105) busy = true;
        if (!threat && ((q.wanted > 0 && dq < 105) || (q.car && Math.abs(q.car.spd) > 70 && dq < 65))) threat = q;
      }
      // El chofer que se bajó corriendo (le robaron el auto, se asustó): huye un rato
      if (p.fleeT > 0) {
        p.fleeT -= dt;
        busy = true;
        threat = p.fleeFrom || threat;
      }
      if (!busy) {
        p.doorT -= dt;
        if (p.doorT <= 0 && !p.target && !p.famous) {
          const b = nearestDoor(p.x, p.y, 110);
          if (b) p.target = b;
          else p.doorT = rnd(4, 10);
        }
        if (p.target) {
          const d = p.target.door, tx2 = d.x + d.ox, ty2 = d.y + d.oy;
          const dd = Math.hypot(tx2 - p.x, ty2 - p.y);
          if (dd < 5) {
            p.inside = p.target;
            p.target = null;
            p.fade = 0;
            p.doorT = rnd(5, 22);
            continue;
          }
          p.ang = Math.atan2(ty2 - p.y, tx2 - p.x);
          const sp2 = p.sped;
          const nx2 = p.x + Math.cos(p.ang) * sp2 * dt;
          const ny2 = p.y + Math.sin(p.ang) * sp2 * dt;
          if (!pedBlocked(nx2, ny2, 3)) {
            p.x = nx2;
            p.y = ny2;
            p.walk += (dt * sp2) / 8;
            p.stuck = 0;
          } else {
            p.stuck = (p.stuck || 0) + dt;
            if (p.stuck > 0.5) {
              p.target = null;
              p.doorT = rnd(5, 14);
              p.stuck = 0;
              p.ang += Math.PI / 2;
            }
          }
          continue;
        }
      } else {
        p.target = null;
      }

      if (p.tt <= 0) {
        p.tt = rnd(1.6, 4.2);
        const turn = Math.random();
        if (turn < 0.42) p.ang += Math.PI / 2;
        else if (turn < 0.84) p.ang -= Math.PI / 2;
        else p.ang += Math.PI;
        p.ang = Math.round(p.ang / (Math.PI / 2)) * (Math.PI / 2);
      }

      const scared = !!threat;
      if (scared) {
        p.ang = Math.atan2(p.y - threat.y, p.x - threat.x);
        p.chat = 0;
      }
      const s = scared ? 78 * p.ty.panic : p.sped;
      const stepX = Math.cos(p.ang) * s * dt, stepY = Math.sin(p.ang) * s * dt;
      const nx = p.x + stepX, ny = p.y + stepY;

      let dodge = false;
      for (const c of G.cars) {
        if (Math.abs(c.spd) < 25) continue;
        if (Math.hypot(c.x - nx, c.y - ny) < 22) {
          // Se corre del auto (un paso para el costado, no se queda clavado)
          p.ang = Math.atan2(ny - c.y, nx - c.x);
          const ex = p.x + Math.cos(p.ang) * s * dt, ey = p.y + Math.sin(p.ang) * s * dt;
          if (!pedBlocked(ex, ey, p.r)) { p.x = ex; p.y = ey; p.walk += (dt * s) / 8; }
          dodge = true;
          break;
        }
      }

      if (!dodge) {
        // Y se prueba con la X ya movida: probando los dos ejes por separado, en diagonal
        // contra la esquina de un edificio cada eje daba libre y juntos lo metían adentro
        const freeX = !pedBlocked(nx, p.y, p.r);
        if (freeX) p.x = nx;
        const freeY = !pedBlocked(p.x, ny, p.r);
        if (freeY) p.y = ny;

        if (freeX || freeY) {
          p.walk += (dt * s) / 8;
          p.stuck = 0;
          if (!freeX || !freeY) {
            p.ang = Math.atan2(freeY ? Math.sign(stepY) : 0, freeX ? Math.sign(stepX) : 0);
          }
          if (!scared && !onSidewalk(p.x, p.y)) {
            const t = toSidewalk(p.x, p.y);
            // Se prueba el punto intermedio, no solo la vereda de destino: en línea recta
            // el camino a la vereda más cercana puede cruzar la esquina de un edificio
            const lx = lerp(p.x, t.x, dt * 4.5), ly = lerp(p.y, t.y, dt * 4.5);
            if (!pedBlocked(t.x, t.y, 5) && !pedBlocked(lx, ly, p.r)) {
              p.x = lx;
              p.y = ly;
            }
          }
        } else {
          p.stuck = (p.stuck || 0) + dt;
          let out = false;
          for (const reach of [s * dt + p.r + 1, p.r * 2.5, p.r * 5]) {
            for (let i = 0; i < 8 && !out; i++) {
              const base = p.ang + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (Math.PI / 4);
              const tx2 = p.x + Math.cos(base) * reach, ty2 = p.y + Math.sin(base) * reach;
              if (!pedBlocked(tx2, ty2, p.r)) {
                p.ang = base;
                p.tt = rnd(0.8, 1.8);
                out = true;
                p.x += Math.cos(base) * Math.min(reach, s * dt * 1.5);
                p.y += Math.sin(base) * Math.min(reach, s * dt * 1.5);
              }
            }
            if (out) break;
          }
          if (!out && p.stuck > 0.45) {
            const esc = toSidewalk(p.x, p.y);
            if (!pedBlocked(esc.x, esc.y, p.r)) {
              p.x = esc.x;
              p.y = esc.y;
            } else {
              const sp3 = sidewalkSpot(120, SIM_R * 0.9);
              if (sp3) {
                p.x = sp3.x;
                p.y = sp3.y;
              } else {
                p.x = clamp(p.x, MARGIN + 2, WORLD_W - MARGIN - 2);
                p.y = clamp(p.y, MARGIN + 2, WORLD_H - MARGIN - 2);
              }
            }
            p.stuck = 0;
            p.target = null;
            p.ang = rnd(0, TAU);
          }
        }
      }

      for (const q of G.peds) {
        if (q === p || q.hp <= 0 || q.air) continue;
        const dx2 = p.x - q.x, dy2 = p.y - q.y, d2 = dx2 * dx2 + dy2 * dy2;
        if (d2 > 0.01 && d2 < 64) {
          const d3 = Math.sqrt(d2), push = (8 - d3) * dt * 2.2;
          const sx2 = p.x + (dx2 / d3) * push, sy2 = p.y + (dy2 / d3) * push;
          if (!pedBlocked(sx2, sy2, p.r)) {
            p.x = sx2;
            p.y = sy2;
          }
        }
      }

      if (!scared && p.chat <= 0 && Math.random() < 0.25 * dt) {
        for (const q of G.peds) {
          if (q !== p && q.hp > 0 && !q.air && dist(p, q) < 16) {
            p.chat = rnd(1.5, 4);
            q.chat = p.chat;
            break;
          }
        }
      }
      if (p.chat > 0) {
        p.chat -= dt;
        p.walk += dt * 2;
        const bx = p.x - Math.cos(p.ang) * s * dt, by = p.y - Math.sin(p.ang) * s * dt;
        if (!pedBlocked(bx, by, p.r)) { p.x = bx; p.y = by; }
      }
    }

    // Streaming de peatones: se mantienen los que están cerca de algún jugador
    G.peds = G.peds.filter(q => {
      const d = distToPlayers(q);
      return q.hp > 0 ? d < SIM_R * 1.12 : d < 300;
    });
    // Cada jugador tiene su barrio poblado: se repone alrededor de cada uno, sin que lo vea otro
    for (const P of G.players) {
      const alive = G.peds.filter(q => q.hp > 0 && dist(q, P) < SIM_R * 1.12).length;
      if (alive < PED_TARGET) {
        P.pedSpawn = (P.pedSpawn || 0) + dt;
        if (P.pedSpawn > 0.12) {
          P.pedSpawn = 0;
          const sp = sidewalkSpot(OFFSCREEN, SIM_R * 0.95, P);
          if (sp && offscreenForOthers(sp, P)) G.peds.push(makePedAt(sp.x, sp.y));
        }
      } else {
        P.pedSpawn = 0;
      }
    }

    this.updateFamous(dt);
    this.updateCorralito(dt);
    this.updateEvents(dt);
    this.updateFestejo(dt);
    this.updateSupers(dt);
    this.updateGrills(dt);
    this.updateBarras(dt);

    // Velocidad real de cada auto (cuánto se movió de verdad), para que nadie espere
    // atrás de uno que acelera contra una pared sin avanzar
    for (const c of G.cars) {
      c.rv = c.lx === undefined || dt <= 0 ? Math.abs(c.spd) : Math.hypot(c.x - c.lx, c.y - c.ly) / dt;
      c.lx = c.x;
      c.ly = c.y;
    }

    // Tráfico de autos civiles: carriles, giros con curva, rotonda y frenado (js/traffic.js)
    for (const c of G.cars) {
      if (!c.ai || c.chase || c.hp <= 0) continue;
      trafficAI.update(c, dt);
    }

    // Autos sin nadie adentro (el que dejó un jugador, el que abandonó un chofer asustado):
    // ruedan hasta frenar. Los muy golpeados humean, como el del jugador.
    for (const c of G.cars) {
      if (c.hp <= 0) continue;
      const P = driverOf(c);
      if (!c.ai && !c.chase && !P) {
        c.spd -= Math.sign(c.spd) * Math.min(Math.abs(c.spd), 110 * dt);
        const nx = c.x + Math.cos(c.ang) * c.spd * dt, ny = c.y + Math.sin(c.ang) * c.spd * dt;
        if (hitBuilding(nx, ny, c.h * 0.5 + 1) || hitCarBlock(nx, ny, c.h * 0.5 + 1)) c.spd *= -0.2;
        else { c.x = clamp(nx, 10, WORLD_W - 10); c.y = clamp(ny, 10, WORLD_H - 10); }
        c.brake = false;
        c.signal = 0;
      }
      if (!P && c.hp < 45 && Math.random() < dt * 2.5) {
        puff(c.x - Math.cos(c.ang) * 10, c.y - Math.sin(c.ang) * 10, c.hp < 18 ? '255,140,40' : '90,90,90', 1, 16);
      }
    }

    // Se mantienen los autos cerca de algún jugador, y siempre los que maneja un jugador
    G.cars = G.cars.filter(c => driverOf(c) || (c.hp > 0 && distToPlayers(c) < SIM_R * 1.12));
    // Cuántos autos entran alrededor de cada jugador: en una esquina del mapa o contra el
    // río hay menos calle, y meter los 46 de siempre arma un embotellamiento que no se desarma nunca
    for (const P of G.players) {
      P.carCapT = (P.carCapT || 0) - dt;
      if (P.carCapT <= 0 || !P.carCap) {
        P.carCapT = 1;
        let road = 0, n = 0;
        for (let r = 80; r <= SIM_R; r += 80) {
          for (let a = 0; a < TAU; a += TAU / 16) {
            n++;
            const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
            if (x > 0 && y > 0 && x < WORLD_W && y < WORLD_H && onRoad(x, y) && !hitBuilding(x, y, 2)) road++;
          }
        }
        P.carCap = Math.round(CAR_TARGET * clamp(road / n / 0.45, 0.65, 1));
      }
      const carsNear = G.cars.filter(c => c.ai && c.hp > 0 && dist(c, P) < SIM_R * 1.12).length;
      if (carsNear > P.carCap) {
        // Sobran: se va uno que nadie ve y está clavado en una fila (el que anda, sigue)
        P.carTrim = (P.carTrim || 0) + dt;
        if (P.carTrim > 0.25) {
          P.carTrim = 0;
          let pick = null, best = -1;
          for (const c of G.cars) {
            if (!c.ai || c.chase || c.hp <= 0 || driverOf(c) || c.spd >= 4) continue;
            if (distToPlayers(c) < OFFSCREEN) continue;
            const d = dist(c, P);
            if (d > best) { best = d; pick = c; }
          }
          if (pick) { trafficAI.release(pick); pick.hp = 0; }
        }
      } else if (carsNear < P.carCap) {
        P.carSpawn = (P.carSpawn || 0) + dt;
        if (P.carSpawn > 0.22) {
          P.carSpawn = 0;
          // Busca un lugar con calle libre: no aparece adentro de una fila ni en una zona
          // ya cargada (en una esquina del mapa o al lado del río hay menos calles para repartir).
          // trafficAI.spawnAt lo pone en un carril, lejos de las bocacalles y con lugar adelante.
          for (let k = 0; k < 4; k++) {
            const sp = ringSpot(OFFSCREEN, SIM_R * 0.95, true, P);
            if (!sp || !offscreenForOthers(sp, P)) continue;
            let near = 0;
            for (const o of G.cars) if (Math.abs(o.x - sp.x) < 120 && Math.abs(o.y - sp.y) < 120) near++;
            if (near >= 4) continue;
            const car = trafficAI.spawnAt(sp);
            // (con margen: la cámara se adelanta hasta 52 px yendo rápido en auto)
            if (!car || G.players.some(q => inView(q, car, 70))) continue;
            G.cars.push(car);
            break;
          }
        }
      } else {
        P.carSpawn = 0;
      }
    }

    // Cada jugador buscado tiene su propia yuta: policías a pie y patrulleros que lo persiguen a él
    for (const P of G.players) {
      if (!inPlay(P)) continue;
      const wantCops = [0, 2, 4, 6, 9, 12][P.wanted] || 0;
      if (G.cops.filter(c => c.hp > 0 && c.tgt === P).length < wantCops && Math.random() < 1.6 * dt) {
        const cop = makeCop(P);
        if (cop) G.cops.push(cop);
      }
      const wantChase = [0, 0, 1, 2, 3, 5][P.wanted] || 0;
      if (G.cars.filter(c => c.chase && c.hp > 0 && c.tgt === P).length < wantChase && Math.random() < 0.9 * dt) {
        G.cars.push(makeChaser(P));
      }
    }

    const chasers = G.cars.filter(c => c.chase && c.hp > 0 && !driverOf(c));
    for (const c of chasers) {
      // Si su objetivo se fue de la partida, va por el más cercano
      if (!c.tgt || !G.players.includes(c.tgt)) c.tgt = nearestPlayer(c).p;
      const P = c.tgt;
      // Su jugador ya no tiene estrellas: apaga la sirena y vuelve al tráfico (se va cuando nadie lo ve)
      if (!P || P.wanted <= 0) {
        Object.assign(c, { chase: false, ai: true, nav: false, tgt: null, slot: undefined, bustT: 0, cruise: c.model.cruise * rnd(0.9, 1.1) });
        continue;
      }
      const d = dist(c, P);
      // Va por las calles hacia su jugador (js/traffic.js); sin camino por la grilla, derecho
      let nav = copNav.target(c, P, dt) || { x: P.x, y: P.y, turn: false };
      // Ya llegó y el jugador está a pie: se tira contra el cordón en vez de quedar en el medio
      // del carril (con el jugador en un auto sí se le va encima, para encajonarlo)
      if (!P.car && d < 70) {
        // Lugar propio en el operativo: el primer número libre entre los que ya estacionaron
        if (c.slot === undefined) {
          const used = new Set(chasers.filter(o => o !== c && o.tgt === P && o.slot !== undefined).map(o => o.slot));
          c.slot = 0;
          while (used.has(c.slot)) c.slot++;
        }
        nav = copNav.curb(c, P) || nav;
      } else if (d > 120) {
        c.slot = undefined; // se alejó (el jugador se fue): el lugar queda para otro
      }
      // Maneja hacia ahí sin carriles ni semáforos, esquivando lo que se le cruza (js/traffic.js)
      trafficAI.pursue(c, nav, P, dt, d, true);
      // Encajonar jugador
      if (inPlay(P) && P.car && d < 24) {
        if (Math.abs(P.car.spd) < 34) {
          c.bustT = (c.bustT || 0) + dt;
          if (c.bustT > 0.8) this.bust(P);
        } else {
          c.bustT = 0;
          if (d < 17) {
            const push = Math.atan2(P.y - c.y, P.x - c.x);
            P.car.spd *= 0.93;
            P.car.x += Math.cos(push) * 26 * dt;
            P.car.y += Math.sin(push) * 26 * dt;
            P.car.hp -= 7 * dt;
            this.shakeFor(P, 22 * dt);
          }
        }
      } else {
        c.bustT = 0;
      }
    }

    G.cars = G.cars.filter(c => !c.chase || driverOf(c) || (c.hp > 0 && distToPlayers(c) < SIM_R * 1.3));

    // Choques entre autos: si dos terminan superpuestos se empujan y se danan,
    // en vez de cruzarse como si nada. Solo toca G.cars: los peatones (G.peds/G.cops
    // a pie) nunca reciben dano aca, asi que un auto de NPC jamas puede atropellar a nadie.
    for (let i = 0; i < G.cars.length; i++) {
      const a = G.cars[i];
      if (a.hp <= 0) continue;
      for (let j = i + 1; j < G.cars.length; j++) {
        const b = G.cars[j];
        if (b.hp <= 0) continue;
        // Como rectángulos girados: con círculos, dos anchos que se cruzan de frente cada
        // uno en su carril se "tocaban" sin estar ni cerca
        const hit = carOverlap(a, b);
        if (!hit) continue;
        const dx2 = b.x - a.x, dy2 = b.y - a.y;
        const d2 = Math.hypot(dx2, dy2) || 1;
        const overlap = hit.o, ux = hit.ux, uy = hit.uy;
        const halfAx = a.x - ux * overlap * 0.5, halfAy = a.y - uy * overlap * 0.5;
        const halfBx = b.x + ux * overlap * 0.5, halfBy = b.y + uy * overlap * 0.5;
        // Libre = sin edificio y adentro del mapa: el empujón no puede sacar a nadie del borde
        const free = (x, y, r) => !hitBuilding(x, y, r) && x > 10 && y > 10 && x < WORLD_W - 10 && y < WORLD_H - 10;
        const aClear = free(halfAx, halfAy, (a.w + a.h) / 4);
        const bClear = free(halfBx, halfBy, (b.w + b.h) / 4);
        if (aClear && bClear) {
          a.x = halfAx; a.y = halfAy;
          b.x = halfBx; b.y = halfBy;
        } else if (aClear) {
          a.x -= ux * overlap;
          a.y -= uy * overlap;
        } else if (bClear) {
          b.x += ux * overlap;
          b.y += uy * overlap;
        } else {
          // Ninguno tiene lugar para atras (encajonados entre auto y pared): se
          // prueba deslizar de costado. Si no, quedaban encimados para siempre.
          const sx = -uy, sy = ux;
          for (const s of [1, -1]) {
            const ax2 = a.x + sx * s * overlap * 0.6, ay2 = a.y + sy * s * overlap * 0.6;
            const bx2 = b.x - sx * s * overlap * 0.6, by2 = b.y - sy * s * overlap * 0.6;
            if (free(ax2, ay2, (a.w + a.h) / 4) && free(bx2, by2, (b.w + b.h) / 4)) {
              a.x = ax2; a.y = ay2;
              b.x = bx2; b.y = by2;
              break;
            }
          }
        }

        // Velocidad de cierre real (proyectada sobre la línea entre los dos), no la suma de
        // rapideces: dos autos en fila yendo para el mismo lado no deben "chocar" solo por ir cerca.
        const avx = Math.cos(a.ang) * a.spd, avy = Math.sin(a.ang) * a.spd;
        const bvx = Math.cos(b.ang) * b.spd, bvy = Math.sin(b.ang) * b.spd;
        const impact = -((bvx - avx) * dx2 + (bvy - avy) * dy2) / d2;
        const da = driverOf(a), db = driverOf(b);
        // Al que chocó un jugador: bocinazo, y si fue fuerte, según el chofer se calienta o se asusta
        if (impact > 8 && !!da !== !!db) trafficAI.rammed(da ? b : a, da || db, impact);
        if (impact > 30) {
          const dmg = impact / 14;
          const aAlive = a.hp > 0, bAlive = b.hp > 0;
          a.hp -= dmg;
          b.hp -= dmg;
          a.spd *= -0.3;
          b.spd *= -0.3;
          boom((a.x + b.x) / 2, (a.y + b.y) / 2, 10, '255,190,90');
          sfx('choque', (a.x + b.x) / 2, (a.y + b.y) / 2, dmg);
          this.shakeAt((a.x + b.x) / 2, (a.y + b.y) / 2, Math.min(10, dmg * 0.5));
          if (da) da.hp -= dmg * 0.5;
          if (db) db.hp -= dmg * 0.5;
          if (aAlive && a.hp <= 0) this.wreckCar(a);
          if (bAlive && b.hp <= 0) this.wreckCar(b);
        }
      }
    }

    for (const c of G.cops) {
      if (c.hp <= 0) continue;
      if (!c.tgt || !G.players.includes(c.tgt)) c.tgt = nearestPlayer(c).p;
      const P = c.tgt;
      c.muzzle = Math.max(0, c.muzzle - dt * 14);
      const d = dist(c, P);
      c.ang = Math.atan2(P.y - c.y, P.x - c.x);

      // Arresto en curso: se le acercan a esposarlo, sin tirar
      if (P.busted) {
        if (d > 13) {
          c.x += Math.cos(c.ang) * 46 * dt;
          c.y += Math.sin(c.ang) * 46 * dt;
          c.walk += dt * 5;
        }
        continue;
      }

      if (d > 34) {
        const s = 52 + P.wanted * 6;
        const nx = c.x + Math.cos(c.ang) * s * dt, ny = c.y + Math.sin(c.ang) * s * dt;
        // La yuta a pie no entra a la villa: se queda en el borde
        const out = !villaAt(c.x, c.y);
        if (!hitBuilding(nx, c.y, c.r) && !(out && villaAt(nx, c.y))) c.x = nx;
        if (!hitBuilding(c.x, ny, c.r) && !(out && villaAt(c.x, ny))) c.y = ny;
        c.walk += (dt * s) / 8;
      }

      if (inPlay(P) && d < 15) {
        const slow = P.car ? Math.abs(P.car.spd) < 26 : true;
        if (slow) {
          c.bustT += dt;
          if (c.bustT > 0.65) this.bust(P);
        } else {
          c.bustT = 0;
        }
      } else {
        c.bustT = 0;
      }

      c.cool -= dt;
      if (d < 155 && c.cool <= 0 && inPlay(P)) {
        c.cool = rnd(0.7, 1.6) / (1 + P.wanted * 0.15);
        const a = c.ang + rnd(-0.16, 0.16);
        c.muzzle = 1;
        sfx('pistola', c.x, c.y);
        trafficAI.alarm(c.x, c.y, 100, c, 1);
        G.bullets.push({
          x: c.x + Math.cos(a) * 9,
          y: c.y + Math.sin(a) * 9,
          vx: Math.cos(a) * 335,
          vy: Math.sin(a) * 335,
          life: 0.8,
          owner: null,
          dmg: 7,
        });
      }
    }
    G.cops = G.cops.filter(c => c.hp > 0 && distToPlayers(c) < 700);

    for (const P of G.players) {
      if (P.wanted <= 0 || P.busted) continue;
      // Adentro de la villa la búsqueda baja el doble de rápido y solo te "ven" de cerca
      const hidden = villaAt(P.x, P.y) && !P.car;
      P.wantCool += hidden ? dt * 2 : dt;
      if (G.cops.some(c => dist(c, P) < (hidden ? 80 : 195))) P.wantCool = 0;
      if (P.wantCool > 12) {
        P.wantCool = 0;
        P.wanted--;
        this.say(P.wanted ? 'BAJO LA BUSQUEDA' : 'LOS PERDISTE', 2.6, P);
        if (!P.wanted) {
          if (P.wantPeak >= 3) { this.gainRespect(P, RESPECT.star * P.wantPeak, 'LOS PERDISTE'); this.addScore(P, SCORE.star * P.wantPeak); }
          P.wantPeak = 0;
        }
      }
    }

    for (const pk of G.pickups) {
      pk.t += dt;
      const { p: P, d } = nearestPlayer(pk, inPlay);
      if (P && d < 12) {
        if (pk.kind === 'cash') {
          const v = pk.value || 150 + ((Math.random() * 8) | 0) * 50;
          P.money += v;
          this.say('+$' + v, 2.6, P);
        } else if (pk.kind === 'gold' || pk.kind === 'merca') {
          P.money += pk.value;
          this.say('+$' + pk.value + (pk.kind === 'gold' ? ' BALON DE ORO' : ' MERCA'), 2.6, P);
        } else if (pk.kind === 'weapon') {
          this.giveWeapon(P, pk.w, pk.ammo);
          this.say(WEAPONS[pk.w].melee ? WEAPONS[pk.w].name : WEAPONS[pk.w].short + ' +' + pk.ammo, 2.6, P);
        } else {
          const heal = FOOD_HEAL[pk.food] || 35, F = FOOD[pk.food];
          P.hp = Math.min(P.maxhp, P.hp + heal);
          if (F) {
            P.food = Math.min(100, P.food + F.food);
            P.drink = Math.min(100, P.drink + F.drink);
          }
          this.say('+' + heal + ' VIDA (' + pk.food.toUpperCase() + ')', 2.6, P);
        }
        sfxFor(P, { cash: 'guita', gold: 'guita', merca: 'guita', weapon: 'arma' }[pk.kind] || 'comida');
        const col = { cash: '120,220,120', gold: '255,215,70', merca: '245,245,255', hp: '230,90,90', weapon: '255,200,90' }[pk.kind];
        boom(pk.x, pk.y, 8, col);
        if (pk.drop) pk.gone = true;
        else Object.assign(pk, makePickup());
      }
    }
    G.pickups = G.pickups.filter(pk => !pk.gone && !(pk.drop && pk.t > 30));

    this.updateFx(dt);

    for (const P of G.players) {
      if (P.hp <= 0 && !P.dead) {
        P.dead = true;
        P.hp = 0;
        this.playerDown(P);
        this.exitCar(P);
        boom(P.x, P.y, 32, '170,30,30');
        sfxFor(P, 'muerte');
        decal(P.x, P.y, 9, 'rgba(95,12,12,.55)');
        this.shakeFor(P, 10);
      }
    }

    this.updateCamera(rdt);
  }

  // Chispas y humo: son de cada pantalla (en red cada uno anima los suyos)
  updateFx(dt) {
    for (const f of G.fx) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.93;
      f.vy *= 0.93;
      f.life -= dt;
    }
    G.fx = G.fx.filter(f => f.life > 0);

    for (const s of G.smoke) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy *= 0.96;
      s.r += dt * 7;
      s.life -= dt;
    }
    G.smoke = G.smoke.filter(s => s.life > 0);
  }

  // Cámara del jugador local, con suavizado y adelanto según velocidad
  updateCamera(rdt) {
    const P = G.me;
    if (!P) return;
    const lead = P.car ? clamp(P.car.spd / 195, 0, 1) * 52 : 0;
    const tx = clamp(P.x + Math.cos(P.ang) * lead - RW / 2, 0, WORLD_W - RW);
    const ty = clamp(P.y + Math.sin(P.ang) * lead - RH / 2, 0, WORLD_H - RH);
    G.cam.x = lerp(G.cam.x, tx, clamp(rdt * 7, 0, 1));
    G.cam.y = lerp(G.cam.y, ty, clamp(rdt * 7, 0, 1));
  }
}

const game = new Game();
game.registerEvent({
  id: 'festejo',
  weight: 1,
  when: () => !G.festejo && !!getObelisco(),
  run: () => game.startFestejo(),
});

// Exportación para compatibilidad. Sin jugador explícito, actúan sobre el local (G.me).
const say = (t, s, P) => game.say(t, s, P);
const startGame = def => game.startGame(def);
const addPlayer = def => game.addPlayer(def);
const removePlayer = P => game.removePlayer(P);
const bust = (P = G.me) => game.bust(P);
const finishBust = (P = G.me) => game.finishBust(P);
const exitCar = (P = G.me) => game.exitCar(P);
const wantUp = (n, P = G.me) => game.wantUp(P, n);
const update = dt => game.update(dt);
