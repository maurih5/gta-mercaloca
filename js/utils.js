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
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * f, 0, 255) | 0;
  const g = clamp(((n >> 8) & 255) * f, 0, 255) | 0;
  const b = clamp((n & 255) * f, 0, 255) | 0;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
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
 * Recorta y reduce una foto de textura a un tamaño pequeño (ej. 14x14)
 * generando pixel art con contraste aumentado y contorno oscuro.
 */
function pixelFace(img, crop, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(
    img,
    crop[0] * img.width, crop[1] * img.height,
    crop[2] * img.width, crop[3] * img.height,
    0, 0, size, size
  );

  const d = g.getImageData(0, 0, size, size);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      p[i + k] = clamp((p[i + k] - 128) * 1.22 + 138, 0, 255);
    }
  }
  g.putImageData(d, 0, 0);

  // Contorno oscuro para despegar la cabeza del fondo
  const o = document.createElement('canvas');
  o.width = o.height = size;
  const og = o.getContext('2d');
  og.drawImage(c, 0, 0);
  og.globalCompositeOperation = 'destination-over';
  og.fillStyle = '#14100c';
  og.fillRect(0, 0, size, size);
  return o;
}
