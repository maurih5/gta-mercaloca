/* =========================================================================
   GTA MERCALOCA - Motor Gráfico / Renderer (Falso 3D, Iluminación, HUD)
   ========================================================================= */

const litWindows = [];
const glowCache = {};

/**
 * Ícono pixel art de un arma (o del chaleco), centrado en (x, y), de unos 24x12.
 * Se usa en el HUD, en los fierros tirados en la calle y en la armería.
 */
// Comida: la de los pickups del piso y la que vende el super
function foodIcon(g, id, x, y) {
  const r = (col, a, b, w, h) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x + a), Math.round(y + b), w, h);
  };
  if (id === 'pernil') {
    r('#8a5a3a', -5, -4, 9, 8); r('#d99a68', -5, -4, 9, 5); r('#efe6d4', 3, 1, 3, 4);
  } else if (id === 'choripan') {
    r('#d8ad5f', -5, -3, 10, 6); r('#7a3a2a', -5, -1, 10, 3); r('#c9a227', -5, -1, 10, 1);
  } else if (id === 'carne') {
    r('#7a1e1e', -6, -3, 12, 7); r('#b83a34', -6, -3, 12, 4); r('#f0d8c8', -4, -2, 3, 1); r('#f0d8c8', 1, 0, 4, 1);
  } else if (id === 'fideos') {
    r('#e8e4d8', -4, -5, 8, 10); r('#2a4fa8', -4, -5, 8, 3); r('#e8c060', -2, 0, 4, 3);
  } else if (id === 'carbon') {
    r('#6a5a44', -5, -5, 10, 11); r('#8a7a5e', -5, -5, 10, 2); r('#1a1a1c', -3, -1, 6, 4); r('#e8a23a', -1, 0, 2, 1);
  } else if (id === 'asado' || id === 'crudo' || id === 'quemado') {
    const c = { asado: ['#7a3a1e', '#a85a2e'], crudo: ['#9a2424', '#d05050'], quemado: ['#1e1612', '#3a2a1e'] }[id];
    r(c[0], -6, -3, 12, 7); r(c[1], -6, -3, 12, 3); r('#d8d0c0', 3, 1, 3, 1);
  } else if (id === 'agua') {
    r('#a8d8f0', -2, -6, 5, 12); r('#e8f6ff', -1, -5, 1, 9); r('#3a7ab8', -2, -7, 5, 2); r('#3a7ab8', -2, 0, 5, 2);
  } else if (id === 'gaseosa') {
    r('#3a1a12', -3, -6, 6, 12); r('#c8302a', -3, -2, 6, 4); r('#f0f0f0', -2, -1, 4, 1); r('#c8302a', -1, -8, 2, 2);
  } else if (id === 'galletitas') {
    r('#c8302a', -6, -3, 12, 6); r('#e0b060', -4, -2, 3, 3); r('#e0b060', 0, -2, 3, 3); r('#9a2420', -6, 2, 12, 1);
  } else {
    // Mate con bombilla y yerba
    r('#c8c8c8', -0.5, -7, 2, 6);
    g.fillStyle = '#4a3524';
    g.beginPath();
    g.ellipse(x, y + 1, 4, 4.5, 0, 0, TAU);
    g.fill();
    r('#6b8a4a', -2.5, -1, 5, 2);
  }
}

function weaponIcon(g, id, x, y) {
  const r = (col, a, b, w, h) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x + a), Math.round(y + b), w, h);
  };
  const IRON = '#2a2d33', LITE = '#6a707a', WOOD = '#8a5428', DARKW = '#5a3418';
  if (id === 'pistola') {
    r(IRON, -5, -3, 11, 3); r(LITE, -5, -3, 11, 1); r(IRON, -4, 0, 3, 5); r(DARKW, -4, 2, 3, 3);
  } else if (id === 'uzi') {
    r(IRON, -7, -3, 13, 4); r(LITE, -7, -3, 13, 1); r(IRON, 6, -2, 3, 2);
    r(IRON, -1, 1, 3, 6); r(IRON, -6, 1, 2, 3);
  } else if (id === 'escopeta') {
    r(WOOD, -12, -2, 8, 3); r(DARKW, -12, 1, 3, 2); r(IRON, -4, -3, 16, 2); r(LITE, -4, -3, 16, 1);
    r(DARKW, 2, -1, 6, 2);
  } else if (id === 'ak') {
    r(WOOD, -12, -2, 6, 3); r(DARKW, -12, 1, 2, 2); r(IRON, -6, -3, 9, 4); r(LITE, -6, -3, 9, 1);
    r(WOOD, 3, -3, 5, 3); r(IRON, 8, -2, 5, 1); r(IRON, -2, 1, 3, 3); r(IRON, -1, 4, 3, 2);
  } else if (id === 'granada') {
    r('#3f5a2a', -4, -3, 8, 8); r('#5a7a3a', -4, -3, 8, 2); r('#2a3a1a', -4, 1, 8, 1);
    r(IRON, -1, -6, 3, 3); r('#d0d0d0', 2, -6, 3, 1);
  } else if (id === 'baston') {
    r('#2f9a3a', -12, -1, 22, 2); r('#5ad266', -12, -1, 22, 1); r('#2f9a3a', 9, -5, 2, 5);
    r('#2f9a3a', 5, -6, 5, 2); r('#e8e8e8', -13, -1, 2, 2);
  } else if (id === 'porro') {
    r('#e8e4d8', -8, -1, 14, 3); r('#c8c0a8', -8, 1, 14, 1); r('#8a6a3a', -8, -1, 3, 3);
    r('#ff7a2a', 6, -1, 2, 3); r('#ffd34a', 7, 0, 1, 1); r('rgba(220,220,220,.6)', 8, -4, 2, 2); r('rgba(220,220,220,.4)', 10, -7, 2, 2);
  } else if (id === 'chaleco') {
    r('#2a3a5a', -6, -5, 12, 11); r('#3a5080', -6, -5, 12, 2); r('#14100c', -2, -5, 4, 3);
    r('#1a2440', -6, 1, 12, 1); r('#c9a227', 2, 3, 2, 2);
  }
}

/* ---- Riachuelo: lo que se mueve sobre el agua ----
   Todo es funcion de G.t (y de la curva del rio), sin estado: con varios jugadores
   cada pantalla ve la misma lancha en el mismo lugar sin mandar nada por la red. */

// Azar determinista en [0, 1) para el agua. hash() se degenera con numeros grandes
// (pierde precision en los doubles), y aca las claves son indices de celda del mundo.
const wrand = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
// Punto del cauce a s px de la entrada norte: posicion, tangente (sentido de la corriente) y t
function riverAt(s) {
  const t = clamp(s / RIVER_LEN, 0, 1);
  let lo = 0, hi = riverPts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (riverPts[m].t <= t) lo = m; else hi = m; }
  const a = riverPts[lo], b = riverPts[hi], u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  const tx = lerp(a.tx, b.tx, u), ty = lerp(a.ty, b.ty, u), l = Math.hypot(tx, ty) || 1;
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), tx: tx / l, ty: ty / l, t };
}
// Distancia a la orilla precisa: proyecta sobre los tramos de la curva vecinos e
// interpola el ancho. shoreDist() sale de la grilla de 12px y alcanza para la colision,
// pero en la desembocadura (donde el ancho cambia rapido) su costa queda serruchada.
// La usan el horneado del agua (bakeGround) y la espuma: solo cerca de la orilla.
function shoreDistFine(x, y) {
  const t = shoreT(x, y);
  let lo = 0, hi = riverPts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (riverPts[m].t <= t) lo = m; else hi = m; }
  let best = Infinity;
  for (let i = Math.max(0, lo - 4), e = Math.min(riverPts.length - 1, lo + 5); i < e; i++) {
    const a = riverPts[i], b = riverPts[i + 1], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    const u = L2 > 0 ? clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1) : 0;
    const d = Math.hypot(x - a.x - dx * u, y - a.y - dy * u) - riverWidthAt(a.t + (b.t - a.t) * u);
    if (d < best) best = d;
  }
  return best;
}
// Algo que navega a s px, corrido 'lane' medio anchos a la derecha de su marcha
function riverSpot(s, lane, dir) {
  const p = riverAt(s), r = riverWidthAt(p.t) * lane, hx = p.tx * dir, hy = p.ty * dir;
  return { x: p.x - hy * r, y: p.y + hx * r, ang: Math.atan2(hy, hx), t: p.t };
}
// Medidas del casco (largo L, manga W) de cada tipo de embarcacion
const BOAT_DIM = { lancha: { L: 18, W: 7 }, bote: { L: 12, W: 5 }, remolcador: { L: 24, W: 10 }, barcaza: { L: 50, W: 17 } };
const wrapS = (s) => ((s % RIVER_LEN) + RIVER_LEN) % RIVER_LEN;
// Las embarcaciones en el instante 'time': entran por un borde del mapa y salen por el otro
function boatsAt(time) {
  return RIVER_BOATS.map((b, i) => {
    const s = wrapS(b.ph * RIVER_LEN + b.dir * b.v * time), p = riverSpot(s, b.lane, b.dir);
    return { i, k: b.k, x: p.x, y: p.y, ang: p.ang, s, dir: b.dir, lane: b.lane, v: b.v };
  });
}
// Camalotes, basura y patos a la deriva (los patos remontan despacito)
function floatsAt(time) {
  const out = [];
  for (let i = 0; i < RIVER_FLOATS; i++) {
    const h0 = wrand(i * 3 + 0.1), h1 = wrand(i * 3 + 1.1), h2 = wrand(i * 3 + 2.1) * 2 - 1;
    const k = h1 < 0.55 ? 'camalote' : h1 < 0.8 ? 'basura' : 'pato';
    const dir = k === 'pato' && h0 < 0.6 ? -1 : 1, v = k === 'pato' ? 4 + h1 * 3 : 7 + h1 * 6;
    const s = wrapS(h0 * RIVER_LEN + dir * v * time);
    const p = riverSpot(s, h2 * 0.7 + Math.sin(time * 0.3 + i) * 0.04, dir);
    out.push({ i, k, x: p.x, y: p.y, ang: p.ang, h: h1 });
  }
  return out;
}
// Sentido de la corriente segun t, tabulado (lo pide cada celda de agua en cada frame)
let FLOW = null;
function flowAt(t) {
  if (!FLOW) {
    FLOW = [];
    for (let k = 0; k <= 256; k++) { const p = riverAt(k / 256 * RIVER_LEN); FLOW.push([p.tx, p.ty]); }
  }
  return FLOW[clamp(Math.round(t * 256), 0, 256)];
}

class Renderer {
  constructor() {
    this.cv = (typeof document !== 'undefined') ? document.getElementById('cv') : null;
    this.ctx = this.cv ? this.cv.getContext('2d') : null;
    if (this.cv) {
      this.cv.width = RW * RENDER_SCALE;
      this.cv.height = RH * RENDER_SCALE;
    }
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
    this.fit();
    if (typeof addEventListener !== 'undefined') {
      addEventListener('resize', () => this.fit());
    }
  }

  fit() {
    if (!this.cv || typeof innerWidth === 'undefined' || typeof innerHeight === 'undefined') return;
    const s = Math.max(1, Math.min(innerWidth / RW, innerHeight / RH));
    this.cv.style.width = Math.floor(RW * s) + 'px';
    this.cv.style.height = Math.floor(RH * s) + 'px';
  }

