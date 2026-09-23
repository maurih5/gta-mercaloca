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
    G.pickups = [];
    G.fx = [];
    G.smoke = [];

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
    G.cam.x = clamp(P.x - RW / 2, 0, WORLD - RW);
    G.cam.y = clamp(P.y - RH / 2, 0, WORLD - RH);
    G.busted = 0;
    G.bustT = 0;
    this.say('TE SOLTARON. PERDISTE $' + G.bustFine, 3.4);
  }

  exitCar() {
    const P = G.player;
    if (!P || !P.car) return;
    P.car.ai = true;
    P.car.spd = 0;
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

  update(dt) {
    G.t += dt;
    if (G.msgT > 0) G.msgT -= dt;
    G.shake = Math.max(0, G.shake - dt * 22);
    G.flash = Math.max(0, G.flash - dt * 4);
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
    P.muzzle = Math.max(0, P.muzzle - dt * 14);

    if (P.dead) {
      P.hp = 0;
      if (keys.Enter) this.startGame(P.def);
    } else if (P.car) {
      const car = P.car;
      const acc = (keys.ShiftLeft || keys.ShiftRight) ? 200 : 145;
      if (iy < -0.1) car.spd += acc * dt * Math.min(1, Math.abs(iy));
      else if (iy > 0.1) car.spd -= acc * 1.25 * dt * Math.min(1, Math.abs(iy));
      else car.spd *= (1 - 1.6 * dt);
      car.spd = clamp(car.spd, -70, 195);
      const turning = Math.abs(car.spd) > 4 && Math.abs(ix) > 0.1 ? ix : 0;
      car.steer = lerp(car.steer, turning, dt * 9);
      if (turning) {
        car.ang += turning * 2.3 * dt * (car.spd > 0 ? 1 : -1) * clamp(Math.abs(car.spd) / 90, 0.35, 1);
      }

      // Marcas de derrape
      if (Math.abs(car.spd) > 120 && Math.abs(car.steer) > 0.55) {
        const pxx = Math.cos(car.ang + Math.PI / 2) * 5, pyy = Math.sin(car.ang + Math.PI / 2) * 5;
        decal(car.x + pxx, car.y + pyy, 1.6, 'rgba(15,15,18,.32)');
        decal(car.x - pxx, car.y - pyy, 1.6, 'rgba(15,15,18,.32)');
        if (Math.random() < 0.5) puff(car.x, car.y, '180,180,180', 1, 5);
      }

      const nx = car.x + Math.cos(car.ang) * car.spd * dt;
      const ny = car.y + Math.sin(car.ang) * car.spd * dt;
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

      for (const list of [G.peds, G.cops]) {
        for (const e of list) {
          if (Math.abs(car.spd) > 40 && e.hp > 0 && dist(car, e) < 14) {
            e.hp -= Math.abs(car.spd) / 6;
            boom(e.x, e.y, 10, '170,30,30');
            decal(e.x, e.y, rnd(3, 6), 'rgba(90,12,12,.45)');
            if (e.hp <= 0) this.wantUp(1);
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
      P.run = lerp(P.run, running ? 1 : 0, dt * 8);
      const m = Math.hypot(ix, iy) || 1;
      const nx = P.x + (ix / m) * spd * dt;
      const ny = P.y + (iy / m) * spd * dt;
      if (!hitBuilding(nx, P.y, P.r)) P.x = clamp(nx, 6, WORLD - 6);
      if (!hitBuilding(P.x, ny, P.r)) P.y = clamp(ny, 6, WORLD - 6);
      if (ix || iy) {
        P.ang = Math.atan2(iy, ix);
        P.walk += (dt * spd) / 8;
      }

      if (keys.KeyE && P.cool <= 0) {
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
    P.cool -= dt;

    if (keys.Space && !P.dead && P.cool <= 0) {
      P.cool = P.car ? 0.17 : 0.21;
      const a = P.ang + rnd(-0.055, 0.055);
      G.bullets.push({
        x: P.x + Math.cos(a) * 10,
        y: P.y + Math.sin(a) * 10,
        vx: Math.cos(a) * 430,
        vy: Math.sin(a) * 430,
        life: 0.7,
        mine: true,
      });
      P.muzzle = 1;
      G.shake += 1.1;
      boom(P.x + Math.cos(a) * 11, P.y + Math.sin(a) * 11, 3, '255,225,150');
      if (G.wanted < 1) this.wantUp(1);
    }

    for (const b of G.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (hitBuilding(b.x, b.y, 1)) {
        b.life = 0;
        boom(b.x, b.y, 4, '220,220,200');
        continue;
      }
      if (b.mine) {
        for (const list of [G.cops, G.peds]) {
          for (const e of list) {
            if (e.hp > 0 && dist(b, e) < 7) {
              e.hp -= 22;
              b.life = 0;
              boom(e.x, e.y, 7, '190,35,35');
              if (e.hp <= 0) {
                decal(e.x, e.y, rnd(4, 7), 'rgba(95,12,12,.5)');
                this.wantUp(e.kind === 'cop' ? 2 : 1);
                G.money += e.kind === 'cop' ? 120 : 40;
              }
            }
          }
        }
      } else if (!P.dead && dist(b, P) < (P.car ? 12 : 7)) {
        b.life = 0;
        G.shake += 1.6;
        if (P.car) {
          P.car.hp -= 7;
          P.hp -= 2;
        } else {
          P.hp -= 7;
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
        const freeX = !pedBlocked(nx, p.y, p.r), freeY = !pedBlocked(p.x, ny, p.r);
        if (freeX) p.x = nx;
        if (freeY) p.y = ny;

        if (freeX || freeY) {
          p.walk += (dt * s) / 8;
          p.stuck = 0;
          if (!freeX || !freeY) {
            p.ang = Math.atan2(freeY ? Math.sign(stepY) : 0, freeX ? Math.sign(stepX) : 0);
          }
          if (!scared && !onSidewalk(p.x, p.y)) {
            const t = toSidewalk(p.x, p.y);
            if (!pedBlocked(t.x, t.y, 5)) {
              p.x = lerp(p.x, t.x, dt * 4.5);
              p.y = lerp(p.y, t.y, dt * 4.5);
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
        p.x -= Math.cos(p.ang) * s * dt;
        p.y -= Math.sin(p.ang) * s * dt;
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

    // Tráfico de autos civiles
    for (const c of G.cars) {
      if (!c.ai || c.chase || c.hp <= 0) continue;
      c.horn = Math.max(0, c.horn - dt);

      const fwx = Math.cos(c.ang), fwy = Math.sin(c.ang);
      const ahead = c.w * 0.6 + 9 + Math.abs(c.spd) * 0.22;
      const inFront = (ox2, oy2, halfW) => {
        const rx2 = ox2 - c.x, ry2 = oy2 - c.y;
        const fwd = rx2 * fwx + ry2 * fwy;
        const lat = Math.abs(-rx2 * fwy + ry2 * fwx);
        return fwd > 0 && fwd < ahead && lat < halfW;
      };

      let block = false, queued = false;
      for (const o of G.cars) {
        if (o === c || o.hp <= 0) continue;
        const sameWay = (Math.cos(c.ang) * Math.cos(o.ang) + Math.sin(c.ang) * Math.sin(o.ang)) > 0.3;
        if (!sameWay) continue;
        if (inFront(o.x, o.y, (c.h + o.h) * 0.42)) {
          block = true;
          if ((o.waitLight || 0) > 0 || o.queued) queued = true;
          break;
        }
      }
      c.queued = queued;

      if (!block && !P.dead) {
        const pw = P.car ? (c.h + P.car.h) * 0.45 : c.h * 0.5;
        if (inFront(P.x, P.y, pw)) {
          block = true;
          if (!P.car && c.horn <= 0 && Math.random() < 0.5) c.horn = 1.1;
        }
      }

      let redStop = false;
      const LA = lightAhead(c.x, c.y, c.ang);
      if (LA && LA.fwd > -2 && LA.fwd < 46) {
        const st = lightState(LA.L, LA.horiz);
        if (st === 'rojo' || (st === 'amarillo' && LA.fwd > Math.abs(c.spd) * 0.42)) redStop = true;
      }

      if (redStop) {
        const brake = LA.fwd < 3 ? 6 : 3.0;
        c.spd += (0 - c.spd) * brake * dt;
        if (LA.fwd < 1.5 && c.spd < 6) c.spd = 0;
        c.waitLight = (c.waitLight || 0) + dt;
        c.stopT = 0;
      } else if (block) {
        c.spd += (0 - c.spd) * 3.4 * dt;
        c.waitLight = 0;
        if (queued) c.stopT = 0;
        else c.stopT += dt;
      } else {
        c.spd += (c.cruise - c.spd) * 0.75 * dt;
        c.stopT = 0;
        c.waitLight = 0;
      }

      if (c.stopT > 3.5) {
        const R2 = c.h * 0.5 + 1;
        for (const turn of [Math.PI / 2, -Math.PI / 2]) {
          const L2 = laneSnap(c.x, c.y, c.ang + turn);
          const ax = L2.x + Math.cos(L2.ang) * 20, ay = L2.y + Math.sin(L2.ang) * 20;
          if (!hitBuilding(ax, ay, R2) && ax > 10 && ay > 10 && ax < WORLD - 10 && ay < WORLD - 10) {
            c.x = L2.x;
            c.y = L2.y;
            c.ang = L2.ang;
            c.spd = Math.max(16, c.cruise * 0.35);
            c.turned = true;
            break;
          }
        }
        c.stopT = 0;
      }

      const CR = c.h * 0.5 + 1;
      const carBlocked = (x2, y2) => hitBuilding(x2, y2, CR) || hitCarBlock(x2, y2, CR) || x2 < 10 || y2 < 10 || x2 > WORLD - 10 || y2 > WORLD - 10;
      const nx = c.x + Math.cos(c.ang) * c.spd * dt;
      const ny = c.y + Math.sin(c.ang) * c.spd * dt;

      if (carBlocked(nx, ny)) {
        const probe = Math.max(c.w, 18);
        let fixed = false;
        const opts = Math.random() < 0.5
          ? [Math.PI / 2, -Math.PI / 2, Math.PI]
          : [-Math.PI / 2, Math.PI / 2, Math.PI];
        for (const turn of opts) {
          const na = c.ang + turn;
          const L = laneSnap(c.x, c.y, na);
          if (!carBlocked(L.x + Math.cos(L.ang) * probe, L.y + Math.sin(L.ang) * probe) && !carBlocked(L.x, L.y)) {
            c.x = L.x;
            c.y = L.y;
            c.ang = L.ang;
            c.spd = Math.max(16, c.cruise * 0.35);
            c.turned = true;
            fixed = true;
            break;
          }
        }
        if (!fixed) {
          if (dist(c, P) > OFFSCREEN) {
            c.hp = 0;
          } else {
            c.ang += Math.PI;
            const L = laneSnap(c.x, c.y, c.ang);
            c.x = L.x;
            c.y = L.y;
            c.ang = L.ang;
            c.spd = 16;
          }
        }
      } else {
        c.x = nx;
        c.y = ny;
      }

      const ob = getObelisco();
      // Distancia al obelisco, no celda de grilla: el centro de la rotonda no cae simetrico
      // dentro de su celda (la avenida es mas ancha que ROAD), asi que el anillo se sale
      // del cuadrado de la celda por un lado. Un gate por distancia evita que un auto
      // todavia circulando el anillo "salga" de la plaza por error y reinicie ringArc.
      const inPlazaCell = !!ob && dist(c, { x: ob.x + ob.w / 2, y: ob.y + ob.h / 2 }) < ROTONDA_R + 24;
      const ringMid = (ROTONDA_ISLAND_R + ROTONDA_R) / 2;
      if (inPlazaCell && ob && (c.inRing || inRotondaRing(c.x, c.y))) {
        // Circulando la rotonda: navega tangente al circulo (sentido antihorario, mano derecha).
        const ocx = ob.x + ob.w / 2, ocy = ob.y + ob.h / 2;
        const rad = Math.atan2(c.y - ocy, c.x - ocx);
        const tangent = rad - Math.PI / 2;
        c.inRing = true;
        c.turned = false;
        c.ringArc = (c.ringArc || 0) + Math.abs(dt * c.spd) / ringMid;
        // Mantiene el radio pegado al carril medio del anillo.
        const d = Math.hypot(c.x - ocx, c.y - ocy);
        const dClamped = clamp(d, ROTONDA_ISLAND_R + 2, ROTONDA_R - 2);
        c.x = ocx + Math.cos(rad) * lerp(d, ringMid, dt * 2 + (dClamped !== d ? 1 : 0));
        c.y = ocy + Math.sin(rad) * lerp(d, ringMid, dt * 2 + (dClamped !== d ? 1 : 0));
        // Sale por la primer salida cardinal alineada, despues de dar al menos un buen tramo de vuelta.
        const cardinals = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        const aligned = cardinals.some(a => Math.abs(((tangent - a + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.12);
        if (c.ringArc > Math.PI * 0.9 && aligned) {
          c.inRing = false;
          c.turned = true;
          const exitAng = cardinals.reduce((best, a) =>
            Math.abs(((tangent - a + Math.PI) % TAU + TAU) % TAU - Math.PI) <
            Math.abs(((tangent - best + Math.PI) % TAU + TAU) % TAU - Math.PI) ? a : best, 0);
          const L = laneSnap(c.x, c.y, exitAng);
          c.x = L.x;
          c.y = L.y;
          c.ang = L.ang;
        } else {
          c.ang = tangent;
        }
      } else if (inPlazaCell && !c.inRing && !c.turned) {
        // Llega a la bocacalle ancha de la plaza: entra siempre a la rotonda (no cruza derecho).
        c.turned = true;
        c.inRing = true;
        c.ringArc = 0;
      } else if (!inPlazaCell) {
        c.inRing = false;
        c.ringArc = 0;
      }

      // Diagonal Norte: mientras el auto esta en la franja, mantiene el heading fijo
      // de la diagonal (el sentido mas cercano a su angulo actual) en vez de cardinal.
      const inDiag = inDiagonalBand(c.x, c.y);
      if (inDiag) {
        const fwdDot = Math.cos(c.ang) * DIAG_UX + Math.sin(c.ang) * DIAG_UY;
        c.ang = fwdDot >= 0 ? DIAG_ANG : DIAG_ANG + Math.PI;
        c.turned = true;
      } else if (c.wasDiag) {
        const L = laneSnap(c.x, c.y, c.ang);
        c.x = L.x; c.y = L.y; c.ang = L.ang;
        c.turned = false;
      }
      c.wasDiag = inDiag;

      const ox = ((c.x % CELL) + CELL) % CELL, oy = ((c.y % CELL) + CELL) % CELL;
      const rw = Math.floor(c.x / CELL) === PLAZA_CX ? AVENUE_ROAD : ROAD;
      const rh = Math.floor(c.y / CELL) === PLAZA_CY ? AVENUE_ROAD : ROAD;
      const atCross = ox < rw && oy < rh;
      if (inPlazaCell || inDiag) {
        // ya resuelto arriba (rotonda / diagonal), no aplica el criterio de bocacalle comun
      } else if (atCross && !c.turned) {
        c.turned = true;
        if (Math.random() < 0.34) {
          c.ang += Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
          const L = laneSnap(c.x, c.y, c.ang);
          c.x = L.x;
          c.y = L.y;
          c.ang = L.ang;
        }
      } else if (!atCross) {
        c.turned = false;
        const L = laneSnap(c.x, c.y, c.ang);
        if (Math.abs(Math.cos(c.ang)) > 0.5) c.y = lerp(c.y, L.y, dt * 3);
        else c.x = lerp(c.x, L.x, dt * 3);
      }

      if (c.stopT > 9 && dist(c, P) > OFFSCREEN) c.hp = 0;
    }

    G.cars = G.cars.filter(c => c.hp > 0 || c === P.car);
    G.cars = G.cars.filter(c => c === P.car || dist(c, P) < SIM_R * 1.12);
    const carsNear = G.cars.filter(c => c.ai && c.hp > 0).length;
    if (carsNear < CAR_TARGET) {
      G.carSpawn = (G.carSpawn || 0) + dt;
      if (G.carSpawn > 0.22) {
        G.carSpawn = 0;
        const sp = ringSpot(OFFSCREEN, SIM_R * 0.95, true);
        if (sp) G.cars.push(makeCar(sp.x, sp.y));
      }
    } else {
      G.carSpawn = 0;
    }

    // Policías a pie
    const wantCops = [0, 2, 4, 6, 9, 12][G.wanted] || 0;
    if (G.cops.filter(c => c.hp > 0).length < wantCops && Math.random() < 1.6 * dt) {
      G.cops.push(makeCop());
    }

    // Patrulleros que persiguen
    const wantChase = [0, 0, 1, 2, 3, 5][G.wanted] || 0;
    const chasers = G.cars.filter(c => c.chase && c.hp > 0);
    if (chasers.length < wantChase && Math.random() < 0.9 * dt) {
      G.cars.push(makeChaser());
    }

    for (const c of chasers) {
      const d = dist(c, P);
      const want = Math.atan2(P.y - c.y, P.x - c.x);
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
        const aClear = !hitBuilding(halfAx, halfAy, (a.w + a.h) / 4);
        const bClear = !hitBuilding(halfBx, halfBy, (b.w + b.h) / 4);
        if (aClear && bClear) {
          a.x = halfAx; a.y = halfAy;
          b.x = halfBx; b.y = halfBy;
        } else if (aClear) {
          a.x -= ux * overlap;
          a.y -= uy * overlap;
        } else if (bClear) {
          b.x += ux * overlap;
          b.y += uy * overlap;
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
        if (!hitBuilding(nx, c.y, c.r)) c.x = nx;
        if (!hitBuilding(c.x, ny, c.r)) c.y = ny;
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
      G.wantCool += dt;
      if (G.cops.some(c => dist(c, P) < 195)) G.wantCool = 0;
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
        } else {
          const heal = FOOD_HEAL[pk.food] || 35;
          P.hp = Math.min(P.maxhp, P.hp + heal);
          this.say('+' + heal + ' VIDA (' + pk.food.toUpperCase() + ')');
        }
        boom(pk.x, pk.y, 8, pk.kind === 'cash' ? '120,220,120' : '230,90,90');
        Object.assign(pk, makePickup());
      }
    }

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
    G.cam.x = lerp(G.cam.x, tx, clamp(dt * 7, 0, 1));
    G.cam.y = lerp(G.cam.y, ty, clamp(dt * 7, 0, 1));
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
