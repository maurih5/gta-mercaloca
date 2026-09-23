/* =========================================================================
   GTA MERCALOCA - Motor Gráfico / Renderer (Falso 3D, Iluminación, HUD)
   ========================================================================= */

const litWindows = [];
const glowCache = {};

class Renderer {
  constructor() {
    this.cv = (typeof document !== 'undefined') ? document.getElementById('cv') : null;
    this.ctx = this.cv ? this.cv.getContext('2d') : null;
    if (this.cv) {
      this.cv.width = RW;
      this.cv.height = RH;
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

    if (det === 'tejas') {
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
      const bcx = rx + b.w / 2, bs = Math.min(b.w, b.h) * 0.2;
      ctx.fillStyle = '#f5ead6';
      ctx.fillRect(px(bcx - bs), px(ry + b.h * 0.6), bs * 2, bs * 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px(bcx - bs * 0.12), px(ry + b.h * 0.1), bs * 0.24, bs * 0.9);
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

    if (det === 'tanque' || b.tank) {
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

  drawObelisco(o) {
    const ctx = this.ctx;
    const x = o.x - G.cam.x, y = o.y - G.cam.y;
    if (x < -60 || y < -180 || x > RW + 60 || y > RH + 60) return;
    const H = 90;
    const dx = (x - RW / 2) * H / FOCAL, dy = (y - RH / 2) * H / FOCAL;
    const tx = x + dx, ty = y + dy, w = 7;
    ctx.fillStyle = '#6b6a63';
    ctx.fillRect(px(x - w), px(y), w * 2, 4);
    ctx.fillStyle = '#e8e6de';
    this.quad(x - w, y, x + w, y, tx + w, ty, tx - w, ty, '#d8d6cc');
    ctx.fillStyle = '#c8c6bc';
    ctx.fillRect(px(tx - w), px(ty), w * 2, 1);
    ctx.beginPath();
    ctx.moveTo(tx - w, ty);
    ctx.lineTo(tx + w, ty);
    ctx.lineTo(tx, ty - 14);
    ctx.closePath();
    ctx.fillStyle = '#f0eee6';
    ctx.fill();
  }

  drawTrafficLight(L) {
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

    if (pk.kind === 'cash') {
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
    ctx.fillStyle = '#16181c'; // Fierro
    ctx.fillRect(4.5, -1.2, 6, 2.4);
    ctx.restore();

    // Cabeza y cara
    const f = G.faces[faceKey] || G.faces.ped;
    const hy = y - 11 - bob;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(px(x - 6.5), px(hy - 0.5), 13, 13);
    if (f) {
      ctx.drawImage(f, px(x - 6), px(hy), 12, 12);
    } else {
      ctx.fillStyle = '#c9a07a';
      ctx.fillRect(px(x - 4), px(hy + 1), 8, 8);
    }
    if (hurt) {
      ctx.fillStyle = 'rgba(190,20,20,.35)';
      ctx.fillRect(px(x - 6), px(hy), 12, 12);
    }

    // Fogonazo
    if (e.muzzle > 0) {
      ctx.globalAlpha = e.muzzle;
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath();
      ctx.moveTo(x + fx * 11, y + fy * 11);
      ctx.lineTo(x + fx * 17 + rxp * 3.5, y + fy * 17 + ryp * 3.5);
      ctx.lineTo(x + fx * 17 - rxp * 3.5, y + fy * 17 - ryp * 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
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
    ctx.fillStyle = c.spd < -2 ? '#ff7a6a' : '#8c2a22';
    ctx.fillRect(-w / 2 + 0.6, -h / 2 + 2.5, 1.6, 3);
    ctx.fillRect(-w / 2 + 0.6, h / 2 - 5.5, 1.6, 3);

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

    const P = G.player;
    if (P && P.muzzle > 0) {
      const gsz = 108;
      ECTX.globalAlpha = P.muzzle;
      ECTX.drawImage(this.glow(255, 228, 158, gsz), P.x - G.cam.x - gsz / 2, P.y - G.cam.y - gsz / 2);
      any = true;
    }
    for (const c of G.cops) {
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
      ECTX.drawImage(pk.kind === 'cash' ? this.glow(110, 255, 120, gsz) : this.glow(255, 110, 110, gsz), x - gsz / 2, y - gsz / 2);
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
    const P = G.player, half = S / 2;
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
    for (const pk of G.pickups) dot(pk, pk.kind === 'cash' ? '#5ad25a' : '#ff5a5a');
    for (const h of hospitals) dot({ x: h.x + h.w / 2, y: h.y + h.h / 2 }, '#ffffff', 3);
    for (const cr of casaRosada) dot({ x: cr.x + cr.w / 2, y: cr.y + cr.h / 2 }, '#ff8fc0', 3);
    if (obelisco) dot({ x: obelisco.x + obelisco.w / 2, y: obelisco.y + obelisco.h / 2 }, '#f5f0e0', 3);
    for (const c of G.cops) dot(c, '#4aa3ff');
    for (const c of G.cars) if (c.chase && c.hp > 0) dot(c, '#2a6aff', 3);
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
    const P = G.player;
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
    if (obelisco) dot({ x: obelisco.x + obelisco.w / 2, y: obelisco.y + obelisco.h / 2 }, '#f5f0e0', 3);
    for (const c of G.cops) dot(c, '#4aa3ff');
    for (const c of G.cars) if (c.chase && c.hp > 0) dot(c, '#2a6aff', 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px((P.x - sx) * k) - 2, px((P.y - sy) * k) - 2, 4, 4);

    this.text('MAPA', RW / 2, 12, '#ffd34a', 10, 'center');
    this.text('M cerrar · +/- zoom', RW / 2, RH - 10, '#ccc', 7, 'center');
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

  drawHUD() {
    const ctx = this.ctx;
    const P = G.player;
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(0, 0, 118, 32);
    ctx.fillRect(RW - 96, 0, 96, 45);
    this.text('$' + G.money, RW - 7, 13, '#7de07d', 9, 'right');
    for (let i = 0; i < 5; i++) {
      this.text('*', RW - 9 - i * 11, 28, i < G.wanted ? '#ffd34a' : '#35383d', 11, 'right');
    }
    ctx.fillStyle = 'rgba(0,0,0,.75)';
    ctx.fillRect(RW - 79, 34, 72, 7);
    const hp = clamp(P.hp / P.maxhp, 0, 1);
    ctx.fillStyle = hp > 0.3 ? '#d1483f' : '#ff6a5a';
    ctx.fillRect(RW - 78, 35, 70 * hp, 5);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(RW - 78, 35, 70 * hp, 1);
    this.text(P.def.name, 7, 13, '#ffd34a', 8);
    const h = Math.floor(dayT() * 24), mm = Math.floor(((dayT() * 24) % 1) * 60);
    this.text(String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), 7, 26, '#cfcfcf', 7);

    if (G.msgT > 0) {
      ctx.globalAlpha = clamp(G.msgT, 0, 1);
      this.text(G.msg, RW / 2, RH - 16, '#fff', 8, 'center');
      ctx.globalAlpha = 1;
    }

    if (G.busted) {
      const k = clamp(0.45 + G.bustT / 0.35, 0, 1);
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
      this.text('MULTA: $' + G.bustFine, RW / 2, RH / 2 + 14, '#ffd34a', 9, 'center');
      if (G.bustT > 1.4) {
        this.text('TE LLEVAN A LA COMISARIA', RW / 2, RH / 2 + 34, '#e8e8e8', 8, 'center');
      }
      ctx.globalAlpha = 1;
    }

    if (G.healing) {
      const k = clamp(0.45 + G.healT / 0.35, 0, 1);
      ctx.fillStyle = 'rgba(18,60,30,.5)';
      ctx.fillRect(0, 0, RW, RH);
      ctx.fillStyle = 'rgba(0,0,0,.93)';
      ctx.fillRect(0, RH / 2 - 26, RW, 58);
      ctx.fillStyle = '#3fae4a';
      ctx.fillRect(0, RH / 2 - 27, RW, 2);
      ctx.fillRect(0, RH / 2 + 30, RW, 2);
      ctx.globalAlpha = k;
      this.text('CURANDOTE...', RW / 2, RH / 2 - 4, '#8ef08e', 14, 'center');
      const pct = Math.min(100, Math.round(G.healT / HOSPITAL_TIME * 100));
      this.text(pct + '%', RW / 2, RH / 2 + 16, '#ffd34a', 9, 'center');
      ctx.globalAlpha = 1;
    }

    if (!G.busted && !P.dead && P.car) {
      const near = G.cars.some(c => c.chase && c.hp > 0 && dist(c, P) < 30);
      if (near && Math.floor(G.t * 5) % 2) {
        this.text('FRENA Y TE AGARRAN - ACELERA!', RW / 2, 52, '#ff8a4a', 8, 'center');
      }
    }

    if (P.dead) {
      ctx.fillStyle = 'rgba(70,0,0,.55)';
      ctx.fillRect(0, 0, RW, RH);
      this.text('TE MATARON', RW / 2, RH / 2 - 10, '#ff4a4a', 16, 'center');
      this.text('GUITA: $' + G.money, RW / 2, RH / 2 + 12, '#ffd34a', 9, 'center');
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
    const night = darkness(), P = G.player;
    litWindows.length = 0;
    ctx.save();
    if (G.shake > 0.1) {
      const a = Math.random() * TAU, m = Math.min(G.shake, 6);
      ctx.translate(px(Math.cos(a) * m), px(Math.sin(a) * m));
    }
    this.drawGround();

    for (const pk of G.pickups) this.drawPickup(pk);

    for (const c of G.cars) {
      if (c !== (P && P.car)) this.drawCar(c, night);
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
    for (const p of props) if (p.t === 'palm') this.drawPalm(p); else if (p.t === 'obelisco') this.drawObelisco(p);
    for (const l of lamps) this.drawLamp(l, night);
    for (const L of lights) this.drawTrafficLight(L);

    if (P) {
      if (P.car) this.drawCar(P.car, night);
      else if (!P.dead && !G.healing) this.drawGuy(P, P.def.id, P.def.shirt, P.def.pants, P.hp < 35);
    }

    for (const b of G.bullets) {
      ctx.strokeStyle = b.mine ? 'rgba(255,235,160,.95)' : 'rgba(255,150,110,.95)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(b.x - G.cam.x, b.y - G.cam.y);
      ctx.lineTo(b.x - G.cam.x - b.vx * 0.012, b.y - G.cam.y - b.vy * 0.012);
      ctx.stroke();
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
