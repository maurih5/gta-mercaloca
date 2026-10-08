/* =========================================================================
   GTA MERCALOCA - Lógica Central del Juego, Estado y Simulación Física
   ========================================================================= */

const G = {
  state: 'load',
  t: 0,
  cam: { x: 0, y: 0 },
  shake: 0,
  player: null,
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
  wanted: 0,
  wantCool: 0,
  money: 0,
  msg: '',
  msgT: 0,
  paused: false,
  mapOpen: false,
  mapZoom: MAP_MIN_ZOOM,
  flash: 0,
  busted: 0,
  bustT: 0,
  bustFine: 0,
  bustCar: null,
  healing: 0,
  healT: 0,
  nearShop: null,
  shopOpen: false,
  tranzas: [],
  nearTranza: null,
  zone: null,
  slowmo: 0,
  ts: 1,
};

class Game {
  constructor() {
    this.state = G;
  }

  say(t, s = 2.6) {
    G.msg = t;
    G.msgT = s;
  }

  startGame(def) {
    G.player = makePlayer(def);
    const s = freeRoadSpot();
    G.player.x = s.x;
    G.player.y = s.y;
    G.cam.x = clamp(s.x - RW / 2, 0, WORLD - RW);
    G.cam.y = clamp(s.y - RH / 2, 0, WORLD - RH);
    G.cars = [];
    G.peds = [];
    G.guards = [];
    G.cops = [];
    G.bullets = [];
    G.nades = [];
    G.pickups = [];
    G.fx = [];
    G.smoke = [];
    G.nearShop = null;
    G.shopOpen = false;
    G.nearTranza = null;
    G.zone = null;
    G.slowmo = 0;
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

    G.wanted = 0;
    G.money = 0;
    G.state = 'play';
    G.paused = false;
    G.mapOpen = false;
    G.mapZoom = MAP_MIN_ZOOM;
    G.shake = 0;
    G.busted = 0;
    G.bustT = 0;
    G.bustFine = 0;
    G.healing = 0;
    G.healT = 0;
    this.say('MERCALOCA EN LA CALLE. JUNTA GUITA.', 3.4);
    if (typeof touchController !== 'undefined') {
      touchController.updateVisibility();
    }
  }

  bust() {
    const P = G.player;
    if (!P || P.dead || G.busted) return;
    G.busted = 1;
    G.bustT = 0;
    G.bustFine = Math.round(G.money * 0.35) + 200 * G.wanted;
    G.bustCar = P.car;
    if (P.car) {
      this.exitCar();
    }
    P.hp = Math.max(P.hp, 1);
    G.shake += 6;
    this.say('QUEDATE QUIETO!', 2.2);
  }

  finishBust() {
    const P = G.player;
    if (!P) return;
    G.money = Math.max(0, G.money - G.bustFine);
    G.wanted = 0;
    G.wantCool = 0;
    G.cops.length = 0;
    G.cars = G.cars.filter(c => !c.chase && !c.cop);
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
    G.cam.x = clamp(P.x - RW / 2, 0, WORLD - RW);
    G.cam.y = clamp(P.y - RH / 2, 0, WORLD - RH);
    G.busted = 0;
    G.bustT = 0;
    this.say('TE SOLTARON SIN LOS FIERROS. PERDISTE $' + G.bustFine, 3.4);
  }

  exitCar() {
    const P = G.player;
    if (!P || !P.car) return;
    P.car.ai = true;
    P.car.spd = 0;
    P.car.nav = false; // la IA retoma desde donde lo dejaste
    P.x = P.car.x + Math.cos(P.car.ang + Math.PI / 2) * 15;
    P.y = P.car.y + Math.sin(P.car.ang + Math.PI / 2) * 15;
    P.car = null;
  }

  wantUp(n) {
    const old = G.wanted;
    G.wanted = Math.min(5, G.wanted + n);
    G.wantCool = 0;
    if (G.wanted > old && G.wanted >= 2) {
      this.say('NIVEL DE BUSQUEDA ' + '*'.repeat(G.wanted));
    }
  }

