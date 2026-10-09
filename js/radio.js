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
const beatsOf = seq => seq.trim().split(/\s+/).reduce((s, k) => s + parseFloat(k.split(':')[1]), 0);

// Arma un tema por partes (intro, estrofa, estribillo...). Cada parte dice qué toca cada
// pista; la pista que no aparece en una parte calla. Las que tocan tienen que durar lo mismo.
function arrange(bpm, tracks, parts, form) {
  const seqs = Object.fromEntries(Object.keys(tracks).map(k => [k, []]));
  for (const name of form) {
    const part = parts[name];
    const lens = Object.values(part).map(beatsOf);
    if (lens.some(l => Math.abs(l - lens[0]) > 1e-9)) throw new Error(`parte "${name}": pistas de distinto largo (${lens})`);
    for (const k in seqs) seqs[k].push(part[k] ? part[k].trim() : `-:${lens[0]}`);
  }
  return { bpm, tracks: Object.entries(tracks).map(([k, t]) => ({ ...t, seq: seqs[k].join(' ') })) };
}

// Acordes: una pista por voz del acorde (la 1ª, 2ª o 3ª nota de cada uno), un compás por acorde
const CHORD = {
  Am: ['A3', 'C4', 'E4'], F: ['F3', 'A3', 'C4'], C: ['C4', 'E4', 'G4'], G: ['G3', 'B3', 'D4'],
  Em: ['G3', 'B3', 'E4'], Dm: ['D4', 'F4', 'A4'], E: ['E4', 'G#4', 'B4'],
  D: ['D4', 'F#4', 'A4'], A: ['C#4', 'E4', 'A4'], Gd: ['D4', 'G4', 'B4'],
};
const voice = (chords, i, rhythm) => chords.map(c => rhythm(CHORD[c][i])).join(' ');
const prog = s => s.trim().split(/\s+/);

