/* =========================================================================
   GTA MERCALOCA - Audio: efectos sintetizados con Web Audio
   ========================================================================= */

// Todos los sonidos se generan con osciladores y ruido: no hay archivos que cargar.
// El audio es de la pantalla local, como el temblor: cada sonido se escucha según
// dónde está G.me (volumen por distancia, paneo a izquierda/derecha). La simulación
// solo avisa qué pasó y dónde con sfx(); sin Web Audio (Node, navegador viejo) no suena nada.

const AUDIO_R = OFFSCREEN * 1.6;       // más lejos que esto no se escucha
const AUDIO_VOICES = 28;               // sonidos cortos sonando a la vez, como máximo

// Cuánto escucha el jugador P un sonido en (x, y): {vol, pan} o null si no le llega
function audibleFor(P, x, y) {
  if (!P) return null;
  const d = Math.hypot(x - P.x, y - P.y);
  if (d >= AUDIO_R) return null;
  const k = 1 - d / AUDIO_R;
  return { vol: k * k, pan: clamp((x - P.x) / (RW * 0.6), -1, 1) };
}

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.voices = 0;
    this.lastAt = {};
    try {
      this.muted = typeof localStorage !== 'undefined' && localStorage.getItem('mercaloca.mute') === '1';
    } catch (e) {}
    // Los navegadores no dejan sonar nada hasta que el usuario toca algo
    if (typeof addEventListener !== 'undefined') {
      const unlock = () => this.unlock();
      for (const ev of ['keydown', 'pointerdown', 'touchstart']) addEventListener(ev, unlock, { passive: true });
    }
  }

  unlock() {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    if (!this.ctx) {
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      // Compresor al final: veinte tiros juntos no saturan
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(c.destination);
      this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.loops = this.makeLoops();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('mercaloca.mute', this.muted ? '1' : '0');
    } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.03);
    this.syncButton();
    return this.muted;
  }

  // El botón táctil muestra si hay sonido o no
  syncButton() {
    const b = typeof document !== 'undefined' && document.getElementById('btn-sound');
    if (b) b.textContent = this.muted ? '🔇' : '🔊';
  }

  // ---- Piezas para armar sonidos ----

  // Salida de un sonido: volumen y paneo, y libera la voz al terminar
  out(vol, pan, dur) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = vol;
    let node = g;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      node = p;
    }
    node.connect(this.master);
    this.voices++;
    setTimeout(() => {
      this.voices--;
      node.disconnect();
    }, (dur + 0.1) * 1000);
    return g;
  }

  // Golpe de ruido filtrado: disparos, choques, explosiones
  burst(dest, t, { dur, vol = 1, type = 'lowpass', f0, f1 = f0, q = 0.8, attack = 0.002 }) {
    const c = dest.context; // el contexto de destino: sirve también para renderizar offline
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // Nota con barrido de frecuencia: golpes graves, monedas, avisos
  tone(dest, t, { dur, vol = 1, wave = 'sine', f0, f1 = f0, attack = 0.004 }) {
    const c = dest.context; // el contexto de destino: sirve también para renderizar offline
    const o = c.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ---- Efectos ----

  // Lo que suena en cada efecto. k: intensidad extra (por ej. lo fuerte de un choque)
  voice(name, d, t, k) {
    const r = Math.random() * 0.15 + 0.92; // cada tiro suena un poco distinto
    switch (name) {
      case 'pistola':
        this.burst(d, t, { dur: 0.16, f0: 3200 * r, f1: 500, vol: 0.8 });
        this.tone(d, t, { dur: 0.09, f0: 190 * r, f1: 60, vol: 0.7 });
        return 0.2;
      case 'uzi':
        this.burst(d, t, { dur: 0.07, f0: 4200 * r, f1: 900, vol: 0.55 });
        this.tone(d, t, { dur: 0.05, f0: 230 * r, f1: 90, vol: 0.4, wave: 'square' });
        return 0.1;
      case 'ak':
        this.burst(d, t, { dur: 0.2, f0: 2600 * r, f1: 300, vol: 0.9 });
        this.tone(d, t, { dur: 0.12, f0: 150 * r, f1: 45, vol: 0.9 });
        return 0.22;
      case 'escopeta':
        this.burst(d, t, { dur: 0.42, f0: 1800 * r, f1: 140, vol: 1 });
        this.tone(d, t, { dur: 0.22, f0: 110 * r, f1: 35, vol: 1 });
        this.burst(d, t + 0.32, { dur: 0.05, type: 'bandpass', f0: 2200, q: 4, vol: 0.25 }); // corredera
        this.burst(d, t + 0.42, { dur: 0.05, type: 'bandpass', f0: 1700, q: 4, vol: 0.25 });
        return 0.5;
      case 'swing':
        this.burst(d, t, { dur: 0.16, type: 'bandpass', f0: 500, f1: 2400, q: 2, vol: 0.35, attack: 0.05 });
        return 0.2;
      case 'golpe': // bastonazo que pega
        this.tone(d, t, { dur: 0.12, f0: 140, f1: 55, vol: 0.9 });
        this.burst(d, t, { dur: 0.06, f0: 1400, vol: 0.5 });
        return 0.15;
      case 'impacto': // bala que le da a alguien
        this.tone(d, t, { dur: 0.07, f0: 120 * r, f1: 70, vol: 0.5 });
        this.burst(d, t, { dur: 0.05, f0: 900, vol: 0.3 });
        return 0.1;
      case 'pared': // bala contra un edificio
        this.burst(d, t, { dur: 0.05, type: 'bandpass', f0: 3000 * r, q: 3, vol: 0.18 });
        return 0.07;
      case 'granada':
        this.burst(d, t, { dur: 0.12, type: 'bandpass', f0: 700, f1: 1500, q: 2, vol: 0.3, attack: 0.03 });
        return 0.15;
      case 'explosion':
        this.burst(d, t, { dur: 1.4, f0: 1600, f1: 60, vol: 1 });
        this.tone(d, t, { dur: 0.7, f0: 90, f1: 28, vol: 1 });
        this.burst(d, t + 0.05, { dur: 0.6, type: 'bandpass', f0: 600, f1: 120, q: 1, vol: 0.5 });
        return 1.5;
      case 'choque': {
        const v = clamp(0.35 + k * 0.08, 0.35, 1);
        this.burst(d, t, { dur: 0.35, type: 'bandpass', f0: 1800, f1: 400, q: 1.5, vol: v });
        this.tone(d, t, { dur: 0.18, f0: 95, f1: 40, vol: v });
        this.burst(d, t + 0.06, { dur: 0.25, type: 'highpass', f0: 4000, f1: 2500, vol: v * 0.3 }); // vidrios
        return 0.4;
      }
      case 'puerta': // subir o bajar del auto
        this.tone(d, t, { dur: 0.1, f0: 110, f1: 60, vol: 0.6 });
        this.burst(d, t, { dur: 0.06, f0: 800, vol: 0.3 });
        return 0.12;
      case 'guita':
        this.tone(d, t, { dur: 0.08, f0: 988, wave: 'square', vol: 0.22 });
        this.tone(d, t + 0.07, { dur: 0.22, f0: 1319, wave: 'square', vol: 0.22 });
        return 0.3;
      case 'arma': // levantar un fierro: clic-clac
        this.burst(d, t, { dur: 0.04, type: 'bandpass', f0: 1800, q: 5, vol: 0.4 });
        this.burst(d, t + 0.09, { dur: 0.05, type: 'bandpass', f0: 1300, q: 5, vol: 0.45 });
        return 0.15;
      case 'comida':
        this.tone(d, t, { dur: 0.12, f0: 520, f1: 780, wave: 'triangle', vol: 0.35 });
        this.tone(d, t + 0.1, { dur: 0.16, f0: 780, f1: 1040, wave: 'triangle', vol: 0.3 });
        return 0.27;
      case 'busqueda': // sube la búsqueda: el silbato de la yuta
        this.tone(d, t, { dur: 0.16, f0: 2400, f1: 2600, wave: 'triangle', vol: 0.18 });
        this.tone(d, t + 0.2, { dur: 0.3, f0: 2400, f1: 2700, wave: 'triangle', vol: 0.18 });
        return 0.5;
      case 'arresto':
        this.tone(d, t, { dur: 0.5, f0: 500, f1: 1100, wave: 'sawtooth', vol: 0.18 });
        this.tone(d, t + 0.5, { dur: 0.5, f0: 1100, f1: 500, wave: 'sawtooth', vol: 0.18 });
        return 1;
      case 'muerte':
        this.tone(d, t, { dur: 1.1, f0: 330, f1: 55, wave: 'square', vol: 0.2 });
        return 1.1;
      case 'porro':
        this.burst(d, t, { dur: 0.9, type: 'bandpass', f0: 1200, f1: 600, q: 1, vol: 0.25, attack: 0.3 });
        return 0.9;
      case 'hospital':
        this.tone(d, t, { dur: 0.15, f0: 660, wave: 'triangle', vol: 0.25 });
        this.tone(d, t + 0.15, { dur: 0.15, f0: 880, wave: 'triangle', vol: 0.25 });
        this.tone(d, t + 0.3, { dur: 0.3, f0: 1320, wave: 'triangle', vol: 0.25 });
        return 0.6;
    }
    return 0;
  }

  // Un efecto en (x, y), como lo escucha G.me. Devuelve {vol, pan} si le llega
  // (aunque no haya Web Audio) o null si está lejos.
  play(name, x, y, k = 0) {
    const a = audibleFor(G.me, x, y);
    if (!a || !this.ctx || this.muted || this.ctx.state !== 'running') return a;
    if (this.voices >= AUDIO_VOICES) return a;
    // El mismo efecto pegado no suma: una ráfaga de uzi de tres tranzas es un solo tableteo
    const now = this.ctx.currentTime;
    if (now - (this.lastAt[name] || -1) < 0.03) return a;
    this.lastAt[name] = now;
    try {
      const g = this.out(a.vol, a.pan, 1.6);
      this.voice(name, g, now, k);
    } catch (e) {}
    return a;
  }

  // ---- Sonidos continuos: motor, derrape y sirena ----

  makeLoops() {
    const c = this.ctx;
    const loop = (build) => {
      const g = c.createGain();
      g.gain.value = 0;
      const p = c.createStereoPanner ? c.createStereoPanner() : null;
      if (p) {
        g.connect(p);
        p.connect(this.master);
      } else {
        g.connect(this.master);
      }
      return { g, p, ...build(g) };
    };
    const engine = loop(g => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const o2 = c.createOscillator();
      o2.type = 'square';
      const flt = c.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 400;
      const g2 = c.createGain();
      g2.gain.value = 0.4;
      o.connect(flt);
      o2.connect(g2);
      g2.connect(flt);
      flt.connect(g);
      o.start();
      o2.start();
      return { o, o2, flt };
    });
    const skid = loop(g => {
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const flt = c.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 1300;
      flt.Q.value = 6;
      src.connect(flt);
      flt.connect(g);
      src.start();
      return { src };
    });
    const siren = loop(g => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.connect(g);
      o.start();
      return { o };
    });
    return { engine, skid, siren };
  }

  // Una vez por frame: el motor y el derrape son del auto de G.me; la sirena, del
  // patrullero persiguiendo más cercano a G.me (persiga a quien persiga)
  update() {
    if (!this.loops || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime, L = this.loops, P = G.me;
    const live = G.state === 'play' && !G.paused && P;
    const set = (param, v, tc = 0.05) => param.setTargetAtTime(v, t, tc);

    const car = live && P.car && !P.dead ? P.car : null;
    if (car) {
      const s = Math.abs(car.spd) / 195;
      set(L.engine.o.frequency, 38 + s * 95);
      set(L.engine.o2.frequency, 19 + s * 48);
      set(L.engine.flt.frequency, 300 + s * 1300);
      set(L.engine.g.gain, 0.09 + s * 0.09, 0.08);
      // Derrape en curva fuerte, o frenada yendo rápido
      const drift = Math.abs(car.spd) > 120 && Math.abs(car.steer) > 0.55;
      const brake = car.spd > 60 && P.ctl && P.ctl.y > 0.1;
      set(L.skid.g.gain, drift || brake ? 0.12 : 0, 0.04);
    } else {
      set(L.engine.g.gain, 0, 0.1);
      set(L.skid.g.gain, 0, 0.04);
    }

    let best = null;
    if (live) {
      for (const c of G.cars) {
        if (!c.chase || c.hp <= 0 || driverOf(c)) continue;
        const a = audibleFor(P, c.x, c.y);
        if (a && (!best || a.vol > best.vol)) best = a;
      }
    }
    if (best) {
      // Sube y baja como las sirenas de la yuta
      const ph = (G.t * 0.9) % 1;
      set(L.siren.o.frequency, 620 + 520 * (ph < 0.5 ? ph * 2 : 2 - ph * 2), 0.02);
      set(L.siren.g.gain, 0.13 * best.vol, 0.1);
      if (L.siren.p) set(L.siren.p.pan, best.pan, 0.1);
    } else {
      set(L.siren.g.gain, 0, 0.15);
    }
  }
}

const sound = new SoundManager();
const sfx = (name, x, y, k) => sound.play(name, x, y, k);
// Avisos que son solo del jugador (levantó guita, lo buscan, lo agarraron): suenan si es G.me
const sfxFor = (P, name) => (P === G.me ? sound.play(name, P.x, P.y) : null);