  glow(r, gg, b, size) {
    const k = r + ',' + gg + ',' + b + ',' + size;
    if (glowCache[k]) return glowCache[k];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(' + r + ',' + gg + ',' + b + ',1)');
    gr.addColorStop(0.35, 'rgba(' + r + ',' + gg + ',' + b + ',.55)');
    gr.addColorStop(1, 'rgba(' + r + ',' + gg + ',' + b + ',0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, size, size);
    return glowCache[k] = c;
  }

  quad(x1, y1, x2, y2, x3, y3, x4, y4, col) {
    const ctx = this.ctx;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  drawGround() {
    if (!GROUND) return;
    this.ctx.drawImage(GROUND, px(G.cam.x), px(G.cam.y), RW, RH, 0, 0, RW, RH);
  }

  drawBuilding(b, night) {
    const ctx = this.ctx;
    const x = b.x - G.cam.x, y = b.y - G.cam.y;
    const cxp = x + b.w / 2 - RW / 2, cyp = y + b.h / 2 - RH / 2;
    const dx = cxp * b.H / FOCAL, dy = cyp * b.H / FOCAL;
    const rx = x + dx, ry = y + dy; // Techo
    const dark = shade(b.col, 0.45), wallE = shade(b.col, 0.62), wallW = shade(b.col, 0.80);
    const wallN = shade(b.col, 0.70), wallS = shade(b.col, 0.55);

    ctx.fillStyle = dark;
    ctx.fillRect(px(x), px(y), px(b.w), px(b.h));

    // 4 paredes con perspectiva
    this.quad(x, y, x + b.w, y, rx + b.w, ry, rx, ry, dy < 0 ? wallN : shade(b.col, 0.34));
    this.quad(x, y + b.h, x + b.w, y + b.h, rx + b.w, ry + b.h, rx, ry + b.h, dy > 0 ? wallS : shade(b.col, 0.34));
    this.quad(x, y, x, y + b.h, rx, ry + b.h, rx, ry, dx < 0 ? wallW : shade(b.col, 0.34));
    this.quad(x + b.w, y, x + b.w, y + b.h, rx + b.w, ry + b.h, rx + b.w, ry, dx > 0 ? wallE : shade(b.col, 0.34));

    // Ventanas en las paredes que miran a la cámara
    const rows = Math.max(1, Math.floor(b.H / 11));
    const lit = night > 0.28;
    const drawWall = (ax, ay, bx2, by2, axis) => {
      const cols = Math.max(1, Math.floor(Math.hypot(bx2 - ax, by2 - ay) / 13));
      for (let r = 0; r < rows; r++) {
        const t0 = (r + 0.28) / rows, t1 = (r + 0.72) / rows;
        for (let c = 0; c < cols; c++) {
          const u0 = (c + 0.25) / cols, u1 = (c + 0.75) / cols;
          const on = lit && hash(b.id * 97 + r * 13 + c * 7 + axis * 3) > 0.15;
          const X0 = lerp(ax, bx2, u0), Y0 = lerp(ay, by2, u0);
          const X1 = lerp(ax, bx2, u1), Y1 = lerp(ay, by2, u1);
          const P0 = [X0 + dx * t0, Y0 + dy * t0], P1 = [X1 + dx * t0, Y1 + dy * t0];
          const P2 = [X1 + dx * t1, Y1 + dy * t1], P3 = [X0 + dx * t1, Y0 + dy * t1];
          ctx.fillStyle = on ? 'rgba(90,72,40,.95)' : 'rgba(16,18,24,.55)';
          ctx.beginPath();
          ctx.moveTo(P0[0], P0[1]);
          ctx.lineTo(P1[0], P1[1]);
          ctx.lineTo(P2[0], P2[1]);
          ctx.lineTo(P3[0], P3[1]);
          ctx.closePath();
          ctx.fill();
          if (on) litWindows.push([P0, P1, P2, P3]);
        }
      }
    };

    if (dy > 2) drawWall(x, y + b.h, x + b.w, y + b.h, 1);
    else if (dy < -2) drawWall(x, y, x + b.w, y, 2);

    if (dx > 2) drawWall(x + b.w, y, x + b.w, y + b.h, 3);
    else if (dx < -2) drawWall(x, y, x, y + b.h, 4);

    // Techo
    const rc = b.roofCol, det = b.ty.detail;
    ctx.fillStyle = rc;
    ctx.fillRect(px(rx), px(ry), px(b.w), px(b.h));

    if (b.villa) {
      // Chapa acanalada con óxido, o losa con hierros asomando, gomas y tanque negro
      if (rc !== '#9a958a') {
        ctx.fillStyle = 'rgba(0,0,0,.16)';
        for (let lx = rx + 1; lx < rx + b.w - 1; lx += 2) ctx.fillRect(px(lx), px(ry), 1, px(b.h));
        if (hash(b.id * 13) > 0.2) {
          ctx.fillStyle = 'rgba(140,70,30,.45)';
          ctx.fillRect(px(rx + b.w * (0.2 + hash(b.id * 7) * 0.3)), px(ry + b.h * 0.3), px(b.w * 0.3), px(b.h * 0.35));
        }
      } else {
        ctx.fillStyle = '#5a4a3a';
        for (let i = 0; i < 3; i++) ctx.fillRect(px(rx + 2 + i * 3), px(ry + 1), 1, 3);
      }
      ctx.fillStyle = shade(rc, 1.3);
      ctx.fillRect(px(rx), px(ry), px(b.w), 1);
      if (b.tire) {
        ctx.fillStyle = '#1a1a1c';
        ctx.fillRect(px(rx + b.w * 0.55), px(ry + b.h * 0.4), 5, 5);
        ctx.fillStyle = shade(rc, 0.8);
        ctx.fillRect(px(rx + b.w * 0.55 + 1.5), px(ry + b.h * 0.4 + 1.5), 2, 2);
      }
      if (b.tank) {
        ctx.fillStyle = '#16181c';
        ctx.beginPath();
        ctx.arc(rx + b.w * 0.3, ry + b.h * 0.35, 4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a3d44';
        ctx.fillRect(px(rx + b.w * 0.3 - 2), px(ry + b.h * 0.35 - 3), 3, 1);
      }
    } else if (det === 'tejas') {
      ctx.fillStyle = shade(rc, 1.18);
      ctx.fillRect(px(rx), px(ry), px(b.w), px(b.h / 2));
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let ly = ry + 2; ly < ry + b.h - 1; ly += 3) ctx.fillRect(px(rx), px(ly), px(b.w), 1);
      ctx.fillStyle = shade(rc, 1.45);
      ctx.fillRect(px(rx), px(ry + b.h / 2 - 1), px(b.w), 2);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(px(rx + b.w * 0.7), px(ry + b.h * 0.28), 5, 5);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      for (let i = 0; i < 4; i++) {
        const hx = hash(b.id * 31 + i) * 0.5 + 0.5, hy = hash(b.id * 57 + i) * 0.5 + 0.5;
        ctx.fillRect(px(rx + hx * b.w * 0.7), px(ry + hy * b.h * 0.7), 7 + i * 2, 5 + i);
      }
      ctx.fillStyle = shade(rc, 1.35);
      ctx.fillRect(px(rx), px(ry), px(b.w), 2.5);
      ctx.fillRect(px(rx), px(ry), 2.5, px(b.h));
      ctx.fillStyle = shade(rc, 0.70);
      ctx.fillRect(px(rx), px(ry + b.h - 2.5), px(b.w), 2.5);
      ctx.fillRect(px(rx + b.w - 2.5), px(ry), 2.5, px(b.h));
      ctx.fillStyle = shade(rc, 0.82);
      ctx.fillRect(px(rx + b.w * 0.12), px(ry + b.h * 0.62), 10, 8);
      ctx.fillStyle = shade(rc, 1.25);
      ctx.fillRect(px(rx + b.w * 0.12), px(ry + b.h * 0.62), 10, 2.5);
    }

    if (b.bank) {
      const sx = rx + b.w / 2, sy = ry + b.h / 2;
      ctx.fillStyle = '#0e2a12';
      ctx.fillRect(px(sx - 17), px(sy - 6), 34, 12);
      ctx.fillStyle = '#2f8a3a';
      ctx.fillRect(px(sx - 16), px(sy - 5), 32, 10);
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('BANCO', px(sx), px(sy + 2.5));
    }

    if (b.hospital) {
      const ccx = rx + b.w / 2, ccy = ry + b.h / 2, cs = Math.min(b.w, b.h) * 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px(ccx - cs), px(ccy - cs), cs * 2, cs * 2);
      ctx.fillStyle = '#d8342c';
      ctx.fillRect(px(ccx - cs * 0.22), px(ccy - cs * 0.75), cs * 0.44, cs * 1.5);
      ctx.fillRect(px(ccx - cs * 0.75), px(ccy - cs * 0.22), cs * 1.5, cs * 0.44);
    }

    if (b.casaRosada) {
      // Da al oeste: balcon corrido sobre la plaza y mastil con bandera en el techo
      const bcy = ry + b.h / 2, bs = Math.min(b.w, b.h) * 0.3;
      ctx.fillStyle = '#f5ead6';
      ctx.fillRect(px(rx + b.w * 0.08), px(bcy - b.h * 0.22), b.w * 0.2, b.h * 0.44);
      ctx.fillStyle = '#e8dcc4'; // patio/cupula central
      ctx.fillRect(px(rx + b.w * 0.36), px(bcy - bs), b.w * 0.28, bs * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px(rx + b.w * 0.5), px(ry + b.h * 0.08), 2.5, b.h * 0.16);
      ctx.fillStyle = '#74acdf'; // celeste y blanco
      ctx.fillRect(px(rx + b.w * 0.5 + 2), px(ry + b.h * 0.08), 9, 6);
    }

    if (b.cabildo) {
      // Da al este, a la plaza: recova de arcos al frente y torre con cupula al medio
      const ccy = ry + b.h / 2;
      ctx.fillStyle = '#d9d2bf'; // recova
      ctx.fillRect(px(rx + b.w * 0.72), px(ry + b.h * 0.12), b.w * 0.2, b.h * 0.76);
      ctx.fillStyle = '#6f6857'; // arcadas
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(px(rx + b.w * 0.75), px(ry + b.h * (0.18 + i * 0.16)), b.w * 0.14, 3);
      }
      ctx.fillStyle = '#f2ecda'; // cuerpo de la torre
      ctx.fillRect(px(rx + b.w * 0.36), px(ccy - b.h * 0.17), b.w * 0.26, b.h * 0.34);
      ctx.fillStyle = '#8c9a86'; // cupula
      ctx.beginPath();
      ctx.arc(px(rx + b.w * 0.49), px(ccy), Math.max(3, b.w * 0.1), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5f6b5b';
      ctx.beginPath();
      ctx.arc(px(rx + b.w * 0.49), px(ccy), Math.max(2, b.w * 0.055), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff'; // veleta
      ctx.fillRect(px(rx + b.w * 0.49), px(ccy - b.h * 0.3), 2, b.h * 0.12);
    }

    if (det === 'ac' || b.ac) {
      for (let i = 0; i < 2; i++) {
        const ax2 = rx + b.w * (0.22 + i * 0.3), ay2 = ry + b.h * 0.2;
        ctx.fillStyle = '#6e7278';
        ctx.fillRect(px(ax2), px(ay2), 9, 7);
        ctx.fillStyle = '#9aa0a6';
        ctx.fillRect(px(ax2), px(ay2), 9, 2.4);
        ctx.fillStyle = '#4a4e52';
        ctx.fillRect(px(ax2 + 2), px(ay2 + 3), 5, 3);
      }
    }

    if (!b.villa && (det === 'tanque' || b.tank)) {
      ctx.fillStyle = '#5f5346';
      ctx.fillRect(px(rx + b.w * 0.58), px(ry + b.h * 0.52), 12, 10);
      ctx.fillStyle = '#8a7a63';
      ctx.fillRect(px(rx + b.w * 0.58), px(ry + b.h * 0.52), 12, 3.2);
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.fillRect(px(rx + b.w * 0.58), px(ry + b.h * 0.52 + 7), 12, 3);
    }

    if (det === 'helipuerto' && b.w > 34 && b.h > 34) {
      const cxh = rx + b.w / 2, cyh = ry + b.h / 2;
      ctx.strokeStyle = 'rgba(240,240,240,.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cxh, cyh, Math.min(b.w, b.h) * 0.28, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(240,240,240,.8)';
      const hw = Math.min(b.w, b.h) * 0.16;
      ctx.fillRect(px(cxh - hw), px(cyh - hw * 0.8), 2.5, hw * 1.6);
      ctx.fillRect(px(cxh + hw - 2.5), px(cyh - hw * 0.8), 2.5, hw * 1.6);
      ctx.fillRect(px(cxh - hw), px(cyh - 1), hw * 2, 2);
    }

    if (b.door) {
      const d = b.door, dxp = d.x - G.cam.x, dyp = d.y - G.cam.y;
      ctx.fillStyle = '#2e2620';
      if (d.s === 'n' || d.s === 's') ctx.fillRect(px(dxp - 4), px(dyp - 1.5), 8, 3);
      else                           ctx.fillRect(px(dxp - 1.5), px(dyp - 4), 3, 8);
      ctx.fillStyle = shade(b.col, 1.3);
      if (d.s === 'n' || d.s === 's') ctx.fillRect(px(dxp - 5), px(dyp - 2), 10, 1);
      else                           ctx.fillRect(px(dxp - 2), px(dyp - 5), 1, 10);
      ctx.fillStyle = 'rgba(70,60,50,.55)';
      ctx.fillRect(px(dxp + d.ox * 0.45 - 3), px(dyp + d.oy * 0.45 - 2), 6, 4);
    }

    if (b.shop) {
      const sx = rx + b.w / 2, sy = ry + b.h / 2;
      ctx.fillStyle = '#14100c';
      ctx.fillRect(px(sx - 17), px(sy - 6), 34, 12);
      ctx.fillStyle = Math.floor(G.t * 2) % 2 ? '#d8352a' : '#b0201c';
      ctx.fillRect(px(sx - 16), px(sy - 5), 32, 10);
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('ARMAS', px(sx), px(sy + 2.5));
    }

    if (b.stadium) this.drawStadium(b, rx, ry);
    if (b.super) this.drawSuperSign(b, rx, ry);
    if (b.boliche) this.drawBolicheSign(b, rx, ry);
    if (b.super && b.closed > 0 && b.door) {
      // Persiana baja: chapa gris con canaletas
      const d = b.door, dxp = d.x - G.cam.x, dyp = d.y - G.cam.y, hz = d.s === 'n' || d.s === 's';
      ctx.fillStyle = '#8a8e94';
      if (hz) ctx.fillRect(px(dxp - 9), px(dyp - 2.5), 18, 5);
      else ctx.fillRect(px(dxp - 2.5), px(dyp - 9), 5, 18);
      ctx.fillStyle = '#5c6066';
      for (let i = -8; i < 9; i += 3) {
        if (hz) ctx.fillRect(px(dxp + i), px(dyp - 2.5), 1, 5);
        else ctx.fillRect(px(dxp - 2.5), px(dyp + i), 5, 1);
      }
    }

    if (b.H > 45) {
      const bl = Math.sin(G.t * 3.4) > 0;
      ctx.fillStyle = bl ? '#ff5a5a' : '#4a1212';
      ctx.fillRect(px(rx + b.w * 0.85), px(ry + b.h * 0.85), 3, 3);
    }
  }

  // Estadio visto de arriba: tribunas con los colores del club, la cancha con sus líneas,
  // las torres de luz y el nombre sobre la tribuna de la puerta. Cada club a su manera:
  // Boca con la franja amarilla y sin una tribuna (solo los palcos), River con la banda roja
  // cruzada, Independiente todo rojo y Racing redondo, con bastones celestes y blancos.
  drawStadium(b, rx, ry) {
    const ctx = this.ctx, S = STADIUMS.find(q => q.k === b.stadium);
    const w = b.w, h = b.h, m = Math.min(w, h) * 0.2;
    // La cancha (en Boca se corre: del lado que falta la tribuna hay solo palcos)
    const miss = S.missing ? m * 0.65 : 0;
    const fx = rx + m, fy = ry + m, fw = w - 2 * m + miss, fh = h - 2 * m;
    ctx.save();
    if (S.round) {
      // El termo: redondo, con gajos celestes y blancos
      const cx = rx + w / 2, cy = ry + h / 2, R = Math.min(w, h) / 2;
      ctx.fillStyle = '#8a8e94'; // explanada de cemento en las esquinas
      ctx.fillRect(px(rx), px(ry), px(w), px(h));
      ctx.fillStyle = S.c1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.fillStyle = S.c2;
      for (let i = 0; i < 16; i += 2) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, (i / 16) * TAU, ((i + 1) / 16) * TAU);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,.18)';
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R - i * m / 4, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = '#2a2d33';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      ctx.fillStyle = S.c1;
      ctx.fillRect(px(rx), px(ry), px(w), px(h));
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      for (let i = 1; i < 4; i++) ctx.strokeRect(rx + i * m / 4, ry + i * m / 4, w - i * m / 2, h - i * m / 2);
      ctx.beginPath();
      ctx.rect(rx, ry, w, h);
      ctx.rect(fx, fy, fw, fh);
      ctx.clip('evenodd');
      ctx.fillStyle = S.c2;
      if (S.pattern === 'banda') {
        ctx.beginPath();
        ctx.moveTo(rx, ry + h * 0.18); ctx.lineTo(rx + w * 0.18, ry);
        ctx.lineTo(rx + w, ry + h * 0.82); ctx.lineTo(rx + w * 0.82, ry + h);
        ctx.closePath();
        ctx.fill();
      } else if (S.pattern === 'franja') {
        ctx.fillRect(px(rx), px(ry + h * 0.4), px(w), px(h * 0.2));
      } else {
        // Liso: una línea blanca finita en el borde de cada tribuna
        ctx.strokeStyle = S.c2;
        ctx.strokeRect(rx + 2.5, ry + 2.5, w - 5, h - 5);
      }
    }
    ctx.restore();
    if (S.missing) {
      // El lado sin tribuna: la fila chata de palcos y el cartel del chiste
      const px0 = fx + fw, pw = rx + w - px0;
      ctx.fillStyle = '#d8d0c0';
      ctx.fillRect(px(px0), px(ry), px(pw), px(h));
      ctx.fillStyle = '#5a5e64';
      for (let yy = ry + 3; yy < ry + h - 4; yy += 6) ctx.fillRect(px(px0 + 1.5), px(yy), px(pw - 3), 4);
      ctx.save();
      ctx.translate(px0 + pw / 2 + 1.5, ry + h / 2);
      ctx.rotate(Math.PI / 2);
      this.text('ACA VA UNA TRIBUNA', 0, 0, '#ffd34a', 4, 'center');
      ctx.restore();
    }
    // La cancha
    ctx.fillStyle = '#3f8f3a';
    ctx.fillRect(px(fx), px(fy), px(fw), px(fh));
    ctx.fillStyle = '#4a9c44';
    for (let i = 0; i < 6; i += 2) ctx.fillRect(px(fx), px(fy + fh * i / 6), px(fw), px(fh / 6));
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 3, fy + 3, fw - 6, fh - 6);
    ctx.beginPath();
    ctx.moveTo(fx + 3, fy + fh / 2);
    ctx.lineTo(fx + fw - 3, fy + fh / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(fx + fw / 2, fy + fh / 2, Math.min(fw, fh) * 0.12, 0, TAU);
    ctx.stroke();
    ctx.strokeRect(fx + fw * 0.3, fy + 3, fw * 0.4, fh * 0.12);
    ctx.strokeRect(fx + fw * 0.3, fy + fh - 3 - fh * 0.12, fw * 0.4, fh * 0.12);
    // Torres de luz
    const lights = S.round
      ? [[rx + w * 0.15, ry + h * 0.15], [rx + w * 0.85 - 4, ry + h * 0.15], [rx + w * 0.15, ry + h * 0.85 - 4], [rx + w * 0.85 - 4, ry + h * 0.85 - 4]]
      : [[rx + 3, ry + 3], [rx + w - 6, ry + 3], [rx + 3, ry + h - 6], [rx + w - 6, ry + h - 6]];
    for (const [cx2, cy2] of lights) {
      ctx.fillStyle = '#2a2d33';
      ctx.fillRect(px(cx2), px(cy2), 4, 4);
      ctx.fillStyle = darkness() > 0.3 ? '#fff6c8' : '#b8bcc4';
      ctx.fillRect(px(cx2 + 1), px(cy2 + 1), 2, 2);
    }
    // Nombre sobre la tribuna de la puerta
    const nw = S.name.length * 5 + 8, ny = ry + h - m * 0.75;
    ctx.fillStyle = '#14100c';
    ctx.fillRect(px(rx + w / 2 - nw / 2 - 1), px(ny - 1), nw + 2, 10);
    ctx.fillStyle = S.pattern === 'banda' ? S.c2 : S.round ? '#3a7ab8' : S.c1;
    ctx.fillRect(px(rx + w / 2 - nw / 2), px(ny), nw, 8);
    this.text(S.name, rx + w / 2, ny + 6.5, S.pattern === 'franja' ? S.c2 : '#fff', 5, 'center');
  }

  // Un trapo con los colores del club: Boca azul con la franja amarilla, River blanco con
  // la banda roja. (x, y) es la punta del palo; flamea un poco.
  drawFlag(k, x, y, s = 1) {
    const ctx = this.ctx, B = BARRAS.find(q => q.k === k), w = 16 * s, h = 10 * s;
    const wave = Math.sin(G.t * 6 + x * 0.1) * 1.2 * s;
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(px(x - 1), px(y), 1.5, 14 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(1, wave / w, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(-0.5, -0.5, w + 1, h + 1);
    ctx.fillStyle = B.shirt;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = B.band;
    const pat = STADIUMS.find(q => q.k === B.stadium).pattern;
    if (pat === 'banda') {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(w * 0.3, 0); ctx.lineTo(w, h * 0.7); ctx.lineTo(w, h); ctx.lineTo(w * 0.7, h); ctx.lineTo(0, h * 0.3);
      ctx.fill();
    } else if (pat === 'bastones') {
      for (let i = 1; i < 6; i += 2) ctx.fillRect(w * i / 6, 0, w / 6, h);
    } else if (pat === 'liso') {
      ctx.fillRect(0, 0, w, h * 0.15); // ribete blanco arriba y abajo
      ctx.fillRect(0, h * 0.85, w, h * 0.15);
    } else {
      ctx.fillRect(0, h * 0.35, w, h * 0.3);
    }
    ctx.restore();
  }

  // El palo del trapo en la puerta del estadio (con el trapo si está colgado) y, si estás
  // cerca y la barra está tranquila, lo que canta
  drawTrapoPole(B) {
    const x = B.flag.x - G.cam.x, y = B.flag.y - G.cam.y;
    if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) return;
    const ctx = this.ctx;
    if (B.trapo === 'hung') this.drawFlag(B.def.k, x, y - 18);
    else {
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(px(x - 1), px(y - 18), 1.5, 18);
    }
    const P = G.me;
    if (P && dist(P, B.flag) < 170 && B.angry <= 0 && B.trapo === 'hung') {
      const k = Math.floor(G.t / 5), on = (G.t % 5) < 2.6;
      if (on) this.text(B.def.chant[k % B.def.chant.length], x, y - 26, B.def.band, 5, 'center');
    }
  }

  // Cartel del boliche en el techo: de noche titila el neón, de día queda apagado
  drawBolicheSign(b, rx, ry) {
    const ctx = this.ctx, D = bolicheOf(b), on = bolicheOpen();
    const sx = rx + b.w / 2, sy = ry + b.h / 2, w = D.name.length * 5 + 8;
    ctx.fillStyle = '#0a080c';
    ctx.fillRect(px(sx - w / 2), px(sy - 6), w, 12);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = on && Math.floor(G.t * 3) % 4 ? 'rgb(' + D.glow + ')' : '#4a4450';
    ctx.fillText(D.name, px(sx), px(sy + 2.5));
  }

  // Cartel del super en el techo. Al de Lanús se le cayó la O y quedó tirada al lado
  drawSuperSign(b, rx, ry) {
    const ctx = this.ctx, S = SUPERS.find(q => q.k === b.super), name = S.name;
    const sx = rx + b.w / 2, sy = ry + b.h / 2, w = name.length * 8 + 10;
    ctx.fillStyle = '#14100c';
    ctx.fillRect(px(sx - w / 2 - 1), px(sy - 9), w + 2, 18);
    ctx.fillStyle = S.sign;
    ctx.fillRect(px(sx - w / 2), px(sy - 8), w, 16);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = S.ink;
    ctx.fillText(name, px(sx), px(sy + 4));
    if (b.alarm > 0) {
      // Baliza de la alarma en la esquina del techo
      const on = Math.floor(G.t * 6) % 2;
      ctx.fillStyle = on ? '#ff3a2a' : '#5a1210';
      ctx.fillRect(px(rx + b.w - 12), px(ry + 4), 7, 7);
      if (on) {
        ctx.fillStyle = 'rgba(255,60,40,.25)';
        ctx.beginPath();
        ctx.arc(rx + b.w - 8.5, ry + 7.5, 12, 0, TAU);
        ctx.fill();
      }
    }
    if (b.closed > 0) {
      ctx.fillStyle = '#14100c';
      ctx.fillRect(px(sx - 26), px(sy + 10), 52, 10);
      this.text('CERRADO', sx, sy + 17.5, '#ffb04a', 5, 'center');
    }
    if (b.super === 'lanus') {
      // la O tirada en el techo, torcida
      ctx.strokeStyle = S.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sx + w / 2 + 6, sy + 11, 4, 2.6, 0.6, 0, TAU);
      ctx.stroke();
    }
  }

