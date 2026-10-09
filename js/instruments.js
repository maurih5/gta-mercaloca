/* =========================================================================
   GTA MERCALOCA - Instrumentos de la radio: síntesis que suena a instrumento real
   ========================================================================= */

// Cada instrumento toca una nota: (dest, t, f, dur, v) -> nodo destino, cuándo, frecuencia,
// cuánto dura y qué tan fuerte. Todo sale del contexto de dest (dest.context), así que
// sirve igual para la radio en vivo que para renderizar un tema offline.
// Las guitarras son cuerdas pulsadas de verdad (Karplus-Strong): un golpe de ruido que
// rebota en un retardo del largo de la cuerda y se va apagando como una cuerda.

const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

// Envolvente ataque-caída-sostén-relevo sobre un GainNode; devuelve cuándo terminó de sonar
function adsr(g, t, dur, { a = 0.005, d = 0.1, s = 0.7, r = 0.08, peak = 1 }) {
  const p = g.gain;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(peak * s, t + a, d / 3);
  const end = t + Math.max(dur, a + 0.01);
  p.setTargetAtTime(0, end, r / 3);
  return end + r * 2;
}

function osc(c, type, f, t, stop, detune = 0) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

function filter(c, type, f, q = 0.7) {
  const n = c.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  n.Q.value = q;
  return n;
}

// Vibrato que entra de a poco (como un violinista o un guitarrista que hace temblar la nota)
function vibrato(c, param, t, stop, { rate = 5.5, depth = 8, delay = 0.18 }) {
  const lfo = osc(c, 'sine', rate, t, stop);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(depth, t + delay + 0.25);
  lfo.connect(g);
  g.connect(param);
}

// Cuerda pulsada (Karplus-Strong). Se calcula una vez por nota y se guarda.
const KS_CACHE = new Map();
function pluck(c, f, bright) {
  const key = c.sampleRate + ':' + Math.round(f * 10) + ':' + (bright ? 1 : 0);
  let buf = KS_CACHE.get(key);
  if (buf) return buf;
  const sr = c.sampleRate, len = Math.floor(sr * (bright ? 2.4 : 1.8));
  buf = c.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  // El promedio de dos muestras suma media muestra de retardo
  const N = Math.max(2, Math.round(sr / f - 0.5));
  let last = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 2 - 1;
    // La nylon arranca con un golpe más suave (menos agudos) que la eléctrica
    last = bright ? r : last + (r - last) * 0.45;
    y[i] = last;
  }
  const decay = bright ? 0.9985 : 0.996;
  for (let i = N; i < len; i++) y[i] = decay * 0.5 * (y[i - N] + y[i - N - 1 < 0 ? 0 : i - N - 1]);
  KS_CACHE.set(key, buf);
  return buf;
}

// Saturación de amplificador: tanh, con más ganancia más distorsión
const DRIVE = {};
function driveCurve(k) {
  if (DRIVE[k]) return DRIVE[k];
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return (DRIVE[k] = curve);
}

