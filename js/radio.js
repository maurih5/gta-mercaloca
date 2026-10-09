/* =========================================================================
   GTA MERCALOCA - Radio de los autos: emisoras con temas sintetizados o grabados
   ========================================================================= */

// La radio es de la pantalla local: suena cuando G.me maneja, y cada vez que sube a
// un auto agarra una emisora al azar. R (o el botón 📻) cambia de emisora o la apaga.
//
// Un tema puede ser:
//  - sintetizado: un SONGS[id], que sale de un .mid de music/ (tools/midi2songs.js) o
//    está escrito acá abajo a mano con notas ("A4:1" = la de la 4ª octava, un tiempo);
//  - grabado: un archivo de music/ ('mi-tema.ogg' o .mp3), que se reproduce tal cual.

// Temas escritos a mano. Cada pista: instrumento, volumen y la secuencia de notas.
// Instrumentos: square, triangle, sawtooth, sine, pad (colchón de sintes), y drums (k bombo, s redoblante,
// h platillo, g güiro). "-:1" es un silencio de un tiempo.
const bar = (s, n) => (s + ' ').repeat(n);
Object.assign(SONGS, {
  'cumbia-del-riachuelo': {
    bpm: 96,
    tracks: [
      { inst: 'drums', vol: 0.6, seq: bar('g:0.5 g:0.25 g:0.25', 32) },
      { inst: 'drums', vol: 0.8, seq: bar('k:1 s:1 k:1 s:1', 8) },
      {
        inst: 'triangle', vol: 0.8,
        seq: ['A2 E2', 'A2 E2', 'D2 A2', 'D2 A2', 'G2 D2', 'G2 D2', 'E2 B2', 'E2 B2']
          .map(c => { const [r, f] = c.split(' '); return `${r}:1 -:0.5 ${f}:0.5 ${r}:1 ${f}:1`; })
          .join(' '),
      },
      {
        inst: 'square', vol: 0.32,
        seq: [
          'A4:0.5 C5:0.5 E5:1 D5:0.5 C5:0.5 A4:1',
          'C5:0.5 B4:0.5 A4:0.5 B4:0.5 C5:1 -:1',
          'D5:0.5 F5:0.5 A5:1 G5:0.5 F5:0.5 D5:1',
          'F5:0.5 E5:0.5 D5:0.5 E5:0.5 F5:1 -:1',
          'G5:0.5 F5:0.5 E5:0.5 D5:0.5 B4:1 D5:1',
          'G4:0.5 B4:0.5 D5:0.5 F5:0.5 E5:1 D5:1',
          'E5:0.5 D5:0.5 C5:0.5 B4:0.5 G#4:1 B4:1',
          'E5:1.5 D5:0.5 C5:0.5 B4:0.5 G#4:1',
        ].join(' '),
      },
    ],
  },
  'rock-de-la-costanera': {
    bpm: 140,
    tracks: [
      { inst: 'drums', vol: 0.7, seq: bar('k:0.5 h:0.5 s:0.5 h:0.5 k:0.5 k:0.5 s:0.5 h:0.5', 8) },
      { inst: 'sawtooth', vol: 0.35, seq: ['E2', 'E2', 'G2', 'A2', 'E2', 'E2', 'C3', 'D3'].map(n => bar(n + ':0.5', 8)).join(' ') },
      {
        inst: 'square', vol: 0.3,
        seq: [
          'E4:0.5 G4:0.5 A4:0.5 B4:1 A4:0.5 G4:1',
          'E4:0.5 G4:0.5 A4:0.5 B4:0.5 D5:1 B4:1',
          'D5:1 B4:0.5 A4:0.5 G4:1 A4:1',
          'E5:1.5 D5:0.5 B4:1 A4:1',
          'E4:0.5 G4:0.5 A4:0.5 B4:1 A4:0.5 G4:1',
          'E4:0.5 G4:0.5 A4:0.5 B4:0.5 D5:1 B4:1',
          'C5:1 B4:0.5 A4:0.5 G4:1 E4:1',
          'D4:0.5 F#4:0.5 A4:1 F#4:0.5 A4:0.5 B4:1',
        ].join(' '),
      },
    ],
  },
});