  // Changuito de super visto de arriba: canasto de alambre con la manija para atrás.
  // Volcado: de costado, con las ruedas al aire.
  drawChanguito(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -12 || y < -12 || x > RW + 12 || y > RH + 12) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.a);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(-3, -2, 8, 6);
    if (p.volcado) {
      ctx.fillStyle = '#8c949c';
      ctx.fillRect(-4, -2, 8, 4);
      ctx.fillStyle = '#1a1a1c';
      ctx.fillRect(-4, -3, 2, 1); ctx.fillRect(2, -3, 2, 1);
    } else {
      ctx.strokeStyle = '#a8b0b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(-4, -3, 8, 6);
      ctx.fillStyle = 'rgba(168,176,184,.35)';
      ctx.fillRect(-4, -3, 8, 6);
      ctx.fillStyle = '#c8302a';
      ctx.fillRect(-6, -3, 2, 6);
    }
    ctx.restore();
  }

  // Parrilla de plaza: base de ladrillo y la parrilla arriba. Prendida: brasas, los
  // pedazos de carne (uno por porción) que se van dorando y quemando, y humo.
  drawParrilla(g) {
    const ctx = this.ctx;
    const x = g.x - G.cam.x, y = g.y - G.cam.y;
    if (x < -20 || y < -20 || x > RW + 20 || y > RH + 20) return;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(px(x - 8), px(y - 3), 18, 9);
    ctx.fillStyle = '#9a4a32';
    ctx.fillRect(px(x - 9), px(y - 5), 18, 9);
    ctx.fillStyle = '#b8603e';
    ctx.fillRect(px(x - 9), px(y - 5), 18, 2);
    ctx.fillStyle = g.cooking ? (Math.floor(G.t * 5) % 2 ? '#ff7a2a' : '#d84a1a') : '#2a2420';
    ctx.fillRect(px(x - 7), px(y - 3), 14, 5);
    ctx.fillStyle = '#5a5e64';
    for (let i = -6; i <= 6; i += 2) ctx.fillRect(px(x + i), px(y - 3), 1, 5);
    if (!g.cooking) return;
    const k = clamp(g.t / ASADO_QUEMA, 0, 1), quema = clamp((g.t - ASADO_QUEMA) / (ASADO_CARBON - ASADO_QUEMA), 0, 1);
    const col = quema > 0 ? mix('#7a3a1e', '#141010', quema) : mix('#c84a4a', '#7a3a1e', k);
    for (let i = 0; i < g.portions; i++) {
      ctx.fillStyle = col;
      ctx.fillRect(px(x - 6 + i * 4.5), px(y - 2.5), 4, 3);
    }
    if (Math.random() < 0.08 + quema * 0.2) puff(g.x + rnd(-4, 4), g.y - 6, quema > 0.3 ? '50,50,50' : '210,210,210', 1, 9);
    // Cómo va, para el que está al lado
    const P = G.me;
    if (P && dist(P, g) < 60) {
      const lbl = g.t < ASADO_PUNTO ? ['CRUDO', '#ff8a8a'] : g.t < ASADO_QUEMA ? ['A PUNTO!', '#8ef08e'] : ['QUEMANDOSE', '#ff6a3a'];
      this.text(lbl[0], x, y - 10, lbl[1], 5, 'center');
    }
  }

  // El perro del super de Lanús: duerme en la puerta y no se mueve por nada
  drawPerro(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -12 || y < -12 || x > RW + 12 || y > RH + 12) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.a);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(1, 1.5, 5, 3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b08a5a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(3, -2, 3, 3); // cabeza
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(4, -3, 1, 1); // oreja
    ctx.fillRect(-6, 0, 2, 1); // cola
    ctx.restore();
    // Zzz que suben
    const z = (G.t * 0.6 + p.x * 0.01) % 1;
    ctx.globalAlpha = 1 - z;
    this.text('z', x + 4 + z * 3, y - 5 - z * 8, '#e8e8e8', 4);
    ctx.globalAlpha = 1;
  }

  drawPalm(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -24 || y < -30 || x > RW + 24 || y > RH + 24) return;
    const H = 26 * p.s;
    const dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL;
    ctx.strokeStyle = '#6b5636';
    ctx.lineWidth = 3 * p.s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();

    const tx = x + dx, ty = y + dy, sw = Math.sin(G.t * 1.2 + p.x * 0.1) * 1.5;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + sw * 0.1;
      ctx.strokeStyle = i % 2 ? '#2f6b34' : '#3d8a3f';
      ctx.lineWidth = 2.4 * p.s;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(a) * 7 * p.s, ty + Math.sin(a) * 7 * p.s - 2,
        tx + Math.cos(a) * 12 * p.s + sw, ty + Math.sin(a) * 12 * p.s + 3
      );
      ctx.stroke();
    }
    ctx.fillStyle = '#4a3a22';
    ctx.fillRect(px(tx - 2), px(ty - 2), 4, 4);
  }

  // Arbol del cantero de la avenida: tronco extruido y copa de varios bollos,
  // para que se lea como arbol y no como una mancha verde redonda.
  drawArbol(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -30 || y < -40 || x > RW + 30 || y > RH + 30) return;
    // Bajito, como las palmeras. El alto sale de la extrusion natural mas un
    // empujon fijo hacia arriba: si se normalizara a un largo minimo, al caminar
    // alrededor el tronco giraria como aguja de reloj.
    const H = 22 * p.s;
    const dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL - 7 * p.s;
    const tx = x + dx, ty = y + dy;
    ctx.strokeStyle = '#5b452a';
    ctx.lineWidth = 3.2 * p.s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    const sw = Math.sin(G.t * 0.9 + p.x * 0.07) * 0.8;
    const blobs = [
      [0, 0, 6.2, '#3f7a38'],
      [-4, -1, 4.6, '#4f9143'],
      [4, -0.8, 4.4, '#356b30'],
      [0, -4, 4.8, '#58a049'],
      [0, 2.6, 4.0, '#2f6130'],
    ];
    for (const [ox, oy, r, col] of blobs) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(tx + (ox + sw) * p.s, ty + oy * p.s, r * p.s, 0, TAU);
      ctx.fill();
    }
  }

  // Sombrilla de playa: palo extruido y lona de gajos vista desde arriba. El viento
  // la mece un poquito (todo sale de G.t: se ve igual en todas las pantallas).
  drawSombrilla(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -24 || y < -30 || x > RW + 24 || y > RH + 24) return;
    const H = 20 * p.s;
    const dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL - 6 * p.s;
    const vi = Math.sin(G.t * 1.7 + p.x * 0.13) * 0.7 + Math.sin(G.t * 4.3 + p.y * 0.2) * 0.25;
    const tx = x + dx + vi, ty = y + dy + vi * 0.35, R = 11 * p.s;
    ctx.fillStyle = 'rgba(0,0,0,.20)'; // sombra en la arena
    ctx.beginPath();
    ctx.ellipse(x + 3 + vi * 0.5, y + 3, R * 0.9, R * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a7f60'; // palo
    ctx.lineWidth = 2 * p.s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // Lona: gajos alternados del color de la sombrilla y blanco; con el viento giran
    // apenas y el borde de cada gajo se infla y se desinfla.
    const giro = Math.sin(G.t * 0.8 + p.y * 0.05) * 0.12;
    for (let i = 0; i < 8; i++) {
      const a0 = i / 8 * TAU + giro, a1 = (i + 1) / 8 * TAU + giro;
      const Ri = R * (1 + Math.sin(G.t * 5.1 + i * 1.9 + p.x) * 0.035);
      ctx.fillStyle = i % 2 ? '#f2ede0' : p.col;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.arc(tx, ty, Ri, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.10)'; // el lado de la lona que no le da el sol
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.arc(tx, ty, R, 0.15 * TAU + giro, 0.6 * TAU + giro);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b6152';
    ctx.beginPath();
    ctx.arc(tx, ty, 1.6 * p.s, 0, TAU);
    ctx.fill();
  }

  // Extrusion de un punto de pantalla hacia "arriba" segun su altura
  upPt(x, y, H) {
    return [x + (x - RW / 2) * H / FOCAL, y + (y - RH / 2) * H / FOCAL];
  }

  // Bañista chiquito parado (alto ~8) o sentado (alto ~4): piernas, malla, torso y
  // cabeza escalonados por la extrusion, como el tronco de las palmeras.
  drawBanista(x, y, alto, q) {
    const ctx = this.ctx;
    const m = this.upPt(x, y, alto * 0.45), t = this.upPt(x, y, alto);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(px(x - 1), px(y), 4, 2);
    ctx.strokeStyle = q.piel;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(m[0], m[1]);
    ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(m[0], m[1]);
    ctx.lineTo(t[0], t[1]);
    ctx.stroke();
    ctx.fillStyle = q.malla;
    ctx.fillRect(px(m[0] - 2), px(m[1] - 1), 4, 2);
    ctx.fillStyle = q.piel;
    ctx.fillRect(px(t[0] - 1.5), px(t[1] - 3), 3, 3);
    ctx.fillStyle = 'rgba(40,28,18,.85)';
    ctx.fillRect(px(t[0] - 1.5), px(t[1] - 3), 3, 1);
  }

  // Caja extruida (piso en coordenadas de pantalla): paredes de la mas lejana del
  // centro a la mas cercana, y el techo encima.
  cajita(x, y, w, h, H0, H1, pared, techo) {
    const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const lo = c.map(([a, b]) => this.upPt(a, b, H0)), hi = c.map(([a, b]) => this.upPt(a, b, H1));
    const lados = [0, 1, 2, 3].map(i => {
      const k = (i + 1) % 4, mx = (c[i][0] + c[k][0]) / 2 - RW / 2, my = (c[i][1] + c[k][1]) / 2 - RH / 2;
      return { i, k, d: mx * mx + my * my };
    }).sort((a, b) => b.d - a.d);
    for (const { i, k } of lados) {
      this.quad(lo[i][0], lo[i][1], lo[k][0], lo[k][1], hi[k][0], hi[k][1], hi[i][0], hi[i][1], i % 2 ? shade(pared, 0.8) : pared);
    }
    if (techo) this.quad(hi[0][0], hi[0][1], hi[1][0], hi[1][1], hi[2][0], hi[2][1], hi[3][0], hi[3][1], techo);
    return hi;
  }

  // Puesto de choripan: casilla de madera con techito de paja, cartel, humo de la
  // parrilla y la cola de gente esperando del lado del agua.
  drawChiringuito(p, night) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -50 || y < -60 || x > RW + 50 || y > RH + 50) return;
    const w = 22, h = 14, x0 = x - w / 2, y0 = y - h / 2;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(px(x0 + 3), px(y0 + 4), w + 2, h + 2);
    for (const q of p.gente) if (q.dy < 0 || q.dx < 0) this.drawBanista(x + q.dx, y + q.dy, 8, q);
    this.cajita(x0, y0, w, h, 0, 9, '#b8946a', null);
    // Mostrador del lado del agua
    const f = this.upPt(x + p.fx * (w / 2 + 1), y + p.fy * (h / 2 + 1), 6);
    ctx.fillStyle = '#7a5634';
    ctx.fillRect(px(f[0] - (p.fx ? 1.5 : 9)), px(f[1] - (p.fy ? 1.5 : 6)), p.fx ? 3 : 18, p.fy ? 3 : 12);
    // Techo de paja con alero
    const t = this.cajita(x0 - 3, y0 - 3, w + 6, h + 6, 12, 14, '#8a6a3a', '#c49a52');
    ctx.strokeStyle = 'rgba(110,80,40,.6)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) {
      const a = k / 6;
      ctx.beginPath();
      ctx.moveTo(t[0][0] + (t[1][0] - t[0][0]) * a, t[0][1] + (t[1][1] - t[0][1]) * a);
      ctx.lineTo(t[3][0] + (t[2][0] - t[3][0]) * a, t[3][1] + (t[2][1] - t[3][1]) * a);
      ctx.stroke();
    }
    // Toldito a rayas sobre el mostrador
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = k % 2 ? '#f2ede0' : p.col;
      const a = this.upPt(x + p.fx * (w / 2 + 3) + (p.fx ? 0 : (k - 3) * 4), y + p.fy * (h / 2 + 3) + (p.fy ? 0 : (k - 3) * 4), 11);
      ctx.fillRect(px(a[0]), px(a[1]), p.fx ? 3 : 4, p.fy ? 3 : 4);
    }
    // Cartel
    const c = this.upPt(x, y, 15);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const cw = p.cartel.length * 5 + 4;
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(px(c[0] - cw / 2), px(c[1] - 4), cw, 7);
    ctx.fillStyle = night > 0.3 && Math.floor(G.t * 1.5 + p.x) % 4 ? '#ffd34a' : '#f2ede0';
    ctx.fillText(p.cartel, px(c[0]), px(c[1] + 2));
    // Humo de la parrilla: bocanadas que suben y se apagan (solo de G.t)
    for (let k = 0; k < 4; k++) {
      const ph = (G.t * 0.6 + k / 4 + p.x * 0.01) % 1;
      const s = this.upPt(x + w / 2 - 4 + Math.sin(G.t * 1.3 + k) * 2, y - h / 2 + 3, 16 + ph * 22);
      ctx.fillStyle = 'rgba(225,222,215,' + (0.4 * (1 - ph)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s[0] + ph * 6, s[1], 2 + ph * 3.5, 0, TAU);
      ctx.fill();
    }
    for (const q of p.gente) if (!(q.dy < 0 || q.dx < 0)) this.drawBanista(x + q.dx, y + q.dy, 8, q);
  }

  // Torre de guardavidas: cuatro patas, plataforma, casilla roja y la bandera que flamea
  drawGuardavidas(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -50 || y < -70 || x > RW + 50 || y > RH + 50) return;
    const s = 5;
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(px(x - s + 6), px(y - s + 8), s * 2 + 2, s * 2);
    ctx.strokeStyle = '#e8e2d2';
    ctx.lineWidth = 1.4;
    for (const [a, b] of [[-s, -s], [s, -s], [s, s], [-s, s]]) {
      const t = this.upPt(x + a, y + b, 16);
      ctx.beginPath();
      ctx.moveTo(x + a, y + b);
      ctx.lineTo(t[0], t[1]);
      ctx.stroke();
    }
    // Escalera que baja para el lado del agua
    const ex = Math.cos(p.a), ey = Math.sin(p.a);
    ctx.strokeStyle = '#cfc9ba';
    ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const a = this.upPt(x + ex * (s + 6 - k * 1.4), y + ey * (s + 6 - k * 1.4), k * 4);
      ctx.fillStyle = '#cfc9ba';
      ctx.fillRect(px(a[0] - 2), px(a[1]), 4, 1);
    }
    this.cajita(x - s - 1, y - s - 1, s * 2 + 2, s * 2 + 2, 15, 16, '#8a6a44', '#a07a4e');
    // Baranda roja y el guardavidas parado mirando al agua
    ctx.strokeStyle = '#d8352a';
    ctx.lineWidth = 1;
    const bar = [[-s - 1, -s - 1], [s + 1, -s - 1], [s + 1, s + 1], [-s - 1, s + 1]].map(([a, b]) => this.upPt(x + a, y + b, 20));
    ctx.beginPath();
    ctx.moveTo(bar[0][0], bar[0][1]);
    for (let k = 1; k <= 4; k++) ctx.lineTo(bar[k % 4][0], bar[k % 4][1]);
    ctx.stroke();
    const pl = this.upPt(x + ex * 2, y + ey * 2, 16);
    this.drawBanista(pl[0], pl[1], 8, { malla: '#d8352a', piel: '#c4926a' });
    // Techito a dos aguas rojo y amarillo, corrido para el lado de tierra
    const tx0 = x - ex * 3, ty0 = y - ey * 3;
    const r0 = this.upPt(tx0 - s, ty0 - s, 25), r1 = this.upPt(tx0 + s, ty0 - s, 25);
    const r2 = this.upPt(tx0 + s, ty0 + s, 25), r3 = this.upPt(tx0 - s, ty0 + s, 25);
    this.quad(r0[0], r0[1], r1[0], r1[1], (r1[0] + r2[0]) / 2, (r1[1] + r2[1]) / 2, (r0[0] + r3[0]) / 2, (r0[1] + r3[1]) / 2, '#d8352a');
    this.quad((r0[0] + r3[0]) / 2, (r0[1] + r3[1]) / 2, (r1[0] + r2[0]) / 2, (r1[1] + r2[1]) / 2, r2[0], r2[1], r3[0], r3[1], '#f2c230');
    // Bandera: palo y paño rojo y amarillo que flamea con el viento
    const b0 = this.upPt(x + s - 1, y - s + 1, 23), b1 = this.upPt(x + s - 1, y - s + 1, 34);
    ctx.strokeStyle = '#e8e2d2';
    ctx.beginPath();
    ctx.moveTo(b0[0], b0[1]);
    ctx.lineTo(b1[0], b1[1]);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const ond = Math.sin(G.t * 7 - k * 1.1) * 1.2;
      ctx.fillStyle = (k + 1) % 2 ? '#d8352a' : '#f2c230';
      ctx.fillRect(px(b1[0] + 1 + k * 2), px(b1[1] + ond), 2, 4);
    }
  }

  // Canchita de voley: postes, red y la pelota que va y viene por arriba, con los
  // jugadores saltando. Las lineas de la cancha estan horneadas en el piso.
  drawVoley(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -50 || y < -60 || x > RW + 50 || y > RH + 50) return;
    const ux = Math.cos(p.a), uy = Math.sin(p.a), vx = -uy, vy = ux;
    const at = (u, v) => [x + ux * u + vx * v, y + uy * u + vy * v];
    const ph = (G.t * 0.55 + p.seed) % 2, ida = ph < 1 ? 1 : -1, f = ph % 1;
    for (const q of p.gente) {
      if (q.u * ida > 0) continue; // primero los del lado que recibe (quedan atras)
      const [gx, gy] = at(q.u, q.v);
      this.drawBanista(gx, gy, 8 + Math.max(0, Math.sin(G.t * 5 + q.v)) * 2, q);
    }
    const P0 = at(0, -13), P1 = at(0, 13);
    const a0 = this.upPt(P0[0], P0[1], 11), a1 = this.upPt(P1[0], P1[1], 11);
    const b0 = this.upPt(P0[0], P0[1], 6), b1 = this.upPt(P1[0], P1[1], 6);
    this.quad(b0[0], b0[1], b1[0], b1[1], a1[0], a1[1], a0[0], a0[1], 'rgba(240,240,232,.28)');
    ctx.strokeStyle = 'rgba(30,30,30,.35)';
    ctx.lineWidth = 0.6;
    for (let k = 1; k < 8; k++) {
      const a = k / 8;
      ctx.beginPath();
      ctx.moveTo(b0[0] + (b1[0] - b0[0]) * a, b0[1] + (b1[1] - b0[1]) * a);
      ctx.lineTo(a0[0] + (a1[0] - a0[0]) * a, a0[1] + (a1[1] - a0[1]) * a);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f2ede0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.lineTo(a1[0], a1[1]);
    ctx.stroke();
    ctx.strokeStyle = '#6b5636';
    ctx.lineWidth = 1.6;
    for (const [P, A] of [[P0, a0], [P1, a1]]) {
      ctx.beginPath();
      ctx.moveTo(P[0], P[1]);
      ctx.lineTo(A[0], A[1]);
      ctx.stroke();
    }
    for (const q of p.gente) {
      if (q.u * ida <= 0) continue;
      const [gx, gy] = at(q.u, q.v);
      this.drawBanista(gx, gy, 8 + Math.max(0, Math.sin(G.t * 5 + q.v)) * 2, q);
    }
    // Pelota: parabola de un lado al otro
    const [bx, by] = at(-ida * 13 + ida * 26 * f, Math.sin(ph * 3.1) * 5);
    const z = 9 + Math.sin(f * Math.PI) * 17;
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(px(bx - 1), px(by), 3, 2);
    const bp = this.upPt(bx, by, z);
    ctx.fillStyle = '#f6f2e4';
    ctx.beginPath();
    ctx.arc(bp[0], bp[1] - z * 0.25, 1.9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e0b83a';
    ctx.fillRect(px(bp[0] - 1), px(bp[1] - z * 0.25 - 1), 1, 2);
  }

  // Carpa canadiense: dos faldones que suben a la cumbrera
  drawCarpa(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -30 || y < -30 || x > RW + 30 || y > RH + 30) return;
    const L = 9, W = 6, H = 8;
    const ax = p.horiz ? L : 0, ay = p.horiz ? 0 : L, bx = p.horiz ? 0 : W, by = p.horiz ? W : 0;
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(px(x - L + 2), px(y - L + 3), L * 2, L * 2 - 2);
    const r0 = this.upPt(x - ax, y - ay, H), r1 = this.upPt(x + ax, y + ay, H);
    const lados = [
      [[x - ax - bx, y - ay - by], [x + ax - bx, y + ay - by]],
      [[x - ax + bx, y - ay + by], [x + ax + bx, y + ay + by]],
    ].map(e => ({ e, d: Math.hypot((e[0][0] + e[1][0]) / 2 - RW / 2, (e[0][1] + e[1][1]) / 2 - RH / 2) }))
      .sort((a, b) => b.d - a.d);
    lados.forEach(({ e }, k) => {
      this.quad(e[0][0], e[0][1], e[1][0], e[1][1], r1[0], r1[1], r0[0], r0[1], k ? p.col : shade(p.col, 0.72));
    });
    // Puerta en una punta
    const pu = [x + ax, y + ay];
    this.quad(pu[0] - bx * 0.6, pu[1] - by * 0.6, pu[0] + bx * 0.6, pu[1] + by * 0.6, r1[0], r1[1], r1[0], r1[1], '#2a2a2e');
    ctx.strokeStyle = shade(p.col, 1.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r0[0], r0[1]);
    ctx.lineTo(r1[0], r1[1]);
    ctx.stroke();
  }

  // Fogon: la ronda sentada en los troncos y el fuego. De dia es brasa y humito;
  // a la noche prende en serio (el brillo va en drawLights).
  drawFogata(p, night) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -40 || y < -50 || x > RW + 40 || y > RH + 40) return;
    const atras = [], adelante = [];
    for (const q of p.gente) (Math.sin(q.a) < 0 ? atras : adelante).push(q);
    for (const q of atras) this.drawBanista(x + Math.cos(q.a) * 10, y + Math.sin(q.a) * 10, 5, q);
    const fuego = clamp((night - 0.12) * 3, 0.25, 1);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * TAU + 0.6, r = k ? 1.8 : 0;
      const fx = x + Math.cos(a) * r, fy = y + Math.sin(a) * r;
      const h = (3 + 4 * Math.abs(Math.sin(G.t * 9 + k * 1.7 + p.x))) * fuego;
      const t = this.upPt(fx, fy, h);
      this.quad(fx - 1.6, fy, fx + 1.6, fy, t[0], t[1], t[0], t[1], k % 2 ? '#ff8a2a' : '#ffc23a');
    }
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(px(x - 1), px(y - 1), 2, 2);
    // Chispas y humo
    for (let k = 0; k < 3; k++) {
      const ph = (G.t * (0.5 + k * 0.13) + k / 3) % 1;
      const s = this.upPt(x + Math.sin(G.t * 2 + k * 2) * 2, y, 6 + ph * 24);
      if (fuego > 0.5 && k < 2) {
        ctx.fillStyle = 'rgba(255,190,80,' + (1 - ph).toFixed(3) + ')';
        ctx.fillRect(px(s[0] + ph * 3), px(s[1]), 1, 1);
      }
      ctx.fillStyle = 'rgba(200,198,190,' + (0.3 * (1 - ph) * (1.3 - fuego)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s[0] + ph * 5, s[1] - 4, 1.5 + ph * 3, 0, TAU);
      ctx.fill();
    }
    for (const q of adelante) this.drawBanista(x + Math.cos(q.a) * 10, y + Math.sin(q.a) * 10, 5, q);
  }

  // Muelle de pescadores: tablones sobre pilotes que salen de la arena y entran al
  // agua, con el pescador en la punta y la boya que sube y baja.
  drawMuelle(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x + p.dx * p.L < -60 && x < -60 || x + p.dx * p.L > RW + 60 && x > RW + 60
      || y + p.dy * p.L < -60 && y < -60 || y + p.dy * p.L > RH + 60 && y > RH + 60) return;
    const W = 4, H = 3, nx = -p.dy, ny = p.dx;
    const ex = x + p.dx * p.L, ey = y + p.dy * p.L;
    // Sombra sobre el agua y pilotes
    this.quad(x + nx * W + 3, y + ny * W + 4, ex + nx * W + 3, ey + ny * W + 4,
      ex - nx * W + 3, ey - ny * W + 4, x - nx * W + 3, y - ny * W + 4, 'rgba(0,0,0,.25)');
    ctx.fillStyle = '#3e2e1e';
    for (let u = 8; u <= p.L; u += 8) {
      for (const s of [-1, 1]) ctx.fillRect(px(x + p.dx * u + nx * W * s - 1), px(y + p.dy * u + ny * W * s - 1), 2, 2);
    }
    const c = [[x + nx * W, y + ny * W], [ex + nx * W, ey + ny * W], [ex - nx * W, ey - ny * W], [x - nx * W, y - ny * W]]
      .map(([a, b]) => this.upPt(a, b, H));
    this.quad(c[0][0], c[0][1], c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1], '#9a7a50');
    ctx.strokeStyle = 'rgba(60,42,26,.55)'; // juntas de los tablones
    ctx.lineWidth = 0.7;
    for (let u = 2; u < p.L; u += 2.5) {
      const a = this.upPt(x + p.dx * u + nx * W, y + p.dy * u + ny * W, H);
      const b = this.upPt(x + p.dx * u - nx * W, y + p.dy * u - ny * W, H);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    for (const q of p.gente) {
      const u = p.L * q.f, sx = x + p.dx * u + nx * 2 * q.lado, sy = y + p.dy * u + ny * 2 * q.lado;
      const b = this.upPt(sx, sy, H);
      this.drawBanista(b[0], b[1], q.lado > 0 ? 8 : 5, q);
      // Caña: sale de las manos y la tanza baja a la boya, afuera del muelle
      const m = this.upPt(b[0], b[1], 6), tip = this.upPt(sx + p.dx * 9 + nx * 7 * q.lado, sy + p.dy * 9 + ny * 7 * q.lado, 16);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(m[0], m[1]);
      ctx.lineTo(tip[0], tip[1]);
      ctx.stroke();
      const bob = Math.sin(G.t * 2.3 + q.f * 9) * 0.7;
      const fx = sx + p.dx * 16 + nx * 9 * q.lado, fy = sy + p.dy * 16 + ny * 9 * q.lado + bob;
      ctx.strokeStyle = 'rgba(235,235,235,.45)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = '#e8402a';
      ctx.fillRect(px(fx - 0.5), px(fy - 0.5), 2, 2);
      const ola = (G.t * 0.7 + q.f) % 1; // ondita alrededor de la boya
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * (1 - ola)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(fx + 0.5, fy + 0.5, 1 + ola * 4, 0.6 + ola * 2.2, 0, 0, TAU);
      ctx.stroke();
    }
  }

  // Gaviotas dando vueltas: la posicion sale solo de G.t, sin estado
  drawGaviotas(p, night) {
    if (night > 0.6) return;
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -120 || y < -120 || x > RW + 120 || y > RH + 120) return;
    ctx.globalAlpha = 1 - night;
    for (let k = 0; k < p.n; k++) {
      const dir = k % 2 ? 1 : -1, a = G.t * (0.32 + k * 0.05) * dir + p.seed + k * 2.1;
      const R = 34 + k * 13;
      const bx = x + Math.cos(a) * R + Math.sin(G.t * 0.21 + k) * 24, by = y + Math.sin(a) * R * 0.65;
      ctx.fillStyle = 'rgba(0,0,0,.12)'; // sombra en el piso
      ctx.fillRect(px(bx + 10), px(by + 14), 4, 1);
      const [sx, sy] = this.upPt(bx, by, 26);
      const al = Math.sin(G.t * 8 + k * 1.3 + p.seed) * 1.8, fx = Math.cos(a + dir * Math.PI / 2), fy = Math.sin(a + dir * Math.PI / 2);
      const nx = -fy, ny = fx;
      ctx.strokeStyle = '#f4f4ee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + nx * 4 - fx, sy + ny * 4 - fy + al);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx - nx * 4 - fx, sy - ny * 4 - fy + al);
      ctx.stroke();
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(px(sx + nx * 4 - fx), px(sy + ny * 4 - fy + al), 1, 1);
      ctx.fillRect(px(sx - nx * 4 - fx), px(sy - ny * 4 - fy + al), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Puente: el tablero va horneado en el piso (world.bakeGround); aca va lo que se mueve
  // o tiene altura: la espuma en las pilas, las barandas y la estructura propia de cada
  // estilo (reticulado, mastil atirantado, Transbordador). Todo se arma en coordenadas
  // del puente: u a lo largo de la calle, v a lo ancho, h altura.
  drawPuente(p) {
    const br = p.br;
    if (!br) return;
    const ctx = this.ctx, S = BRIDGE_STYLES[p.style] || BRIDGE_STYLES.hormigon;
    const tall = S.k === 'atirantado' || S.k === 'transbordador';
    const M = tall ? 110 : 50;
    const cu = p.horiz ? G.cam.x : G.cam.y, cvv = p.horiz ? G.cam.y : G.cam.x;
    if (p.b - cu < -M || p.a - cu > (p.horiz ? RW : RH) + M) return;
    if (p.base + p.w - cvv < -M || p.base - cvv > (p.horiz ? RH : RW) + M) return;

    const L = p.base, W = p.w, mid = L + W / 2, da = br.da, db = br.db;
    const E = 4, v0 = L - E, v1 = L + W + E, NOSE = 10;
    const vA = L - 2, vB = L + W + 2; // donde se paran las barandas: sobre la viga de borde
    // Extrusion comun (barandas, reticulado)
    const P = (u, v, h) => {
      const x = (p.horiz ? u : v) - G.cam.x, y = (p.horiz ? v : u) - G.cam.y;
      return [x + (x - RW / 2) * h / FOCAL, y + (y - RH / 2) * h / FOCAL];
    };
    // Lo muy alto (mastil, torres): como el obelisco, solo una parte del alto va por
    // extrusion y el resto es un empujon fijo hacia arriba, asi no gira como aguja de
    // reloj cuando la camara pasa al lado.
    const T = (u, v, h) => {
      const x = (p.horiz ? u : v) - G.cam.x, y = (p.horiz ? v : u) - G.cam.y, k = h * 0.45 / FOCAL;
      return [x + (x - RW / 2) * k, y + (y - RH / 2) * k - h * 0.55];
    };
    // Tanda de segmentos con un solo stroke
    const segs = (list, col, lw) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (const [q0, q1] of list) { ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); }
      ctx.stroke();
    };
    const poly = (pts, col, lw) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.stroke();
    };

    // --- Espuma: ola en la punta de cada pila aguas arriba y estela aguas abajo ---
    const f = br.flow;
    for (const pr of br.piers) {
      if (!pr.wet) continue;
      const vu = f > 0 ? v0 - NOSE : v1 + NOSE, vd = f > 0 ? v1 + NOSE : v0 - NOSE;
      for (let k = 0; k < 2; k++) {
        const ph = (G.t * 0.8 + k * 0.5 + pr.u * 0.013) % 1;
        const s = 3 + ph * 7;
        poly([P(pr.u - s, vu + f * (s * 0.9 + 2), 0), P(pr.u, vu - f * (1.5 - ph), 0), P(pr.u + s, vu + f * (s * 0.9 + 2), 0)],
          'rgba(240,248,252,' + (0.9 * (1 - ph)).toFixed(2) + ')', 1.3);
      }
      for (let k = 0; k < 4; k++) {
        const ph = (G.t * 0.55 + k * 0.25 + pr.u * 0.007) % 1;
        const q = P(pr.u + (k % 2 ? 1 : -1) * (2 + ph * 4), vd + f * (1 + ph * 22), 0);
        ctx.fillStyle = 'rgba(236,246,250,' + (0.6 * (1 - ph)).toFixed(2) + ')';
        ctx.fillRect(q[0] - 1, q[1] - 0.5, 2.5, 1.2);
      }
    }

    // --- Barandas a los dos lados, sobre la viga de borde ---
    const railing = (v, h, gap, post, top, panel) => {
      const A = P(da, v, 0), B = P(db, v, 0), At = P(da, v, h), Bt = P(db, v, h);
      if (panel) this.quad(A[0], A[1], B[0], B[1], Bt[0], Bt[1], At[0], At[1], panel);
      const posts = [];
      for (let u = da + 2; u <= db - 1; u += gap) posts.push([P(u, v, 0), P(u, v, h)]);
      segs(posts, post, 1);
      segs([[At, Bt]], top, 1.5);
    };
    if (S.k === 'hormigon') {
      // Balaustrada de hormigon y miradores redondos sobre las pilas
      for (const v of [vA, vB]) railing(v, 6, 4, 'rgba(90,84,72,.8)', '#e2dccd', 'rgba(201,194,178,.88)');
      for (const pr of br.piers) {
        for (const side of [-1, 1]) {
          const vc = side < 0 ? v0 : v1, arc = [];
          for (let i = 0; i <= 8; i++) {
            const a = Math.PI * i / 8;
            arc.push(P(pr.u - Math.cos(a) * 10, vc + side * Math.sin(a) * 10, 6));
          }
          poly(arc, '#e2dccd', 1.5);
        }
      }
    } else if (S.k === 'atirantado') {
      for (const v of [vA, vB]) railing(v, 5, 6, '#c9ccc6', '#f6f7f2', 'rgba(205,225,235,.22)');
    } else {
      for (const v of [vA, vB]) railing(v, 4, 8, S.dark, S.steel, null);
    }

    // --- Estructura de cada estilo ---
    if (S.k === 'reticulado') {
      // Dos vigas reticuladas a los costados (cordon arriba, montantes y cruces en X)
      // con portales arriba en las puntas. Van con la proyeccion de lo alto: con la
      // extrusion sola, vistas desde arriba quedaban de canto y no se leian las X.
      const HT = S.HT, n = Math.max(3, Math.round((db - da) / (HT * 1.7))), pl = (db - da) / n;
      const chords = [], webs = [], tops = [[], []];
      [vA, vB].forEach((v, si) => {
        const Bn = [], Tn = [];
        for (let i = 0; i <= n; i++) { Bn.push(T(da + i * pl, v, 0)); Tn.push(T(da + i * pl, v, HT)); }
        tops[si] = Tn;
        for (let i = 1; i < n - 1; i++) chords.push([Tn[i], Tn[i + 1]]);
        chords.push([Bn[0], Tn[1]], [Bn[n], Tn[n - 1]]); // montantes de punta, inclinados
        for (let i = 1; i < n; i++) webs.push([Bn[i], Tn[i]]);
        for (let i = 1; i < n - 1; i++) webs.push([Bn[i], Tn[i + 1]], [Tn[i], Bn[i + 1]]);      });
      // Arriostramiento superior: solo portales en las puntas y uno al medio, finitos,
      // para no tapar lo que pasa abajo
      const braces = [];
      for (const i of [1, n - 1, Math.round(n / 2)]) braces.push([tops[0][i], tops[1][i]]);
      segs(braces, S.dark, 1.6);
      segs(webs, S.dark, 1.6);
      segs(webs, S.steel, 0.9);
      segs(chords, S.dark, 2.4);
      segs(chords, S.steel, 1.4);
    } else if (S.k === 'atirantado') {
      // Mastil blanco inclinado, onda Puente de la Mujer: se para en la punta de una
      // pila, al costado del tablero, se inclina hacia afuera y hacia atras, y los
      // tirantes bajan en abanico hasta el borde del tablero. Si fuera sobre el eje,
      // visto desde arriba quedaria de canto y seria una raya.
      const mu = br.mast, H = 62, vf = v0 - 7;
      const tipU = mu - 24, tipV = vf - 34;
      const F = T(mu, vf, 0), Hd = T(tipU, tipV, H);
      // El grosor va de costado a la direccion en pantalla, asi no se afina de canto
      const dl = Math.hypot(Hd[0] - F[0], Hd[1] - F[1]) || 1, nx = -(Hd[1] - F[1]) / dl, ny = (Hd[0] - F[0]) / dl;
      const cables = [];
      const nC = 11, reach = Math.max(40, db - 14 - (mu + 10));
      for (let j = 0; j < nC; j++) {
        const k = 0.4 + 0.6 * j / (nC - 1);
        const m = T(mu + (tipU - mu) * k, vf + (tipV - vf) * k, H * k);
        cables.push([m, T(mu + 10 + reach * j / (nC - 1), vA, 0)]);
      }
      segs(cables, 'rgba(250,250,246,.8)', 0.8);
      const w0 = 5, w1 = 1.8;
      this.quad(F[0] - nx * w0, F[1] - ny * w0, F[0] + nx * w0, F[1] + ny * w0,
        Hd[0] + nx * w1, Hd[1] + ny * w1, Hd[0] - nx * w1, Hd[1] - ny * w1, S.steel);
      this.quad(F[0], F[1], F[0] + nx * w0, F[1] + ny * w0, Hd[0] + nx * w1, Hd[1] + ny * w1, Hd[0], Hd[1], S.dark);
      const tip = [Hd[0] + (Hd[0] - F[0]) * 0.05, Hd[1] + (Hd[1] - F[1]) * 0.05];
      this.quad(Hd[0] - nx * w1, Hd[1] - ny * w1, Hd[0] + nx * w1, Hd[1] + ny * w1, tip[0], tip[1], tip[0], tip[1], S.steel);
    } else if (S.k === 'transbordador') {
      // Transbordador: dos torres de hierro en las costas unidas arriba por una viga
      // reticulada, con la barquilla colgando que va y viene. Fino, para no tapar.
      const HB = 80, HG = 70, ua = da - 4, ub = db + 4, vl = v0 - 9, vr = v1 + 9;
      const legs = [], lattice = [];
      for (const u of [ua, ub]) {
        for (const v of [vl, vr]) {
          const b0 = T(u - 3, v, 0), b1 = T(u + 3, v, 0), t0 = T(u - 1.5, v, HB), t1 = T(u + 1.5, v, HB);
          legs.push([b0, t0], [b1, t1]);
          for (let h = 0; h < HB; h += 10) {
            const w0 = 3 - 1.5 * h / HB, w1 = 3 - 1.5 * (h + 10) / HB;
            lattice.push([T(u - w0, v, h), T(u + w1, v, h + 10)], [T(u + w0, v, h), T(u - w1, v, h + 10)]);
          }
        }
        // Travesanos arriba, de pata a pata
        legs.push([T(u, vl, HB), T(u, vr, HB)], [T(u, vl, HG), T(u, vr, HG)]);
        lattice.push([T(u, vl, HB), T(u, vr, HG)], [T(u, vl, HG), T(u, vr, HB)]);
      }
      // Vigas altas de costa a costa
      for (const v of [vl, vr]) {
        legs.push([T(ua, v, HB), T(ub, v, HB)], [T(ua, v, HG), T(ub, v, HG)]);
        const n = Math.max(4, Math.round((ub - ua) / 14));
        for (let i = 0; i < n; i++) {
          const u0 = ua + (ub - ua) * i / n, u1 = ua + (ub - ua) * (i + 1) / n;
          lattice.push(i % 2 ? [T(u0, v, HB), T(u1, v, HG)] : [T(u0, v, HG), T(u1, v, HB)]);
        }
      }
      segs(lattice, 'rgba(70,82,94,.75)', 0.8);
      segs(legs, S.dark, 2);
      segs(legs, S.steel, 1.1);
      // Barquilla: carro arriba, cables y plataforma, que cruza despacio de costa a costa
      const ug = da + 14 + (db - da - 28) * (0.5 - 0.5 * Math.cos(G.t * 0.11)), HP = 34;
      const c = [T(ug - 8, L, HP), T(ug + 8, L, HP), T(ug + 8, L + W, HP), T(ug - 8, L + W, HP)];
      segs([[T(ug, vl, HG), c[0]], [T(ug, vl, HG), c[1]], [T(ug, vr, HG), c[2]], [T(ug, vr, HG), c[3]]],
        'rgba(40,46,52,.8)', 0.7);
      this.quad(c[0][0], c[0][1], c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1], 'rgba(60,70,80,.55)');
      poly([c[0], c[1], c[2], c[3], c[0]], 'rgba(200,90,50,.85)', 1);
    }
  }

  drawObelisco(o) {
    const ctx = this.ctx;
    const x = o.x - G.cam.x, y = o.y - G.cam.y;
    if (x < -60 || y < -260 || x > RW + 60 || y > RH + 60) return;
    // El barrido de la extrusion radial crece con H: con 130 el obelisco giraba
    // como aguja de reloj al caminarle alrededor. Se baja el alto proyectado y
    // la mayor parte del largo pasa a ser un empujon fijo hacia arriba, que no
    // depende de donde este la camara.
    const H = 52;
    const dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL - 74;
    const tx = x + dx, ty = y + dy;
    // Ancho siempre horizontal: la base es un cuadrado fijo en el piso y no gira
    // con la camara, igual que el techo de los edificios.
    const w = 9, tw = w * 0.55; // se afina hacia la punta, como el de verdad
    ctx.fillStyle = '#6b6a63';
    ctx.fillRect(px(x - w), px(y), w * 2, 4);
    // Fuste completo
    this.quad(x - w, y, x + w, y, tx + tw, ty, tx - tw, ty, '#e0ded4');
    // Media cara en sombra: siempre la misma, el sol no se mueve con la camara
    this.quad(x, y, x + w, y, tx + tw, ty, tx, ty, '#b9b6ab');
    // Punta piramidal
    ctx.beginPath();
    ctx.moveTo(tx - tw, ty);
    ctx.lineTo(tx + tw, ty);
    ctx.lineTo(tx, ty - 18);
    ctx.closePath();
    ctx.fillStyle = '#f0eee6';
    ctx.fill();
  }

  drawRopa(p) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -50 || y < -20 || x > RW + 10 || y > RH + 20) return;
    const H = 9, dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL;
    ctx.strokeStyle = 'rgba(30,30,30,.7)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + p.w + dx, y + dy);
    ctx.stroke();
    const sway = Math.sin(G.t * 2 + p.x) * 0.6;
    p.cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(px(x + dx + 2 + i * (p.w - 4) / 5 + sway), px(y + dy), 3, 3 + (i % 2));
    });
  }

  drawBarril(p, night) {
    const ctx = this.ctx;
    const x = p.x - G.cam.x, y = p.y - G.cam.y;
    if (x < -12 || y < -16 || x > RW + 12 || y > RH + 12) return;
    ctx.fillStyle = '#3a3026';
    ctx.fillRect(px(x - 3), px(y - 3), 6, 6);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(px(x - 3), px(y - 3), 6, 1);
    const f = Math.sin(G.t * 13 + p.x) > 0;
    ctx.fillStyle = f ? '#ffb03a' : '#ff6a2a';
    ctx.fillRect(px(x - 2), px(y - 5), 4, 2);
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(px(x - 1 + (f ? 1 : 0)), px(y - 7), 1, 2);
    if (Math.random() < 0.05) puff(p.x, p.y - 6, '70,70,70', 1, 10);
  }

  drawTrafficLight(L) {
    if (L.off) return;
    const ctx = this.ctx;
    const x = L.x - G.cam.x, y = L.y - G.cam.y;
    if (x < -ROAD - 30 || y < -ROAD - 30 || x > RW + ROAD + 30 || y > RH + ROAD + 30) return;
    const H = 19, off = ROAD / 2 + 4;
    const heads = [
      { dx: -off, dy: -off, horiz: true },
      { dx:  off, dy:  off, horiz: true },
      { dx:  off, dy: -off, horiz: false },
      { dx: -off, dy:  off, horiz: false },
    ];
    // Donde pasa la Diagonal hay una luz más, la de su fase
    if (L.diag) heads.push({ dx: off + 8, dy: -off - 8, horiz: 'd' }, { dx: -off - 8, dy: off + 8, horiz: 'd' });
    for (const h of heads) {
      const bx = x + h.dx, by = y + h.dy;
      if (bx < -20 || by < -20 || bx > RW + 20 || by > RH + 20) continue;
      const ex = (bx - RW / 2) * H / FOCAL, ey = (by - RH / 2) * H / FOCAL;
      ctx.strokeStyle = '#2b2e33';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + ex, by + ey);
      ctx.stroke();

      const hx = bx + ex, hy = by + ey;
      ctx.fillStyle = '#16181c';
      ctx.fillRect(px(hx - 2.5), px(hy - 6), 5, 11);
      const st = lightState(L, h.horiz);
      const on = { rojo: '#ff3a2a', amarillo: '#ffc21a', verde: '#39d94a' };
      for (const [i, k] of ['rojo', 'amarillo', 'verde'].entries()) {
        ctx.fillStyle = st === k ? on[k] : 'rgba(20,20,20,.9)';
        ctx.fillRect(px(hx - 1.5), px(hy - 4.6 + i * 3.2), 3, 2.6);
      }
    }
  }

  drawLamp(l, night) {
    const ctx = this.ctx;
    const x = l.x - G.cam.x, y = l.y - G.cam.y;
    if (x < -20 || y < -24 || x > RW + 20 || y > RH + 20) return;
    const H = 22, dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL;
    ctx.strokeStyle = '#3a3d44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
    ctx.fillStyle = night > 0.3 ? '#ffe08a' : '#9aa0a8';
    ctx.fillRect(px(x + dx - 3), px(y + dy - 2), 6, 4);
  }

  drawPickup(pk) {
    const ctx = this.ctx;
    const x = pk.x - G.cam.x, y = pk.y - G.cam.y + Math.sin(pk.t * 3) * 2;
    if (x < -12 || y < -12 || x > RW + 12 || y > RH + 12) return;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(px(x - 4), px(pk.y - G.cam.y + 4), 9, 3);

    if (pk.kind === 'weapon') {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.7, 0.7);
      weaponIcon(ctx, pk.w, 0, 0);
      ctx.restore();
    } else if (pk.kind === 'gold') {
      // Balón de oro: pelota dorada con brillo
      ctx.fillStyle = '#a8790f';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f2c63a';
      ctx.beginPath();
      ctx.arc(x - 0.5, y - 0.5, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(px(x - 2), px(y - 2), 1.5, 1.5);
    } else if (pk.kind === 'merca') {
      ctx.fillStyle = '#2f3040';
      ctx.fillRect(px(x - 4), px(y - 3), 9, 7);
      ctx.fillStyle = '#f7f7ff';
      ctx.fillRect(px(x - 4), px(y - 4), 8, 6);
      ctx.fillStyle = '#d7dcff';
      ctx.fillRect(px(x - 2), px(y - 2), 5, 1);
    } else if (pk.kind === 'cash') {
      ctx.fillStyle = '#1f5c23';
      ctx.fillRect(px(x - 5), px(y - 4), 10, 7);
      ctx.fillStyle = '#3f9c43';
      ctx.fillRect(px(x - 5), px(y - 4), 10, 3);
      ctx.fillStyle = '#d8f0d8';
      ctx.fillRect(px(x - 2), px(y - 2), 4, 3);
    } else {
      foodIcon(ctx, pk.food, x, y);
    }
  }

  drawGuy(e, faceKey, shirt, pants, hurt) {
    const ctx = this.ctx;
    const x = e.x - G.cam.x, y = e.y - G.cam.y;
    if (x < -24 || y < -26 || x > RW + 24 || y > RH + 24) return;
    const s = Math.sin(e.walk || 0);
    const fx = Math.cos(e.ang), fy = Math.sin(e.ang);
    const rxp = -fy, ryp = fx;
    const bob = Math.abs(s) * 0.9;

    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 5.5, 6.5, 3.4, 0, 0, TAU);
    ctx.fill();

    // Piernas
    ctx.fillStyle = pants;
    for (const sg of [1, -1]) {
      const sw = s * sg * 2.6;
      ctx.fillRect(px(x + rxp * sg * 2.2 + fx * sw - 1.5), px(y + ryp * sg * 2.2 + fy * sw + 0.5), 3, 4);
    }

    // Torso orientado
    ctx.save();
    ctx.translate(x, y - 2 - bob);
    ctx.rotate(e.ang);
    ctx.fillStyle = shade(shirt, 0.78);
    ctx.fillRect(-4, -4.2, 8.5, 8.5);
    ctx.fillStyle = shirt;
    ctx.fillRect(-4, -4.2, 6.8, 8.5);
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.fillRect(-4, -4.2, 6.8, 2);
    if (e.famous && e.famous.stripes) {
      // Camiseta a rayas (vistas desde arriba, cruzan el torso de hombro a hombro)
      ctx.fillStyle = e.famous.stripes;
      ctx.fillRect(-4, -2.2, 6.8, 1.1);
      ctx.fillRect(-4, 1.1, 6.8, 1.1);
    }
    ctx.fillStyle = '#c49a72'; // Brazos
    ctx.fillRect(2, -5.5, 3, 2.6);
    ctx.fillRect(2, 3, 3, 2.6);
    this.drawHeld(e.wpn || 'pistola', e.swing || 0);
    ctx.restore();

    // Cabeza y cara
    const f = G.faces[faceKey] || G.faces.ped;
    const hy = y - 11 - bob;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(px(x - 6.5), px(hy - 0.5), 13, 13);
    if (f) {
      // La foto de la cara tiene el doble de píxeles que la grilla del juego (FACE_PX)
      ctx.drawImage(f, px(x - 6), px(hy), 12, 12);
    } else {
      ctx.fillStyle = '#c9a07a';
      ctx.fillRect(px(x - 4), px(hy + 1), 8, 8);
    }
    if (hurt) {
      ctx.fillStyle = 'rgba(190,20,20,.35)';
      ctx.fillRect(px(x - 6), px(hy), 12, 12);
    }

    // Fogonazo en la punta del caño
    if (e.muzzle > 0) {
      const bl = (WEAPONS[e.wpn] || WEAPONS.pistola).barrel || 11;
      ctx.globalAlpha = e.muzzle;
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath();
      ctx.moveTo(x + fx * bl, y + fy * bl);
      ctx.lineTo(x + fx * (bl + 6) + rxp * 3.5, y + fy * (bl + 6) + ryp * 3.5);
      ctx.lineTo(x + fx * (bl + 6) - rxp * 3.5, y + fy * (bl + 6) - ryp * 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Arma en la mano, dibujada en coordenadas del torso (mirando a +x)
  drawHeld(id, swing) {
    const ctx = this.ctx;
    if (id === 'baston') {
      ctx.save();
      ctx.translate(3, 3);
      ctx.rotate(swing > 0 ? lerp(1.0, -1.4, swing) : 0.3);
      ctx.fillStyle = '#2f9a3a';
      ctx.fillRect(0, -1, 14, 2);
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(13, -1, 2, 2);
      ctx.restore();
    } else if (id === 'granada') {
      ctx.fillStyle = '#3f5a2a';
      ctx.fillRect(4.5, 2, 3.6, 3.6);
    } else if (id === 'uzi') {
      ctx.fillStyle = '#16181c';
      ctx.fillRect(4.5, -1.5, 7, 3);
      ctx.fillRect(6, 1.5, 2, 2);
    } else if (id === 'escopeta') {
      ctx.fillStyle = '#6a4020';
      ctx.fillRect(1, -1.2, 5, 2.4);
      ctx.fillStyle = '#16181c';
      ctx.fillRect(6, -1, 8, 2);
    } else if (id === 'ak') {
      ctx.fillStyle = '#6a4020';
      ctx.fillRect(0, -1.3, 5, 2.6);
      ctx.fillStyle = '#16181c';
      ctx.fillRect(5, -1.3, 9, 2.6);
      ctx.fillRect(7, 1.3, 2, 2.5);
    } else {
      ctx.fillStyle = '#16181c';
      ctx.fillRect(4.5, -1.2, 6, 2.4);
    }
  }

  drawCar(c, night) {
    const ctx = this.ctx;
    const x = c.x - G.cam.x, y = c.y - G.cam.y;
    if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) return;
    const H = 11, dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL;
    const w = c.w, h = c.h;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,.36)';
    ctx.save();
    ctx.translate(x + 3, y + 4);
    ctx.rotate(c.ang);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();

    // Ruedas y chasis
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.ang);
    ctx.fillStyle = '#131418';
    const st = c.steer * 0.5;
    for (const [wx, wy, rot] of [[w * 0.28, -h / 2, st], [w * 0.28, h / 2 - 3, st], [-w * 0.3, -h / 2, 0], [-w * 0.3, h / 2 - 3, 0]]) {
      ctx.save();
      ctx.translate(wx, wy + 1.5);
      ctx.rotate(rot);
      ctx.fillRect(-3.5, -1.8, 7, 3.6);
      ctx.restore();
    }
    ctx.fillStyle = shade(c.col, 0.55);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();

    // Carrocería elevada
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(c.ang);
    ctx.fillStyle = c.col;
    ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
    ctx.fillStyle = shade(c.col, 1.22);
    ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, 2.4);
    ctx.fillStyle = shade(c.col, 0.72);
    ctx.fillRect(-w / 2 + 1, h / 2 - 3.4, w - 2, 2.4);
    ctx.fillStyle = shade(c.col, 0.88);
    ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w * 0.42, h - 4);
    ctx.fillStyle = 'rgba(30,45,60,.85)';
    ctx.fillRect(w * 0.04, -h / 2 + 2.4, 5, h - 4.8);
    ctx.fillRect(-w / 2 + 2.5, -h / 2 + 2.4, 4, h - 4.8);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(w * 0.04, -h / 2 + 2.4, 5, 1.6);
    ctx.fillStyle = '#1a1c20';
    ctx.fillRect(w / 2 - 2.2, -h / 2 + 1, 1.6, h - 2);
    ctx.fillStyle = night > 0.3 ? '#fff6cc' : '#d8d4bb';
    ctx.fillRect(w / 2 - 2.4, -h / 2 + 2.5, 2, 3);
    ctx.fillRect(w / 2 - 2.4, h / 2 - 5.5, 2, 3);
    // Luces de freno (rojo fuerte al frenar) y de marcha atrás
    ctx.fillStyle = c.spd < -2 ? '#ff7a6a' : c.brake ? '#ff2a1a' : '#8c2a22';
    ctx.fillRect(-w / 2 + 0.6, -h / 2 + 2.5, 1.6, 3);
    ctx.fillRect(-w / 2 + 0.6, h / 2 - 5.5, 1.6, 3);
    // Guiño: titila adelante y atrás del lado que va a doblar (+1 derecha, -1 izquierda).
    // Balizas (auto abandonado): los dos lados a la vez
    if ((c.signal || c.hazard) && Math.floor(G.t * 3.2) % 2) {
      ctx.fillStyle = '#ffb21a';
      for (const sy of c.hazard ? [h / 2 - 2, -h / 2] : [c.signal > 0 ? h / 2 - 2 : -h / 2]) {
        ctx.fillRect(w / 2 - 2.6, sy, 2.2, 2);
        ctx.fillRect(-w / 2 + 0.4, sy, 2.2, 2);
      }
    }

    if (c.cop) {
      const bl = Math.floor(G.t * 7) % 2;
      ctx.fillStyle = '#0d0f13';
      ctx.fillRect(-2.5, -h / 2 + 2.5, 5, h - 5);
      ctx.fillStyle = bl ? '#4a86ff' : '#2a2f5a';
      ctx.fillRect(-2.5, -h / 2 + 2.5, 5, (h - 5) / 2);
      ctx.fillStyle = bl ? '#3a1f2a' : '#ff4a4a';
      ctx.fillRect(-2.5, 0, 5, (h - 5) / 2);
    }
    ctx.restore();
  }

  // Recorta los tableros de los puentes: lo que va sobre el agua (olas, lanchas,
  // estelas) pasa por debajo, porque el tablero esta horneado en GROUND.
  clipBridges() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.rect(-20, -20, RW + 40, RH + 40);
    for (const b of bridges) {
      const c = b.line + b.w / 2, h = b.half + 2;
      if (b.horiz) ctx.rect(b.a - G.cam.x, c - h - G.cam.y, b.b - b.a, h * 2);
      else ctx.rect(c - h - G.cam.x, b.a - G.cam.y, h * 2, b.b - b.a);
    }
    ctx.clip('evenodd');
  }

  // Agua animada: recorre solo la grilla de 12px de la vista (~40x23 celdas).
  // En la orilla, una linea de espuma que respira y corre a lo largo de la costa;
  // adentro, destellos y vetas que viajan en el sentido de la corriente.
  drawWater() {
    const ctx = this.ctx, C = WATER_CELL, cx = G.cam.x, cy = G.cam.y;
    if (shoreDist(cx + RW / 2, cy + RH / 2) > RW * 0.6) return; // el rio no esta en pantalla
    const night = darkness();
    const i0 = Math.floor(cx / C), j0 = Math.floor(cy / C);
    const i1 = Math.floor((cx + RW) / C), j1 = Math.floor((cy + RH) / C);
    ctx.save();
    this.clipBridges();
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = i * C + C / 2, y = j * C + C / 2, sd = shoreDist(x, y);
        if (sd > 8) continue;
        const t = shoreT(x, y);
        if (sd > -16) {
          // Espuma: se proyecta sobre una curva de nivel de la distancia a la costa que
          // va y viene. Cada celda dibuja solo el pedazo de costa que cae adentro suyo.
          const sf = shoreDistFine, fd = sf(x, y);
          const gx = sf(x + 3, y) - sf(x - 3, y), gy = sf(x, y + 3) - sf(x, y - 3);
          const l = Math.hypot(gx, gy) || 1, nx = gx / l, ny = gy / l;
          const br = 0.5 + 0.5 * Math.sin(G.t * 1.3 - t * 110);
          for (let w = 0; w < 2; w++) {
            const tgt = w ? -7 - br * 5 : -1.5 - br * 3;
            const qx = x - nx * (fd - tgt), qy = y - ny * (fd - tgt);
            if (Math.floor(qx / C) !== i || Math.floor(qy / C) !== j) continue;
            ctx.globalAlpha = w ? 0.22 * br : 0.3 + 0.4 * (1 - br);
            ctx.fillStyle = WATER_FOAM;
            for (let q = -6; q < 6; q += w ? 2 : 1) ctx.fillRect(px(qx - ny * q - cx), px(qy + nx * q - cy), 1, 1);
          }
        }
        if (sd > -6 || !inWater(x, y)) continue;
        const k = i * 0.7349 + j * 9.2821, kind = wrand(k);
        if (kind > 0.45) continue;
        const per = 2.2 + wrand(k + 1) * 2.6, ph = (G.t / per + wrand(k + 2)) % 1;
        const life = (ph + 1) % 1;
        if (life > 0.55) continue;
        const a = Math.sin(life / 0.55 * Math.PI), f = flowAt(t);
        const veta = kind > 0.3, drift = (life - 0.27) * (veta ? 22 : 12);
        const gx = x + (wrand(k + 3) - 0.5) * 10 + f[0] * drift - cx, gy = y + (wrand(k + 4) - 0.5) * 10 + f[1] * drift - cy;
        if (veta) {
          // Veta de corriente: rayita de puntos a lo largo del flujo
          ctx.globalAlpha = a * 0.2;
          ctx.fillStyle = WATER_PAL[0];
          for (let q = -4; q <= 4; q++) ctx.fillRect(px(gx + f[0] * q * 1.4), px(gy + f[1] * q * 1.4), 1, 1);
        } else {
          // Destello: rayita clara; de noche, mas tenue y calida (luces de la costa)
          ctx.globalAlpha = a * (0.65 - night * 0.3);
          ctx.fillStyle = night > 0.5 ? '#ffe2a8' : '#e6f2ea';
          const hz = Math.abs(f[0]) > Math.abs(f[1]);
          ctx.fillRect(px(gx - (hz ? 1 : 0)), px(gy - (hz ? 0 : 1)), hz ? 3 : 1, hz ? 1 : 3);
          if (a > 0.85) ctx.fillRect(px(gx), px(gy), 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
    this.drawFloats();
    this.drawBoats();
    ctx.restore();
  }

  // Camalotes, basura y patos (dentro del recorte de los puentes)
  drawFloats() {
    const ctx = this.ctx;
    for (const f of floatsAt(G.t)) {
      const x = px(f.x - G.cam.x), y = px(f.y - G.cam.y);
      if (x < -8 || y < -8 || x > RW + 8 || y > RH + 8) continue;
      if (f.k === 'camalote') {
        ctx.fillStyle = 'rgba(20,40,30,.3)';
        ctx.fillRect(x - 2, y - 1, 7, 4);
        ctx.fillStyle = '#4c7a2c';
        ctx.fillRect(x - 3, y - 2, 6, 4);
        ctx.fillRect(x - 1, y - 3, 3, 6);
        ctx.fillStyle = '#76a43c';
        ctx.fillRect(x - 2, y - 2, 2, 2);
        ctx.fillRect(x + 1, y, 2, 1);
        if (f.h < 0.25) { ctx.fillStyle = '#b994d6'; ctx.fillRect(x, y - 1, 1, 1); } // flor de camalote
      } else if (f.k === 'basura') {
        ctx.fillStyle = f.h < 0.65 ? '#dfe8e2' : f.h < 0.72 ? '#c0392b' : '#d8cfb4';
        ctx.fillRect(x, y, f.h < 0.65 ? 3 : 2, f.h < 0.72 ? 1 : 2);
      } else {
        // Pato: cuerpo, cabeza verde hacia donde nada y una V chiquita detras
        const hx = Math.round(Math.cos(f.ang) * 2), hy = Math.round(Math.sin(f.ang) * 2);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = WATER_FOAM;
        ctx.fillRect(x - hx * 2 - hy, y - hy * 2 + hx, 1, 1);
        ctx.fillRect(x - hx * 2 + hy, y - hy * 2 - hx, 1, 1);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#7a5c3c';
        ctx.fillRect(x - 1, y - 1, 3, 2);
        ctx.fillStyle = '#2f6b3a';
        ctx.fillRect(x + hx, y + hy - 1, 1, 1);
        ctx.fillStyle = '#e0a030';
        ctx.fillRect(x + hx + Math.sign(hx), y + hy - 1 + Math.sign(hy), 1, 1);
      }
    }
  }

  // Lanchas, botes, remolcadores y barcazas con su estela
  drawBoats() {
    const ctx = this.ctx;
    for (const b of boatsAt(G.t)) {
      const x = b.x - G.cam.x, y = b.y - G.cam.y, D = BOAT_DIM[b.k], L = D.L, W = D.W;
      if (x < -90 || y < -90 || x > RW + 90 || y > RH + 90) continue;
      // Estela: puntos de espuma en las posiciones por donde paso, abriendose en V
      const fast = b.v > 30, n = b.k === 'bote' ? 5 : fast ? 16 : 11;
      ctx.fillStyle = WATER_FOAM;
      for (let k = 1; k <= n; k++) {
        const p = riverSpot(b.s - b.dir * (L / 2 + k * (fast ? 4 : 3)), b.lane, b.dir);
        const sx = p.x - G.cam.x, sy = p.y - G.cam.y, nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
        const spread = W / 2 + k * (fast ? 1.3 : 0.7), fade = 1 - k / (n + 1);
        const wob = Math.sin(G.t * 6 + k * 1.7) * 0.6;
        ctx.globalAlpha = fade * 0.6;
        for (const sg of [-1, 1]) ctx.fillRect(px(sx + nx * (spread + wob) * sg), px(sy + ny * (spread + wob) * sg), 1, 1);
        if (b.k !== 'bote' && k < n * 0.6) {
          // Remolino de la helice en el medio
          ctx.globalAlpha = fade * 0.45;
          ctx.fillRect(px(sx + nx * wob * 2), px(sy + ny * wob * 2), 2, 1);
        }
      }
      ctx.globalAlpha = 1;
      // Bamboleo suave de la embarcacion
      const ang = b.ang + Math.sin(G.t * 1.7 + b.i) * 0.02;
      ctx.save();
      ctx.translate(x + 2, y + 3);
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(10,25,30,.32)';
      ctx.fillRect(-L / 2, -W / 2, L, W);
      ctx.restore();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const hull = (col, l, w, bow) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(-l / 2, -w / 2);
        ctx.lineTo(l / 2 - bow, -w / 2);
        ctx.lineTo(l / 2, 0);
        ctx.lineTo(l / 2 - bow, w / 2);
        ctx.lineTo(-l / 2, w / 2);
        ctx.closePath();
        ctx.fill();
      };
      if (b.k === 'lancha') {
        hull('#b9b6ac', L, W, 6);
        hull('#ecebe4', L - 2, W - 2, 5);
        ctx.fillStyle = '#c8463c';
        ctx.fillRect(-L / 2, -W / 2, L - 6, 1);
        ctx.fillRect(-L / 2, W / 2 - 1, L - 6, 1);
        ctx.fillStyle = '#3d5f78';
        ctx.fillRect(0, -W / 2 + 1, 2, W - 2); // parabrisas
        ctx.fillStyle = '#8a5a3a';
        ctx.fillRect(-6, -2, 5, 4); // asientos
        ctx.fillStyle = '#2b2b2e';
        ctx.fillRect(-L / 2 - 1, -1, 2, 2); // motor fuera de borda
      } else if (b.k === 'bote') {
        hull('#5e3b20', L, W, 4);
        hull('#a87445', L - 2, W - 2, 3);
        ctx.fillStyle = '#5e3b20';
        ctx.fillRect(-1, -W / 2, 2, W);
        // Remos que van y vienen
        const r = Math.sin(G.t * 3 + b.i) * 2;
        ctx.fillStyle = '#c9a06a';
        ctx.fillRect(-1 + r, -W / 2 - 3, 1, 3);
        ctx.fillRect(-1 + r, W / 2, 1, 3);
        ctx.fillStyle = '#d24a3a';
        ctx.fillRect(-4, -1, 2, 2); // el remero
      } else if (b.k === 'remolcador') {
        hull('#26262a', L, W, 6);
        hull('#a8382c', L - 3, W - 3, 5);
        ctx.fillStyle = '#1b1b1e'; // gomas de defensa
        for (const u of [-8, -2, 4]) { ctx.fillRect(u, -W / 2 - 1, 3, 1); ctx.fillRect(u, W / 2, 3, 1); }
      } else {
        hull('#4a2f1e', L, W, 5);
        hull('#7a4a2c', L - 3, W - 3, 4);
        ctx.fillStyle = '#5a3822';
        ctx.fillRect(-L / 2 + 3, -W / 2 + 3, L - 10, W - 6);
        // Carga: contenedores o arena, segun la barcaza
        if (b.i % 2) {
          const cols = ['#2f5f8f', '#a8382c', '#3f7a3a', '#c9a227'];
          for (let u = 0; u < 4; u++) {
            ctx.fillStyle = cols[(u + b.i) % 4];
            ctx.fillRect(-L / 2 + 4 + u * 9, -W / 2 + 4, 8, W - 8);
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            ctx.fillRect(-L / 2 + 4 + u * 9, -W / 2 + 4, 8, 1);
          }
        } else {
          ctx.fillStyle = '#b8955a';
          ctx.fillRect(-L / 2 + 5, -W / 2 + 4, L - 14, W - 8);
          ctx.fillStyle = '#d4b47a';
          ctx.fillRect(-L / 2 + 9, -2, L - 22, 3);
        }
      }
      ctx.restore();
      // Cabina del remolcador, elevada como la carroceria de los autos
      if (b.k === 'remolcador') {
        const H = 8, dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL;
        ctx.save();
        ctx.translate(x + dx, y + dy);
        ctx.rotate(ang);
        ctx.fillStyle = '#dcd6c8';
        ctx.fillRect(-5, -3.5, 9, 7);
        ctx.fillStyle = '#3d5f78';
        ctx.fillRect(2, -3, 2, 6);
        ctx.fillStyle = '#1b1b1e'; // chimenea con franja
        ctx.fillRect(-9, -1.5, 3, 3);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(-8, -1.5, 1, 3);
        ctx.restore();
      }
    }
  }

  // Luces de navegacion de noche: blanca a proa, roja a babor y verde a estribor
  drawBoatLights(k) {
    let any = false;
    for (const b of boatsAt(G.t)) {
      const x = b.x - G.cam.x, y = b.y - G.cam.y;
      if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40 || inBridgeCorridor(b.x, b.y)) continue;
      const D = BOAT_DIM[b.k], c = Math.cos(b.ang), s = Math.sin(b.ang);
      const at = (u, v) => [x + c * u - s * v, y + s * u + c * v];
      for (const [u, v, r, gg, bb, sz] of [[D.L / 2 - 2, 0, 255, 240, 200, 18], [-D.L / 4, -D.W / 2, 255, 60, 50, 12], [-D.L / 4, D.W / 2, 60, 230, 90, 12]]) {
        const [lx, ly] = at(u, v);
        ECTX.globalAlpha = 0.8 * k;
        ECTX.drawImage(this.glow(r, gg, bb, sz), lx - sz / 2, ly - sz / 2);
      }
      any = true;
    }
    ECTX.globalAlpha = 1;
    return any;
  }

  drawLights(night) {
    if (!LIGHT || !EMIT) return;
    const ctx = this.ctx;
    LCTX.globalCompositeOperation = 'source-over';
    LCTX.fillStyle = ambient();
    LCTX.fillRect(0, 0, RW, RH);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(LIGHT, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    ECTX.globalCompositeOperation = 'source-over';
    ECTX.clearRect(0, 0, RW, RH);
    ECTX.globalCompositeOperation = 'lighter';
    const k = clamp(night * 1.15, 0, 1);
    let any = false;

    if (night > 0.18) {
      ECTX.fillStyle = 'rgba(255,214,140,.85)';
      for (const w of litWindows) {
        ECTX.beginPath();
        ECTX.moveTo(w[0][0], w[0][1]);
        ECTX.lineTo(w[1][0], w[1][1]);
        ECTX.lineTo(w[2][0], w[2][1]);
        ECTX.lineTo(w[3][0], w[3][1]);
        ECTX.closePath();
        ECTX.fill();
        any = true;
      }
      for (const l of lamps) {
        const x = l.x - G.cam.x, y = l.y - G.cam.y;
        if (x < -60 || y < -60 || x > RW + 60 || y > RH + 60) continue;
        const gsz = 92;
        ECTX.globalAlpha = 0.75 * k;
        ECTX.drawImage(this.glow(255, 205, 120, gsz), x - gsz / 2, y - gsz / 2 + 8);
        ECTX.globalAlpha = 1;
        ECTX.fillStyle = '#fff1c4';
        ECTX.fillRect(px(x - 3), px(y - 18 * 22 / FOCAL - 2), 6, 4);
        any = true;
      }
      for (const L of lights) {
        if (!L || L.off) continue;
        const x = L.x - G.cam.x, y = L.y - G.cam.y;
        if (x < -ROAD - 40 || y < -ROAD - 40 || x > RW + ROAD + 40 || y > RH + ROAD + 40) continue;
        const off = ROAD / 2 + 4, H = 19;
        for (const h of [
          { dx: -off, dy: -off, hz: true }, { dx: off, dy: off, hz: true },
          { dx: off, dy: -off, hz: false }, { dx: -off, dy: off, hz: false },
          ...(L.diag ? [{ dx: off + 8, dy: -off - 8, hz: 'd' }, { dx: -off - 8, dy: off + 8, hz: 'd' }] : []),
        ]) {
          const bx = x + h.dx, by = y + h.dy;
          if (bx < -16 || by < -16 || bx > RW + 16 || by > RH + 16) continue;
          const st = lightState(L, h.hz), gsz = 22;
          const c2 = st === 'rojo' ? [255, 60, 45] : st === 'amarillo' ? [255, 195, 30] : [60, 220, 80];
          ECTX.globalAlpha = 0.75 * k;
          ECTX.drawImage(
            this.glow(c2[0], c2[1], c2[2], gsz),
            bx + (bx - RW / 2) * H / FOCAL - gsz / 2,
            by + (by - RH / 2) * H / FOCAL - gsz / 2
          );
        }
        ECTX.globalAlpha = 1;
        any = true;
      }
      for (const c of G.cars) {
        const x = c.x - G.cam.x, y = c.y - G.cam.y;
        if (x < -90 || y < -90 || x > RW + 90 || y > RH + 90) continue;
        ECTX.save();
        ECTX.translate(x, y);
        ECTX.rotate(c.ang);
        const lg = ECTX.createLinearGradient(0, 0, 72, 0);
        lg.addColorStop(0, 'rgba(255,244,196,' + (0.55 * k) + ')');
        lg.addColorStop(1, 'rgba(255,244,196,0)');
        ECTX.fillStyle = lg;
        ECTX.beginPath();
        ECTX.moveTo(11, -5);
        ECTX.lineTo(72, -26);
        ECTX.lineTo(72, 26);
        ECTX.lineTo(11, 5);
        ECTX.closePath();
        ECTX.fill();
        // Luces traseras: brillan más al frenar
        ECTX.globalAlpha = (c.brake ? 0.9 : 0.4) * k;
        ECTX.drawImage(this.glow(255, 40, 30, c.brake ? 22 : 14), -c.w / 2 - (c.brake ? 11 : 7), -(c.brake ? 11 : 7));
        if ((c.signal || c.hazard) && Math.floor(G.t * 3.2) % 2) {
          ECTX.globalAlpha = 0.8 * k;
          for (const sd of c.hazard ? [1, -1] : [c.signal]) {
            ECTX.drawImage(this.glow(255, 180, 40, 16), c.w / 2 - 8, (sd > 0 ? c.h / 2 : -c.h / 2) - 8);
          }
        }
        ECTX.globalAlpha = 1;
        ECTX.restore();
        any = true;
      }
    }

    for (const c of G.cars) {
      if (c.cop) {
        const x = c.x - G.cam.x, y = c.y - G.cam.y;
        if (x < -60 || y < -60 || x > RW + 60 || y > RH + 60) continue;
        const bl = Math.floor(G.t * 7) % 2, gsz = 74;
        ECTX.globalAlpha = 0.85;
        ECTX.drawImage(this.glow(bl ? 80 : 255, bl ? 140 : 60, bl ? 255 : 60, gsz), x - gsz / 2, y - gsz / 2);
        ECTX.globalAlpha = 1;
        any = true;
      }
    }

    for (const P of G.players) {
      if (P.muzzle <= 0) continue;
      const gsz = 108;
      ECTX.globalAlpha = P.muzzle;
      ECTX.drawImage(this.glow(255, 228, 158, gsz), P.x - G.cam.x - gsz / 2, P.y - G.cam.y - gsz / 2);
      any = true;
    }
    for (const p of props) {
      if (p.t !== 'barril') continue;
      const x = p.x - G.cam.x, y = p.y - G.cam.y;
      if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) continue;
      const gsz = 56;
      ECTX.globalAlpha = (0.35 + Math.sin(G.t * 11 + p.x) * 0.08) * Math.max(k, 0.25);
      ECTX.drawImage(this.glow(255, 140, 50, gsz), x - gsz / 2, y - gsz / 2 - 4);
      any = true;
    }
    // Playa de noche: el fogon ilumina la ronda y el puesto de choripan prende sus lamparitas
    if (night > 0.12) {
      for (const p of props) {
        if (p.t !== 'fogata' && p.t !== 'chiringuito') continue;
        const x = p.x - G.cam.x, y = p.y - G.cam.y;
        if (x < -70 || y < -70 || x > RW + 70 || y > RH + 70) continue;
        if (p.t === 'fogata') {
          const gsz = 96;
          ECTX.globalAlpha = (0.7 + Math.sin(G.t * 13 + p.x) * 0.08 + Math.sin(G.t * 5.3) * 0.06) * k;
          ECTX.drawImage(this.glow(255, 150, 60, gsz), x - gsz / 2, y - gsz / 2 - 3);
        } else {
          const gsz = 70;
          ECTX.globalAlpha = 0.55 * k;
          ECTX.drawImage(this.glow(255, 200, 120, gsz), x + p.fx * 10 - gsz / 2, y + p.fy * 10 - gsz / 2 - 6);
          // Guirnalda de lamparitas en el alero
          ECTX.globalAlpha = k;
          for (let i = 0; i < 7; i++) {
            const on = Math.floor(G.t * 2 + i) % 3;
            ECTX.fillStyle = on ? ['#ffd34a', '#ff6a5a', '#7ad0ff'][i % 3] : '#5a4a30';
            const a = this.upPt(x - 14 + i * 4.7, y - 10, 12);
            ECTX.fillRect(px(a[0]), px(a[1]), 1, 1);
          }
        }
        any = true;
      }
      ECTX.globalAlpha = 1;
    }
    for (const c of G.cops.concat(G.tranzas)) {
      if (c.muzzle > 0) {
        const gsz = 74;
        ECTX.globalAlpha = c.muzzle * 0.85;
        ECTX.drawImage(this.glow(255, 228, 158, gsz), c.x - G.cam.x - gsz / 2, c.y - G.cam.y - gsz / 2);
        any = true;
      }
    }
    for (const f of G.fx) {
      if (f.col === '255,150,40' || f.col === '255,190,90') {
        const gsz = 50;
        ECTX.globalAlpha = clamp(f.life / f.max, 0, 1) * 0.85;
        ECTX.drawImage(this.glow(255, 170, 70, gsz), f.x - G.cam.x - gsz / 2, f.y - G.cam.y - gsz / 2);
        any = true;
      }
    }
    for (const pk of G.pickups) {
      const x = pk.x - G.cam.x, y = pk.y - G.cam.y;
      if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) continue;
      const gsz = 38;
      ECTX.globalAlpha = (0.30 + Math.sin(pk.t * 3) * 0.14) * Math.max(k, 0.5);
      const gc = { cash: [110, 255, 120], gold: [255, 215, 70], hp: [255, 110, 110], weapon: [255, 200, 80] }[pk.kind] || [255, 255, 255];
      ECTX.drawImage(this.glow(gc[0], gc[1], gc[2], gsz), x - gsz / 2, y - gsz / 2);
      any = true;
    }
    for (const b of shops.concat(supers.filter(q => !(q.closed > 0)))) {
      const d = b.door, x = d.x + d.ox - G.cam.x, y = d.y + d.oy - G.cam.y;
      if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) continue;
      const gsz = 48;
      ECTX.globalAlpha = (0.45 + Math.sin(G.t * 4) * 0.15) * Math.max(k, 0.5);
      ECTX.drawImage(b.super ? this.glow(255, 90, 70, gsz) : this.glow(255, 150, 50, gsz), x - gsz / 2, y - gsz / 2);
      any = true;
    }
    if (bolicheOpen()) {
      for (const b of boliches) {
        const d = b.door, x = d.x + d.ox - G.cam.x, y = d.y + d.oy - G.cam.y;
        if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) continue;
        const gsz = 56, c = bolicheOf(b).glow;
        ECTX.globalAlpha = (0.5 + Math.sin(G.t * 8) * 0.2) * Math.max(k, 0.5);
        ECTX.drawImage(this.glow(c[0], c[1], c[2], gsz), x - gsz / 2, y - gsz / 2);
        any = true;
      }
    }
    for (const g of parrillas) {
      if (!g.cooking) continue;
      const x = g.x - G.cam.x, y = g.y - G.cam.y;
      if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) continue;
      const gsz = 40;
      ECTX.globalAlpha = (0.5 + Math.sin(G.t * 7 + g.x) * 0.12) * Math.max(k, 0.4);
      ECTX.drawImage(this.glow(255, 120, 40, gsz), x - gsz / 2, y - gsz / 2);
      any = true;
    }
    if (night > 0.18 && this.drawBoatLights(k)) any = true; // luces de las lanchas
    // Helicóptero de noche: reflector que barre el piso y luces de navegación
    for (const p of G.peds) {
      if (!p.air || p.hp <= 0 || night < 0.12) continue;
      const x = p.x - G.cam.x, y = p.y - G.cam.y;
      if (x < -120 || y < -120 || x > RW + 120 || y > RH + 120) continue;
      const a = G.t * 0.8 + p.x * 0.01, gsz = 70;
      ECTX.globalAlpha = 0.8 * k;
      ECTX.drawImage(this.glow(235, 245, 255, gsz), x + 10 + Math.cos(a) * 30 - gsz / 2, y + 18 + Math.sin(a) * 20 - gsz / 2);
      ECTX.globalAlpha = k;
      const sn = Math.sin(p.ang) * 7, cs = Math.cos(p.ang) * 7;
      ECTX.drawImage(this.glow(255, 50, 50, 18), x + sn - 9, y - cs - 9);
      ECTX.drawImage(this.glow(60, 255, 100, 18), x - sn - 9, y + cs - 9);
      any = true;
    }

    ECTX.globalAlpha = 1;
    if (any) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(EMIT, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawRadar() {
    if (!MINI) return;
    const ctx = this.ctx;
    const S = 58, ox = 7, oy = RH - S - 7, MS = 320, k = MS / WORLD;
    const P = G.me, half = S / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(ox - 2, oy - 2, S + 4, S + 4);
    ctx.drawImage(MINI, clamp(P.x * k - half, 0, MS - S), clamp(P.y * k - half, 0, MS - S), S, S, ox, oy, S, S);
    const sx = clamp(P.x * k - half, 0, MS - S), sy = clamp(P.y * k - half, 0, MS - S);
    const dot = (e, col, sz = 2) => {
      const x = ox + (e.x * k - sx), y = oy + (e.y * k - sy);
      if (x < ox || y < oy || x > ox + S - 1 || y > oy + S - 1) return;
      ctx.fillStyle = col;
      ctx.fillRect(px(x), px(y), sz, sz);
    };
    for (const pk of G.pickups) dot(pk, { cash: '#5ad25a', gold: '#ffd34a', merca: '#f0f0ff', hp: '#ff5a5a', weapon: '#ffc84a' }[pk.kind] || '#ffffff');
    for (const h of hospitals) dot({ x: h.x + h.w / 2, y: h.y + h.h / 2 }, '#ffffff', 3);
    for (const b of supers) dot({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, '#ff6a5a', 3);
    for (const g of parrillas) dot(g, g.cooking ? '#ff9a3a' : '#a8643a', 2);
    for (const cr of casaRosada) dot({ x: cr.x + cr.w / 2, y: cr.y + cr.h / 2 }, '#ff8fc0', 3);
    for (const b of stadiums) dot({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, STADIUMS.find(q => q.k === b.stadium).c2, 3);
    if (obelisco) dot({ x: obelisco.x + obelisco.w / 2, y: obelisco.y + obelisco.h / 2 }, '#e8f070', 3);
    for (const c of G.cops) dot(c, '#4aa3ff');
    for (const t of G.tranzas) if (t.hp > 0) dot(t, t.villa.angry > 0 ? '#ff3a3a' : '#c070ff');
    for (const h of G.hinchas) if (h.hp > 0 && h.barra.angry > 0) dot(h, '#ff6a2a');
    for (const c of G.cars) if (c.chase && c.hp > 0) dot(c, '#2a6aff', 3);
    for (const q of G.players) if (q !== P && !q.dead) dot(q, q.def.shirt, 3);
    // Armerías: siempre visibles, pegadas al borde si quedan lejos
    for (const b of shops) {
      const x = clamp(ox + ((b.door.x + b.door.ox) * k - sx), ox + 1, ox + S - 4);
      const y = clamp(oy + ((b.door.y + b.door.oy) * k - sy), oy + 1, oy + S - 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(px(x) - 1, px(y) - 1, 5, 5);
      ctx.fillStyle = '#ff9a2a';
      ctx.fillRect(px(x), px(y), 3, 3);
    }
    // Famosos: estrella siempre visible, pegada al borde si está lejos, para ir a buscarlo
    for (const f of G.peds) {
      if (!f.famous || f.hp <= 0) continue;
      const x = clamp(ox + (f.x * k - sx), ox + 2, ox + S - 3);
      const y = clamp(oy + (f.y * k - sy), oy + 2, oy + S - 3);
      this.star(px(x), px(y), (G.t * 4) % 2 < 1.4);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(px(ox + (P.x * k - sx)) - 1, px(oy + (P.y * k - sy)) - 1, 3, 3);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 1.5, oy - 1.5, S + 3, S + 3);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(ox - 2.5, oy - 2.5, S + 5, S + 5);
  }

  // Estrellita de los famosos en el radar y el mapa (lit: titila)
  star(x, y, lit = true) {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, y - 1, 7, 3);
    ctx.fillRect(x - 1, y - 3, 3, 7);
    ctx.fillStyle = lit ? '#ffd34a' : '#c8952a';
    ctx.fillRect(x - 2, y, 5, 1);
    ctx.fillRect(x, y - 2, 1, 5);
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }

  // ---- Mapa grande (M) ----

  // Lo que va en el mapa, con su ícono. Las referencias salen de acá: solo aparece lo que hay.
  mapItems() {
    const P = G.me, it = [];
    const add = (kind, x, y, extra) => it.push(Object.assign({ kind, x, y }, extra));
    const mid = b => [b.x + b.w / 2, b.y + b.h / 2];
    for (const pk of G.pickups) add(pk.kind === 'cash' || pk.kind === 'gold' ? 'guita' : pk.kind === 'weapon' ? 'fierro' : 'comida', pk.x, pk.y);
    for (const g of parrillas) add(g.cooking ? 'asado' : 'parrilla', g.x, g.y);
    for (const h of hospitals) add('hospital', ...mid(h));
    for (const b of shops) add('armeria', b.door.x + b.door.ox, b.door.y + b.door.oy);
    for (const b of banks) add('banco', ...mid(b));
    for (const b of supers) add(b.closed > 0 || b.robbing ? 'cerrado' : b.super === 'noche' ? 'noche' : 'choto', ...mid(b));
    for (const cr of casaRosada) add('rosada', ...mid(cr));
    for (const b of stadiums) add('st_' + b.stadium, ...mid(b));
    if (obelisco) add('obelisco', ...mid(obelisco));
    for (const t of G.tranzas) if (t.hp > 0) add(t.villa.angry > 0 ? 'tranzaMal' : 'tranza', t.x, t.y);
    for (const B of G.barras) {
      const at = B.trapo === 'hung' ? B.flag : B.trapo === 'carried' && B.by ? B.by : null;
      if (at) add('tr_' + B.def.k, at.x, at.y);
    }
    for (const h of G.hinchas) if (h.hp > 0 && h.barra.angry > 0) add('hincha', h.x, h.y);
    for (const c of G.cops) add('yuta', c.x, c.y);
    for (const c of G.cars) if (c.chase && c.hp > 0) add('patrullero', c.x, c.y);
    for (const f of G.peds) if (f.famous && f.hp > 0) add('famoso', f.x, f.y);
    for (const q of G.players) if (q !== P && !q.dead) add('jugador', q.x, q.y, { q });
    return it;
  }

  // Íconos de 9x9 con borde negro, que se leen sobre cualquier fondo
  mapIcon(kind, x, y, q) {
    const ctx = this.ctx;
    x = Math.round(x);
    y = Math.round(y);
    const r = (col, a, b, w, h) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + a, y + b, w, h);
    };
    const box = (bg) => { r('#000', -5, -5, 11, 11); r(bg, -4, -4, 9, 9); };
    const cart = c => { r(c, -3, -2, 6, 3); r(c, -3, -3, 1, 1); r(c, -2, 2, 1, 1); r(c, 2, 2, 1, 1); };
    // Estadios: un cuadrito con los colores del club, a su manera
    if (kind.startsWith('st_')) {
      const S = STADIUMS.find(q => 'st_' + q.k === kind);
      box(S.c1);
      if (S.pattern === 'franja') r(S.c2, -4, -1, 9, 3);
      else if (S.pattern === 'banda') for (let i = -4; i <= 3; i++) r(S.c2, i, i - 1, 2, 2);
      else if (S.pattern === 'bastones') for (let i = -3; i <= 3; i += 2) r(S.c2, i, -4, 1, 9);
      else { r(S.c2, -2, -2, 5, 5); r(S.c1, -1, -1, 3, 3); }
      return;
    }
    // Trapos: un banderín con los colores de la barra
    if (kind.startsWith('tr_')) {
      const B = BARRAS.find(q => 'tr_' + q.k === kind), S = STADIUMS.find(q => q.k === B.stadium);
      r('#000', -4, -4, 1, 9); r('#000', -3, -5, 8, 6);
      r(B.shirt, -2, -4, 6, 4);
      if (S.pattern === 'franja') r(B.band, -2, -3, 6, 1);
      else if (S.pattern === 'banda') { r(B.band, -2, -4, 2, 2); r(B.band, 0, -3, 2, 2); r(B.band, 2, -2, 2, 2); }
      else if (S.pattern === 'bastones') { r(B.band, -1, -4, 1, 4); r(B.band, 1, -4, 1, 4); r(B.band, 3, -4, 1, 4); }
      else r(B.band, -2, -4, 6, 1);
      r('#c8b89a', -3, -4, 1, 8);
      return;
    }
    switch (kind) {
      case 'vos': {
        const P = G.me;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd34a';
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
        if (P) {
          ctx.strokeStyle = '#ffd34a';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(P.ang) * 8, y + Math.sin(P.ang) * 8); ctx.stroke();
        }
        break;
      }
      case 'jugador':
        r('#000', -3, -3, 7, 7); r(q ? q.def.shirt : '#5ad25a', -2, -2, 5, 5);
        break;
      case 'hospital': box('#f4f4f4'); r('#d8342c', -1, -3, 3, 7); r('#d8342c', -3, -1, 7, 3); break;
      case 'banco': box('#2f7a3a'); r('#7de07d', -3, -2, 7, 5); r('#2f7a3a', -1, -1, 3, 3); break;
      case 'armeria': box('#e8892a'); r('#14100c', -3, -2, 7, 2); r('#14100c', -3, 0, 2, 3); break;
      case 'choto': box('#c8302a'); cart('#fff'); break;
      case 'noche': box('#2a4fa8'); cart('#ff6a5a'); break;
      case 'cerrado': box('#5a5e64'); cart('#9aa0a6'); break;
      case 'parrilla': box('#6a3a22'); r('#c8c8c8', -3, -1, 7, 1); r('#c8c8c8', -3, 1, 7, 1); r('#c8c8c8', -2, -3, 1, 6); r('#c8c8c8', 1, -3, 1, 6); break;
      case 'asado': box('#2a1610'); r('#ff7a2a', -2, -1, 5, 4); r('#ffd34a', -1, -3, 3, 4); r('#fff2a0', 0, -1, 1, 2); break;
      case 'rosada': box('#ff8fc0'); r('#fff', -3, 0, 7, 3); r('#fff', -2, -1, 5, 1); r('#fff', -1, -2, 3, 1); r('#ff8fc0', 0, 1, 1, 2); break;
      case 'obelisco': box('#e8f070'); r('#14100c', 0, -3, 1, 7); r('#14100c', -1, 2, 3, 2); break;
      case 'tranza': box('#7a3ab8'); r('#5ad266', -1, -3, 3, 6); r('#5ad266', -3, -1, 7, 2); break;
      case 'tranzaMal': box('#d8302a'); r('#fff', -1, -3, 3, 4); r('#fff', -1, 2, 3, 1); break;
      case 'famoso': this.star(x, y, (G.t * 4) % 2 < 1.4); break;
      case 'yuta': r('#000', -2, -2, 5, 5); r('#4aa3ff', -1, -1, 3, 3); break;
      case 'patrullero': r('#000', -3, -2, 7, 5); r('#2a6aff', -2, -1, 5, 3); r(Math.floor(G.t * 6) % 2 ? '#ff3a2a' : '#fff', -1, -1, 3, 1); break;
      case 'guita': r('#000', -2, -2, 5, 4); r('#5ad25a', -1, -1, 3, 2); break;
      case 'fierro': r('#000', -2, -2, 5, 4); r('#ffc84a', -1, -1, 3, 2); break;
      case 'comida': r('#000', -2, -2, 5, 5); r('#ff5a5a', -1, -1, 3, 3); break;
    }
  }

  drawMap() {
    if (!GROUND || !G.me) return;
    const ctx = this.ctx;
    const P = G.me, v = mapCtl.view(), { sx, sy, k, MW } = v;

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, RW, RH);
    ctx.drawImage(GROUND, sx, sy, v.viewW, v.viewH, 0, 0, MW, RH);

    const items = this.mapItems();
    const inView = (x, y, m = 0) => x >= -m && y >= -m && x <= MW + m && y <= RH + m;
    // Nombres de las villas, para ubicarse
    ctx.globalAlpha = 0.85;
    for (const vl of villas) {
      const x = ((vl.x0 + vl.x1) / 2 - sx) * k, y = (vl.y0 - sy) * k + 9; // arriba, para no tapar los íconos
      if (inView(x, y, 40)) this.text(vl.name, x, y, vl.angry > 0 ? '#ff8a7a' : '#e0c0ff', 5, 'center');
    }
    ctx.globalAlpha = 1;
    // Primero lo chico (guita, yuta), arriba los lugares
    const order = ['guita', 'fierro', 'comida', 'hincha', 'yuta', 'parrilla', 'asado', 'tranza', 'tranzaMal', 'patrullero',
      'cerrado', 'noche', 'choto', 'armeria', 'banco', 'hospital', ...STADIUMS.map(S => 'st_' + S.k), 'rosada', 'obelisco',
      ...BARRAS.map(B => 'tr_' + B.k), 'famoso', 'jugador'];
    for (const kind of order) {
      for (const e of items) {
        if (e.kind !== kind) continue;
        const x = (e.x - sx) * k, y = (e.y - sy) * k;
        if (inView(x, y)) this.mapIcon(kind, x, y, e.q);
      }
    }

    // Vos: con anillo que late; si quedaste fuera de la vista, una flecha en el borde
    const cx = (P.x - sx) * k, cy = (P.y - sy) * k;
    if (inView(cx, cy)) {
      const pulse = 4 + Math.sin(G.t * 6) * 1.6;
      ctx.strokeStyle = 'rgba(255,211,74,.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 4, 0, TAU);
      ctx.stroke();
      this.mapIcon('vos', cx, cy);
    } else {
      const ex = clamp(cx, 8, MW - 8), ey = clamp(cy, 18, RH - 20), a = Math.atan2(cy - ey, cx - ex);
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(ex, ey, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd34a';
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(a) * 5, ey + Math.sin(a) * 5);
      ctx.lineTo(ex + Math.cos(a + 2.4) * 4, ey + Math.sin(a + 2.4) * 4);
      ctx.lineTo(ex + Math.cos(a - 2.4) * 4, ey + Math.sin(a - 2.4) * 4);
      ctx.fill();
    }

    this.text('MAPA', MW / 2, 12, '#ffd34a', 10, 'center');
    const touch = typeof touchController !== 'undefined' && touchController.isTouch;
    const help = touch ? ['ARRASTRA: mover · +/-: zoom', '⌖: volver a vos']
      : ['FLECHAS o ARRASTRAR: mover · +/- o RUEDA: zoom', 'ESPACIO: volver a vos · L: referencias · M: cerrar'];
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, RH - 21, MW, 21);
    help.forEach((h, i) => this.text(h, MW / 2, RH - 12 + i * 8, '#ccc', 5, 'center'));

    if (G.mapLegend) this.drawMapLegend(items);
  }

  // Referencias al costado, como en los GTA: solo lo que hay en el mapa
  mapLegend(items) {
    const have = new Set(items.map(e => e.kind));
    have.add('vos');
    return MAP_LEGEND.filter(([kind]) => have.has(kind));
  }

  drawMapLegend(items) {
    const ctx = this.ctx, x0 = RW - MAP_LEG_W;
    ctx.fillStyle = 'rgba(8,8,10,.92)';
    ctx.fillRect(x0, 0, MAP_LEG_W, RH);
    ctx.fillStyle = '#e8b53a';
    ctx.fillRect(x0, 0, 1, RH);
    this.text('REFERENCIAS', x0 + MAP_LEG_W / 2, 14, '#ffd34a', 6, 'center');
    // En una sala: la tabla de respeto de todos, abajo del panel
    const table = G.players.length > 1 ? G.players.slice().sort((a, b) => (b.respect || 0) - (a.respect || 0)) : [];
    const tableH = table.length ? 16 + table.length * 10 : 0;
    const rows = this.mapLegend(items), step = Math.min(13, (RH - 30 - tableH) / rows.length);
    if (table.length) {
      const ty = RH - tableH;
      ctx.fillStyle = '#e8b53a';
      ctx.fillRect(x0 + 6, ty - 2, MAP_LEG_W - 12, 1);
      this.text('RESPETO', x0 + MAP_LEG_W / 2, ty + 8, '#ffd34a', 5, 'center');
      table.forEach((q, i) => {
        const y = ty + 18 + i * 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(x0 + 6, y - 5, 6, 6);
        ctx.fillStyle = q.def.shirt;
        ctx.fillRect(x0 + 7, y - 4, 4, 4);
        this.text(q.def.name.replace(/^EL /, ''), x0 + 15, y, q === G.me ? '#ffd34a' : '#e8e8e8', 4);
        this.text(String(q.respect || 0), x0 + MAP_LEG_W - 6, y, '#e8c86a', 4, 'right');
      });
    }
    rows.forEach(([kind, label], i) => {
      const y = 30 + i * step;
      this.mapIcon(kind, x0 + 12, y, kind === 'jugador' ? G.players.find(q => q !== G.me) : null);
      this.text(label, x0 + 22, y + 2.5, '#e8e8e8', label.length > 16 ? 4 : 5); // los largos, más chicos para que entren
    });
  }

  text(t, x, y, col = '#fff', size = 8, align = 'left') {
    const ctx = this.ctx;
    ctx.font = size + 'px "Press Start 2P", monospace';
    ctx.textAlign = align;
    ctx.fillStyle = 'rgba(0,0,0,.85)';
    ctx.fillText(t, x + 1, y + 1);
    ctx.fillText(t, x + 2, y + 2);
    ctx.fillStyle = col;
    ctx.fillText(t, x, y);
  }

  // Helicóptero de un famoso: sombra en el piso, fuselaje con su cara en la cabina y aspas girando
  drawHeli(e) {
    const ctx = this.ctx;
    const x = e.x - G.cam.x, y = e.y - G.cam.y;
    if (x < -50 || y < -50 || x > RW + 50 || y > RH + 50) return;
    const t = G.t, sx = x + 10, sy = y + 18;
    // Viento de las aspas en el piso: anillos que se abren bajo la sombra
    ctx.strokeStyle = 'rgba(230,225,210,.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const k = (t * 1.6 + i / 2) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 8 + k * 18, 4 + k * 9, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12, 5, e.ang, 0, TAU);
    ctx.fill();

    const hov = Math.sin(t * 2.4) * 1.2; // se mece en el aire
    ctx.save();
    ctx.translate(x, y + hov);
    ctx.rotate(e.ang + Math.sin(t * 1.3) * 0.05);
    ctx.fillStyle = '#2a2a30'; // patines
    ctx.fillRect(-7, -8, 15, 1.4);
    ctx.fillRect(-7, 6.6, 15, 1.4);
    ctx.fillStyle = shade(e.shirt, 0.7);
    ctx.fillRect(-21, -1.5, 15, 3); // cola
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-16, -1.5, 2, 3); // franja blanca
    ctx.fillRect(-12, -1.5, 2, 3);
    ctx.fillStyle = shade(e.shirt, 0.6);
    ctx.fillRect(-23, -5, 3, 10); // estabilizador
    ctx.save(); // rotor de cola
    ctx.translate(-21.5, 0);
    ctx.rotate(t * 40);
    ctx.fillStyle = 'rgba(40,40,40,.8)';
    ctx.fillRect(-0.5, -4, 1, 8);
    ctx.restore();
    ctx.fillStyle = shade(e.shirt, 0.8);
    ctx.beginPath();
    ctx.ellipse(0.5, 0.8, 10.5, 7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = e.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; // brillo de la chapa
    ctx.fillRect(-6, -5, 9, 1.5);
    ctx.fillStyle = 'rgba(120,200,255,.9)'; // burbuja de la cabina
    ctx.beginPath();
    ctx.ellipse(6, 0, 4, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(7, -3, 1.5, 2);
    // Luces de navegación: roja y verde en los costados, blanca que titila en la cola
    ctx.fillStyle = '#ff3030';
    ctx.fillRect(-2, -7.5, 2, 2);
    ctx.fillStyle = '#30ff60';
    ctx.fillRect(-2, 5.5, 2, 2);
    if (t % 1 < 0.15) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-24, -1, 2, 2); }
    ctx.restore();

    const f = G.faces['famous-' + e.famous.id];
    if (f) ctx.drawImage(f, px(x - 5), px(y - 5 + hov), 10, 10);

    // Aspas: disco borroso y dos palas girando
    ctx.fillStyle = 'rgba(40,40,45,.12)';
    ctx.beginPath();
    ctx.ellipse(x, y + hov, 19, 19, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,25,30,.75)';
    ctx.lineWidth = 1.6;
    for (const a of [t * 24, t * 24 + Math.PI / 2]) {
      const c = Math.cos(a) * 19, s = Math.sin(a) * 19;
      ctx.beginPath();
      ctx.moveTo(x - c, y + hov - s);
      ctx.lineTo(x + c, y + hov + s);
      ctx.stroke();
    }
    ctx.fillStyle = '#18181c';
    ctx.fillRect(px(x - 1), px(y - 1 + hov), 3, 3);

    // Cartel de EN VIVO que titila y el chat que le tira corazones
    const bx = x - 11, by = y + 24;
    ctx.fillStyle = t % 1 < 0.6 ? '#e8242c' : '#9a1418';
    ctx.fillRect(px(bx), px(by), 22, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px(bx + 2), px(by + 2), 3, 3);
    this.text('VIVO', px(bx + 14), px(by + 1.5), '#ffffff', 4, 'center');
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.7 + i / 4) % 1;
      const hx = x + 14 + Math.sin(k * 9 + i * 2) * 4, hy = y - 2 - k * 26 + hov;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = ['#ff4d6d', '#ff9a3a', '#b46aff', '#3ad2ff'][i];
      ctx.fillRect(px(hx - 2), px(hy - 1), 2, 2);
      ctx.fillRect(px(hx + 1), px(hy - 1), 2, 2);
      ctx.fillRect(px(hx - 2), px(hy), 5, 2);
      ctx.fillRect(px(hx - 1), px(hy + 2), 3, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Nombre arriba de cada famoso y, si está hablando, su globito
  drawFamousTags() {
    const ctx = this.ctx;
    for (const p of G.peds) {
      if (!p.famous || p.hp <= 0 || p.inside) continue;
      const x = p.x - G.cam.x, y = p.y - G.cam.y - (p.air ? 26 : 16);
      if (x < -60 || y < -30 || x > RW + 60 || y > RH + 30) continue;
      this.text(p.famous.name, px(x), px(y), '#ffd34a', 4, 'center');
      if (p.lineT > 0) {
        ctx.font = '5px "Press Start 2P", monospace';
        const w = ctx.measureText(p.line).width + 6, by = y - 14;
        ctx.globalAlpha = Math.min(1, p.lineT * 3);
        ctx.fillStyle = 'rgba(250,250,245,.95)';
        ctx.fillRect(px(x - w / 2), px(by), w, 9);
        ctx.beginPath();
        ctx.moveTo(x - 2.5, by + 9);
        ctx.lineTo(x + 2.5, by + 9);
        ctx.lineTo(x, by + 12);
        ctx.fill();
        ctx.fillStyle = '#141414';
        ctx.textAlign = 'center';
        ctx.fillText(p.line, x, by + 7);
        ctx.globalAlpha = 1;
      }
    }
  }

  // El nombre de los otros jugadores arriba de la cabeza, con el color de su remera
  drawPlayerTags() {
    for (const q of G.players) {
      if (q === G.me || q.dead || q.healing || q.party) continue;
      const x = q.x - G.cam.x, y = q.y - G.cam.y - (q.car ? 14 : 18);
      if (x < -60 || y < -30 || x > RW + 60 || y > RH + 30) continue;
      this.text(q.def.name, px(x), px(y), q.def.shirt, 4, 'center');
    }
  }

  // El HUD es del jugador local (G.me): su guita, su búsqueda, su arresto
  drawHUD() {
    const ctx = this.ctx;
    const P = G.me;
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(0, 0, 118, 46);
    const needY = P.armor > 0 ? 50 : 44; // barras de hambre y sed, abajo de la vida
    ctx.fillRect(RW - 96, 0, 96, needY + 9);
    this.text('$' + P.money, RW - 7, 13, '#7de07d', 9, 'right');
    for (let i = 0; i < 5; i++) {
      this.text('*', RW - 9 - i * 11, 28, i < P.wanted ? '#ffd34a' : '#35383d', 11, 'right');
    }
    ctx.fillStyle = 'rgba(0,0,0,.75)';
    ctx.fillRect(RW - 79, 34, 72, 7);
    const hp = clamp(P.hp / P.maxhp, 0, 1);
    ctx.fillStyle = hp > 0.3 ? '#d1483f' : '#ff6a5a';
    ctx.fillRect(RW - 78, 35, 70 * hp, 5);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(RW - 78, 35, 70 * hp, 1);
    if (P.armor > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.75)';
      ctx.fillRect(RW - 79, 42, 72, 6);
      ctx.fillStyle = '#5a8ad8';
      ctx.fillRect(RW - 78, 43, 70 * clamp(P.armor / 100, 0, 1), 4);
    }
    // Respeto: el rango y cuánto tiene
    const rank = RANKS[game.rankOf(P)][1];
    this.text(rank + ' ' + (P.respect || 0), RW - 8, needY + 17, '#e8c86a', 5, 'right');
    if (P.bank > 0) this.text('BANCO $' + P.bank, RW - 8, needY + 25, '#7de07d', 5, 'right');
    // Hambre (naranja) y sed (celeste): titilan cuando están bajas
    const blink = Math.floor(G.t * 4) % 2;
    [[P.food, '#e8a23a', RW - 79], [P.drink, '#4ab0e8', RW - 42]].forEach(([v, col, x]) => {
      const k = clamp((v || 0) / 100, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.75)';
      ctx.fillRect(x, needY, 35, 5);
      ctx.fillStyle = v <= NEED_LOW && blink ? '#ff4a3a' : col;
      ctx.fillRect(x + 1, needY + 1, 33 * k, 3);
    });

    // La mochila: lo que lleva para comer y tomar, con la cantidad
    const bag = Object.keys(P.bag || {}).filter(k => P.bag[k] > 0);
    if (bag.length) {
      const by = P.porros > 0 || P.slowmo > 0 ? 70 : 54;
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.fillRect(0, by - 8, 8 + bag.length * 22, 16);
      bag.forEach((k, i) => {
        const bx = 12 + i * 22;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(0.7, 0.7);
        foodIcon(ctx, k, 0, 0);
        ctx.restore();
        this.text(String(P.bag[k]), bx + 6, by + 6, '#e8e8e8', 5);
      });
    }

    // Arma en mano y balas
    weaponIcon(ctx, P.wpn, 19, 37);
    const ammo = P.inv[P.wpn];
    this.text(WEAPONS[P.wpn].short + (ammo === Infinity ? '' : ' ' + ammo), 36, 40, '#e8e8e8', 6);
    this.text(P.def.name, 7, 13, '#ffd34a', 8);
    // Jugando online: el código de la sala (para pasarlo) y cuántos hay
    if (net.role && net.code) {
      this.text('SALA ' + net.code + ' - ' + G.players.length + '/' + MAX_PLAYERS, RW / 2, 9, '#9ad0ff', 6, 'center');
    }
    const h = Math.floor(dayT() * 24), mm = Math.floor(((dayT() * 24) % 1) * 60);
    this.text(String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), 7, 26, '#cfcfcf', 7);

    if (P.nearGrill && !P.nearShop && !P.nearSuper && !G.shopOpen && !P.dead && !P.busted && !P.car) {
      const g = parrillas.find(q => dist(q, P) < GRILL_R);
      const key = (typeof touchController !== 'undefined' && touchController.isTouch) ? 'TOCA EL AUTO' : 'E';
      const what = g && g.cooking ? 'SACAR UNA PORCION' : 'PRENDER EL ASADO (CARNE + CARBON)';
      this.text(key + ': ' + what, RW / 2, RH - 34, Math.floor(G.t * 3) % 2 ? '#ffb04a' : '#ffd34a', 7, 'center');
    }
    if (P.nearBoliche && !P.nearShop && !P.nearSuper && !G.shopOpen && !P.dead && !P.busted && !P.car && !P.party) {
      const b = boliches.find(q => Math.hypot(q.door.x + q.door.ox - P.x, q.door.y + q.door.oy - P.y) < 16);
      const key = (typeof touchController !== 'undefined' && touchController.isTouch) ? 'TOCA EL AUTO' : 'E';
      if (b) {
        const D = bolicheOf(b);
        this.text(bolicheOpen() ? key + ': ENTRAR A ' + D.name + ' ($' + D.entry + ')' : D.name + ' ABRE A LA NOCHE',
          RW / 2, RH - 34, Math.floor(G.t * 3) % 2 ? 'rgb(' + D.glow + ')' : '#fff', 7, 'center');
      }
    }
    if (P.nearBank && !P.nearShop && !P.nearSuper && !G.shopOpen && !P.dead && !P.busted && !P.car) {
      const key = (typeof touchController !== 'undefined' && touchController.isTouch) ? 'TOCA EL AUTO' : 'E';
      this.text(key + ': ENTRAR AL BANCO', RW / 2, RH - 34, Math.floor(G.t * 3) % 2 ? '#7de07d' : '#ffd34a', 7, 'center');
    }
    if ((P.nearShop || P.nearTranza || P.nearSuper) && !G.shopOpen && !P.dead && !P.busted) {
      const bl = Math.floor(G.t * 3) % 2;
      const key = (typeof touchController !== 'undefined' && touchController.isTouch) ? 'TOCA EL AUTO' : 'E';
      const what = P.nearShop ? 'ENTRAR A LA ARMERIA' : P.nearSuper ? 'ENTRAR AL SUPER' : 'HABLAR CON EL TRANZA';
      const sup = P.nearSuper && supers.find(b => Math.hypot(b.door.x + b.door.ox - P.x, b.door.y + b.door.oy - P.y) < 16);
      if (sup && (sup.closed > 0 || sup.robbing)) {
        if (!sup.robbing) this.text('CERRADO POR ROBO', RW / 2, RH - 34, '#ff8a4a', 7, 'center');
      } else {
        this.text(key + ': ' + what + (sup ? ' - DISPARA: ASALTO' : ''), RW / 2, RH - 34, bl ? '#ffb04a' : '#ffd34a', 7, 'center');
      }
    }

    // Con el trapo encima: cuánto falta para que sea tuyo
    if (P.trapo && !P.dead) {
      const k2 = clamp(P.trapoT / TRAPO_TIME, 0, 1), W = 140, X = RW / 2 - W / 2, Y = 30;
      this.text('TRAPO DE ' + P.trapo.def.name + ' - AGUANTALO', RW / 2, Y - 4, Math.floor(G.t * 4) % 2 ? P.trapo.def.band : '#fff', 6, 'center');
      ctx.fillStyle = '#000';
      ctx.fillRect(X - 1, Y - 1, W + 2, 7);
      ctx.fillStyle = P.trapo.def.band;
      ctx.fillRect(X, Y, W * k2, 5);
    }
    if (P.nearTrapo && !P.car && !P.dead && !G.shopOpen) {
      const B = G.barras.find(q => q.trapo === 'hung' && dist(q.flag, P) < TRAPO_R);
      if (B) this.text('E: ROBAR EL TRAPO DE ' + B.def.name, RW / 2, RH - 44, Math.floor(G.t * 3) % 2 ? '#ff6a5a' : '#ffd34a', 7, 'center');
    }

    // Asalto en curso: la barra de la caja para los que están en la puerta
    for (const b of supers) {
      if (!b.robbing || P.dead || P.car) continue;
      if (Math.hypot(b.door.x + b.door.ox - P.x, b.door.y + b.door.oy - P.y) > ROB_R) continue;
      const k2 = Math.min(1, b.robT / ROB_TIME), W = 120, X = RW / 2 - W / 2, Y = RH - 52;
      this.text('VACIANDO LA CAJA', RW / 2, Y - 4, Math.floor(G.t * 4) % 2 ? '#ff6a5a' : '#ffd34a', 7, 'center');
      ctx.fillStyle = '#000';
      ctx.fillRect(X - 1, Y - 1, W + 2, 7);
      ctx.fillStyle = '#5ad25a';
      ctx.fillRect(X, Y, W * k2, 5);
    }

    // Porros en el bolsillo y tiempo de cámara lenta
    if (P.porros > 0 || P.slowmo > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.fillRect(0, 46, 64, 14);
      weaponIcon(ctx, 'porro', 14, 53);
      this.text('x' + P.porros, 28, 57, '#9ae29a', 6);
      if (P.slowmo > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(46, 50, 14, 5);
        ctx.fillStyle = '#5ad266';
        ctx.fillRect(47, 51, 12 * P.slowmo / PORRO_TIME, 3);
      }
    }

    if (G.msgT > 0) {
      ctx.globalAlpha = clamp(G.msgT, 0, 1);
      this.text(G.msg, RW / 2, RH - 16, '#fff', 8, 'center');
      ctx.globalAlpha = 1;
    }

    if (P.busted) {
      const k = clamp(0.45 + P.bustT / 0.35, 0, 1);
      const bl = Math.floor(G.t * 6) % 2;
      ctx.fillStyle = bl ? 'rgba(18,34,105,.5)' : 'rgba(105,18,26,.5)';
      ctx.fillRect(0, 0, RW, RH);
      ctx.fillStyle = 'rgba(0,0,0,.93)';
      ctx.fillRect(0, RH / 2 - 32, RW, 74);
      ctx.fillStyle = bl ? '#3a5ad8' : '#d83a44';
      ctx.fillRect(0, RH / 2 - 33, RW, 2);
      ctx.fillRect(0, RH / 2 + 42, RW, 2);
      ctx.globalAlpha = k;
      this.text('TE AGARRARON', RW / 2, RH / 2 - 8, '#ff8a7a', 16, 'center');
      this.text('MULTA: $' + P.bustFine, RW / 2, RH / 2 + 14, '#ffd34a', 9, 'center');
      if (P.bustT > 1.4) {
        this.text('TE LLEVAN A LA COMISARIA', RW / 2, RH / 2 + 34, '#e8e8e8', 8, 'center');
      }
      ctx.globalAlpha = 1;
    }

    if (P.healing) {
      const k = clamp(0.45 + P.healT / 0.35, 0, 1);
      ctx.fillStyle = 'rgba(18,60,30,.5)';
      ctx.fillRect(0, 0, RW, RH);
      ctx.fillStyle = 'rgba(0,0,0,.93)';
      ctx.fillRect(0, RH / 2 - 26, RW, 58);
      ctx.fillStyle = '#3fae4a';
      ctx.fillRect(0, RH / 2 - 27, RW, 2);
      ctx.fillRect(0, RH / 2 + 30, RW, 2);
      ctx.globalAlpha = k;
      this.text('CURANDOTE...', RW / 2, RH / 2 - 4, '#8ef08e', 14, 'center');
      const pct = Math.min(100, Math.round(P.healT / HOSPITAL_TIME * 100));
      this.text(pct + '%', RW / 2, RH / 2 + 16, '#ffd34a', 9, 'center');
      ctx.globalAlpha = 1;
    }

    if (P.party) {
      // Adentro del boliche: luces que giran y la gente bailando
      const D = bolicheOf(boliches[P.party - 1]), c = D.glow;
      ctx.fillStyle = 'rgba(8,4,14,.88)';
      ctx.fillRect(0, 0, RW, RH);
      for (let i = 0; i < 18; i++) {
        const a = G.t * 1.3 + i * 2.4, x = RW / 2 + Math.cos(a) * (40 + i * 9), y = RH / 2 + Math.sin(a * 0.7) * (20 + i * 3);
        ctx.fillStyle = i % 3 ? 'rgba(' + c + ',.5)' : 'rgba(255,255,255,.35)';
        ctx.fillRect(px(x), px(y + Math.abs(Math.sin(G.t * 8 + i)) * -4), 4, 7);
      }
      this.text(D.name, RW / 2, RH / 2 - 30, 'rgb(' + c + ')', 12, 'center');
      this.text(D.doing + '...', RW / 2, RH / 2 + 34, '#fff', 8, 'center');
    }

    if (!P.busted && !P.dead && P.car) {
      const near = G.cars.some(c => c.chase && c.hp > 0 && dist(c, P) < 30);
      if (near && Math.floor(G.t * 5) % 2) {
        this.text('FRENA Y TE AGARRAN - ACELERA!', RW / 2, 52, '#ff8a4a', 8, 'center');
      }
    }

    if (P.dead) {
      ctx.fillStyle = 'rgba(70,0,0,.55)';
      ctx.fillRect(0, 0, RW, RH);
      this.text('TE MATARON', RW / 2, RH / 2 - 10, '#ff4a4a', 16, 'center');
      this.text('GUITA: $' + P.money + (P.bank > 0 ? '  BANCO: $' + P.bank : ''), RW / 2, RH / 2 + 12, '#ffd34a', 9, 'center');
      this.text('ENTER PARA VOLVER AL BARRIO', RW / 2, RH / 2 + 32, '#fff', 8, 'center');
    }

    if (G.paused) {
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(0, 0, RW, RH);
      this.text('PAUSA', RW / 2, RH / 2, '#ffd34a', 16, 'center');
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const night = darkness();
    litWindows.length = 0;
    ctx.save();
    if (G.shake > 0.1) {
      const a = Math.random() * TAU, m = Math.min(G.shake, 6);
      ctx.translate(px(Math.cos(a) * m), px(Math.sin(a) * m));
    }
    this.drawGround();
    this.drawWater(); // olas, espuma, camalotes y lanchas del Riachuelo

    for (const pk of G.pickups) this.drawPickup(pk);

    // Marca en la vereda frente a cada armería, cada super abierto y el banco
    for (const b of shops.concat(supers.filter(q => !(q.closed > 0)), banks)) {
      const d = b.door, x = d.x + d.ox - G.cam.x, y = d.y + d.oy - G.cam.y;
      if (x < -20 || y < -20 || x > RW + 20 || y > RH + 20) continue;
      const pulse = 6 + Math.sin(G.t * 4) * 1.5;
      ctx.strokeStyle = b.bank ? 'rgba(110,230,120,.9)' : b.super ? 'rgba(255,110,90,.9)' : 'rgba(255,170,60,.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, pulse, pulse * 0.6, 0, 0, TAU);
      ctx.stroke();
    }

    for (const c of G.cars) {
      if (!driverOf(c)) this.drawCar(c, night);
    }
    for (const p of G.peds) {
      if (p.hp <= 0 || p.inside || p.air) continue;
      if (p.fade < 1) ctx.globalAlpha = p.fade;
      this.drawGuy(p, p.face, p.shirt, p.pants, false);
      ctx.globalAlpha = 1;
    }
    for (const c of G.cops) {
      this.drawGuy(c, 'cop', '#20406f', '#14213d', false);
    }
    for (const t of G.tranzas) {
      if (t.hp > 0) this.drawGuy(t, t.face, t.shirt, t.pants, false);
    }
    for (const h of G.hinchas) {
      if (h.hp > 0) this.drawGuy(h, h.face, h.barra.def.shirt, h.barra.def.pants, false);
    }

    // Edificios: ordenados desde el más lejano del centro de pantalla
    const vis = [];
    for (const b of buildings) {
      const x = b.x - G.cam.x, y = b.y - G.cam.y;
      if (x > RW + 60 || y > RH + 60 || x + b.w < -60 || y + b.h < -60) continue;
      vis.push(b);
    }
    vis.sort((a, b2) =>
      Math.hypot(b2.x + b2.w / 2 - G.cam.x - RW / 2, b2.y + b2.h / 2 - G.cam.y - RH / 2) -
      Math.hypot(a.x + a.w / 2 - G.cam.x - RW / 2, a.y + a.h / 2 - G.cam.y - RH / 2)
    );

    for (const b of vis) this.drawBuilding(b, night);
    for (const p of props) {
      if (p.t === 'palm') this.drawPalm(p);
      else if (p.t === 'arbol') this.drawArbol(p);
      else if (p.t === 'obelisco') this.drawObelisco(p);
      else if (p.t === 'puente') this.drawPuente(p);
      else if (p.t === 'ropa') this.drawRopa(p);
      else if (p.t === 'barril') this.drawBarril(p, night);
      else if (p.t === 'sombrilla') this.drawSombrilla(p);
      else if (p.t === 'chiringuito') this.drawChiringuito(p, night);
      else if (p.t === 'guardavidas') this.drawGuardavidas(p);
      else if (p.t === 'voley') this.drawVoley(p);
      else if (p.t === 'carpa') this.drawCarpa(p);
      else if (p.t === 'fogata') this.drawFogata(p, night);
      else if (p.t === 'muelle') this.drawMuelle(p);
      else if (p.t === 'gaviotas') this.drawGaviotas(p, night);
      else if (p.t === 'changuito') this.drawChanguito(p);
      else if (p.t === 'perro') this.drawPerro(p);
    }
    for (const g of parrillas) this.drawParrilla(g);
    for (const B of G.barras) this.drawTrapoPole(B);
    for (const l of lamps) this.drawLamp(l, night);
    for (const L of lights) if (L) this.drawTrafficLight(L);
    for (const p of G.peds) if (p.air && p.hp > 0) this.drawHeli(p);

    // Los jugadores van arriba de todo; el local al final, para que nunca lo tape otro
    for (const P of G.players.filter(q => q !== G.me).concat(G.me ? [G.me] : [])) {
      if (P.car) { if (!P.seat) this.drawCar(P.car, night); }
      else if (!P.dead && !P.healing && !P.party) this.drawGuy(P, P.def.id, P.def.shirt, P.def.pants, P.hp < 35);
      if (P.trapo && !P.dead) this.drawFlag(P.trapo.def.k, P.x - G.cam.x + 3, P.y - G.cam.y - 16, 0.8);
    }

    for (const b of G.bullets) {
      ctx.strokeStyle = b.owner ? 'rgba(255,235,160,.95)' : 'rgba(255,150,110,.95)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(b.x - G.cam.x, b.y - G.cam.y);
      ctx.lineTo(b.x - G.cam.x - b.vx * 0.012, b.y - G.cam.y - b.vy * 0.012);
      ctx.stroke();
    }

    for (const n of G.nades) {
      const x = n.x - G.cam.x, y = n.y - G.cam.y;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(px(x - 1.5), px(y + 1), 4, 2);
      ctx.fillStyle = '#3f5a2a';
      ctx.fillRect(px(x - 1.5), px(y - 1.5 - n.z * 0.5), 3.5, 3.5);
      if (Math.floor(n.t * 10) % 2) {
        ctx.fillStyle = '#ff4a3a';
        ctx.fillRect(px(x), px(y - 2 - n.z * 0.5), 1, 1);
      }
    }

    for (const f of G.fx) {
      ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
      ctx.fillStyle = 'rgb(' + f.col + ')';
      ctx.fillRect(px(f.x - G.cam.x), px(f.y - G.cam.y), f.sz, f.sz);
    }

    for (const s of G.smoke) {
      ctx.globalAlpha = clamp(s.life / s.max, 0, 1) * 0.45;
      ctx.fillStyle = 'rgb(' + s.col + ')';
      ctx.beginPath();
      ctx.arc(s.x - G.cam.x, s.y - G.cam.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawLights(night);
    this.drawFamousTags();
    this.drawPlayerTags();
    ctx.restore();

    // Porro: gradiente verde que respira mientras dura la cámara lenta
    const high = G.me ? G.me.high : 0;
    if (high > 0.01) {
      const wob = Math.sin(G.t * 9) * 0.04;
      const gr = ctx.createRadialGradient(RW / 2, RH / 2, RH * (0.2 + wob), RW / 2, RH / 2, RH);
      gr.addColorStop(0, 'rgba(90,210,102,' + (0.08 * high) + ')');
      gr.addColorStop(1, 'rgba(30,140,50,' + (0.5 * high) + ')');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, RW, RH);
    }

    if (VIG) ctx.drawImage(VIG, 0, 0);
    if (G.flash > 0) {
      ctx.globalAlpha = G.flash * 0.5;
      ctx.fillStyle = '#ffdca0';
      ctx.fillRect(0, 0, RW, RH);
      ctx.globalAlpha = 1;
    }
    this.drawRadar();
    this.drawHUD();
    if (G.mapOpen) this.drawMap();
  }
}

