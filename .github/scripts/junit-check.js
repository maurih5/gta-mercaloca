// Publica el resultado de los tests (XML JUnit, de cualquier herramienta: Gradle,
// jest-junit, pytest --junitxml, dotnet JunitXml.TestLogger, go-junit-report...)
// como check runs en la PR:
// - un resumen (por defecto "Tests"): "N suites: X passed, Y failed, Z skipped",
//   tabla por suite, detalle de cada falla y anotación en la línea del test;
// - un check por test ("<Suite> › <test>"), para ver cada uno con su tilde en la PR.
// Se llama desde actions/github-script. Si el token es de una GitHub App, los checks
// aparecen sueltos (con el ícono de la app); con GITHUB_TOKEN, agrupados bajo el workflow.
//
// Opciones de run({ github, context, core, ... }):
//   ruta           archivo .xml o carpeta con .xml (no recursivo). Obligatoria.
//   name           nombre del check resumen (default "Tests").
//   porTest        crear un check por test (default true).
//   archivoDeSuite (suite, test) => ruta del archivo fuente, para las anotaciones.
//                  Recibe también el test (con su .message) para runners donde el
//                  archivo depende del test y no de la suite (Go: "foo_test.go:12: ...").
//                  Default: atributo "file" del testcase/testsuite si existe
//                  (jest-junit con addFileAttribute), o el nombre de la suite si
//                  parece una ruta. Ej. Gradle/JUnit (Kotlin):
//                  s => `app/src/test/java/${s.nombre.replace(/\$.*$/, '').replace(/\./g, '/')}.kt`

const fs = require('fs');
const path = require('path');

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : '';
};

const unescape = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '')
    .replace(/&amp;/g, '&');

// Nombre corto de la suite: "com.x.FooTest" -> "FooTest"; "src/a/foo.test.ts" -> "foo".
function corto(nombre) {
  if (nombre.includes('/') || nombre.includes('\\')) {
    const archivo = nombre.split(/[\\/]/).pop();
    const sinTest = archivo.replace(/\.(test|spec)\.[^.]+$/, '');
    return sinTest !== archivo ? sinTest : archivo.replace(/\.[^.]+$/, '');
  }
  return nombre.split('.').pop();
}

