/* =========================================================================
   GTA MERCALOCA - Interfaz de Usuario, Menús y Carga de Recursos
   ========================================================================= */

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const IMGS = {};

// Novedades: se guarda la PR más nueva que el jugador ya vio y tildó "no volver a mostrar".
// Mientras haya alguna más nueva, el cartel aparece al arrancar.
const NEWS_KEY = 'mercaloca.novedades';
const PR_URL = 'https://github.com/maurih5/gta-mercaloca/pull/'; // cada novedad abre su PR
const newsMax = list => list.reduce((m, g) => g.items.reduce((m2, i) => Math.max(m2, i.pr), m), 0);
const newsFresh = (list, seen) => newsMax(list) > seen;

class UIManager {
  constructor() {
    this.selIdx = 0;
    this.menuIdx = 0;
    this.mode = 'solo'; // 'solo' · 'host': crea una sala · 'join': entra a la de otro (?sala=)
    this.newsOpen = false;
    this.initEvents();
    const vt = $('version-tag');
    if (vt) vt.textContent = VERSION;
  }

  show(id) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    const vt = $('version-tag');
    if (vt) vt.style.display = id ? 'block' : 'none';
    if (typeof touchController !== 'undefined') {
      touchController.updateVisibility();
    }
  }

  fadeTo(fn) {
    const f = $('fade');
    if (!f) {
      fn();
      return;
    }
    f.style.opacity = 1;
    setTimeout(() => {
      fn();
      f.style.opacity = 0;
    }, 360);
  }

  buildCards() {
    const cardsEl = $('cards');
    if (!cardsEl) return;
    cardsEl.innerHTML = CREW.map((c, i) =>
      '<div class="card' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '"><img src="' + c.img + '" alt="">' +
      '<div class="nm">' + c.name + '</div></div>'
    ).join('');

    cardsEl.querySelectorAll('.card').forEach(el => {
      const choose = () => {
        if (this.taken(+el.dataset.i)) {
          this.selMsg(CREW[+el.dataset.i].name + ' YA ESTA EN LA SALA. ELEGI OTRO');
          return;
        }
        this.selIdx = +el.dataset.i;
        this.markSel();
        this.play();
      };
      el.onclick = choose;
    });
  }

  // Entrando a la sala de otro: los personajes que ya están adentro no se pueden elegir
  taken(i) {
    return this.mode === 'join' && (net.used || []).includes(i);
  }

  // Tacha los que están en uso y, si el elegido quedó tomado, pasa al primero libre
  markTaken() {
    const cardsEl = $('cards');
    if (cardsEl) {
      cardsEl.querySelectorAll('.card').forEach((el, i) => el.classList.toggle('taken', this.taken(i)));
    }
    if (this.taken(this.selIdx)) {
      const free = CREW.findIndex((c, i) => !this.taken(i));
      if (free >= 0) this.selIdx = free;
    }
    this.markSel();
  }

  // Próximo personaje libre para el lado d (+1 / -1)
  stepSel(d) {
    for (let n = 1; n <= CREW.length; n++) {
      const i = (this.selIdx + d * n + CREW.length * n) % CREW.length;
      if (!this.taken(i)) {
        this.selIdx = i;
        break;
      }
    }
    this.markSel();
  }

  selMsg(t) {
    const go = typeof document !== 'undefined' && document.querySelector && document.querySelector('#sel .go');
    if (go) go.textContent = t;
  }

  markSel() {
    const cardsEl = $('cards');
    if (!cardsEl) return;
    cardsEl.querySelectorAll('.card').forEach((el, i) => {
      el.classList.toggle('sel', i === this.selIdx);
    });
  }

  play() {
    if (G.state !== 'sel' || this.taken(this.selIdx)) return;
    G.state = 'go';
    this.fadeTo(() => {
      if (this.mode === 'join') {
        this.show('net');
        this.netMsg('ENTRANDO AL BARRIO...', 'SALA ' + net.code);
        net.join(this.selIdx);
        return;
      }
      this.show('');
      startGame(CREW[this.selIdx]);
      if (this.mode === 'host') this.openRoom();
      if (typeof touchController !== 'undefined') {
        touchController.updateVisibility();
      }
    });
  }

  // Abre la sala con la partida recién arrancada y copia el link para pasarlo
  openRoom() {
    say('ABRIENDO LA SALA...', 6);
    net.host().then(code => {
      if (typeof keepHosting === 'function') keepHosting(); // que siga aunque se cambie de pestaña
      const link = salaLink(code);
      let copied = false;
      try {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(link).catch(() => {});
          copied = true;
        }
      } catch (e) { /* sin portapapeles: queda el código en pantalla */ }
      say('SALA ' + code + (copied ? ' - LINK COPIADO, PASALO' : ' - PASALE EL CODIGO A TUS AMIGOS'), 6);
    }).catch(() => say('NO SE PUDO ABRIR LA SALA. REVISA LA CONEXION', 4));
  }

  // Pantalla de la red: buscando la sala, entrando, o se cortó (back: botón para volver)
  netMsg(title, text, back = false) {
    const t = $('net-title'), x = $('net-text'), b = $('btnNetBack');
    if (t) t.textContent = title;
    if (x) x.textContent = text;
    if (b) b.style.display = back ? 'block' : 'none';
  }

  // ---- Novedades ----

  newsSeen() {
    try {
      return +localStorage.getItem(NEWS_KEY) || 0;
    } catch (e) {
      return 0; // sin localStorage (navegación privada, etc.): se muestra siempre
    }
  }

  // Abre el cartel si hay algo que no viste (o siempre, con force: botón del menú, ?novedades)
  openNews(force = false) {
    const seen = this.newsSeen();
    if (!force && !newsFresh(NOVEDADES, seen)) return false;
    const list = $('news-list'), ver = $('news-ver'), hide = $('news-hide'), el = $('news');
    if (ver) ver.textContent = VERSION;
    if (hide) hide.checked = false;
    if (list && typeof document !== 'undefined') {
      list.innerHTML = '';
      if (!NOVEDADES.length) {
        const it = document.createElement('div');
        it.className = 'news-it';
        it.textContent = 'Todavia no hay novedades.';
        list.appendChild(it);
      }
      for (const g of NOVEDADES) {
        const v = document.createElement('div');
        v.className = 'news-v';
        v.textContent = 'VERSION ' + g.v;
        list.appendChild(v);
        for (const i of g.items) {
          // NUEVO: lo que no viste. La primera vez que entrás, solo lo de la última versión
          const fresh = seen ? i.pr > seen : g === NOVEDADES[0];
          const it = document.createElement('a');
          it.className = 'news-it' + (fresh ? ' new' : '');
          it.href = PR_URL + i.pr;
          it.target = '_blank';
          it.rel = 'noopener';
          it.title = 'Ver la PR #' + i.pr + ' en GitHub';
          it.textContent = i.t;
          if (fresh) {
            const tag = document.createElement('b');
            tag.textContent = 'NUEVO';
            it.appendChild(tag);
          }
          list.appendChild(it);
        }
      }
      list.scrollTop = 0;
    }
    if (el) el.classList.add('on');
    this.newsOpen = true;
    return true;
  }

  // hide: el tilde de "no volver a mostrar"
  closeNews(hide = !!($('news-hide') || {}).checked) {
    const el = $('news');
    if (hide) {
      try {
        localStorage.setItem(NEWS_KEY, String(Math.max(this.newsSeen(), newsMax(NOVEDADES))));
      } catch (e) { /* no se puede guardar: vuelve a salir la próxima */ }
    }
    if (el) el.classList.remove('on');
    this.newsOpen = false;
  }

  markMenu() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#menu .mi').forEach((el, i) => el.classList.toggle('sel', i === this.menuIdx));
  }

  toSel(mode) {
    this.mode = mode;
    G.state = 'sel';
    this.fadeTo(() => this.show('sel'));
  }

  toOnline() {
    G.state = 'online';
    this.fadeTo(() => {
      this.show('online');
      const inp = $('sala-code');
      if (inp && inp.focus) inp.focus();
    });
  }

  joinTyped() {
    const inp = $('sala-code');
    const code = String((inp && inp.value) || '').trim().toUpperCase();
    if (!validSala(code)) {
      const e = $('online-msg');
      if (e) e.textContent = 'EL CODIGO TIENE ' + SALA_LEN + ' LETRAS';
      return;
    }
    location.href = salaLink(code);
  }

  loadAll(list, onProg) {
    let done = 0;
    return Promise.all(list.map(src => new Promise(res => {
      const im = new Image();
      im.onload = im.onerror = () => {
        IMGS[src] = im;
        if (onProg) onProg(++done / list.length);
        res();
      };
      im.src = src;
    })));
  }

  initEvents() {
    if (typeof addEventListener === 'undefined') return;

    addEventListener('keydown', e => {
      // Con las novedades abiertas, el teclado es solo para cerrarlas
      if (this.newsOpen) {
        if (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') {
          e.preventDefault();
          this.closeNews();
        }
        return;
      }
      if (G.state === 'menu') {
        const n = 3; // EMPEZAR · ONLINE · NOVEDADES
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          this.menuIdx = (this.menuIdx + 1) % n;
          this.markMenu();
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.menuIdx = (this.menuIdx + n - 1) % n;
          this.markMenu();
        } else if (e.code === 'Enter' || e.code === 'Space') {
          if (this.menuIdx === 1) this.toOnline();
          else if (this.menuIdx === 2) this.openNews(true);
          else this.toSel('solo');
        }
      } else if (G.state === 'online') {
        if (e.code === 'Escape') {
          G.state = 'menu';
          this.fadeTo(() => this.show('menu'));
        } else if (e.code === 'Enter' && e.target && e.target.id === 'sala-code') {
          this.joinTyped();
        }
      } else if (G.state === 'sel') {
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.stepSel(1);
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.stepSel(-1);
        if (e.code === 'Enter' || e.code === 'Space') {
          this.play();
        }
      }
    });

    if (typeof document !== 'undefined') {
      const btn = $('btnPlay');
      if (btn) btn.onclick = () => this.toSel('solo');
      const on = (id, fn) => {
        const el = $(id);
        if (el) el.onclick = fn;
      };
      on('btnOnline', () => this.toOnline());
      on('btnNews', () => this.openNews(true));
      on('news-close', () => this.closeNews());
      on('btnHost', () => this.toSel('host'));
      on('btnJoin', () => this.joinTyped());
      on('btnOnlineBack', () => {
        G.state = 'menu';
        this.fadeTo(() => this.show('menu'));
      });
      // Volver al menú: se recarga sin la sala en la dirección
      on('btnNetBack', () => { location.href = location.pathname; });
      const btnSel = $('btnPlaySel');
      if (btnSel) {
        btnSel.onclick = () => this.play();
      }
    }
  }
}

