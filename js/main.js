/* =========================================================================
   GTA MERCALOCA - Inicialización (Boot) y Bucle Principal (Game Loop)
   ========================================================================= */

let lastTime = (typeof performance !== 'undefined') ? performance.now() : 0;
let lastRaf = 0, pulse = null;

function frame(now) {
  lastRaf = performance.now();
  step(now);
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(frame);
  }
}

// Con la pestaña escondida (o la ventana tapada) el navegador deja de llamar a
// requestAnimationFrame. Si esta pantalla es el host de una sala, el mundo de todos
// depende de ella: un worker (sus timers no se frenan) sigue marcando el paso.
function keepHosting() {
  if (pulse || typeof Worker === 'undefined' || typeof Blob === 'undefined') return;
  try {
    pulse = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 33)'])));
    pulse.onmessage = () => {
      const now = performance.now();
      if (net.hosting && now - lastRaf > 120) step(now);
    };
  } catch (e) {
    pulse = false;
  }
}

function step(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (G.state === 'play') {
    // Con otros jugando el mundo no se puede frenar: no hay pausa, y el mapa y los menús
    // dejan al jugador local quieto (sin controles) pero la simulación sigue
    const solo = G.players.length <= 1 && !net.client;
    if (keys.KeyP && !G._p && !G.mapOpen && solo) {
      G.paused = !G.paused;
      G._p = true;
    }
    if (!keys.KeyP) G._p = false;

    if (keys.KeyM && !G._m && !G.paused) {
      G.mapOpen = !G.mapOpen;
      G._m = true;
    }
    if (!keys.KeyM) G._m = false;

    if (keys.KeyN && !G._n) {
      G._n = true;
      say(sound.toggleMute() ? 'SONIDO APAGADO' : 'SONIDO PRENDIDO', 1.4);
    }
    if (!keys.KeyN) G._n = false;

    if (keys.KeyR && !G._r) {
      G._r = true;
      radio.next();
    }
    if (!keys.KeyR) G._r = false;

    if (G.mapOpen) {
      const f = 1 + MAP_ZOOM_RATE * dt;
      if (keys.Equal || keys.NumpadAdd) G.mapZoom = clamp(G.mapZoom * f, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
      if (keys.Minus || keys.NumpadSubtract) G.mapZoom = clamp(G.mapZoom / f, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
      const wheel = input.consumeWheel();
      if (wheel) G.mapZoom = clamp(G.mapZoom * Math.pow(1.0015, -wheel), MAP_MIN_ZOOM, MAP_MAX_ZOOM);
    } else {
      input.consumeWheel();
    }
    if (touchController) touchController.syncMapButtons();

    // En la sala de otro no se simula nada: manda los controles y anima lo que manda el host
    if (net.client) net.clientFrame(dt);
    else if (!solo || (!G.paused && !G.mapOpen && !G.shopOpen)) update(dt);
    // Escondida (host marcando el paso con el worker) no hace falta dibujar
    if (G.state === 'play' && !(typeof document !== 'undefined' && document.hidden)) render();
  }
  net.tick(dt);
  sound.update();
  radio.update();
}

async function boot() {
  if (typeof document === 'undefined') return;

  let tipIdx = 0;
  const tipEl = $('tip');
  if (tipEl) tipEl.textContent = TIPS[0];

  const timer = setInterval(() => {
    tipIdx = (tipIdx + 1) % TIPS.length;
    if (tipEl) tipEl.textContent = TIPS[tipIdx];
  }, 2400);

  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const q = new URLSearchParams(location.search);

  // ?sala=CODIGO: se entra a la sala de otro. Antes de armar la ciudad hay que encontrar
  // al host, que pasa la semilla de la suya (así es la misma ciudad para todos).
  const sala = (q.get('sala') || '').toUpperCase();
  let seed;
  if (sala) {
    clearInterval(timer);
    if (tipEl) tipEl.textContent = 'BUSCANDO LA SALA ' + sala + '...';
    try {
      if (!validSala(sala)) throw new Error('CODIGO');
      const info = await net.probe(sala);
      if (info.v !== VERSION) throw new Error('VERSION');
      seed = info.seed;
    } catch (e) {
      net.leave();
      show('net');
      ui.netMsg('NO SE PUDO ENTRAR', {
        CODIGO: 'EL CODIGO DE SALA ' + sala + ' NO EXISTE',
        VERSION: 'ESA SALA JUEGA OTRA VERSION DEL JUEGO. RECARGA LA PAGINA',
      }[e.message] || 'NO ENCONTRAMOS A NADIE EN LA SALA ' + sala, true);
      return;
    }
  }

  // Generar la ciudad y hornear el suelo
  world.buildCity(seed);
  world.bakeGround();

  // Precargar imágenes del crew y pantallas
  const imgList = CREW.map(c => c.img).concat(['img/crew.jpeg', 'img/loading.jpeg']);
  await loadAll(imgList, p => {
    const fillEl = $('fill');
    if (fillEl) fillEl.style.width = Math.round(p * 100) + '%';
  });

  // Generar sprites de caras para el crew
  for (const c of CREW) {
    if (IMGS[c.img] && IMGS[c.img].width) {
      G.faces[c.id] = pixelFace(IMGS[c.img], c.crop, FACE_PX);
    }
  }

  // Generar caras pixel art genéricas para peatones anónimos
  const SKIN = ['#c9a07a', '#a9784f', '#e0b892', '#8a5f3c'];
  const HAIR = ['#2a1d12', '#4a3a22', '#6b4a2a', '#1a1a1a', '#8a6a3a'];
  for (let i = 0; i < 4; i++) {
    const c2 = document.createElement('canvas');
    c2.width = c2.height = 14;
    const g2 = c2.getContext('2d');
    g2.fillStyle = '#14100c';
    g2.fillRect(0, 0, 14, 14);
    g2.fillStyle = SKIN[i];
    g2.fillRect(2, 4, 10, 9);
    g2.fillStyle = HAIR[i % HAIR.length];
    g2.fillRect(2, 2, 10, 4);
    g2.fillStyle = '#1a1a1a';
    g2.fillRect(4, 7, 2, 2);
    g2.fillRect(8, 7, 2, 2);
    g2.fillStyle = 'rgba(0,0,0,.25)';
    g2.fillRect(5, 11, 4, 1);
    G.faces['ped' + i] = c2;
  }
  G.faces.ped = G.faces.ped0;

  // Caras de los tranzas: gorra con visera
  TRANZA_LOOK.forEach((look, i) => {
    const c3 = document.createElement('canvas');
    c3.width = c3.height = 14;
    const g3 = c3.getContext('2d');
    g3.fillStyle = '#14100c';
    g3.fillRect(0, 0, 14, 14);
    g3.fillStyle = SKIN[(i + 1) % SKIN.length];
    g3.fillRect(2, 4, 10, 9);
    g3.fillStyle = look.cap;
    g3.fillRect(1, 1, 12, 4);
    g3.fillRect(1, 4, 13, 1);
    g3.fillStyle = '#1a1a1a';
    g3.fillRect(4, 7, 2, 1);
    g3.fillRect(8, 7, 2, 1);
    g3.fillStyle = 'rgba(0,0,0,.3)';
    g3.fillRect(4, 11, 6, 1);
    G.faces['tranza' + i] = c3;
  });

  // Caras de los famosos, dibujadas a mano según su look (pelo, barba, sonrisa)
  for (const f of FAMOUS) G.faces['famous-' + f.id] = famousFace(f.look);

  // Generar cara pixel art del policía
  const cop = document.createElement('canvas');
  cop.width = cop.height = 12;
  const cg = cop.getContext('2d');
  cg.fillStyle = '#14100c';
  cg.fillRect(0, 0, 12, 12);
  cg.fillStyle = '#c9a07a';
  cg.fillRect(2, 3, 8, 8);
  cg.fillStyle = '#1b2a4a';
  cg.fillRect(1, 1, 10, 3);
  cg.fillStyle = '#0b0b0b';
  cg.fillRect(2, 5, 8, 2);
  cg.fillStyle = '#d8d8d8';
  cg.fillRect(4, 2, 4, 1);
  G.faces.cop = cop;

  // ?play arranca directo a jugar; ?famoso=<id> también, con ese famoso al lado (para probarlo)
  const skip = !sala && /[?&](play|famoso)/.test(location.search);

  setTimeout(() => {
    clearInterval(timer);
    buildCards();
    if (skip) {
      show('');
      startGame(CREW[0]);
      const h = parseFloat(q.get('h'));
      if (!isNaN(h)) G.t = (((h / 24 - 0.34 + 1) % 1) * DAY);
      // ?x=..&y=..: arrancar parado en ese punto del mundo (para mirar un lugar puntual)
      const px0 = parseFloat(q.get('x')), py0 = parseFloat(q.get('y'));
      if (!isNaN(px0) && !isNaN(py0)) {
        G.me.x = px0; G.me.y = py0;
        G.cam.x = clamp(px0 - RW / 2, 0, WORLD - RW); G.cam.y = clamp(py0 - RH / 2, 0, WORLD - RH);
      }
      const fam = FAMOUS.find(f => f.id === q.get('famoso'));
      if (fam) {
        const sp = sidewalkSpot(30, 70, G.me);
        if (sp) G.peds.push(makeFamous(fam, sp.x, sp.y));
      }
      const w = parseInt(q.get('w'));
      if (!isNaN(w)) G.me.wanted = clamp(w, 0, 5);
      if (q.get('bust')) {
        G.me.money = 4200;
        setTimeout(() => bust(), 400);
      }
    } else if (sala) {
      // Directo a elegir personaje para entrar a la sala
      ui.mode = 'join';
      G.state = 'sel';
      fadeTo(() => show('sel'));
    } else {
      G.state = 'menu';
      fadeTo(() => show('menu'));
    }
    requestAnimationFrame(frame);
  }, skip ? 0 : Math.max(0, 2600 - (performance.now() - t0)));
}

// Iniciar arranque automáticamente cuando cargue el DOM
if (typeof document !== 'undefined') {
  // Al cerrar la pestaña se avisa a la sala, así los demás no esperan a que se corte
  addEventListener('pagehide', () => net.leave());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