  wreckCar(car) {
    const P = G.player;
    const mine = car === P.car;
    boom(car.x, car.y, mine ? 34 : 24, '255,150,40', 2);
    puff(car.x, car.y, '40,40,40', 10, 26);
    decal(car.x, car.y, mine ? 14 : 12, 'rgba(10,10,10,.5)');
    G.shake += mine ? 12 : 4;
    if (mine) {
      G.flash = 0.8;
      P.hp -= 25;
      this.exitCar();
    }
  }

  // Da un arma (o le suma balas si ya la tenía). Si es nueva, la pone en la mano.
  giveWeapon(P, id, ammo) {
    const isNew = !(P.inv[id] > 0);
    P.inv[id] = WEAPONS[id].melee ? Infinity : (P.inv[id] || 0) + ammo;
    if (isNew) P.wpn = id;
  }

  hurtPlayer(n) {
    const P = G.player;
    if (P.armor > 0) {
      const a = Math.min(P.armor, n * 0.7);
      P.armor -= a;
      n -= a;
    }
    P.hp -= n;
  }

  // Daño a peatón o policía, con premio y búsqueda si lo bajás
  hurt(e, dmg) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    boom(e.x, e.y, 7, '190,35,35');
    if (e.kind === 'tranza') {
      if (e.villa.angry <= 0) this.say('SE PUDRIO TODO EN ' + e.villa.name, 3);
      e.villa.angry = 45;
      if (e.hp <= 0) {
        decal(e.x, e.y, rnd(4, 7), 'rgba(95,12,12,.5)');
        G.money += 150;
        if (Math.random() < 0.4) G.pickups.push(makeDrop(e.x, e.y, 'uzi', 30));
      }
      return;
    }
    if (e.hp <= 0) {
      decal(e.x, e.y, rnd(4, 7), 'rgba(95,12,12,.5)');
      this.wantUp(e.kind === 'cop' ? 2 : 1);
      G.money += e.kind === 'cop' ? 120 : 40;
      if (e.kind === 'cop' && Math.random() < 0.3) G.pickups.push(makeDrop(e.x, e.y, 'escopeta', 6));
    }
  }

  // Q rota entre las armas con balas, 1-6 elige directo
  switchWeapon(P) {
    const owned = WEAPON_ORDER.filter(id => P.inv[id] > 0);
    let next = null;
    if (keys.KeyQ && !G._q) next = owned[(owned.indexOf(P.wpn) + 1) % owned.length];
    G._q = keys.KeyQ;
    WEAPON_ORDER.forEach((id, i) => {
      if (keys['Digit' + (i + 1)] && P.inv[id] > 0) next = id;
    });
    if (next && next !== P.wpn) {
      P.wpn = next;
      this.say(WEAPONS[next].name, 1.2);
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
      });
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
          mine: true,
          dmg: W.dmg,
        });
      }
      P.muzzle = 1;
      G.shake += W.shake;
      boom(P.x + Math.cos(P.ang) * W.barrel, P.y + Math.sin(P.ang) * W.barrel, 3, '255,225,150');
    }

    if (P.inv[id] !== Infinity && --P.inv[id] <= 0) {
      P.inv[id] = 0;
      P.wpn = 'pistola';
      this.say('SIN ' + W.short + '. VOLVES A LA 9MM', 1.8);
    }
    if (G.wanted < 1) this.wantUp(1);
  }

  // Bastonazo: pega a todo lo que esté adelante y lo empuja
  swing(P, W) {
    P.swing = 1;
    let hit = false;
    for (const list of [G.cops, G.peds, G.tranzas]) {
      for (const e of list) {
        if (e.hp <= 0 || e.inside) continue;
        const d = dist(e, P);
        if (d > W.reach) continue;
        const a = Math.atan2(e.y - P.y, e.x - P.x);
        const da = Math.abs(((a - P.ang + Math.PI * 3) % TAU) - Math.PI);
        if (da > 1.1 && d > 7) continue;
        this.hurt(e, W.dmg);
        const nx = e.x + Math.cos(a) * 7, ny = e.y + Math.sin(a) * 7;
        if (!pedBlocked(nx, ny, e.r)) {
          e.x = nx;
          e.y = ny;
        }
        hit = true;
      }
    }
    if (hit) {
      G.shake += 2;
      if (G.wanted < 1) this.wantUp(1);
    }
  }

  explode(x, y, R, dmg) {
    const P = G.player, at = { x, y };
    boom(x, y, 40, '255,150,40', 2.2);
    boom(x, y, 16, '255,230,160', 1.2);
    puff(x, y, '40,40,40', 12, 24);
    decal(x, y, 13, 'rgba(10,10,10,.5)');
    G.shake += 10;
    G.flash = Math.max(G.flash, 0.7);
    for (const list of [G.cops, G.peds, G.tranzas]) {
      for (const e of list) {
        if (e.hp <= 0 || e.inside) continue;
        const d = dist(e, at);
        if (d < R) this.hurt(e, dmg * (1 - (d / R) * 0.6));
      }
    }
    // Los autos que revientan hacen explotar a los de al lado
    for (const c of G.cars) {
      const d = dist(c, at);
      if (c.hp <= 0 || d >= R + 8) continue;
      c.hp -= dmg * (1 - (d / (R + 8)) * 0.5);
      if (c.hp <= 0 && c !== P.car) {
        c.spd = 0;
        this.explode(c.x, c.y, 30, 60);
      }
    }
    if (!P.dead && !P.car) {
      const d = dist(P, at);
      if (d < R) this.hurtPlayer(dmg * 0.6 * (1 - (d / R) * 0.6));
    }
    if (G.wanted < 1) this.wantUp(1);
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
      if (n.t <= 0) this.explode(n.x, n.y, WEAPONS.granada.radius, WEAPONS.granada.dmg);
    }
    G.nades = G.nades.filter(n => n.t > 0);
  }

  updateTranzas(dt) {
    const P = G.player;
    for (const v of villas) v.angry = Math.max(0, v.angry - dt);
    for (const t of G.tranzas) {
      t.muzzle = Math.max(0, t.muzzle - dt * 14);

      // Al rato vuelve otro a la esquina, si no lo estás mirando
      if (t.hp <= 0) {
        t.dead += dt;
        if (t.dead > 90 && dist(t.home, P) > OFFSCREEN) {
          Object.assign(t, { x: t.home.x, y: t.home.y, hp: 60, dead: 0 });
        }
        continue;
      }

      const d = dist(t, P);
      if (t.villa.angry > 0 && d < 170 && !P.dead && !G.busted) {
        // Modo guerra: te apunta, se acerca un poco y tira
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
          G.bullets.push({
            x: t.x + Math.cos(a) * 9,
            y: t.y + Math.sin(a) * 9,
            vx: Math.cos(a) * 340,
            vy: Math.sin(a) * 340,
            life: 0.7,
            mine: false,
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
            t.ang = d < 60 ? Math.atan2(P.y - t.y, P.x - t.x) : rnd(0, TAU);
          }
        }
      }
    }
  }

  update(rdt) {
    // Porro: el mundo va en cámara lenta (dt) mientras el jugador se mueve a tiempo real (rdt)
    G.slowmo = Math.max(0, G.slowmo - rdt);
    G.ts = lerp(G.ts, G.slowmo > 0 ? SLOWMO : 1, clamp(rdt * 4, 0, 1));
    const dt = rdt * G.ts;
    G.t += dt;
    if (G.msgT > 0) G.msgT -= rdt;
    G.shake = Math.max(0, G.shake - rdt * 22);
    G.flash = Math.max(0, G.flash - rdt * 4);
    G.guards = G.guards.filter(g => g.hp > 0);
    const P = G.player;
    if (!P) return;

    // ---- Secuencia de arresto: 3.2s de corte, después comisaría
    if (G.busted) {
      G.bustT += dt;
      for (const c of G.cops) {
        if (c.hp <= 0) continue;
        const d = dist(c, P);
        c.ang = Math.atan2(P.y - c.y, P.x - c.x);
        if (d > 13) {
          c.x += Math.cos(c.ang) * 46 * dt;
          c.y += Math.sin(c.ang) * 46 * dt;
          c.walk += dt * 5;
        }
      }
      for (const f of G.fx) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.life -= dt;
      }
      G.fx = G.fx.filter(f => f.life > 0);
      if (G.bustT > 3.2) this.finishBust();
      return;
    }

    // ---- Secuencia de curacion: entraste a un hospital, unos segundos y salis con la vida llena
    if (G.healing) {
      G.healT += dt;
      if (G.healT > HOSPITAL_TIME) {
        P.hp = P.maxhp;
        G.healing = 0;
        this.say('LISTO. A LA CALLE.', 2.6);
      }
      return;
    }

    const ix = input.getHorizontalAxis();
    const iy = input.getVerticalAxis();
    P.muzzle = Math.max(0, P.muzzle - rdt * 14);
    P.swing = Math.max(0, P.swing - rdt * 5);
    G.nearShop = null;
    G.nearTranza = null;
    if (!P.dead) this.switchWeapon(P);

    // Fumarse un porro: F (o el botón 🌿)
    if (keys.KeyF && !G._f && !P.dead) {
      if (P.porros > 0 && G.slowmo <= 0) {
        P.porros--;
        G.slowmo = PORRO_TIME;
        P.hp = Math.min(P.maxhp, P.hp + 15);
        puff(P.x, P.y - 6, '200,220,200', 6, 10);
        this.say('TE BAJASTE UN CAMBIO...', 2.2);
      } else if (P.porros <= 0) {
        this.say('NO TENES PORROS. BUSCA UN TRANZA', 1.8);
      }
    }
    G._f = keys.KeyF;

    // Cartel de zona al entrar a una villa
    const zone = villaAt(P.x, P.y);
    if (zone !== G.zone) {
      G.zone = zone;
      if (zone) this.say(zone.name + (zone.angry > 0 ? ' - TE ESTAN ESPERANDO' : ' - LA YUTA NO ENTRA'), 2.8);
    }

    if (P.dead) {
      P.hp = 0;
      if (keys.Enter) this.startGame(P.def);
    } else if (P.car) {
      const car = P.car;
      const acc = (keys.ShiftLeft || keys.ShiftRight) ? 200 : 145;
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
          G.shake += dmg * 0.5;
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

      for (const list of [G.peds, G.cops, G.tranzas]) {
        for (const e of list) {
          if (Math.abs(car.spd) > 40 && e.hp > 0 && dist(car, e) < 14) {
            decal(e.x, e.y, rnd(3, 6), 'rgba(90,12,12,.45)');
            this.hurt(e, Math.abs(car.spd) / 6);
          }
        }
      }

      if (car.hp <= 0) this.wreckCar(car);

      if (keys.KeyE && P.cool <= 0) {
        this.exitCar();
        P.cool = 0.4;
      }
    } else {
      const running = keys.ShiftLeft || keys.ShiftRight;
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
        if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 16) G.nearShop = b;
      }
      for (const t of G.tranzas) {
        if (t.hp > 0 && t.villa.angry <= 0 && dist(t, P) < 16) G.nearTranza = t;
      }

      if (keys.KeyE && P.cool <= 0 && G.nearShop) {
        P.cool = 0.4;
        if (G.wanted >= 2) this.say('EL ARMERO NO ATIENDE CON LA YUTA ENCIMA');
        else shop.open('armeria');
      } else if (keys.KeyE && P.cool <= 0 && G.nearTranza) {
        P.cool = 0.4;
        G.nearTranza.ang = Math.atan2(P.y - G.nearTranza.y, P.x - G.nearTranza.x);
        shop.open('tranza');
      } else if (keys.KeyE && P.cool <= 0) {
        P.cool = 0.4;
        let best = null, bd = 26;
        for (const c of G.cars) {
          const d = dist(c, P);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (best) {
          best.ai = false;
          P.car = best;
          if (!best.cop) this.wantUp(1);
          this.say(best.cop ? 'AUTO DE LA YUTA' : 'AUTO ROBADO');
        }
      }

      if (P.hp < P.maxhp) {
        for (const h of hospitals) {
          const d = h.door;
          if (Math.hypot(d.x + d.ox - P.x, d.y + d.oy - P.y) < 10) {
            G.healing = 1;
            G.healT = 0;
            this.say('ENTRANDO AL HOSPITAL...', 2.4);
            break;
          }
        }
      }
    }
    P.cool -= rdt;

    if (keys.Space && !P.dead && P.cool <= 0) this.attack(P);
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
        continue;
      }
      if (b.mine) {
        for (const list of [G.cops, G.peds, G.tranzas]) {
          for (const e of list) {
            if (b.life > 0 && e.hp > 0 && segDist(b, e) < 7) {
              b.life = 0;
              this.hurt(e, b.dmg);
            }
          }
        }
      } else if (!P.dead && segDist(b, P) < (P.car ? 12 : 7)) {
        b.life = 0;
        G.shake += 1.6;
        if (P.car) {
          P.car.hp -= 7;
          this.hurtPlayer(2);
        } else {
          this.hurtPlayer(7);
        }
        boom(P.x, P.y, 5, '190,35,35');
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
      const busy = G.wanted > 0 && dist(p, P) < 105;
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

      const dp = dist(p, P);
      const scared = (G.wanted > 0 && dp < 105) || (P.car && Math.abs(P.car.spd) > 70 && dp < 65);
      if (scared) {
        p.ang = Math.atan2(p.y - P.y, p.x - P.x);
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

    // Streaming de peatones
    G.peds = G.peds.filter(q => (q.hp > 0 && dist(q, P) < SIM_R * 1.12) || (q.hp <= 0 && dist(q, P) < 300));
    const alive = G.peds.filter(q => q.hp > 0).length;
    if (alive < PED_TARGET) {
      G.pedSpawn = (G.pedSpawn || 0) + dt;
      if (G.pedSpawn > 0.12) {
        G.pedSpawn = 0;
        const sp = sidewalkSpot(OFFSCREEN, SIM_R * 0.95);
        if (sp) G.peds.push(makePedAt(sp.x, sp.y));
      }
    } else {
      G.pedSpawn = 0;
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
      trafficAI.update(c, dt, P);
    }

    G.cars = G.cars.filter(c => c.hp > 0 || c === P.car);
    G.cars = G.cars.filter(c => c === P.car || dist(c, P) < SIM_R * 1.12);
    // Cuántos autos entran acá: en una esquina del mapa o contra el río hay menos calle,
    // y meter los 46 de siempre arma un embotellamiento que no se desarma nunca
    G.carCapT = (G.carCapT || 0) - dt;
    if (G.carCapT <= 0 || !G.carCap) {
      G.carCapT = 1;
      let road = 0, n = 0;
      for (let r = 80; r <= SIM_R; r += 80) {
        for (let a = 0; a < TAU; a += TAU / 16) {
          n++;
          const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
          if (x > 0 && y > 0 && x < WORLD && y < WORLD && onRoad(x, y) && !hitBuilding(x, y, 2)) road++;
        }
      }
      G.carCap = Math.round(CAR_TARGET * clamp(road / n / 0.45, 0.65, 1));
    }
    const carsNear = G.cars.filter(c => c.ai && c.hp > 0).length;
    if (carsNear > G.carCap) {
      // Sobran: se va uno que no se ve y está clavado en una fila (el que anda, sigue)
      G.carTrim = (G.carTrim || 0) + dt;
      if (G.carTrim > 0.25) {
        G.carTrim = 0;
        let pick = null, best = -1;
        for (const c of G.cars) {
          if (!c.ai || c.chase || c.hp <= 0 || c === P.car || c.spd >= 4) continue;
          const d = dist(c, P);
          if (d < OFFSCREEN) continue;
          if (d > best) { best = d; pick = c; }
        }
        if (pick) { trafficAI.release(pick); pick.hp = 0; }
      }
    } else if (carsNear < G.carCap) {
      G.carSpawn = (G.carSpawn || 0) + dt;
      if (G.carSpawn > 0.22) {
        G.carSpawn = 0;
        // Busca un lugar con calle libre: no aparece adentro de una fila ni en una zona
        // ya cargada (en una esquina del mapa o al lado del río hay menos calles para repartir)
        for (let k = 0; k < 4; k++) {
          const sp = ringSpot(OFFSCREEN, SIM_R * 0.95, true);
          if (!sp) continue;
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
      G.carSpawn = 0;
    }

    // Policías a pie
    const wantCops = [0, 2, 4, 6, 9, 12][G.wanted] || 0;
    if (G.cops.filter(c => c.hp > 0).length < wantCops && Math.random() < 1.6 * dt) {
      const cop = makeCop();
      if (cop) G.cops.push(cop);
    }

    // Patrulleros que persiguen
    const wantChase = [0, 0, 1, 2, 3, 5][G.wanted] || 0;
    const chasers = G.cars.filter(c => c.chase && c.hp > 0);
    if (chasers.length < wantChase && Math.random() < 0.9 * dt) {
      G.cars.push(makeChaser());
    }

    for (const c of chasers) {
      const d = dist(c, P);
      // Desvío en curso (ver abajo): sigue ese rumbo un rato antes de volver a apuntar al jugador
      c.detourT = Math.max(0, (c.detourT || 0) - dt);
      const want = c.detourT > 0 ? c.detourAng : Math.atan2(P.y - c.y, P.x - c.x);
      let diff = ((want - c.ang + Math.PI * 3) % TAU) - Math.PI;
      const rate = 2.6 * clamp(Math.abs(c.spd) / 70, 0.3, 1);
      const turn = clamp(diff, -rate * dt, rate * dt);
      c.ang += turn;
      c.steer = lerp(c.steer, clamp(diff, -1, 1), dt * 8);

      const target = d > 70 ? c.cruise : (d > 26 ? 70 : 26);
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
          if (d > OFFSCREEN) c.hp = 0;
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
          if (d > OFFSCREEN) c.hp = 0;
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
      if (!P.dead && !G.busted && P.car && d < 24) {
        if (Math.abs(P.car.spd) < 34) {
          c.bustT = (c.bustT || 0) + dt;
          if (c.bustT > 0.8) this.bust();
        } else {
          c.bustT = 0;
          if (d < 17) {
            const push = Math.atan2(P.y - c.y, P.x - c.x);
            P.car.spd *= 0.93;
            P.car.x += Math.cos(push) * 26 * dt;
            P.car.y += Math.sin(push) * 26 * dt;
            P.car.hp -= 7 * dt;
            G.shake += 22 * dt;
          }
        }
      } else {
        c.bustT = 0;
      }
    }

    G.cars = G.cars.filter(c => !c.chase || (c.hp > 0 && dist(c, P) < SIM_R * 1.3));

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
          G.shake += Math.min(10, dmg * 0.5);
          if (a === P.car) P.hp -= dmg * 0.5;
          if (b === P.car) P.hp -= dmg * 0.5;
          if (aAlive && a.hp <= 0) this.wreckCar(a);
          if (bAlive && b.hp <= 0) this.wreckCar(b);
        }
      }
    }

    for (const c of G.cops) {
      if (c.hp <= 0) continue;
      c.muzzle = Math.max(0, c.muzzle - dt * 14);
      const d = dist(c, P);
      c.ang = Math.atan2(P.y - c.y, P.x - c.x);
      if (d > 34) {
        const s = 52 + G.wanted * 6;
        const nx = c.x + Math.cos(c.ang) * s * dt, ny = c.y + Math.sin(c.ang) * s * dt;
        // La yuta a pie no entra a la villa: se queda en el borde
        const out = !villaAt(c.x, c.y);
        if (!hitBuilding(nx, c.y, c.r) && !(out && villaAt(nx, c.y))) c.x = nx;
        if (!hitBuilding(c.x, ny, c.r) && !(out && villaAt(c.x, ny))) c.y = ny;
        c.walk += (dt * s) / 8;
      }

      if (!P.dead && !G.busted && d < 15) {
        const slow = P.car ? Math.abs(P.car.spd) < 26 : true;
        if (slow) {
          c.bustT += dt;
          if (c.bustT > 0.65) this.bust();
        } else {
          c.bustT = 0;
        }
      } else {
        c.bustT = 0;
      }

      c.cool -= dt;
      if (d < 155 && c.cool <= 0 && !P.dead) {
        c.cool = rnd(0.7, 1.6) / (1 + G.wanted * 0.15);
        const a = c.ang + rnd(-0.16, 0.16);
        c.muzzle = 1;
        G.bullets.push({
          x: c.x + Math.cos(a) * 9,
          y: c.y + Math.sin(a) * 9,
          vx: Math.cos(a) * 335,
          vy: Math.sin(a) * 335,
          life: 0.8,
          mine: false,
        });
      }
    }
    G.cops = G.cops.filter(c => c.hp > 0 && dist(c, P) < 700);

    if (G.wanted > 0) {
      // Adentro de la villa la búsqueda baja el doble de rápido y solo te "ven" de cerca
      const hidden = villaAt(P.x, P.y) && !P.car;
      G.wantCool += hidden ? dt * 2 : dt;
      if (G.cops.some(c => dist(c, P) < (hidden ? 80 : 195))) G.wantCool = 0;
      if (G.wantCool > 12) {
        G.wantCool = 0;
        G.wanted--;
        this.say(G.wanted ? 'BAJO LA BUSQUEDA' : 'LOS PERDISTE');
      }
    }

    for (const pk of G.pickups) {
      pk.t += dt;
      if (dist(pk, P) < 12) {
        if (pk.kind === 'cash') {
          const v = 150 + ((Math.random() * 8) | 0) * 50;
          G.money += v;
          this.say('+$' + v);
        } else if (pk.kind === 'weapon') {
          this.giveWeapon(P, pk.w, pk.ammo);
          this.say(WEAPONS[pk.w].melee ? WEAPONS[pk.w].name : WEAPONS[pk.w].short + ' +' + pk.ammo);
        } else {
          const heal = FOOD_HEAL[pk.food] || 35;
          P.hp = Math.min(P.maxhp, P.hp + heal);
          this.say('+' + heal + ' VIDA (' + pk.food.toUpperCase() + ')');
        }
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

    if (P.hp <= 0 && !P.dead) {
      P.dead = true;
      P.hp = 0;
      this.exitCar();
      boom(P.x, P.y, 32, '170,30,30');
      decal(P.x, P.y, 9, 'rgba(95,12,12,.55)');
      G.shake += 10;
    }

    // Cámara con suavizado y adelanto según velocidad
    const lead = P.car ? clamp(P.car.spd / 195, 0, 1) * 52 : 0;
    const tx = clamp(P.x + Math.cos(P.ang) * lead - RW / 2, 0, WORLD - RW);
    const ty = clamp(P.y + Math.sin(P.ang) * lead - RH / 2, 0, WORLD - RH);
    G.cam.x = lerp(G.cam.x, tx, clamp(rdt * 7, 0, 1));
    G.cam.y = lerp(G.cam.y, ty, clamp(rdt * 7, 0, 1));
  }
}

const game = new Game();

// Exportación para compatibilidad
const say = (t, s) => game.say(t, s);
const startGame = def => game.startGame(def);
const bust = () => game.bust();
const finishBust = () => game.finishBust();
const exitCar = () => game.exitCar();
const wantUp = n => game.wantUp(n);
const update = dt => game.update(dt);