const renderer = new Renderer();
const cv = renderer.cv;
const ctx = renderer.ctx;

// Funciones delegadas para compatibilidad
const render = () => renderer.render();
const quad = (x1, y1, x2, y2, x3, y3, x4, y4, col) => renderer.quad(x1, y1, x2, y2, x3, y3, x4, y4, col);
const drawGround = () => renderer.drawGround();
const drawBuilding = (b, night) => renderer.drawBuilding(b, night);
const drawPickup = pk => renderer.drawPickup(pk);
const drawPalm = p => renderer.drawPalm(p);
const drawObelisco = o => renderer.drawObelisco(o);
const drawTrafficLight = L => renderer.drawTrafficLight(L);
const drawLamp = (l, night) => renderer.drawLamp(l, night);
const drawGuy = (e, faceKey, shirt, pants, hurt) => renderer.drawGuy(e, faceKey, shirt, pants, hurt);
const drawCar = (c, night) => renderer.drawCar(c, night);
const drawLights = night => renderer.drawLights(night);
const drawRadar = () => renderer.drawRadar();
const drawMap = () => renderer.drawMap();

// Qué muestra cada ícono del mapa (en este orden van las referencias)
const MAP_LEGEND = [
  ['vos', 'VOS'], ['jugador', 'OTRO JUGADOR'], ['hospital', 'HOSPITAL'], ['armeria', 'ARMERIA'], ['banco', 'BANCO'],
  ['choto', 'SUPER CHOTO'], ['noche', 'SUPER NOCHE %'], ['cerrado', 'SUPER CERRADO'],
  ['parrilla', 'PARRILLA'], ['asado', 'ASADO PRENDIDO'], ...STADIUMS.map(S => ['st_' + S.k, S.name]),
  ...BARRAS.map(B => ['tr_' + B.k, 'TRAPO ' + B.short]), ['hincha', 'BARRA CALIENTE'],
  ['rosada', 'CASA ROSADA'], ['obelisco', 'OBELISCO'],
  ['tranza', 'TRANZA'], ['tranzaMal', 'TRANZA CALIENTE'], ['famoso', 'FAMOSO'], ['yuta', 'YUTA'],
  ['patrullero', 'PATRULLERO'], ['guita', 'GUITA'], ['fierro', 'FIERRO'], ['comida', 'COMIDA'],
];