Object.assign(SONGS, {
  // Cumbia: güiro, bajo de raíz y quinta, teclado a contratiempo en el estribillo
  'cumbia-del-riachuelo': (() => {
    const bass = { Am: ['A2', 'E2'], Dm: ['D2', 'A2'], G: ['G2', 'D2'], E: ['E2', 'B2'], F: ['F2', 'C3'] };
    const tum = cs => prog(cs).map(c => `${bass[c][0]}:1 -:0.5 ${bass[c][1]}:0.5 ${bass[c][0]}:1 ${bass[c][1]}:1`).join(' ');
    const keys = (cs, i) => voice(prog(cs), i, n => bar(`-:0.5 ${n}:0.5`, 4));
    const A = 'Am Am Dm Dm G G E E', B = 'F G Am Am F G E E';
    return arrange(96, {
      guiro: { inst: 'drums', vol: 0.6 },
      perc: { inst: 'drums', vol: 0.8 },
      bass: { inst: 'triangle', vol: 0.8 },
      k1: { inst: 'square', vol: 0.08 }, k2: { inst: 'square', vol: 0.08 }, k3: { inst: 'square', vol: 0.08 },
      lead: { inst: 'square', vol: 0.32 },
    }, {
      intro: {
        guiro: bar('g:0.5 g:0.25 g:0.25', 16),
        perc: bar('k:1 s:1 k:1 s:1', 4),
        bass: '-:8 ' + tum('Am Am'),
      },
      estrofa: {
        guiro: bar('g:0.5 g:0.25 g:0.25', 32),
        perc: bar('k:1 s:1 k:1 s:1', 8),
        bass: tum(A),
        lead: [
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
      estribillo: {
        guiro: bar('g:0.5 g:0.25 g:0.25', 32),
        perc: bar('k:1 s:1 k:1 s:1', 8),
        bass: tum(B),
        k1: keys(B, 0), k2: keys(B, 1), k3: keys(B, 2),
        lead: [
          'A5:1 G5:0.5 F5:0.5 E5:1 C5:1',
          'D5:0.5 E5:0.5 F5:0.5 G5:0.5 B4:2',
          'C5:1 E5:1 A5:1.5 G5:0.5',
          'E5:4',
          'F5:0.5 E5:0.5 D5:0.5 C5:0.5 A4:1 C5:1',
          'B4:0.5 C5:0.5 D5:0.5 G5:0.5 F5:1 D5:1',
          'E5:1 D5:0.5 C5:0.5 B4:1 G#4:1',
          'B4:2 E5:2',
        ].join(' '),
      },
      corte: {
        guiro: bar('g:0.5 g:0.25 g:0.25', 16),
        bass: tum('Am Dm E Am'),
      },
      final: {
        guiro: bar('g:0.5 g:0.25 g:0.25', 4) + ' -:4',
        perc: 'k:1 s:1 k:1 s:1 k:2 -:2',
        bass: 'A2:1 -:0.5 E2:0.5 A2:2 A2:2 -:2',
        lead: 'A4:0.5 C5:0.5 E5:1 A5:2 A5:2 -:2',
      },
    }, ['intro', 'estrofa', 'estribillo', 'corte', 'estrofa', 'estribillo', 'final']);
  })(),

  // Rock barrial: bajo en corcheas, guitarras en quintas, estribillo y solo
  'rock-de-la-costanera': (() => {
    const eighths = notes => prog(notes).map(n => bar(n + ':0.5', 8)).join(' ');
    const beat = bar('k:0.5 h:0.5 s:0.5 h:0.5 k:0.5 k:0.5 s:0.5 h:0.5', 8);
    const power = { E: ['E3', 'B3'], G: ['G3', 'D4'], A: ['A3', 'E4'], C: ['C4', 'G4'], D: ['D4', 'A4'] };
    const gtr = (cs, i) => prog(cs).map(c => bar(power[c][i] + ':1', 4)).join(' ');
    const V = 'E E G A E E C D', CH = 'A A C D E E C D';
    return arrange(140, {
      drums: { inst: 'drums', vol: 0.7 },
      bass: { inst: 'sawtooth', vol: 0.35 },
      g1: { inst: 'sawtooth', vol: 0.1 }, g2: { inst: 'sawtooth', vol: 0.1 },
      lead: { inst: 'square', vol: 0.3 },
    }, {
      intro: {
        drums: bar('k:1 s:1 k:1 s:1', 2) + ' ' + bar('k:0.5 h:0.5 s:0.5 h:0.5 k:0.5 k:0.5 s:0.5 h:0.5', 2),
        bass: eighths('E2 E2 E2 E2'),
      },
      estrofa: {
        drums: beat,
        bass: eighths('E2 E2 G2 A2 E2 E2 C3 D3'),
        lead: [
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
      estribillo: {
        drums: beat,
        bass: eighths('A2 A2 C3 D3 E2 E2 C3 D3'),
        g1: gtr(CH, 0), g2: gtr(CH, 1),
        lead: [
          'E5:1 E5:0.5 D5:0.5 C#5:1 A4:1',
          'E5:1 F#5:1 E5:2',
          'G5:1 E5:0.5 D5:0.5 C5:1 G4:1',
          'A4:0.5 D5:0.5 F#5:1 A5:2',
          'B5:1.5 A5:0.5 G5:1 E5:1',
          'G5:1 F#5:1 E5:2',
          'E5:1 G5:1 C5:1 E5:1',
          'D5:1 F#5:1 A5:1 F#5:1',
        ].join(' '),
      },
      solo: {
        drums: beat,
        bass: eighths('E2 E2 G2 A2 E2 E2 C3 D3'),
        g1: gtr(V, 0), g2: gtr(V, 1),
        lead: [
          'E5:0.5 G5:0.5 A5:0.5 B5:0.5 A5:0.5 G5:0.5 E5:1',
          'D5:0.5 E5:0.5 G5:0.5 E5:0.5 D5:0.5 B4:0.5 A4:1',
          'G4:0.5 B4:0.5 D5:0.5 G5:0.5 F#5:0.5 D5:0.5 B4:1',
          'A4:0.5 C#5:0.5 E5:0.5 A5:0.5 G5:1 E5:1',
          'B5:1 A5:0.5 G5:0.5 A5:1 G5:0.5 E5:0.5',
          'D5:0.5 E5:0.5 D5:0.5 B4:0.5 A4:1 G4:1',
          'C5:0.5 E5:0.5 G5:0.5 C6:0.5 B5:1 G5:1',
          'D5:0.5 F#5:0.5 A5:0.5 D6:0.5 C6:1 B5:1',
        ].join(' '),
      },
      final: {
        drums: 's:0.25 s:0.25 s:0.25 s:0.25 k:0.5 s:0.5 k:0.5 s:0.5 k:1 -:4',
        bass: 'E2:4 -:4',
        g1: 'E3:4 -:4', g2: 'B3:4 -:4',
      },
    }, ['intro', 'estrofa', 'estribillo', 'estrofa', 'estribillo', 'solo', 'estribillo', 'final']);
  })(),

  // Synthpop: arpegio en semicorcheas, bajo en octavas, colchón de sintes y caja
  'noche-en-la-costanera': (() => {
    const root = { Am: 'A', F: 'F', C: 'C', G: 'G', Em: 'E' };
    const arps = { Am: 'A4 C5 E5 A5', F: 'F4 A4 C5 F5', C: 'C4 E4 G4 C5', G: 'G4 B4 D5 G5', Em: 'E4 G4 B4 E5' };
    const arp = cs => prog(cs).map(c => bar(arps[c].split(' ').map(n => n + ':0.25').join(' '), 4)).join(' ');
    const bass = cs => prog(cs).map(c => bar(`${root[c]}2:0.5 ${root[c]}3:0.5`, 4)).join(' ');
    const pads = cs => Object.fromEntries([0, 1, 2].map(i => ['p' + i, voice(prog(cs), i, n => n + ':4')]));
    const V = 'Am F C G Am F C G', CH = 'F G Em Am F G Am Am';
    const drums = n => bar('k:1 s:1 k:0.5 k:0.5 s:1', n);
    return arrange(118, {
      drums: { inst: 'drums', vol: 0.8 },
      hats: { inst: 'drums', vol: 0.5 },
      bass: { inst: 'sawtooth', vol: 0.4 },
      arp: { inst: 'square', vol: 0.16 },
      p0: { inst: 'pad', vol: 0.12 }, p1: { inst: 'pad', vol: 0.12 }, p2: { inst: 'pad', vol: 0.12 },
      lead: { inst: 'square', vol: 0.3 },
    }, {
      intro: { arp: arp('Am F C G'), ...pads('Am F C G') },
      groove: { drums: drums(4), hats: bar('h:0.5', 32), bass: bass('Am F C G'), arp: arp('Am F C G'), ...pads('Am F C G') },
      estrofa: {
        drums: drums(8), hats: bar('h:0.5', 64), bass: bass(V), arp: arp(V), ...pads(V),
        lead: [
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
      estribillo: {
        drums: drums(8), hats: bar('h:0.5', 64), bass: bass(CH), arp: arp(CH), ...pads(CH),
        lead: [
          'A5:2 G5:1 F5:1',
          'G5:1.5 F5:0.5 E5:1 D5:1',
          'E5:1 G5:1 B5:2',
          'A5:3 -:1',
          'C6:1 A5:1 F5:1 A5:1',
          'B5:1.5 A5:0.5 G5:1 D5:1',
          'E5:1 A5:1 C6:1 B5:1',
          'A5:4',
        ].join(' '),
      },
      puente: { drums: bar('k:1 -:1 k:1 -:1', 4), hats: bar('h:0.5', 32), ...pads('Am G F G') },
      final: { arp: arp('Am F C G'), ...pads('Am F C G') },
    }, ['intro', 'groove', 'estrofa', 'estribillo', 'puente', 'estrofa', 'estribillo', 'final']);
  })(),

  // Cuarteto: el tunga-tunga (bajo en el tiempo, piano a contratiempo) y acordeón
  'el-baile-de-la-plaza': (() => {
    const bassN = { D: ['D2', 'A2'], A: ['A2', 'E2'], Gd: ['G2', 'D2'] };
    const bass = cs => prog(cs).map(c => bar(`${bassN[c][0]}:1 ${bassN[c][1]}:1`, 2)).join(' ');
    const piano = cs => Object.fromEntries([0, 1, 2].map(i => ['k' + i, voice(prog(cs), i, n => bar(`-:0.5 ${n}:0.5`, 4))]));
    const ritmo = n => ({ kick: bar('k:1', 4 * n), snare: bar('-:0.5 s:0.5', 4 * n), guiro: bar('g:0.5 g:0.25 g:0.25', 4 * n) });
    const A = 'D A A D D Gd A D', B = 'Gd D A D Gd D A D';
    return arrange(124, {
      kick: { inst: 'drums', vol: 0.7 },
      snare: { inst: 'drums', vol: 0.45 },
      guiro: { inst: 'drums', vol: 0.4 },
      bass: { inst: 'triangle', vol: 0.8 },
      k0: { inst: 'square', vol: 0.1 }, k1: { inst: 'square', vol: 0.1 }, k2: { inst: 'square', vol: 0.1 },
      acc: { inst: 'sawtooth', vol: 0.22 },
    }, {
      intro: { kick: bar('k:1', 8), guiro: bar('g:0.5 g:0.25 g:0.25', 8), ...piano('D D') },
      a: {
        ...ritmo(8), bass: bass(A), ...piano(A),
        acc: [
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
      b: {
        ...ritmo(8), bass: bass(B), ...piano(B),
        acc: [
          'B5:1 D6:1 B5:1 G5:1',
          'A5:1 F#5:1 D5:2',
          'E5:0.5 F#5:0.5 G5:0.5 A5:0.5 B5:1 A5:1',
          'F#5:2 -:2',
          'G5:0.5 A5:0.5 B5:0.5 G5:0.5 D6:2',
          'D6:0.5 C#6:0.5 A5:1 F#5:2',
          'E5:1 G5:1 C#6:1 E6:1',
          'D6:4',
        ].join(' '),
      },
      puente: { kick: bar('k:1', 16), guiro: bar('g:0.5 g:0.25 g:0.25', 16), bass: bass('D A D A') },
      coda: {
        kick: 'k:1 k:1 k:1 k:1 k:2 -:2',
        bass: 'D2:1 A2:1 D2:1 A2:1 D2:2 -:2',
        acc: 'F#5:0.5 E5:0.5 D5:0.5 E5:0.5 F#5:1 A5:1 D6:2 -:2',
      },
    }, ['intro', 'a', 'b', 'puente', 'a', 'b', 'b', 'coda']);
  })(),

  // Chacarera en 6/8: cada tiempo es una corchea. Bombo legüero, guitarra y violín
  'chacarera-del-puente': (() => {
    const strums = { Am: 'A3 C4 E4 A4 E4 C4', E: 'E3 G#3 B3 E4 B3 G#3', Dm: 'D3 F3 A3 D4 A3 F3' };
    const strum = cs => prog(cs).map(c => strums[c].split(' ').map(n => n + ':1').join(' ')).join(' ');
    const bass = cs => prog(cs).map(c => bar(`${c[0]}2:3`, 2)).join(' ');
    const bombo = n => bar('k:2 s:1 k:1 s:1 s:1', n);
    const A = 'Am Am E E Am Am E Am', B = 'Dm Am E Am Dm Am E Am';
    const violinA = [
      'E5:2 D5:1 C5:2 B4:1',
      'A4:3 C5:2 E5:1',
      'D5:2 C5:1 B4:2 G#4:1',
      'B4:3 E5:3',
      'E5:2 F5:1 E5:2 D5:1',
      'C5:2 D5:1 E5:3',
      'B4:2 C5:1 D5:2 B4:1',
      'A4:6',
    ].join(' ');
    return arrange(300, {
      bombo: { inst: 'drums', vol: 0.8 },
      gtr: { inst: 'triangle', vol: 0.5 },
      bass: { inst: 'triangle', vol: 0.7 },
      violin: { inst: 'sawtooth', vol: 0.2 },
    }, {
      intro: { bombo: bombo(4), gtr: strum('Am E Am E') },
      a: { bombo: bombo(8), gtr: strum(A), bass: bass(A), violin: violinA },
      b: {
        bombo: bombo(8), gtr: strum(B), bass: bass(B),
        violin: [
          'F5:2 E5:1 D5:2 F5:1',
          'E5:3 C5:2 A4:1',
          'B4:2 C5:1 D5:2 E5:1',
          'C5:3 A4:3',
          'D5:2 F5:1 A5:2 G5:1',
          'E5:2 D5:1 C5:3',
          'B4:2 G#4:1 B4:2 D5:1',
          'A4:6',
        ].join(' '),
      },
      interludio: { bombo: bombo(4), gtr: strum('Am E Am E') },
      zapateo: { bombo: bar('k:1 k:1 s:1 k:1 k:1 s:1', 4), bass: bass('Am E Am E') },
    }, ['intro', 'a', 'b', 'interludio', 'a', 'b', 'zapateo', 'a']);
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