const ui = new UIManager();

// Link para entrar a la sala: el mismo juego con ?sala=CODIGO
const salaLink = code => (typeof location !== 'undefined' ? location.origin + location.pathname : '') + '?sala=' + code;

// Lo que hace la pantalla cuando entra a la sala de otro o se corta
net.onEnter = () => {
  ui.show('');
  say('ESTAS EN LA SALA ' + net.code, 3);
};
// Eligiendo personaje para entrar: se actualizan los que están en uso
net.onUsed = () => ui.markTaken();
// Justo lo eligió otro: de vuelta a elegir
net.onTaken = () => {
  ui.show('sel');
  ui.markTaken();
  ui.selMsg('ESE PERSONAJE LO ACABA DE ELEGIR OTRO. ELEGI OTRO');
};
net.onLost = msg => {
  G.mapOpen = false;
  if (G.shopOpen) shop.close();
  ui.show('net');
  ui.netMsg('SE CORTO', msg, true);
};
let selIdx = ui.selIdx;

// Funciones globales para compatibilidad
const show = id => ui.show(id);
const fadeTo = fn => ui.fadeTo(fn);
const buildCards = () => ui.buildCards();
const markSel = () => ui.markSel();
const play = () => ui.play();
const loadAll = (list, onProg) => ui.loadAll(list, onProg);
