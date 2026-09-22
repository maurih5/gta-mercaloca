/* =========================================================================
   GTA MERCALOCA - Inicialización (Boot) y Bucle Principal (Game Loop)
   ========================================================================= */

let lastTime = (typeof performance !== 'undefined') ? performance.now() : 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (G.state === 'play') {
    if (keys.KeyP && !G._p) {
      G.paused = !G.paused;
      G._p = true;
    }
    if (!keys.KeyP) G._p = false;

    if (!G.paused) update(dt);
    render();
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(frame);
  }
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

  // Generar la ciudad y hornear el suelo
  world.buildCity();
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
      G.faces[c.id] = pixelFace(IMGS[c.img], c.crop, 14);
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

  const skip = typeof location !== 'undefined' && location.search.indexOf('play') >= 0;

  setTimeout(() => {
    clearInterval(timer);
    buildCards();
    if (skip) {
      show('');
      startGame(CREW[0]);
      const q = new URLSearchParams(location.search);
      const h = parseFloat(q.get('h'));
      if (!isNaN(h)) G.t = (((h / 24 - 0.34 + 1) % 1) * DAY);
      const w = parseInt(q.get('w'));
      if (!isNaN(w)) G.wanted = clamp(w, 0, 5);
      if (q.get('bust')) {
        G.money = 4200;
        setTimeout(() => bust(), 400);
      }
    } else {
      G.state = 'menu';
      fadeTo(() => show('menu'));
    }
    requestAnimationFrame(frame);
  }, skip ? 0 : Math.max(0, 2600 - (performance.now() - t0)));
}

// Iniciar arranque automáticamente cuando cargue el DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
