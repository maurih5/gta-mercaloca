#!/usr/bin/env node
// Pasa los .mid de music/ a js/songs.js, que el juego sintetiza con Web Audio.
//   node tools/midi2songs.js
// Cada music/<nombre>.mid queda como SONGS['<nombre>']; después se lo suma a una
// emisora en STATIONS (js/radio.js). js/songs.js se genera entero: no editarlo a mano.
//
// Del MIDI se usa: las notas de cada canal, el instrumento (program change) para elegir
// la onda, y el primer tempo. El canal 10 es la batería (bombo, redoblante, platillos).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'music');
const out = path.join(root, 'js', 'songs.js');

function parseMidi(buf) {
  let p = 0;
  const u8 = () => buf[p++];
  const u16 = () => (buf[p++] << 8) | buf[p++];
  const u32 = () => ((buf[p++] << 24) | (buf[p++] << 16) | (buf[p++] << 8) | buf[p++]) >>> 0;
  const str = n => buf.toString('latin1', p, (p += n));
  const vlq = () => {
    let v = 0, b;
    do {
      b = u8();
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };

  if (str(4) !== 'MThd') throw new Error('no es un archivo MIDI');
  const hlen = u32();
  u16(); // formato
  const ntrks = u16();
  const div = u16();
  p = 8 + hlen;
  if (div & 0x8000) throw new Error('MIDI con tiempo SMPTE: exportalo con tiempo en negras (PPQ)');

  let tempo = 500000; // 120 bpm
  let tempoSet = false;
  const notes = []; // {ch, prog, tick, len, n, v}
  for (let t = 0; t < ntrks; t++) {
    const id = str(4), len = u32(), end = p + len;
    if (id !== 'MTrk') { p = end; continue; }
    let tick = 0, status = 0;
    const prog = new Array(16).fill(0);
    const open = {}; // `${ch}:${n}` -> nota sonando
    while (p < end) {
      tick += vlq();
      let b = buf[p];
      if (b & 0x80) { status = b; p++; } else b = status; // running status
      if (b === 0xff) {
        const type = u8(), l = vlq();
        if (type === 0x51 && !tempoSet) {
          tempo = (buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2];
          tempoSet = true;
        }
        p += l;
      } else if (b === 0xf0 || b === 0xf7) {
        p += vlq();
      } else {
        const kind = b & 0xf0, ch = b & 0x0f;
        if (kind === 0xc0) prog[ch] = u8();
        else if (kind === 0xd0) u8();
        else {
          const a = u8(), c = u8();
          const key = ch + ':' + a;
          if (kind === 0x90 && c > 0) {
            open[key] = { ch, prog: prog[ch], tick, n: a, v: c / 127 };
          } else if (kind === 0x80 || kind === 0x90) {
            const o = open[key];
            if (o) {
              o.len = tick - o.tick;
              notes.push(o);
              delete open[key];
            }
          }
        }
      }
    }
    p = end;
  }
  return { bpm: 60e6 / tempo, div, notes };
}

// Batería General MIDI -> los golpes que sintetiza el juego
const drum = n => (n === 35 || n === 36 ? 'k' : n === 38 || n === 40 || n === 39 ? 's' : n === 69 || n === 73 || n === 74 ? 'g' : 'h');
// Instrumento General MIDI -> onda
const inst = prog =>
  prog >= 32 && prog <= 39 ? 'triangle' // bajos
  : prog >= 40 && prog <= 55 ? 'sawtooth' // cuerdas y coros
  : prog >= 24 && prog <= 31 ? 'sawtooth' // guitarras
  : 'square';

function toSong(m) {
  const r = x => Math.round(x * 1000) / 1000;
  const tracks = {};
  let last = 0;
  for (const o of m.notes) {
    const isDrum = o.ch === 9;
    const key = isDrum ? 'drums' : o.ch + ':' + o.prog;
    const tr = (tracks[key] = tracks[key] || { inst: isDrum ? 'drums' : inst(o.prog), vol: isDrum ? 0.7 : 0.45, notes: [] });
    const t = o.tick / m.div, d = Math.max(o.len / m.div, 0.05);
    tr.notes.push([r(t), r(d), isDrum ? drum(o.n) : o.n, r(o.v)]);
    last = Math.max(last, t + d);
  }
  for (const tr of Object.values(tracks)) tr.notes.sort((a, b) => a[0] - b[0]);
  return { bpm: r(m.bpm), beats: Math.ceil(last / 4) * 4, tracks: Object.values(tracks) };
}

if (require.main !== module) {
  module.exports = { parseMidi, toSong };
  return;
}

const songs = {};
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.midi?$/i.test(f)).sort() : [];
for (const f of files) {
  const name = f.replace(/\.midi?$/i, '');
  try {
    songs[name] = toSong(parseMidi(fs.readFileSync(path.join(dir, f))));
    const n = songs[name].tracks.reduce((s, t) => s + t.notes.length, 0);
    console.log(`✅ ${f}: ${n} notas, ${songs[name].tracks.length} pistas, ${songs[name].bpm} bpm`);
  } catch (e) {
    console.error(`❌ ${f}: ${e.message}`);
    process.exitCode = 1;
  }
}

const body = Object.entries(songs)
  .map(([k, s]) => `  ${JSON.stringify(k)}: ${JSON.stringify(s)},`)
  .join('\n');
fs.writeFileSync(
  out,
  `// Generado por tools/midi2songs.js a partir de music/*.mid. No editar a mano.\nconst SONGS = {\n${body}${body ? '\n' : ''}};\n`
);
console.log(`js/songs.js: ${Object.keys(songs).length} temas`);
