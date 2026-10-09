/* =========================================================================
   GTA MERCALOCA - Motor Gráfico / Renderer (Falso 3D, Iluminación, HUD)
   ========================================================================= */

const litWindows = [];
const glowCache = {};

/**
 * Ícono pixel art de un arma (o del chaleco), centrado en (x, y), de unos 24x12.
 * Se usa en el HUD, en los fierros tirados en la calle y en la armería.
 */
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

    if (b.H > 45) {
      const bl = Math.sin(G.t * 3.4) > 0;
      ctx.fillStyle = bl ? '#ff5a5a' : '#4a1212';
      ctx.fillRect(px(rx + b.w * 0.85), px(ry + b.h * 0.85), 3, 3);
    }
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
    } else if (pk.kind === 'cash') {
      ctx.fillStyle = '#1f5c23';
      ctx.fillRect(px(x - 5), px(y - 4), 10, 7);
      ctx.fillStyle = '#3f9c43';
      ctx.fillRect(px(x - 5), px(y - 4), 10, 3);
      ctx.fillStyle = '#d8f0d8';
      ctx.fillRect(px(x - 2), px(y - 2), 4, 3);
    } else if (pk.food === 'pernil') {
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(px(x - 5), px(y - 4), 9, 8);
      ctx.fillStyle = '#d99a68';
      ctx.fillRect(px(x - 5), px(y - 4), 9, 5);
      ctx.fillStyle = '#efe6d4';
      ctx.fillRect(px(x + 3), px(y + 1), 3, 4);
    } else if (pk.food === 'choripan') {
      ctx.fillStyle = '#d8ad5f';
      ctx.fillRect(px(x - 5), px(y - 3), 10, 6);
      ctx.fillStyle = '#7a3a2a';
      ctx.fillRect(px(x - 5), px(y - 1), 10, 3);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(px(x - 5), px(y - 1), 10, 1);
    } else {
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(px(x - 0.5), px(y - 7), 2, 6);
      ctx.fillStyle = '#4a3524';
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 4, 4.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6b8a4a';
      ctx.fillRect(px(x - 2.5), px(y - 1), 5, 2);
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
    // Guiño: titila adelante y atrás del lado que va a doblar (+1 derecha, -1 izquierda)
    if (c.signal && Math.floor(G.t * 3.2) % 2) {
      const sy = c.signal > 0 ? h / 2 - 2 : -h / 2;
      ctx.fillStyle = '#ffb21a';
      ctx.fillRect(w / 2 - 2.6, sy, 2.2, 2);
      ctx.fillRect(-w / 2 + 0.4, sy, 2.2, 2);
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
        if (c.signal && Math.floor(G.t * 3.2) % 2) {
          ECTX.globalAlpha = 0.8 * k;
          ECTX.drawImage(this.glow(255, 180, 40, 16), c.w / 2 - 8, (c.signal > 0 ? c.h / 2 : -c.h / 2) - 8);
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
      const gc = { cash: [110, 255, 120], hp: [255, 110, 110], weapon: [255, 200, 80] }[pk.kind];
      ECTX.drawImage(this.glow(gc[0], gc[1], gc[2], gsz), x - gsz / 2, y - gsz / 2);
      any = true;
    }
    for (const b of shops) {
      const d = b.door, x = d.x + d.ox - G.cam.x, y = d.y + d.oy - G.cam.y;
      if (x < -40 || y < -40 || x > RW + 40 || y > RH + 40) continue;
      const gsz = 48;
      ECTX.globalAlpha = (0.45 + Math.sin(G.t * 4) * 0.15) * Math.max(k, 0.5);
      ECTX.drawImage(this.glow(255, 150, 50, gsz), x - gsz / 2, y - gsz / 2);
      any = true;
    }
    if (night > 0.18 && this.drawBoatLights(k)) any = true; // luces de las lanchas

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
    for (const pk of G.pickups) dot(pk, { cash: '#5ad25a', hp: '#ff5a5a', weapon: '#ffc84a' }[pk.kind]);
    for (const h of hospitals) dot({ x: h.x + h.w / 2, y: h.y + h.h / 2 }, '#ffffff', 3);
    for (const cr of casaRosada) dot({ x: cr.x + cr.w / 2, y: cr.y + cr.h / 2 }, '#ff8fc0', 3);
    if (obelisco) dot({ x: obelisco.x + obelisco.w / 2, y: obelisco.y + obelisco.h / 2 }, '#e8f070', 3);
    for (const c of G.cops) dot(c, '#4aa3ff');
    for (const t of G.tranzas) if (t.hp > 0) dot(t, t.villa.angry > 0 ? '#ff3a3a' : '#c070ff');
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
    ctx.fillStyle = '#fff';
    ctx.fillRect(px(ox + (P.x * k - sx)) - 1, px(oy + (P.y * k - sy)) - 1, 3, 3);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 1.5, oy - 1.5, S + 3, S + 3);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(ox - 2.5, oy - 2.5, S + 5, S + 5);
  }

  drawMap() {
    if (!GROUND) return;
    const ctx = this.ctx;
    const P = G.me;
    const viewW = clamp(WORLD / G.mapZoom, 40, WORLD);
    const viewH = viewW * (RH / RW);
    const sx = clamp(P.x - viewW / 2, 0, WORLD - viewW);
    const sy = clamp(P.y - viewH / 2, 0, WORLD - viewH);
    const k = RW / viewW;

    ctx.fillStyle = 'rgba(0,0,0,.85)';
    ctx.fillRect(0, 0, RW, RH);
    ctx.drawImage(GROUND, sx, sy, viewW, viewH, 0, 0, RW, RH);

    const dot = (e, col, sz = 2) => {
      const x = (e.x - sx) * k, y = (e.y - sy) * k;
      if (x < 0 || y < 0 || x > RW || y > RH) return;
      ctx.fillStyle = col;
      ctx.fillRect(px(x), px(y), sz, sz);
    };
    for (const pk of G.pickups) dot(pk, pk.kind === 'cash' ? '#5ad25a' : '#ff5a5a');
    for (const h of hospitals) dot({ x: h.x + h.w / 2, y: h.y + h.h / 2 }, '#ffffff', 3);
    for (const cr of casaRosada) dot({ x: cr.x + cr.w / 2, y: cr.y + cr.h / 2 }, '#ff8fc0', 3);
    if (obelisco) dot({ x: obelisco.x + obelisco.w / 2, y: obelisco.y + obelisco.h / 2 }, '#e8f070', 4);
    for (const c of G.cops) dot(c, '#4aa3ff');
    for (const c of G.cars) if (c.chase && c.hp > 0) dot(c, '#2a6aff', 3);
    // Los otros jugadores, con el color de su remera
    for (const q of G.players) {
      if (q === P || q.dead) continue;
      dot({ x: q.x - 2.5 / k, y: q.y - 2.5 / k }, '#000', 6);
      dot({ x: q.x - 1.5 / k, y: q.y - 1.5 / k }, q.def.shirt, 4);
    }

    // Marcador del jugador: bien resaltado, con anillo pulsante y flecha de rumbo
    const cx = (P.x - sx) * k, cy = (P.y - sy) * k;
    const now = (typeof performance !== 'undefined') ? performance.now() : 0;
    const pulse = 4 + Math.sin(now / 180) * 1.6;
    ctx.strokeStyle = 'rgba(255,211,74,.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse + 4, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd34a';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(P.ang) * 10, cy + Math.sin(P.ang) * 10);
    ctx.stroke();
    ctx.strokeStyle = '#ffd34a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(P.ang) * 10, cy + Math.sin(P.ang) * 10);
    ctx.stroke();

    this.text('MAPA', RW / 2, 12, '#ffd34a', 10, 'center');
    this.text('M cerrar · +/- o rueda: zoom', RW / 2, RH - 10, '#ccc', 7, 'center');
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

  // El HUD es del jugador local (G.me): su guita, su búsqueda, su arresto
  drawHUD() {
    const ctx = this.ctx;
    const P = G.me;
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(0, 0, 118, 46);
    ctx.fillRect(RW - 96, 0, 96, P.armor > 0 ? 51 : 45);
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

    // Arma en mano y balas
    weaponIcon(ctx, P.wpn, 19, 37);
    const ammo = P.inv[P.wpn];
    this.text(WEAPONS[P.wpn].short + (ammo === Infinity ? '' : ' ' + ammo), 36, 40, '#e8e8e8', 6);
    this.text(P.def.name, 7, 13, '#ffd34a', 8);
    const h = Math.floor(dayT() * 24), mm = Math.floor(((dayT() * 24) % 1) * 60);
    this.text(String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), 7, 26, '#cfcfcf', 7);

    if ((P.nearShop || P.nearTranza) && !G.shopOpen && !P.dead && !P.busted) {
      const bl = Math.floor(G.t * 3) % 2;
      const key = (typeof touchController !== 'undefined' && touchController.isTouch) ? 'TOCA EL AUTO' : 'E';
      const what = P.nearShop ? 'ENTRAR A LA ARMERIA' : 'HABLAR CON EL TRANZA';
      this.text(key + ': ' + what, RW / 2, RH - 34, bl ? '#ffb04a' : '#ffd34a', 7, 'center');
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
      this.text('GUITA: $' + P.money, RW / 2, RH / 2 + 12, '#ffd34a', 9, 'center');
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

    // Marca en la vereda frente a cada armería
    for (const b of shops) {
      const d = b.door, x = d.x + d.ox - G.cam.x, y = d.y + d.oy - G.cam.y;
      if (x < -20 || y < -20 || x > RW + 20 || y > RH + 20) continue;
      const pulse = 6 + Math.sin(G.t * 4) * 1.5;
      ctx.strokeStyle = 'rgba(255,170,60,.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, pulse, pulse * 0.6, 0, 0, TAU);
      ctx.stroke();
    }

    for (const c of G.cars) {
      if (!driverOf(c)) this.drawCar(c, night);
    }
    for (const p of G.peds) {
      if (p.hp <= 0 || p.inside) continue;
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
    }
    for (const l of lamps) this.drawLamp(l, night);
    for (const L of lights) if (L) this.drawTrafficLight(L);

    // Los jugadores van arriba de todo; el local al final, para que nunca lo tape otro
    for (const P of G.players.filter(q => q !== G.me).concat(G.me ? [G.me] : [])) {
      if (P.car) this.drawCar(P.car, night);
      else if (!P.dead && !P.healing) this.drawGuy(P, P.def.id, P.def.shirt, P.def.pants, P.hp < 35);
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
const text = (t, x, y, col, size, align) => renderer.text(t, x, y, col, size, align);
const drawHUD = () => renderer.drawHUD();
