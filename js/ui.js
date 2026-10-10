/* =========================================================================
   GTA MERCALOCA - Interfaz de Usuario, Menús y Carga de Recursos
   ========================================================================= */

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const IMGS = {};

class UIManager {
  constructor() {
    this.selIdx = 0;
    this.menuIdx = 0;
    this.mode = 'solo'; // 'solo' · 'host': crea una sala · 'join': entra a la de otro (?sala=)
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
        this.selIdx = +el.dataset.i;
        this.markSel();
        this.play();
      };
      el.onclick = choose;
    });
  }

  markSel() {
    const cardsEl = $('cards');
    if (!cardsEl) return;
    cardsEl.querySelectorAll('.card').forEach((el, i) => {
      el.classList.toggle('sel', i === this.selIdx);
    });
  }

  play() {
    if (G.state !== 'sel') return;
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
      if (G.state === 'menu') {
        if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyS') {
          this.menuIdx = 1 - this.menuIdx;
          this.markMenu();
        } else if (e.code === 'Enter' || e.code === 'Space') {
          if (this.menuIdx === 1) this.toOnline();
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
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.selIdx = (this.selIdx + 1) % CREW.length;
          this.markSel();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.selIdx = (this.selIdx - 1 + CREW.length) % CREW.length;
          this.markSel();
        }
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