// Acordes: una pista por voz del acorde (la 1ª, 2ª o 3ª nota de cada uno), un compás por acorde
const CHORD = {
  Am: ['A3', 'C4', 'E4'], F: ['F3', 'A3', 'C4'], C: ['C4', 'E4', 'G4'], G: ['G3', 'B3', 'D4'],
  D: ['D4', 'F#4', 'A4'], A: ['C#4', 'E4', 'A4'], Gd: ['D4', 'G4', 'B4'],
};
const voice = (chords, i, rhythm) => chords.map(c => rhythm(CHORD[c][i])).join(' ');

Object.assign(SONGS, {
  // Synthpop: arpegio en semicorcheas, bajo en octavas, colchón de sintes y caja con reverb
  'noche-en-la-costanera': (() => {
    const prog = bar('Am F C G', 4).trim().split(' ');
    const root = { Am: 'A', F: 'F', C: 'C', G: 'G' };
    const arp = { Am: 'A4 C5 E5 A5', F: 'F4 A4 C5 F5', C: 'C4 E4 G4 C5', G: 'G4 B4 D5 G5' };
    return {
      bpm: 118,
      tracks: [
        { inst: 'drums', vol: 0.8, seq: bar('k:1 s:1 k:0.5 k:0.5 s:1', 16) },
        { inst: 'drums', vol: 0.5, seq: bar('h:0.5', 128) },
        { inst: 'sawtooth', vol: 0.4, seq: prog.map(c => bar(`${root[c]}2:0.5 ${root[c]}3:0.5`, 4)).join(' ') },
        { inst: 'square', vol: 0.16, seq: prog.map(c => bar(arp[c].split(' ').map(n => n + ':0.25').join(' '), 4)).join(' ') },
        ...[0, 1, 2].map(i => ({ inst: 'pad', vol: 0.12, seq: voice(prog, i, n => n + ':4') })),
        {
          inst: 'square', vol: 0.3,
          seq: '-:32 ' + [
            'E5:1.5 D5:0.5 C5:1 A4:1',
            'C5:1 A4:0.5 C5:0.5 F5:1 E5:1',
            'E5:1.5 G5:0.5 E5:1 C5:1',
            'D5:2 B4:1 -:1',
            'E5:0.5 E5:0.5 D5:0.5 C5:0.5 D5:1 E5:1',
            'F5:1.5 E5:0.5 C5:1 A4:1',
            'G5:1 E5:1 C5:0.5 D5:0.5 E5:1',
            'D5:1 B4:1 G4:2',
          ].join(' '),
        },
      ],
    };
  })(),

  // Cuarteto: el tunga-tunga (bajo en el tiempo, piano a contratiempo) y acordeón
  'el-baile-de-la-plaza': (() => {
    const prog = 'D A A D D Gd A D'.split(' ');
    const bass = { D: ['D2', 'A2'], A: ['A2', 'E2'], Gd: ['G2', 'D2'] };
    return {
      bpm: 124,
      tracks: [
        { inst: 'drums', vol: 0.7, seq: bar('k:1', 32) },
        { inst: 'drums', vol: 0.45, seq: bar('-:0.5 s:0.5', 32) },
        { inst: 'drums', vol: 0.4, seq: bar('g:0.5 g:0.25 g:0.25', 32) },
        { inst: 'triangle', vol: 0.8, seq: prog.map(c => bar(`${bass[c][0]}:1 ${bass[c][1]}:1`, 2)).join(' ') },
        ...[0, 1, 2].map(i => ({ inst: 'square', vol: 0.1, seq: voice(prog, i, n => bar(`-:0.5 ${n}:0.5`, 4)) })),
        {
          inst: 'sawtooth', vol: 0.22,
          seq: [
            'F#5:0.5 E5:0.5 D5:0.5 E5:0.5 F#5:1 A5:1',
            'G5:0.5 F#5:0.5 E5:0.5 F#5:0.5 E5:1 C#5:1',
            'E5:0.5 F#5:0.5 G5:0.5 E5:0.5 A5:1 G5:1',
            'F#5:1 E5:0.5 D5:0.5 D5:2',
            'A4:0.5 D5:0.5 F#5:0.5 D5:0.5 A5:1 F#5:1',
            'B5:1 A5:0.5 G5:0.5 D5:1 G5:1',
            'A5:0.5 G5:0.5 F#5:0.5 E5:0.5 C#5:1 E5:1',
            'D5:1 A4:1 D5:2',
          ].join(' '),
        },
      ],
    };
  })(),

  // Chacarera en 6/8: cada tiempo es una corchea. Bombo legüero, guitarra y violín
  'chacarera-del-puente': (() => {
    const prog = 'Am Am E E Am Am E Am'.split(' ');
    const strum = { Am: 'A3 C4 E4 A4 E4 C4', E: 'E3 G#3 B3 E4 B3 G#3' };
    return {
      bpm: 300,
      tracks: [
        { inst: 'drums', vol: 0.8, seq: bar('k:2 s:1 k:1 s:1 s:1', 8) },
        { inst: 'triangle', vol: 0.5, seq: prog.map(c => strum[c].split(' ').map(n => n + ':1').join(' ')).join(' ') },
        { inst: 'triangle', vol: 0.7, seq: prog.map(c => bar(`${c[0]}2:3`, 2)).join(' ') },
        {
          inst: 'sawtooth', vol: 0.2,
          seq: [
            'E5:2 D5:1 C5:2 B4:1',
            'A4:3 C5:2 E5:1',
            'D5:2 C5:1 B4:2 G#4:1',
            'B4:3 E5:3',
            'E5:2 F5:1 E5:2 D5:1',
            'C5:2 D5:1 E5:3',
            'B4:2 C5:1 D5:2 B4:1',
            'A4:6',
          ].join(' '),
        },
      ],
    };
  })(),
});

