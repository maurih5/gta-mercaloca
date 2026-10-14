/* =========================================================================
   GTA MERCALOCA - Manejo de Entrada / Teclado
   ========================================================================= */

class InputManager {
  constructor() {
    this.keys = {};
    this.touchAxis = { x: 0, y: 0 };
    this.wheel = 0;
    this.drag = { x: 0, y: 0, on: false, lx: 0, ly: 0 }; // arrastrar el mapa (px del canvas)
    this._preventCodes = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    this._boundDown = this.onKeyDown.bind(this);
    this._boundUp = this.onKeyUp.bind(this);
    this._boundWheel = this.onWheel.bind(this);
    this.attach();
  }

  attach() {
    if (typeof addEventListener !== 'undefined') {
      addEventListener('keydown', this._boundDown);
      addEventListener('keyup', this._boundUp);
      addEventListener('wheel', this._boundWheel, { passive: false });
      // Arrastrar el mapa con el mouse o el dedo (solo sobre el canvas y con el mapa abierto)
      addEventListener('pointerdown', e => {
        if (typeof G === 'undefined' || !G.mapOpen || !e.target || e.target.id !== 'cv') return;
        this.drag.on = true;
        this.drag.lx = e.clientX;
        this.drag.ly = e.clientY;
      });
      addEventListener('pointermove', e => {
        if (!this.drag.on) return;
        const r = e.target && e.target.id === 'cv' && e.target.getBoundingClientRect
          ? e.target.getBoundingClientRect() : { width: RW };
        const f = RW / (r.width || RW);
        this.drag.x += (e.clientX - this.drag.lx) * f;
        this.drag.y += (e.clientY - this.drag.ly) * f;
        this.drag.lx = e.clientX;
        this.drag.ly = e.clientY;
      });
      const stop = () => { this.drag.on = false; };
      addEventListener('pointerup', stop);
      addEventListener('pointercancel', stop);
      // Al cambiar de ventana no llega el soltar de las teclas: que no queden apretadas
      addEventListener('blur', () => {
        for (const k in this.keys) this.keys[k] = false;
      });
    }
  }

  onWheel(e) {
    if (typeof G !== 'undefined' && G.mapOpen) e.preventDefault();
    this.wheel += e.deltaY;
  }

  // Lo que se arrastró desde la última vez, en píxeles del canvas
  consumeDrag() {
    const d = { x: this.drag.x, y: this.drag.y };
    this.drag.x = this.drag.y = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  detach() {
    if (typeof removeEventListener !== 'undefined') {
      removeEventListener('keydown', this._boundDown);
      removeEventListener('keyup', this._boundUp);
      removeEventListener('wheel', this._boundWheel);
    }
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    if (this._preventCodes.has(e.code)) {
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  isDown(code) {
    return !!this.keys[code];
  }

  getHorizontalAxis() {
    const keyVal = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) -
                   (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    return keyVal !== 0 ? keyVal : this.touchAxis.x;
  }

  getVerticalAxis() {
    const keyVal = (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) -
                   (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0);
    return keyVal !== 0 ? keyVal : this.touchAxis.y;
  }

  // Lo que el jugador local quiere hacer este frame. La simulación solo lee estos
  // controles (P.ctl), nunca el teclado: así un jugador remoto se maneja igual,
  // con los controles que llegan por la red.
  readControls() {
    const k = this.keys;
    let slot = 0;
    for (let i = 1; i <= 9; i++) if (k['Digit' + i]) { slot = i; break; }
    return {
      x: this.getHorizontalAxis(),
      y: this.getVerticalAxis(),
      run: !!(k.ShiftLeft || k.ShiftRight),
      fire: !!k.Space,
      use: !!k.KeyE,
      next: !!k.KeyQ,
      porro: !!k.KeyF,
      eat: !!k.KeyC,
      respawn: !!k.Enter,
      slot,
    };
  }
}

// Controles en reposo: jugador sin input (menú abierto, remoto sin datos todavía)
const idleControls = () => ({ x: 0, y: 0, run: false, fire: false, use: false, next: false, porro: false, eat: false, respawn: false, slot: 0 });

// Instancia global e interoperabilidad directa con objeto `keys`
const input = new InputManager();
const keys = input.keys;
