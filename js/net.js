/* =========================================================================
   GTA MERCALOCA - Red: multijugador online P2P (WebRTC)
   ========================================================================= */

// El que crea la sala (host) simula todo, como jugando solo con varios jugadores en
// G.players. Los demás (clientes) no simulan nada: mandan sus controles (P.ctl) y
// reciben del host una foto del mundo 20 veces por segundo, con los efectos que pasaron
// en el medio (chispas, sonidos, mensajes). Entre foto y foto el cliente desliza cada
// cosa hacia donde la mandó el host, así se ve suave.
//
// La conexión es WebRTC directo entre los navegadores, con Trystero: la señalización
// (cómo se encuentran) va por relays públicos de Nostr, sin servidor propio, así que
// funciona en GitHub Pages. Todos arman la misma ciudad porque el host les pasa su semilla.

const NET_APP = 'gta-mercaloca';
const NET_LIB = 'https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm';
const NET_SNAP = 1 / 20;                   // cada cuánto manda el host la foto del mundo
const NET_CTL = 1 / 10;                    // los controles se mandan al cambiar, y al menos cada tanto
const NET_VIEW_X = 400, NET_VIEW_Y = 300;  // alrededor de cada jugador se manda todo (más que la pantalla)
const NET_FIND = 25;                       // segundos buscando al host de la sala
const NET_TIMEOUT = 10;                    // segundos sin fotos del host: se cortó
const NET_FX_MAX = 800;                    // tope de efectos por foto
const NET_MSGS = ['quien', 'info', 'hola', 'bienv', 'chau', 'ctl', 'snap', 'compra'];
const SALA_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SALA_LEN = 5;
const CTL_KEYS = ['run', 'fire', 'use', 'next', 'porro', 'respawn'];
const NET_CTL_OLD = 0.6;                   // controles sin renovar: el jugador se queda quieto

const newSalaCode = () => Array.from({ length: SALA_LEN }, () => SALA_ABC[(Math.random() * SALA_ABC.length) | 0]).join('');
const validSala = c => typeof c === 'string' && new RegExp('^[' + SALA_ABC + ']{' + SALA_LEN + '}$').test(c);

// Los controles viajan como [x, y, botones, arma]
function packCtl(c) {
  let bits = 0;
  CTL_KEYS.forEach((k, i) => { if (c[k]) bits |= 1 << i; });
  return [Math.round(c.x * 100), Math.round(c.y * 100), bits, c.slot | 0];
}

function unpackCtl(a) {
  const c = idleControls();
  if (!Array.isArray(a)) return c;
  c.x = clamp((+a[0] || 0) / 100, -1, 1);
  c.y = clamp((+a[1] || 0) / 100, -1, 1);
  CTL_KEYS.forEach((k, i) => { c[k] = !!(a[2] & (1 << i)); });
  c.slot = clamp(a[3] | 0, 0, 9);
  return c;
}

// La conexión de verdad: una sala de Trystero. Devuelve un transporte con send / onMsg /
// onJoin / onLeave / leave (los tests arman uno igual en memoria, sin red)
async function trysteroTransport(code) {
  const lib = await import(NET_LIB);
  const room = lib.joinRoom({ appId: NET_APP }, 'sala-' + code);
  const t = { onMsg: null, onJoin: null, onLeave: null };
  const acts = {};
  for (const type of NET_MSGS) {
    const a = room.makeAction(type);
    a.onMessage = (data, ctx) => { if (t.onMsg) t.onMsg(type, data, ctx && ctx.peerId); };
    acts[type] = a;
  }
  room.onPeerJoin = id => { if (t.onJoin) t.onJoin(id); };
  room.onPeerLeave = id => { if (t.onLeave) t.onLeave(id); };
  t.send = (type, data, to) => acts[type].send(data, to ? { target: to } : undefined);
  t.leave = () => room.leave();
  return t;
}

const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const angTo = (to, from) => ((to - from + Math.PI * 3) % TAU + TAU) % TAU - Math.PI;
const packInv = inv => {
  const o = {};
  for (const k in inv) o[k] = inv[k] === Infinity ? -1 : inv[k];
  return o;
};
const unpackInv = o => {
  const inv = {};
  for (const k in o) inv[k] = o[k] === -1 ? Infinity : o[k];
  return inv;
};