// Dónde mira el mapa: un centro (G.mapX/Y) que se mueve con flechas o arrastrando, el zoom,
// y el ancho que deja el panel de referencias. Es vista local: solo de esta pantalla.
const mapCtl = {
  view() {
    const MW = G.mapLegend ? RW - MAP_LEG_W : RW;
    const viewW = clamp(WORLD / G.mapZoom, 40, WORLD), viewH = viewW * (RH / MW);
    const sx = clamp(G.mapX - viewW / 2, Math.min(0, WORLD - viewW), Math.max(0, WORLD - viewW));
    const sy = clamp(G.mapY - viewH / 2, Math.min(0, WORLD - viewH), Math.max(0, WORLD - viewH));
    return { MW, viewW, viewH, sx, sy, k: MW / viewW };
  },
  // Centrado en el jugador
  open() {
    if (!G.me) return;
    G.mapX = G.me.x;
    G.mapY = G.me.y;
  },
  // Mover el centro (en unidades del mundo), sin salirse del mapa
  pan(dx, dy) {
    const v = this.view();
    G.mapX = clamp(G.mapX + dx, Math.min(v.viewW / 2, WORLD / 2), Math.max(WORLD - v.viewW / 2, WORLD / 2));
    G.mapY = clamp(G.mapY + dy, Math.min(v.viewH / 2, WORLD / 2), Math.max(WORLD - v.viewH / 2, WORLD / 2));
  },
};
const text = (t, x, y, col, size, align) => renderer.text(t, x, y, col, size, align);
const drawHUD = () => renderer.drawHUD();
