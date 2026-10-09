/* =========================================================================
   GTA MERCALOCA - Utilidades Matemáticas, Color y Procesamiento Gráfico
   ========================================================================= */

const TAU = Math.PI * 2;

const rnd = (a, b) => a + Math.random() * (b - a);

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

const lerp = (a, b, t) => a + (b - a) * t;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const px = Math.round;

/**
 * Distancia de un punto `e` al tramo que recorrió una bala en el último frame
 * (de b.ox,b.oy a b.x,b.y). Evita que las balas rápidas atraviesen sin pegar.
 */
function segDist(b, e) {
  const ax = b.ox !== undefined ? b.ox : b.x, ay = b.oy !== undefined ? b.oy : b.y;
  const dx = b.x - ax, dy = b.y - ay, L = dx * dx + dy * dy;
  const t = L > 0 ? clamp(((e.x - ax) * dx + (e.y - ay) * dy) / L, 0, 1) : 0;
  return Math.hypot(ax + dx * t - e.x, ay + dy * t - e.y);
}

/**
 * Generador pseudo-aleatorio determinístico.
 * Mismo ID / valor -> mismo resultado siempre.
 */
function hash(n) {
  n = (n << 13) ^ n;
  return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
}

/**
 * Modifica el brillo de un color hexadecimal por un factor multiplicativo.
 */
const shadeCache = new Map();
function shade(hex, f) {
  const k = hex + f;
  const hit = shadeCache.get(k);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * f, 0, 255) | 0;
  const g = clamp(((n >> 8) & 255) * f, 0, 255) | 0;
  const b = clamp((n & 255) * f, 0, 255) | 0;
  const out = 'rgb(' + r + ',' + g + ',' + b + ')';
  shadeCache.set(k, out);
  return out;
}

/**
 * Mezcla lineal entre dos colores hexadecimales con factor t en [0, 1].
 */
function mix(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = lerp((a >> 16) & 255, (b >> 16) & 255, t) | 0;
  const g = lerp((a >> 8) & 255, (b >> 8) & 255, t) | 0;
  const u = lerp(a & 255, b & 255, t) | 0;
  return 'rgb(' + r + ',' + g + ',' + u + ')';
}

/**
 * Recorta la cara de una foto y la reduce a size x size con la mayor definición posible:
 * achica de a mitades (cada paso promedia bien, sin el aliasing de un salto grande),
 * enfoca los rasgos (ojos, cejas, barba) y sube contraste y color para que se lean chicos.
 */
function pixelFace(img, crop, size) {
  let w = Math.round(crop[2] * img.width), h = Math.round(crop[3] * img.height);
  let src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  let sg = src.getContext('2d');
  sg.drawImage(img, crop[0] * img.width, crop[1] * img.height, w, h, 0, 0, w, h);
  while (w > size * 2 || h > size * 2) {
    const nw = Math.max(size, Math.round(w / 2)), nh = Math.max(size, Math.round(h / 2));
    const half = document.createElement('canvas');
    half.width = nw;
    half.height = nh;
    const hg = half.getContext('2d');
    hg.imageSmoothingEnabled = true;
    hg.imageSmoothingQuality = 'high';
    hg.drawImage(src, 0, 0, w, h, 0, 0, nw, nh);
    src = half;
    w = nw;
    h = nh;
  }
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h, 0, 0, size, size);

  const d = g.getImageData(0, 0, size, size);
  const p = d.data, o = Uint8ClampedArray.from(p);
  const at = (x, y, k) => o[(clamp(y, 0, size - 1) * size + clamp(x, 0, size - 1)) * 4 + k];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const rgb = [0, 1, 2].map(k => {
        // Enfoque: el píxel menos el promedio de sus vecinos, sumado de nuevo
        const blur = (at(x - 1, y, k) + at(x + 1, y, k) + at(x, y - 1, k) + at(x, y + 1, k)) / 4;
        return o[i + k] + (o[i + k] - blur) * 0.9;
      });
      const lum = (rgb[0] + rgb[1] + rgb[2]) / 3;
      for (let k = 0; k < 3; k++) {
        const sat = lum + (rgb[k] - lum) * 1.2;
        p[i + k] = clamp((sat - 128) * 1.2 + 134, 0, 255);
      }
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}