const INSTRUMENTS = {
  // Bajo eléctrico con dedos: fundamental redonda y un poco de cuerpo filtrado
  bass(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur * 0.92, { a: 0.004, d: 0.3, s: 0.55, r: 0.06, peak: v });
    const lp = filter(c, 'lowpass', 900, 1.2);
    lp.frequency.setValueAtTime(1500, t);
    lp.frequency.setTargetAtTime(500, t, 0.08);
    osc(c, 'sine', f, t, stop).connect(g);
    const body = c.createGain();
    body.gain.value = 0.45;
    osc(c, 'sawtooth', f, t, stop).connect(lp);
    lp.connect(body);
    body.connect(g);
    g.connect(dest);
  },

  // Bajo de sintetizador ochentoso: serrucho con filtro que se cierra
  synthbass(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur * 0.85, { a: 0.003, d: 0.2, s: 0.6, r: 0.05, peak: v });
    const lp = filter(c, 'lowpass', 300, 7);
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.setTargetAtTime(380, t, 0.06);
    osc(c, 'sawtooth', f, t, stop).connect(lp);
    osc(c, 'square', f, t, stop, -10).connect(lp);
    lp.connect(g);
    g.connect(dest);
  },

  // Guitarra criolla (nylon)
  guitar(dest, t, f, dur, v) {
    const c = dest.context, src = c.createBufferSource();
    src.buffer = pluck(c, f, false);
    const g = c.createGain();
    const stop = adsr(g, t, Math.min(dur, 1.7), { a: 0.001, d: 1, s: 1, r: 0.15, peak: v });
    const lp = filter(c, 'lowpass', 3800);
    src.connect(lp);
    lp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(stop);
  },

  // Guitarra eléctrica con distorsión (rítmica)
  egtr(dest, t, f, dur, v) {
    INSTRUMENTS.dist(dest, t, f, dur, v, 6, false);
  },

  // Guitarra solista: más saturada, con vibrato
  leadgtr(dest, t, f, dur, v) {
    INSTRUMENTS.dist(dest, t, f, dur, v, 14, true);
  },

  dist(dest, t, f, dur, v, drive, vib) {
    const c = dest.context, src = c.createBufferSource();
    src.buffer = pluck(c, f, true);
    const stop = t + Math.min(dur, 2.3) + 0.1;
    if (vib && dur > 0.35) vibrato(c, src.playbackRate, t, stop, { rate: 5.8, depth: 0.012, delay: 0.15 });
    const pre = c.createGain();
    pre.gain.value = 3;
    const sh = c.createWaveShaper();
    sh.curve = driveCurve(drive);
    sh.oversample = '2x';
    // Parlante de amplificador: sin graves embarrados ni agudos de lija
    const hp = filter(c, 'highpass', 90);
    const lp = filter(c, 'lowpass', 3200, 0.9);
    const mid = filter(c, 'peaking', 800, 1);
    mid.gain.value = 3;
    const g = c.createGain();
    adsr(g, t, Math.min(dur, 2.3), { a: 0.002, d: 0.4, s: 0.85, r: 0.06, peak: v * 0.5 });
    src.connect(pre);
    pre.connect(sh);
    sh.connect(hp);
    hp.connect(mid);
    mid.connect(lp);
    lp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(stop);
  },

  // Piano: parciales que se apagan cada uno a su ritmo, y el golpe del martillo
  piano(dest, t, f, dur, v) {
    const c = dest.context, out = c.createGain();
    const stop = t + Math.min(dur, 1.5) + 0.25;
    out.gain.setValueAtTime(1, t);
    out.gain.setTargetAtTime(0, t + Math.min(dur, 1.5), 0.08);
    [[1, 1, 0.9], [2, 0.45, 0.5], [3, 0.2, 0.3], [4, 0.1, 0.2], [5, 0.05, 0.15]].forEach(([k, a, tau]) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a * v, t + 0.003);
      g.gain.setTargetAtTime(0, t + 0.003, tau);
      osc(c, 'sine', f * k * (1 + 0.0004 * k * k), t, stop).connect(g);
      g.connect(out);
    });
    sound.burst(out, t, { dur: 0.02, type: 'bandpass', f0: 2500, q: 1, vol: v * 0.15 });
    out.connect(dest);
  },

  // Acordeón: tres lengüetas apenas desafinadas (el "musette") y el fuelle que entra suave
  accordion(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur * 0.95, { a: 0.035, d: 0.15, s: 0.85, r: 0.07, peak: v * 0.5 });
    const lp = filter(c, 'lowpass', 3000, 0.8);
    const nasal = filter(c, 'peaking', 1400, 1.2);
    nasal.gain.value = 5;
    for (const dt of [0, 9, -9]) osc(c, 'sawtooth', f, t, stop, dt).connect(lp);
    osc(c, 'square', f / 2, t, stop).connect(lp);
    lp.connect(nasal);
    nasal.connect(g);
    g.connect(dest);
  },

  // Violín: serrucho con arco que entra despacio, vibrato y la caja que resuena
  violin(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur * 0.95, { a: 0.07, d: 0.25, s: 0.8, r: 0.12, peak: v * 0.6 });
    const o = osc(c, 'sawtooth', f, t, stop);
    vibrato(c, o.frequency, t, stop, { rate: 5.6, depth: f * 0.007, delay: 0.12 });
    const body1 = filter(c, 'peaking', 450, 2);
    body1.gain.value = 5;
    const body2 = filter(c, 'peaking', 2700, 2);
    body2.gain.value = 6;
    const lp = filter(c, 'lowpass', 4500);
    o.connect(body1);
    body1.connect(body2);
    body2.connect(lp);
    lp.connect(g);
    g.connect(dest);
  },

  // Sinte solista de los 80: cuadrada y serrucho, filtro con un poco de resonancia y vibrato
  lead(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur * 0.92, { a: 0.01, d: 0.2, s: 0.7, r: 0.12, peak: v * 0.6 });
    const lp = filter(c, 'lowpass', 2800, 2.5);
    const o1 = osc(c, 'square', f, t, stop), o2 = osc(c, 'sawtooth', f, t, stop, 7);
    vibrato(c, o1.detune, t, stop, { rate: 5.2, depth: 14, delay: 0.25 });
    vibrato(c, o2.detune, t, stop, { rate: 5.2, depth: 14, delay: 0.25 });
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(dest);
  },

  // Arpegio de sinte: nota corta con el filtro que se cierra (el "pluck")
  arp(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur * 0.9, { a: 0.002, d: 0.12, s: 0.25, r: 0.06, peak: v * 0.7 });
    const lp = filter(c, 'lowpass', 900, 4);
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.setTargetAtTime(900, t, 0.05);
    osc(c, 'square', f, t, stop).connect(lp);
    osc(c, 'sawtooth', f, t, stop, -6).connect(lp);
    lp.connect(g);
    g.connect(dest);
  },

  // Colchón de sintes: tres serruchos desafinados que entran y salen despacio
  pad(dest, t, f, dur, v) {
    const c = dest.context, g = c.createGain();
    const stop = adsr(g, t, dur, { a: 0.35, d: 0.6, s: 0.8, r: 0.5, peak: v * 0.45 });
    const lp = filter(c, 'lowpass', 1500, 0.8);
    for (const dt of [-11, 0, 12]) osc(c, 'sawtooth', f, t, stop, dt).connect(lp);
    lp.connect(g);
    g.connect(dest);
  },
};

