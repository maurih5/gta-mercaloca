/* =========================================================================
   GTA MERCALOCA - Interfaz de Usuario, Menús y Carga de Recursos
   ========================================================================= */

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const IMGS = {};

class UIManager {
  constructor() {
    this.selIdx = 0;
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
    this.fadeTo(() => {
      this.show('');
      startGame(CREW[this.selIdx]);
      if (typeof touchController !== 'undefined') {
        touchController.updateVisibility();
      }
    });
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
      if (G.state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
        G.state = 'sel';
        this.fadeTo(() => this.show('sel'));
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
      if (btn) {
        btn.onclick = () => {
          G.state = 'sel';
          this.fadeTo(() => this.show('sel'));
        };
      }
      const btnSel = $('btnPlaySel');
      if (btnSel) {
        btnSel.onclick = () => this.play();
      }
    }
  }
}

const ui = new UIManager();
let selIdx = ui.selIdx;

// Funciones globales para compatibilidad
const show = id => ui.show(id);
const fadeTo = fn => ui.fadeTo(fn);
const buildCards = () => ui.buildCards();
const markSel = () => ui.markSel();
const play = () => ui.play();
const loadAll = (list, onProg) => ui.loadAll(list, onProg);
