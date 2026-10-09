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
  flash: 0,
  shopOpen: false,
  tranzas: [],
  ts: 1,
};

// En juego: ni muerto, ni en la secuencia de arresto, ni adentro del hospital.
// La IA solo persigue, apunta y arresta a los que están en juego.
function inPlay(P) {
  return !!P && !P.dead && !P.busted && !P.healing;
}

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
// Ninguno de los otros jugadores lo ve (para aparecer gente alrededor de uno sin que se vea en la pantalla del otro)
const offscreenForOthers = (o, P) => G.players.every(q => q === P || dist(q, o) > OFFSCREEN);

function driverOf(car) {
  for (const P of G.players) if (P.car === car) return P;
  return null;
}

class Game {
  constructor() {
    this.state = G;
  }

  // Los mensajes y el temblor son de la pantalla local: lo que le pasa a otro jugador
  // no se le muestra a este (con P = null es para todos)
  say(t, s = 2.6, P = null) {
    if (P && P !== G.me) return;
    G.msg = t;
    G.msgT = s;
  }

  shakeFor(P, n) {
    if (P === G.me) G.shake += n;
  }

  nearMe(x, y) {
    return !!G.me && Math.hypot(x - G.me.x, y - G.me.y) < OFFSCREEN * 1.5;
  }

  shakeAt(x, y, n) {
    if (this.nearMe(x, y)) G.shake += n;
  }

  snapCam() {
    if (!G.me) return;
    G.cam.x = clamp(G.me.x - RW / 2, 0, WORLD - RW);
    G.cam.y = clamp(G.me.y - RH / 2, 0, WORLD - RH);
  }