// Batería y percusión. Letras: k bombo, s redoblante, h platillo cerrado, o abierto,
// c crash, g güiro, b bombo legüero, r aro (el golpe en el borde del bombo)
const DRUMS = {
  k(d, t, v) {
    sound.tone(d, t, { dur: 0.32, f0: 155, f1: 42, vol: v });
    sound.burst(d, t, { dur: 0.012, type: 'highpass', f0: 2500, vol: v * 0.3 });
  },
  s(d, t, v) {
    sound.burst(d, t, { dur: 0.17, type: 'highpass', f0: 1400, vol: v * 0.55 });
    sound.burst(d, t, { dur: 0.08, type: 'bandpass', f0: 3500, q: 0.8, vol: v * 0.3 });
    sound.tone(d, t, { dur: 0.09, f0: 200, f1: 165, wave: 'triangle', vol: v * 0.55 });
  },
  h(d, t, v) {
    sound.burst(d, t, { dur: 0.045, type: 'highpass', f0: 8500, vol: v * 0.35 });
  },
  o(d, t, v) {
    sound.burst(d, t, { dur: 0.32, type: 'highpass', f0: 7500, vol: v * 0.3 });
  },
  c(d, t, v) {
    sound.burst(d, t, { dur: 1.4, type: 'highpass', f0: 5000, f1: 3500, vol: v * 0.35 });
  },
  // Güiro: el raspado son varios golpecitos seguidos que van creciendo
  g(d, t, v, dur) {
    const n = dur > 0.3 ? 7 : 4, step = Math.min(0.016, (dur * 0.7) / n);
    for (let i = 0; i < n; i++) {
      sound.burst(d, t + i * step, { dur: 0.012, type: 'bandpass', f0: 4200 + i * 120, q: 5, vol: v * (0.25 + 0.35 * (i / n)) });
    }
  },
  b(d, t, v) {
    sound.tone(d, t, { dur: 0.5, f0: 100, f1: 58, vol: v });
    sound.burst(d, t, { dur: 0.09, f0: 380, vol: v * 0.5 });
  },
  r(d, t, v) {
    sound.burst(d, t, { dur: 0.035, type: 'bandpass', f0: 1700, q: 5, vol: v * 0.7 });
    sound.tone(d, t, { dur: 0.04, f0: 820, f1: 700, wave: 'triangle', vol: v * 0.25 });
  },
};

// Sala para la reverb: ruido estéreo que se apaga (respuesta al impulso de una sala chica)
const IR_CACHE = {};
function makeReverb(c, secs = 1.8) {
  let ir = IR_CACHE[c.sampleRate];
  if (!ir) {
    const len = Math.floor(c.sampleRate * secs);
    ir = IR_CACHE[c.sampleRate] = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const y = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) y[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
  }
  const conv = c.createConvolver();
  conv.buffer = ir;
  return conv;
}