class NetManager {
  constructor() {
    this.role = null;              // null: sin red · 'host' · 'client'
    this.code = '';
    this.t = null;                 // transporte
    this.makeTransport = trysteroTransport;
    this.onEnter = null;           // cliente: ya está adentro (llegó la primera foto con él)
    this.onLost = null;            // cliente: se cortó (texto para mostrar)
    // Host
    this.peers = new Map();        // peerId -> { P, known, ev }
    this.out = [];                 // efectos para todos desde la última foto
    this.snapT = 0;
    this.nid = 0;
    // Cliente
    this.hostId = null;
    this.myId = null;
    this.ents = {};
    this.ctlT = 0;
    this.lastCtl = '';
    this.quiet = 0;
    this.gone = false;
  }

  get hosting() {
    return this.role === 'host';
  }

  get client() {
    return this.role === 'client';
  }

  send(type, data, to) {
    if (!this.t) return;
    try {
      const r = this.t.send(type, data, to);
      if (r && r.catch) r.catch(() => {});
    } catch (e) {
      // el otro ya se fue: no pasa nada
    }
  }

  leave() {
    if (!this.t) return;
    this.send('chau', 1);
    try { this.t.leave(); } catch (e) { /* ya estaba cerrada */ }
    this.t = null;
  }

  // ---- Host ----

  // Abre la sala con la partida que ya está corriendo. Devuelve el código.
  async host(code = newSalaCode()) {
    this.code = code;
    this.role = 'host';
    this.peers.clear();
    this.out = [];
    try {
      this.t = await this.makeTransport(code);
    } catch (e) {
      this.role = null;
      throw e;
    }
    this.t.onMsg = (type, d, from) => this.onHostMsg(type, d, from);
    this.t.onLeave = id => this.dropPeer(id);
    return code;
  }

  onHostMsg(type, d, from) {
    const peer = this.peers.get(from);
    if (type === 'quien') {
      this.send('info', { seed: world.seed, v: VERSION, n: G.players.length, max: MAX_PLAYERS }, from);
    } else if (type === 'hola') {
      if (!peer) this.welcome(from, d || {});
    } else if (!peer) {
      return;
    } else if (type === 'ctl') {
      // Lo que se apretó queda marcado hasta el próximo frame, aunque ya lo haya soltado:
      // si no, un toque corto que llega junto con el soltar se pierde
      const c = unpackCtl(d);
      peer.P.net.ctl = c;
      peer.P.net.at = Date.now();
      for (const k of CTL_KEYS) if (c[k]) peer.P.net.tap[k] = true;
    } else if (type === 'compra') {
      this.sell(peer.P, d || {});
    } else if (type === 'chau') {
      this.dropPeer(from);
    }
  }

  welcome(from, d) {
    const no = d.v !== VERSION ? 'VERSION' : G.state !== 'play' ? 'CERRADA' : G.players.length >= MAX_PLAYERS ? 'LLENA' : null;
    const P = no ? null : addPlayer(CREW[d.crew] || CREW[0]);
    if (!P) {
      this.send('bienv', { no: no || 'LLENA' }, from);
      return;
    }
    P.peer = from;
    P.net = { ctl: idleControls(), tap: {}, at: 0 };
    this.peers.set(from, { P, known: new Set(), ev: [] });
    G.paused = false; // con otro jugando no hay pausa
    this.send('bienv', { id: P.id, code: this.code }, from);
    this.sayAll(P.def.name + ' SE SUMO AL BARRIO');
  }

  dropPeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    if (G.players.includes(peer.P)) removePlayer(peer.P);
    this.sayAll(peer.P.def.name + ' SE FUE DEL BARRIO');
  }

  sayAll(t) {
    say(t, 3);
    this.fx(['m', t, 3]);
  }

  // Los controles que llegaron por la red, para este frame (game.update)
  applyControls() {
    if (!this.hosting) return;
    const now = Date.now();
    for (const { P } of this.peers.values()) {
      // Si dejaron de llegar (pestaña escondida, red trabada) no se queda apretando nada
      const c = now - (P.net.at || 0) > NET_CTL_OLD * 1000 ? idleControls() : { ...P.net.ctl };
      for (const k in P.net.tap) c[k] = true;
      P.net.tap = {};
      P.ctl = c;
    }
  }

  // Compra de un cliente: la hace el host, si de verdad está en la puerta del local
  sell(P, d) {
    const K = SHOP_KINDS[d.k];
    if (!K || !inPlay(P) || P.car) return;
    const ok = d.k === 'armeria' ? P.nearShop && P.wanted < 2 : P.nearTranza;
    if (!ok) {
      this.to(P, ['sm', 'YA NO ESTAS EN EL LOCAL', true]);
      return;
    }
    const r = shop.purchase(P, K.items[d.i | 0]);
    if (r) this.to(P, ['sm', r.msg, !!r.bad]);
  }

  // Un efecto que tienen que ver todos (chispas, humo, manchas, sonidos, temblor)
  fx(e) {
    if (!this.hosting || !this.peers.size) return;
    this.out.push(e.map(v => (typeof v === 'number' ? r1(v) : v)));
    if (this.out.length > NET_FX_MAX) this.out.splice(0, this.out.length - NET_FX_MAX);
  }

  // Algo que le pasa solo a P (mensaje, temblor, sonido, tienda): va a su pantalla
  to(P, e) {
    if (!this.hosting || !P || !P.peer) return;
    const peer = this.peers.get(P.peer);
    if (peer && peer.ev.length < NET_FX_MAX) peer.ev.push(e);
  }

  tick(dt) {
    if (this.hosting) {
      this.snapT += dt;
      if (this.snapT < NET_SNAP) return;
      this.snapT = 0;
      if (G.state === 'play') {
        for (const [id, peer] of this.peers) this.send('snap', this.snapshot(peer), id);
      }
      this.out = [];
    } else if (this.client && G.state !== 'play') {
      this.watch(dt);
    }
  }

  // La foto del mundo para un jugador: lo que tiene cerca con detalle, y del resto del
  // mapa solo lo que sale en el radar y el mapa (yuta, famosos, fierros, guita)
  snapshot(peer) {
    const P = peer.P, known = peer.known, seen = new Set();
    const near = o => Math.abs(o.x - P.x) < NET_VIEW_X && Math.abs(o.y - P.y) < NET_VIEW_Y;
    const id = o => o.nid || (o.nid = ++this.nid);
    // Cómo es (color, cara, tamaño) se manda una sola vez, la primera foto en que aparece
    const look = (key, fn) => {
      seen.add(key);
      return known.has(key) ? 0 : fn();
    };
    const driven = new Set(G.players.map(q => q.car).filter(Boolean));

    const cars = G.cars.filter(c => driven.has(c) || (c.hp > 0 && (c.chase || near(c)))).map(c => [
      id(c), r1(c.x), r1(c.y), r2(c.ang), r1(c.spd), r2(c.steer || 0), Math.round(c.hp),
      (c.cop ? 1 : 0) | (c.chase ? 2 : 0) | (c.brake ? 4 : 0), c.signal || 0,
      look('c' + c.nid, () => [c.col, c.w, c.h]),
    ]);
    const peds = G.peds.filter(p => p.hp > 0 && !p.inside && (p.famous || near(p))).map(p => [
      id(p), r1(p.x), r1(p.y), r2(p.ang), r2(p.fade),
      look('p' + p.nid, () => [p.face, p.shirt, p.pants, p.famous ? p.famous.id : 0]),
      p.famous && p.lineT > 0 ? [r2(p.lineT), p.line] : 0,
    ]);
    const cops = G.cops.filter(c => c.hp > 0).map(c => [id(c), r1(c.x), r1(c.y), r2(c.ang), r2(c.muzzle)]);
    const tranzas = G.tranzas.map(t => [r1(t.x), r1(t.y), r2(t.ang), r2(t.muzzle), t.hp > 0 ? 1 : 0]);
    const bullets = G.bullets.filter(near).map(b => [id(b), r1(b.x), r1(b.y), Math.round(b.vx), Math.round(b.vy), b.owner ? 1 : 0]);
    const nades = G.nades.filter(near).map(n => [id(n), r1(n.x), r1(n.y), r1(n.z), Math.round(n.vx), Math.round(n.vy), r2(n.t)]);
    const pickups = G.pickups.map(pk => [id(pk), r1(pk.x), r1(pk.y), pk.kind, pk.food || pk.w || 0]);
    const players = G.players.map(q => [
      q.id, CREW.indexOf(q.def), r1(q.x), r1(q.y), r2(q.ang), Math.ceil(q.hp), q.maxhp,
      q.car ? id(q.car) : 0, q.wpn, r2(q.muzzle), r2(q.swing),
      (q.dead ? 1 : 0) | (q.busted ? 2 : 0) | (q.healing ? 4 : 0) | (q.nearShop ? 8 : 0) | (q.nearTranza ? 16 : 0),
      r1(q.bustT), r1(q.healT), q.money, q.wanted, Math.round(q.armor), q.porros, r1(q.slowmo), q.bustFine,
      q === P ? packInv(q.inv) : 0,
    ]);

    // Los efectos de lejos no le interesan (salvo las manchas, que quedan en el piso)
    const R = Math.max(NET_VIEW_X, AUDIO_R) * 1.4;
    const ev = this.out.filter(e => e[0] === 'd' || typeof e[1] !== 'number' || Math.hypot(e[1] - P.x, e[2] - P.y) < R)
      .concat(peer.ev);
    peer.ev = [];
    peer.known = seen;

    return {
      t: r2(G.t), c: cars, p: peds, k: cops, z: tranzas, va: villas.map(v => r1(v.angry)),
      b: bullets, g: nades, u: pickups, j: players, e: ev,
    };
  }

  // ---- Cliente ----

  // Antes de armar la ciudad: entra a la sala y le pregunta al host su semilla y su versión
  probe(code) {
    this.code = code;
    this.role = 'client';
    this.gone = false;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error('NADIE')), NET_FIND * 1000);
      Promise.resolve(this.makeTransport(code)).then(t => {
        this.t = t;
        t.onMsg = (type, d, from) => {
          if (this.hostId) {
            this.onClientMsg(type, d, from);
          } else if (type === 'info' && d) {
            this.hostId = from;
            clearTimeout(timer);
            res(d);
          }
        };
        t.onJoin = id => { if (!this.hostId) this.send('quien', 1, id); };
        t.onLeave = id => { if (id === this.hostId) this.lost('EL QUE ARMO LA SALA SE FUE'); };
      }, e => {
        clearTimeout(timer);
        rej(e);
      });
    });
  }

  // Ya con la ciudad armada y el personaje elegido: pide entrar
  join(crew) {
    this.myId = null;
    this.quiet = 0;
    G.state = 'net';
    this.send('hola', { crew, v: VERSION }, this.hostId);
  }

  onClientMsg(type, d, from) {
    if (from !== this.hostId || this.gone) return;
    if (type === 'bienv') {
      if (d.no) {
        this.lost({ VERSION: 'ESA SALA JUEGA OTRA VERSION DEL JUEGO', LLENA: 'LA SALA ESTA LLENA' }[d.no] || 'NO SE PUEDE ENTRAR AHORA');
        return;
      }
      this.myId = d.id;
      this.quiet = 0;
      Object.assign(G, { cars: [], peds: [], cops: [], bullets: [], nades: [], pickups: [], fx: [], smoke: [], players: [], me: null });
      G.tranzas = [];
      for (const v of villas) v.spots.forEach((sp, i) => G.tranzas.push(makeTranza(v, sp, i)));
      this.ents = {};
    } else if (type === 'snap' && this.myId !== null) {
      this.applySnap(d);
    } else if (type === 'chau') {
      this.lost('EL QUE ARMO LA SALA LA CERRO');
    }
  }

  lost(msg) {
    if (this.gone) return;
    this.gone = true;
    this.leave();
    G.state = 'net';
    if (this.onLost) this.onLost(msg);
  }

  watch(dt) {
    if (this.myId === null || this.gone) return;
    this.quiet += dt;
    if (this.quiet > NET_TIMEOUT) this.lost('SE CORTO LA CONEXION CON LA SALA');
  }

  buy(kind, i) {
    this.send('compra', { k: kind, i }, this.hostId);
  }

  // Lista nueva a partir de las filas de la foto: reusa los objetos que ya estaban (para
  // deslizarlos) y crea los nuevos
  sync(key, rows, make, set) {
    const old = this.ents[key] || new Map(), now = new Map(), list = [];
    for (const a of rows) {
      const o = old.get(a[0]) || make(a);
      set(o, a);
      now.set(a[0], o);
      list.push(o);
    }
    this.ents[key] = now;
    return list;
  }

  // Hacia dónde tiene que ir (el cliente lo desliza hasta ahí en cada frame)
  aim(o, x, y, ang) {
    if (o.tx === undefined) {
      o.x = x;
      o.y = y;
      o.ang = ang;
    }
    o.tx = x;
    o.ty = y;
    o.ta = ang;
  }

  applySnap(s) {
    this.quiet = 0;
    G.t = Math.abs(s.t - G.t) > 2 ? s.t : G.t + (s.t - G.t) * 0.3;

    G.cars = this.sync('c', s.c, a => {
      const L = a[9] || ['#888888', 22, 10];
      return { kind: 'car', col: L[0], w: L[1], h: L[2], model: {}, spd: 0, steer: 0, hp: 100 };
    }, (c, a) => {
      this.aim(c, a[1], a[2], a[3]);
      c.spd = a[4];
      c.steer = a[5];
      c.hp = a[6];
      c.cop = !!(a[7] & 1);
      c.chase = !!(a[7] & 2);
      c.brake = !!(a[7] & 4);
      c.signal = a[8];
    });
    const cars = this.ents.c;

    G.peds = this.sync('p', s.p, a => {
      const L = a[5] || ['ped0', '#888888', '#333333', 0];
      const p = { kind: 'ped', face: L[0], shirt: L[1], pants: L[2], r: 5, hp: 30, walk: 0, fade: 1, inside: null };
      const f = L[3] && FAMOUS.find(d => d.id === L[3]);
      if (f) Object.assign(p, { famous: f, face: 'famous-' + f.id, line: '', lineT: 0 });
      return p;
    }, (p, a) => {
      this.aim(p, a[1], a[2], a[3]);
      p.fade = a[4];
      if (a[6]) {
        p.lineT = a[6][0];
        p.line = a[6][1];
      }
    });

    G.cops = this.sync('k', s.k, () => ({ kind: 'cop', r: 5, hp: 45, walk: 0, muzzle: 0 }), (c, a) => {
      this.aim(c, a[1], a[2], a[3]);
      c.muzzle = a[4];
    });

    s.z.forEach((a, i) => {
      const t = G.tranzas[i];
      if (!t) return;
      this.aim(t, a[0], a[1], a[2]);
      t.muzzle = a[3];
      t.hp = a[4] ? 60 : 0;
    });
    s.va.forEach((v, i) => { if (villas[i]) villas[i].angry = v; });

    G.bullets = this.sync('b', s.b, () => ({}), (b, a) => {
      b.x = a[1];
      b.y = a[2];
      b.vx = a[3];
      b.vy = a[4];
      b.owner = a[5] ? true : null;
    });
    G.nades = this.sync('g', s.g, () => ({}), (n, a) => {
      n.x = a[1];
      n.y = a[2];
      n.z = a[3];
      n.vx = a[4];
      n.vy = a[5];
      n.t = a[6];
    });
    G.pickups = this.sync('u', s.u, () => ({ t: 0 }), (pk, a) => {
      pk.x = a[1];
      pk.y = a[2];
      pk.kind = a[3];
      pk.food = a[3] === 'hp' ? a[4] : null;
      pk.w = a[3] === 'weapon' ? a[4] : undefined;
    });

    G.players = this.sync('j', s.j, a => makePlayer(CREW[a[1]] || CREW[0], a[0]), (q, a) => {
      this.aim(q, a[2], a[3], a[4]);
      q.hp = a[5];
      q.maxhp = a[6];
      q.car = (a[7] && cars.get(a[7])) || null;
      q.wpn = a[8];
      q.muzzle = a[9];
      q.swing = a[10];
      q.dead = !!(a[11] & 1);
      q.busted = a[11] & 2 ? 1 : 0;
      q.healing = a[11] & 4 ? 1 : 0;
      q.nearShop = a[11] & 8 ? true : null;
      q.nearTranza = a[11] & 16 ? true : null;
      q.bustT = a[12];
      q.healT = a[13];
      q.money = a[14];
      q.wanted = a[15];
      q.armor = a[16];
      q.porros = a[17];
      q.slowmo = a[18];
      q.bustFine = a[19];
      if (a[20]) q.inv = unpackInv(a[20]);
    });

    const me = G.players.find(q => q.id === this.myId) || null;
    const entering = !G.me && me;
    G.me = me;
    if (entering) {
      G.state = 'play';
      G.mapOpen = false;
      G.mapZoom = MAP_MIN_ZOOM;
      game.snapCam();
      if (this.onEnter) this.onEnter();
    }

    for (const e of s.e || []) this.playFx(e);
    if (G.shopOpen && typeof shop !== 'undefined') shop.render();
  }

  playFx(e) {
    switch (e[0]) {
      case 'b': boom(e[1], e[2], e[3], e[4], e[5] ?? 1); break;
      case 'p': puff(e[1], e[2], e[3], e[4] ?? 1, e[5] ?? 14); break;
      case 'd': decal(e[1], e[2], e[3], e[4]); break;
      case 's': sound.play(e[3], e[1], e[2], e[4] ?? 0); break;
      case 'S': if (G.me) sound.play(e[1], G.me.x, G.me.y); break;
      case 'm': say(e[1], e[2]); break;
      case 'k': G.shake += e[1]; break;
      case 'K': game.shakeAt(e[1], e[2], e[3]); break;
      case 'f': game.flashFor(G.me, e[1]); break;
      case 'F': game.flashAt(e[1], e[2], e[3]); break;
      case 'shop': if (G.me && !G.me.dead) shop.open(e[1]); break;
      case 'sm': shop.say(e[1], e[2]); break;
    }
  }

  // Un frame del cliente: manda sus controles y anima lo que mandó el host
  clientFrame(dt) {
    this.watch(dt);
    const me = G.me;
    const ctl = !me || G.mapOpen || G.shopOpen ? idleControls() : input.readControls();
    if (me) me.ctl = ctl; // el audio mira si frena
    const pk = packCtl(ctl), key = pk.join();
    this.ctlT += dt;
    if (key !== this.lastCtl || this.ctlT > NET_CTL) {
      this.send('ctl', pk, this.hostId);
      this.lastCtl = key;
      this.ctlT = 0;
    }

    G.t += dt;
    if (G.msgT > 0) G.msgT -= dt;
    G.shake = Math.max(0, G.shake - dt * 22);
    G.flash = Math.max(0, G.flash - dt * 4);

    // Cada cosa se desliza hacia donde la puso el host; los autos además siguen de largo
    // a su velocidad entre foto y foto. Las piernas se mueven según lo que caminó.
    const k = 1 - Math.exp(-dt * 14);
    const glide = o => {
      const dx = o.tx - o.x, dy = o.ty - o.y;
      if (dx * dx + dy * dy > 90 * 90) {
        o.x = o.tx;
        o.y = o.ty;
        o.ang = o.ta;
        return 0;
      }
      o.x += dx * k;
      o.y += dy * k;
      o.ang += angTo(o.ta, o.ang) * k;
      return Math.hypot(dx * k, dy * k);
    };
    for (const c of G.cars) {
      c.tx += Math.cos(c.ta) * c.spd * dt;
      c.ty += Math.sin(c.ta) * c.spd * dt;
      glide(c);
    }
    for (const list of [G.peds, G.cops, G.tranzas, G.players]) {
      for (const o of list) if (o.tx !== undefined) o.walk = (o.walk || 0) + glide(o) / 8;
    }
    for (const b of G.bullets) {
      b.ox = b.x;
      b.oy = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    G.bullets = G.bullets.filter(b => !hitBuilding(b.x, b.y, 1));
    for (const n of G.nades) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.t -= dt;
    }
    for (const pk of G.pickups) pk.t += dt;
    for (const P of G.players) {
      P.slowmo = Math.max(0, P.slowmo - dt);
      P.high = lerp(P.high, P.slowmo > 0 ? 1 : 0, clamp(dt * 4, 0, 1));
    }
    game.updateFx(dt);
    game.updateCamera(dt);
  }
}

const net = new NetManager();