  startGame(def) {
    G.me = makePlayer(def, 0);
    G.players = [G.me];
    const s = freeRoadSpot();
    G.me.x = s.x;
    G.me.y = s.y;
    this.snapCam();
    G.cars = [];
    copNav.reset();
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

    for (let i = 0; i < CAR_TARGET; i++) {
      const sp = ringSpot(60, SIM_R, true) || freeRoadSpot();
      G.cars.push(makeCar(sp.x, sp.y));
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
  // todos, reaparece solo él, sin fierros ni estrellas pero con su guita
  respawn(P) {
    const s = freeRoadSpot();
    Object.assign(P, {
      x: s.x, y: s.y, hp: P.maxhp, dead: false, car: null, cool: 0.5,
      inv: { pistola: Infinity }, wpn: 'pistola', armor: 0,
      wanted: 0, wantCool: 0, slowmo: 0,
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
    // En la comisaria te sacan los fierros y el chaleco
    P.inv = { pistola: Infinity };
    P.wpn = 'pistola';
    P.armor = 0;
    if (P === G.me) this.snapCam();
    P.busted = 0;
    P.bustT = 0;
    this.say('TE SOLTARON SIN LOS FIERROS. PERDISTE $' + P.bustFine, 3.4, P);
  }

  exitCar(P = G.me) {
    if (!P || !P.car) return;
    sfx('puerta', P.car.x, P.car.y);
    P.car.ai = true;
    P.car.spd = 0;
    P.car.nav = false; // la IA retoma desde donde lo dejaste
    P.x = P.car.x + Math.cos(P.car.ang + Math.PI / 2) * 15;
    P.y = P.car.y + Math.sin(P.car.ang + Math.PI / 2) * 15;
    P.car = null;
  }

  wantUp(P, n) {
    if (!P) return;
    const old = P.wanted;
    P.wanted = Math.min(5, P.wanted + n);
    P.wantCool = 0;
    if (P.wanted > old && P.wanted >= 2) {
      sfxFor(P, 'busqueda');
      this.say('NIVEL DE BUSQUEDA ' + '*'.repeat(P.wanted), 2.6, P);
    }
  }

  wreckCar(car) {
    const P = driverOf(car);
    sfx('explosion', car.x, car.y);
    boom(car.x, car.y, P ? 34 : 24, '255,150,40', 2);
    puff(car.x, car.y, '40,40,40', 10, 26);
    decal(car.x, car.y, P ? 14 : 12, 'rgba(10,10,10,.5)');
    if (P) {
      this.shakeFor(P, 12);
      if (P === G.me) G.flash = 0.8;
      P.hp -= 25;
      this.exitCar(P);
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

  hurtPlayer(P, n) {
    if (P.armor > 0) {
      const a = Math.min(P.armor, n * 0.7);
      P.armor -= a;
      n -= a;
    }
    P.hp -= n;
  }

  // Un balazo a un jugador: en el auto lo absorbe casi todo la chapa
  shootPlayer(P, dmg) {
    this.shakeFor(P, 1.6);
    sfx('impacto', P.x, P.y);
    if (P.car) {
      P.car.hp -= dmg;
      this.hurtPlayer(P, (dmg * 2) / 7);
    } else {
      this.hurtPlayer(P, dmg);
    }
    boom(P.x, P.y, 5, '190,35,35');
  }

  // Daño a peatón o policía, con premio y búsqueda para el jugador que lo bajó (by)
  hurt(e, dmg, by = null) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    boom(e.x, e.y, 7, '190,35,35');
    sfx('impacto', e.x, e.y);
    if (e.kind === 'tranza') {
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
      this.wantUp(by, e.kind === 'cop' ? 2 : 1);
      if (by) by.money += e.kind === 'cop' ? 120 : 40;
      if (e.kind === 'cop' && Math.random() < 0.3) G.pickups.push(makeDrop(e.x, e.y, 'escopeta', 6));
    }
  }

  // Lo que un jugador le puede pegar: la gente de la calle y, con PVP, los otros jugadores
  targetsOf(P) {
    const out = [];
    for (const list of [G.cops, G.peds, G.tranzas]) {
      for (const e of list) if (e.hp > 0 && !e.inside) out.push(e);
    }
    if (PVP) {
      for (const q of G.players) if (q !== P && inPlay(q) && !q.car) out.push(q);
    }
    return out;
  }

  damage(e, dmg, by) {
    if (e.kind === 'player') this.hurtPlayer(e, dmg);
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
    if (this.nearMe(x, y)) G.flash = Math.max(G.flash, 0.7);
    for (const list of [G.cops, G.peds, G.tranzas]) {
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
      if (d < R) this.hurtPlayer(P, dmg * 0.6 * (1 - (d / R) * 0.6));
    }
    if (by && by.wanted < 1) this.wantUp(by, 1);
  }

  updateNades(dt) {
    for (const n of G.nades) {
      n.t -= dt;
      const nx = n.x + n.vx * dt, ny = n.y + n.vy * dt;
      if (hitBuilding(nx, n.y, 2)) n.vx *= -0.5;
      else n.x = clamp(nx, 4, WORLD - 4);
      if (hitBuilding(n.x, ny, 2)) n.vy *= -0.5;
      else n.y = clamp(ny, 4, WORLD - 4);
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
    for (const v of villas) v.angry = Math.max(0, v.angry - dt);
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
        P.healing = 0;
        sfxFor(P, 'hospital');
        this.say('LISTO. A LA CALLE.', 2.6, P);
      }
      return;
    }

    const ctl = P.ctl;
    const ix = ctl.x;
    const iy = ctl.y;
    P.muzzle = Math.max(0, P.muzzle - rdt * 14);
    P.swing = Math.max(0, P.swing - rdt * 5);
    P.nearShop = null;
    P.nearTranza = null;
    if (!P.dead) this.switchWeapon(P);

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
          return 'reset';
        }
        this.respawn(P);
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
        car.x = clamp(nx, 8, WORLD - 8);
        car.y = clamp(ny, 8, WORLD - 8);
      }
      P.x = car.x;
      P.y = car.y;
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
      const spd = running ? 94 : 58;
      P.run = lerp(P.run, running ? 1 : 0, rdt * 8);
      const m = Math.hypot(ix, iy) || 1;
      const nx = P.x + (ix / m) * spd * rdt;
      const ny = P.y + (iy / m) * spd * rdt;
      if (!hitBuilding(nx, P.y, P.r)) P.x = clamp(nx, 6, WORLD - 6);
      if (!hitBuilding(P.x, ny, P.r)) P.y = clamp(ny, 6, WORLD - 6);
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

      // Los menús (armería, tranza) son de la pantalla local: solo los abre G.me
      if (ctl.use && P.cool <= 0 && P.nearShop) {
        P.cool = 0.4;
        if (P.wanted >= 2) this.say('EL ARMERO NO ATIENDE CON LA YUTA ENCIMA', 2.6, P);
        else if (P === G.me) shop.open('armeria');
      } else if (ctl.use && P.cool <= 0 && P.nearTranza) {
        P.cool = 0.4;
        P.nearTranza.ang = Math.atan2(P.y - P.nearTranza.y, P.x - P.nearTranza.x);
        if (P === G.me) shop.open('tranza');
      } else if (ctl.use && P.cool <= 0) {
        P.cool = 0.4;
        let best = null, bd = 26;
        for (const c of G.cars) {
          if (driverOf(c)) continue; // el auto de otro jugador no se roba
          const d = dist(c, P);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (best) {
          best.ai = false;
          best.chase = false; // un patrullero robado deja de perseguir
          P.car = best;
          sfx('puerta', best.x, best.y);
          if (!best.cop) this.wantUp(P, 1);
          this.say(best.cop ? 'AUTO DE LA YUTA' : 'AUTO ROBADO', 2.6, P);
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
      if (hitBuilding(b.x, b.y, 1)) {
        b.life = 0;
        boom(b.x, b.y, 4, '220,220,200');
        sfx('pared', b.x, b.y);
        continue;
      }
      if (b.owner) {
        for (const list of [G.cops, G.peds, G.tranzas]) {
          for (const e of list) {
            if (b.life > 0 && e.hp > 0 && segDist(b, e) < 7) {
              b.life = 0;
              this.hurt(e, b.dmg, b.owner);
            }
          }
        }
      }
      // Las balas de la yuta y los tranzas le pegan a cualquier jugador; las de un
      // jugador, con PVP, a los otros (nunca a él mismo)
      for (const P of G.players) {
        if (b.life <= 0) break;
        if (P === b.owner || (b.owner && !PVP) || !inPlay(P)) continue;
        if (segDist(b, P) < (P.car ? 12 : 7)) {
          b.life = 0;
          this.shootPlayer(P, b.dmg);
        }
      }
    }
    G.bullets = G.bullets.filter(b => b.life > 0);

    for (const p of G.peds) {
      if (p.hp <= 0) continue;

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

      p.tt -= dt;
      // Algún jugador con la yuta encima cerca: nadie se va a un edificio, todos atentos.
      // threat: el que lo asusta (buscado cerca, o pasando fuerte con el auto)
      let busy = false, threat = null;
      for (const q of G.players) {
        const dq = dist(p, q);
        if (q.wanted > 0 && dq < 105) busy = true;
        if (!threat && ((q.wanted > 0 && dq < 105) || (q.car && Math.abs(q.car.spd) > 70 && dq < 65))) threat = q;
      }
      if (!busy) {
        p.doorT -= dt;
        if (p.doorT <= 0 && !p.target) {
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
          p.ang = Math.atan2(ny - c.y, nx - c.x);
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
                p.x = clamp(p.x, MARGIN + 2, WORLD - MARGIN - 2);
                p.y = clamp(p.y, MARGIN + 2, WORLD - MARGIN - 2);
              }
            }
            p.stuck = 0;
            p.target = null;
            p.ang = rnd(0, TAU);
          }
        }
      }

      for (const q of G.peds) {
        if (q === p || q.hp <= 0) continue;
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
          if (q !== p && q.hp > 0 && dist(p, q) < 16) {
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
            if (x > 0 && y > 0 && x < WORLD && y < WORLD && onRoad(x, y) && !hitBuilding(x, y, 2)) road++;
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
          // ya cargada (en una esquina del mapa o al lado del río hay menos calles para repartir)
          for (let k = 0; k < 4; k++) {
            const sp = ringSpot(OFFSCREEN, SIM_R * 0.95, true, P);
            if (!sp || !offscreenForOthers(sp, P)) continue;
            let near = 0, touching = false;
            for (const o of G.cars) {
              const dx = Math.abs(o.x - sp.x), dy = Math.abs(o.y - sp.y);
              if (dx < 40 && dy < 40) { touching = true; break; }
              if (dx < 120 && dy < 120) near++;
            }
            if (touching || near >= 4) continue;
            G.cars.push(makeCar(sp.x, sp.y));
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
      // Desvío en curso (ver abajo): sigue ese rumbo un rato antes de volver a apuntar
      c.detourT = Math.max(0, (c.detourT || 0) - dt);
      const want = c.detourT > 0 ? c.detourAng : Math.atan2(nav.y - c.y, nav.x - c.x);
      let diff = ((want - c.ang + Math.PI * 3) % TAU) - Math.PI;
      const rate = 2.6 * clamp(Math.abs(c.spd) / 70, 0.3, 1);
      const turn = clamp(diff, -rate * dt, rate * dt);
      c.ang += turn;
      c.steer = lerp(c.steer, clamp(diff, -1, 1), dt * 8);

      let target = d > 70 ? c.cruise : (d > 26 ? 70 : 26);
      // Frena antes de doblar en una esquina, o si tiene que girar mucho: a toda velocidad
      // el radio de giro no entra en la calle y se come la esquina
      if (nav.turn) target = Math.min(target, 55);
      if (nav.park) target = Math.hypot(nav.x - c.x, nav.y - c.y) > 6 ? 30 : 0;
      if (Math.abs(diff) > 0.8) target = Math.min(target, 45);
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
          c.ang += Math.PI;
          c.spd = 16;
          if (farFromPlayers(c, OFFSCREEN)) c.hp = 0;
        }
      } else {
        c.x = nx2;
        c.y = ny2;
      }
      // Como los autos civiles: un choque puede empujarlo afuera del mapa, y desde ahí
      // todo movimiento choca con el borde y queda girando en el lugar para siempre
      c.x = clamp(c.x, 10, WORLD - 10);
      c.y = clamp(c.y, 10, WORLD - 10);

      // Sin camino de calles, va derecho al jugador: en un callejón sin salida puede quedar
      // girando sin avanzar. Si en 2s no se movió y no está encima del jugador, se reubica:
      // fuera de pantalla desaparece (aparece otro en una calle), en pantalla salta al carril libre más cercano
      c.progT = (c.progT || 0) + dt;
      if (c.progT >= 2) {
        const moved = Math.hypot(c.x - (c.progX ?? c.x + 99), c.y - (c.progY ?? c.y + 99));
        if (moved < 6 && d > 80) {
          if (farFromPlayers(c, OFFSCREEN)) c.hp = 0;
          else {
            for (const a of [0, Math.PI / 2]) {
              const L = laneSnap(c.x, c.y, a);
              if (L.x > 10 && L.y > 10 && L.x < WORLD - 10 && L.y < WORLD - 10 && !hitBuilding(L.x, L.y, CR2) && !hitCarBlock(L.x, L.y, CR2)) {
                c.x = L.x; c.y = L.y; c.ang = L.ang; c.detourT = 0;
                break;
              }
            }
          }
        }
        c.progT = 0; c.progX = c.x; c.progY = c.y;
      }
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
        const minD = (a.w + a.h) / 4 + (b.w + b.h) / 4;
        const dx2 = b.x - a.x, dy2 = b.y - a.y;
        const d2 = Math.hypot(dx2, dy2);
        if (d2 <= 0 || d2 >= minD) continue;

        const overlap = minD - d2, ux = dx2 / d2, uy = dy2 / d2;
        const halfAx = a.x - ux * overlap * 0.5, halfAy = a.y - uy * overlap * 0.5;
        const halfBx = b.x + ux * overlap * 0.5, halfBy = b.y + uy * overlap * 0.5;
        // Libre = sin edificio y adentro del mapa: el empujón no puede sacar a nadie del borde
        const free = (x, y, r) => !hitBuilding(x, y, r) && x > 10 && y > 10 && x < WORLD - 10 && y < WORLD - 10;
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

        // Velocidad de cierre real (proyectada sobre la normal), no la suma de rapideces:
        // dos autos en fila yendo para el mismo lado no deben "chocar" solo por ir cerca.
        const avx = Math.cos(a.ang) * a.spd, avy = Math.sin(a.ang) * a.spd;
        const bvx = Math.cos(b.ang) * b.spd, bvy = Math.sin(b.ang) * b.spd;
        const impact = -((bvx - avx) * ux + (bvy - avy) * uy);
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
          const da = driverOf(a), db = driverOf(b);
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
      }
    }

    for (const pk of G.pickups) {
      pk.t += dt;
      const { p: P, d } = nearestPlayer(pk, inPlay);
      if (P && d < 12) {
        if (pk.kind === 'cash') {
          const v = 150 + ((Math.random() * 8) | 0) * 50;
          P.money += v;
          this.say('+$' + v, 2.6, P);
        } else if (pk.kind === 'weapon') {
          this.giveWeapon(P, pk.w, pk.ammo);
          this.say(WEAPONS[pk.w].melee ? WEAPONS[pk.w].name : WEAPONS[pk.w].short + ' +' + pk.ammo, 2.6, P);
        } else {
          const heal = FOOD_HEAL[pk.food] || 35;
          P.hp = Math.min(P.maxhp, P.hp + heal);
          this.say('+' + heal + ' VIDA (' + pk.food.toUpperCase() + ')', 2.6, P);
        }
        sfxFor(P, { cash: 'guita', weapon: 'arma' }[pk.kind] || 'comida');
        const col = { cash: '120,220,120', hp: '230,90,90', weapon: '255,200,90' }[pk.kind];
        boom(pk.x, pk.y, 8, col);
        if (pk.drop) pk.gone = true;
        else Object.assign(pk, makePickup());
      }
    }
    G.pickups = G.pickups.filter(pk => !pk.gone && !(pk.drop && pk.t > 30));

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

    for (const P of G.players) {
      if (P.hp <= 0 && !P.dead) {
        P.dead = true;
        P.hp = 0;
        this.exitCar(P);
        boom(P.x, P.y, 32, '170,30,30');
        sfxFor(P, 'muerte');
        decal(P.x, P.y, 9, 'rgba(95,12,12,.55)');
        this.shakeFor(P, 10);
      }
    }

    // Cámara del jugador local, con suavizado y adelanto según velocidad
    const P = G.me;
    if (!P) return;
    const lead = P.car ? clamp(P.car.spd / 195, 0, 1) * 52 : 0;
    const tx = clamp(P.x + Math.cos(P.ang) * lead - RW / 2, 0, WORLD - RW);
    const ty = clamp(P.y + Math.sin(P.ang) * lead - RH / 2, 0, WORLD - RH);
    G.cam.x = lerp(G.cam.x, tx, clamp(rdt * 7, 0, 1));
    G.cam.y = lerp(G.cam.y, ty, clamp(rdt * 7, 0, 1));
  }
}

const game = new Game();

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