function parseJunit(xml) {
  const suites = [];
  const suiteRe = /<testsuite\s[^>]*>([\s\S]*?)<\/testsuite>|<testsuite\s[^>]*\/>/g;
  let s;
  while ((s = suiteRe.exec(xml))) {
    const open = s[0].match(/<testsuite\s[^>]*>/)[0];
    const body = s[1] ?? '';
    const nombre = unescape(attr(open, 'name'));
    const cases = [];
    const caseRe = /<testcase\s[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let c;
    while ((c = caseRe.exec(body))) {
      const inner = c[1] ?? '';
      const failure = inner.match(/<(failure|error)([^>]*)>([\s\S]*?)<\/\1>|<(failure|error)([^>]*)\/>/);
      // El cuerpo del <failure> suele ser el stack trace; si viene vacío, el atributo message.
      const message = failure
        ? unescape((failure[3] ?? '').replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() ||
            attr(failure[2] ?? failure[5] ?? '', 'message'))
        : '';
      cases.push({
        name: unescape(attr(c[0], 'name')),
        describe: unescape(attr(c[0], 'classname')).trim(),
        file: unescape(attr(c[0], 'file')),
        failed: Boolean(failure),
        skipped: /<skipped/.test(inner),
        message,
      });
    }
    suites.push({
      nombre,
      corto: corto(nombre),
      file: unescape(attr(open, 'file')) || cases.find((x) => x.file)?.file || '',
      time: Number(attr(open, 'time')) || 0,
      cases,
    });
  }
  return suites;
}

function leerReportes(ruta) {
  if (!fs.existsSync(ruta)) return null;
  const archivos = fs.statSync(ruta).isDirectory()
    ? fs.readdirSync(ruta).filter((f) => f.endsWith('.xml')).sort().map((f) => path.join(ruta, f))
    : [ruta];
  const suites = archivos.flatMap((f) => parseJunit(fs.readFileSync(f, 'utf8')));
  return suites.length ? suites : null;
}

function resumen(suites) {
  const all = suites.flatMap((s) => s.cases);
  const failed = all.filter((c) => c.failed).length;
  const skipped = all.filter((c) => c.skipped).length;
  return { suites: suites.length, passed: all.length - failed - skipped, failed, skipped };
}

function markdown(suites, r) {
  const filas = suites.map((s) => {
    const f = s.cases.filter((c) => c.failed).length;
    const k = s.cases.filter((c) => c.skipped).length;
    const p = s.cases.length - f - k;
    return `| ${f ? '❌' : '✅'} \`${s.corto}\` | ${p} | ${f} | ${k} | ${s.time.toFixed(1)}s |`;
  });
  return [
    `**${r.suites} suites**: ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`,
    '',
    '| Suite | Passed | Failed | Skipped | Tiempo |',
    '|---|---:|---:|---:|---:|',
    ...filas,
  ].join('\n');
}

function detalleFallas(suites) {
  const out = [];
  for (const s of suites) {
    for (const c of s.cases.filter((x) => x.failed)) {
      out.push(`### ❌ ${s.corto} › ${c.name}\n\n\`\`\`\n${c.message.slice(0, 4000)}\n\`\`\``);
    }
  }
  return out.join('\n\n').slice(0, 65000);
}

// GitHub muestra un solo check por nombre: los repetidos se numeran.
function nombresPorTest(suites) {
  const vistos = new Map();
  return suites.flatMap((s) =>
    s.cases.map((c) => {
      // El describe/classname solo suma si no repite el nombre de la suite.
      const medio = c.describe && ![s.nombre, s.corto].includes(c.describe) && !s.nombre.endsWith(`.${c.describe}`)
        ? ` › ${c.describe}` : '';
      const base = `${s.corto}${medio} › ${c.name}`.slice(0, 180);
      const n = (vistos.get(base) ?? 0) + 1;
      vistos.set(base, n);
      return { suite: s, test: c, nombre: n > 1 ? `${base} (${n})` : base };
    }),
  );
}

// Muchos checks seguidos pueden pegar contra el rate limit secundario de GitHub:
// se espera lo que diga retry-after y se reintenta.
async function conReintento(fn, core) {
  for (let intento = 1; ; intento++) {
    try {
      return await fn();
    } catch (err) {
      const limite = (err.status === 403 || err.status === 429) && intento < 5;
      if (!limite) throw err;
      const h = err.response?.headers?.['retry-after'];
      const espera = h != null && !Number.isNaN(Number(h)) ? Number(h) : 60;
      core.info(`Rate limit de GitHub, reintento en ${espera}s`);
      await new Promise((r) => setTimeout(r, espera * 1000));
    }
  }
}

// Línea del fallo según el stack trace: "<archivo>:<línea>" (Kotlin "(Foo.kt:12)",
// Node "foo.test.ts:12:5", Python "foo_test.py:12" / 'line 12').
function lineaDelFallo(archivo, message) {
  if (!archivo) return 1;
  const base = archivo.split(/[\\/]/).pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = message.match(new RegExp(`${base}"?(?::|, line )(\\d+)`));
  return m ? Number(m[1]) : 1;
}

module.exports = async ({ github, context, core, ruta, name = 'Tests', porTest = true, archivoDeSuite }) => {
  if (!ruta) throw new Error('junit-check: falta la opción "ruta" (archivo o carpeta con XML JUnit)');
  const head_sha = context.payload.pull_request?.head.sha ?? context.sha;
  const { owner, repo } = context.repo;

  const suites = leerReportes(ruta);
  if (!suites) {
    await github.rest.checks.create({
      owner, repo, head_sha, name,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: 'No se generó el reporte de tests',
        summary: `No hay XML JUnit en \`${ruta}\`: falló la instalación, la compilación o el runner antes de correr los tests.`,
      },
    });
    return;
  }

  const archivoDe = (s, c) => c?.file || (archivoDeSuite ? archivoDeSuite(s, c) : s.file || (/[\\/]/.test(s.nombre) ? s.nombre : ''));
  const anotacion = (s, c) => {
    const archivo = archivoDe(s, c);
    if (!archivo) return null;
    const line = lineaDelFallo(archivo, c.message);
    return {
      path: archivo, start_line: line, end_line: line,
      annotation_level: 'failure',
      title: c.name.slice(0, 255),
      message: c.message.slice(0, 2000) || 'Test fallido',
    };
  };

  const r = resumen(suites);
  const annotations = suites
    .flatMap((s) => s.cases.filter((c) => c.failed).map((c) => anotacion(s, c)))
    .filter(Boolean)
    .slice(0, 50);

  const { data: check } = await github.rest.checks.create({
    owner, repo, head_sha, name,
    status: 'completed',
    conclusion: r.failed > 0 ? 'failure' : 'success',
    output: {
      title: `${r.suites} suites: ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`,
      summary: markdown(suites, r),
      text: detalleFallas(suites) || undefined,
      annotations,
    },
  });
  // Sin details_url, "Details" de un check de App lleva a la homepage de la App.
  await github.rest.checks.update({ owner, repo, check_run_id: check.id, details_url: check.html_url });
  core.info(`Check "${name}": ${r.suites} suites, ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`);

  if (!porTest) return;
  for (const { suite, test, nombre } of nombresPorTest(suites)) {
    const conclusion = test.failed ? 'failure' : test.skipped ? 'skipped' : 'success';
    const anot = test.failed ? anotacion(suite, test) : null;
    await conReintento(() => github.rest.checks.create({
      owner, repo, head_sha,
      name: nombre,
      status: 'completed',
      conclusion,
      details_url: check.html_url,
      output: {
        title: test.failed ? 'Failed' : test.skipped ? 'Skipped' : 'Passed',
        summary: `\`${suite.nombre}\` › ${test.name}`,
        text: test.failed ? `\`\`\`\n${test.message.slice(0, 60000)}\n\`\`\`` : undefined,
        annotations: anot ? [anot] : undefined,
      },
    }), core);
  }
  core.info(`Checks por test: ${r.passed + r.failed + r.skipped}`);
};

module.exports.parseJunit = parseJunit;
module.exports.leerReportes = leerReportes;
module.exports.resumen = resumen;
module.exports.nombresPorTest = nombresPorTest;
module.exports.lineaDelFallo = lineaDelFallo;
module.exports.corto = corto;
