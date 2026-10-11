#!/usr/bin/env node
// Arma js/novedades.js (lo que el juego muestra al arrancar) a partir de los títulos de
// las PRs mergeadas a dev, agrupadas por versión.
//
// Uso: node novedades.js <version> [<numero de PR> <titulo de la PR>] > js/novedades.js
//   version: la que se está compilando (X.Y.Z-rc.N para dev, X.Y.Z para main).
//   PR: la que se está compilando, que todavía no está mergeada (solo para dev).
//
// De dónde sale cada versión: cada PR mergeada a dev tiene un tag X.Y.Z-rc.N sobre su
// merge commit (lo crea publicar.yml). Las rc de una misma X.Y.Z se juntan: la estable
// X.Y.Z muestra todo lo que entró en sus rc. Las PRs de docs, ci, tests, etc. no le
// interesan al jugador y no se muestran.
'use strict';

const OCULTOS = new Set(['docs', 'ci', 'chore', 'test', 'tests', 'refactor', 'build', 'style']);
const MAX_VERSIONES = 6;

// "feat(supers): robar los supermercados" -> "Robar los supermercados" (null si no va)
function limpiar(titulo) {
  const t = String(titulo || '').trim();
  const m = t.match(/^(\w+)(\([^)]*\))?!?:\s*(.*)$/);
  if (m && OCULTOS.has(m[1].toLowerCase())) return null;
  const txt = (m ? m[3] : t).trim();
  return txt ? txt[0].toUpperCase() + txt.slice(1) : null;
}

const base = v => v.replace(/-.*$/, '');

// tags: [{ name, code, commit }]  (solo los "versionCode=N")
// merges: [{ commit, subject, body }]  (git log --first-parent --merges de dev)
// actual: { version, pr, titulo }  (pr y titulo, si la PR compilada todavía no se mergeó)
function armar({ tags, merges, actual }) {
  const tagDe = new Map(tags.map(t => [t.commit, t]));
  const items = [];
  for (const m of merges) {
    const pr = m.subject.match(/^Merge pull request #(\d+) from (\S+)/);
    const t = tagDe.get(m.commit);
    if (!pr || !t || /\/(dev|main)$/.test(pr[2])) continue; // dev -> main o main -> dev
    items.push({ pr: +pr[1], titulo: m.body.split('\n')[0], version: t.name, code: t.code });
  }
  if (actual && actual.pr && actual.titulo && !items.some(i => i.pr === +actual.pr)) {
    items.push({ pr: +actual.pr, titulo: actual.titulo, version: actual.version, code: Infinity });
  }

  const grupos = new Map();
  for (const i of items.sort((a, b) => b.code - a.code)) {
    const t = limpiar(i.titulo);
    if (!t) continue;
    const v = base(i.version);
    if (!grupos.has(v)) grupos.set(v, []);
    grupos.get(v).push({ pr: i.pr, t });
  }
  return [...grupos].slice(0, MAX_VERSIONES).map(([v, lista]) => ({ v, items: lista }));
}

function js(lista, version) {
  return '// Generado por .github/scripts/novedades.js al compilar ' + version + '. No editar a mano.\n' +
    'const NOVEDADES = [' + lista.map(g => '\n  ' + JSON.stringify(g)).join(',') + (lista.length ? '\n' : '') + '];\n';
}

// Lee los tags y los merges del repo (el directorio actual)
function leerGit() {
  const { execFileSync } = require('child_process');
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20 });
  const tags = git('for-each-ref', 'refs/tags', '--format=%(refname:short)%1f%(contents:subject)%1f%(*objectname)')
    .split('\n').filter(Boolean).map(l => l.split('\x1f'))
    .map(([name, subj, commit]) => ({ name, code: +((subj.match(/^versionCode=(\d+)$/) || [])[1]), commit }))
    .filter(t => t.commit && Number.isFinite(t.code));
  let merges = [];
  try {
    merges = git('log', '--first-parent', '--merges', '--format=%H%x1f%s%x1f%b%x1e', 'HEAD')
      .split('\x1e').map(r => r.replace(/^\n/, '')).filter(Boolean)
      .map(r => { const [commit, subject, body = ''] = r.split('\x1f'); return { commit, subject, body: body.trim() }; });
  } catch (e) { /* sin historia (clone superficial): sin novedades viejas */ }
  return { tags, merges };
}

if (require.main === module) {
  const [version, pr, titulo] = process.argv.slice(2);
  if (!version) {
    console.error('Uso: novedades.js <version> [<pr> <titulo>]');
    process.exit(1);
  }
  process.stdout.write(js(armar({ ...leerGit(), actual: { version, pr, titulo } }), version));
}

module.exports = { armar, limpiar, js };