// Emisoras: nombre y temas (ids de SONGS, o archivos de music/). Se pasan en orden.
const STATIONS = [
  { name: 'FM LA CUMBIANCHA', songs: ['cumbia-del-riachuelo'] },
  { name: 'RADIO COSTANERA ROCK', songs: ['rock-de-la-costanera'] },
  { name: 'FM RETRO 80', songs: ['noche-en-la-costanera'] },
  { name: 'RADIO CUARTETAZO', songs: ['el-baile-de-la-plaza'] },
  { name: 'LA FOLKLORICA AM', songs: ['chacarera-del-puente'] },
];

const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "A4" -> 69 (número MIDI); los golpes de batería quedan como letra
function noteNum(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) return s;
  return 12 * (+m[3] + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// Un tema a lo que toca la radio: todas las notas en segundos, ordenadas, y su duración
function compileSong(song) {
  const spb = 60 / song.bpm;
  const notes = [];
  let beats = song.beats || 0;
  for (const tr of song.tracks) {
    let list = tr.notes;
    if (!list) {
      list = [];
      let t = 0;
      for (const tok of tr.seq.trim().split(/\s+/)) {
        const [n, d] = tok.split(':');
        const len = parseFloat(d);
        if (n !== '-') list.push([t, len, noteNum(n), 1]);
        t += len;
      }
      beats = Math.max(beats, t);
    }
    for (const [t, d, n, v] of list) {
      notes.push({ t: t * spb, d: d * spb, n, v: v * tr.vol, inst: tr.inst });
      beats = Math.max(beats, t + d);
    }
  }
  notes.sort((a, b) => a.t - b.t);
  return { notes, len: beats * spb };
}

const isFile = id => /\.(ogg|mp3|m4a|wav)$/i.test(id);

class Radio {
  constructor() {
    this.station = -1; // -1: apagada
    this.car = null;
    this.compiled = {};
    this.el = null;
    this.out = null;
  }

  name() {
    return this.station < 0 ? 'RADIO APAGADA' : STATIONS[this.station].name;
  }

  song(id) {
    return (this.compiled[id] = this.compiled[id] || compileSong(SONGS[id]));
  }

  // Sintonizar la emisora i (-1 apaga). Arranca por un tema al azar de la emisora.
  tune(i, announce = true) {
    this.stop();
    this.station = i;
    if (announce && this.car) say(this.name(), 1.8);
    if (i < 0) return;
    const st = STATIONS[i];
    this.songIdx = (Math.random() * st.songs.length) | 0;
    this.startSong(null);
  }

  next() {
    if (!this.car) return;
    this.tune(this.station + 1 >= STATIONS.length ? -1 : this.station + 1);
  }

  stop() {
    if (this.el) {
      this.el.onended = null;
      this.el.pause();
      this.el = null;
    }
    if (this.out) {
      // Corta las notas que ya estaban agendadas
      const out = this.out;
      out.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.02);
      setTimeout(() => out.disconnect(), 200);
      this.out = null;
    }
    this.cur = null;
  }

  // Arranca el tema songIdx de la emisora actual (at: cuándo, en tiempo del audio)
  startSong(at) {
    const id = STATIONS[this.station].songs[this.songIdx];
    this.cur = id;
    if (isFile(id)) {
      if (typeof Audio === 'undefined') return;
      const el = new Audio('music/' + id);
      el.volume = sound.muted ? 0 : 0.45;
      el.onended = () => this.nextSong(null);
      el.play().catch(() => {});
      this.el = el;
    } else if (sound.ctx) {
      if (!this.out) {
        this.out = sound.ctx.createGain();
        this.out.gain.value = 0.32;
        this.out.connect(sound.master);
      }
      this.t0 = at === null ? sound.ctx.currentTime + 0.05 : at;
      this.ni = 0;
    }
  }

  nextSong(at) {
    const st = STATIONS[this.station];
    this.songIdx = (this.songIdx + 1) % st.songs.length;
    if (this.el) {
      this.el.onended = null;
      this.el = null;
    }
    this.startSong(at);
  }

  // Una vez por frame: prende la radio al subir a un auto, la apaga al bajar, y va
  // agendando las notas del tema sintetizado un poquito antes de que suenen
  update() {
    const P = G.me;
    const car = G.state === 'play' && P && !P.dead && P.car ? P.car : null;
    if (car !== this.car) {
      const was = this.car;
      this.car = car;
      if (!car) this.tune(-1, false);
      else if (!was) this.tune((Math.random() * STATIONS.length) | 0);
    }
    const on = this.car && !G.paused;
    if (this.el) {
      this.el.volume = sound.muted ? 0 : 0.45;
      if (!on && !this.el.paused) this.el.pause();
      else if (on && this.el.paused) this.el.play().catch(() => {});
    }
    if (!on || !this.cur || isFile(this.cur) || !sound.ctx || sound.ctx.state !== 'running') return;
    // Subió al auto antes de que el navegador habilitara el audio: arranca recién ahora
    if (!this.out) this.startSong(null);

    const now = sound.ctx.currentTime;
    let song = this.song(this.cur);
    // Pestaña escondida o pausa: no se agenda lo atrasado de golpe, se sigue desde ahora
    if (now > this.t0 + song.len) {
      this.nextSong(now);
      song = this.song(this.cur);
    }
    const ahead = now + 0.2;
    while (this.cur && !isFile(this.cur)) {
      const n = song.notes[this.ni];
      if (!n) {
        if (this.t0 + song.len > ahead) break;
        this.nextSong(this.t0 + song.len);
        if (isFile(this.cur)) break;
        song = this.song(this.cur);
        continue;
      }
      const at = this.t0 + n.t;
      if (at > ahead) break;
      if (at >= now - 0.05) this.play(n, Math.max(at, now));
      this.ni++;
    }
  }

  play(n, t) {
    const d = this.out;
    if (n.inst === 'pad') {
      // Dos serruchos apenas desafinados entre sí, que entran despacio
      const f = 440 * Math.pow(2, (n.n - 69) / 12);
      for (const k of [0.996, 1.004]) {
        sound.tone(d, t, { dur: Math.max(0.2, n.d), f0: f * k, wave: 'sawtooth', vol: n.v, attack: 0.15 });
      }
      return;
    }
    if (n.inst !== 'drums') {
      const f = 440 * Math.pow(2, (n.n - 69) / 12);
      sound.tone(d, t, { dur: Math.max(0.08, n.d * 0.95), f0: f, wave: n.inst, vol: n.v, attack: 0.008 });
      return;
    }
    switch (n.n) {
      case 'k':
        sound.tone(d, t, { dur: 0.16, f0: 150, f1: 45, vol: n.v });
        break;
      case 's':
        sound.burst(d, t, { dur: 0.13, type: 'bandpass', f0: 1800, q: 0.9, vol: n.v * 0.7 });
        sound.tone(d, t, { dur: 0.06, f0: 210, f1: 150, wave: 'triangle', vol: n.v * 0.4 });
        break;
      case 'g':
        sound.burst(d, t, { dur: Math.min(0.14, n.d * 0.8), type: 'bandpass', f0: 3600, f1: 4200, q: 3, vol: n.v * 0.5, attack: 0.01 });
        break;
      default:
        sound.burst(d, t, { dur: 0.045, type: 'highpass', f0: 7000, vol: n.v * 0.35 });
    }
  }
}

const radio = new Radio();
