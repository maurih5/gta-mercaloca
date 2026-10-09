/* =========================================================================
   GTA MERCALOCA - Manejo de Entrada / Teclado
   ========================================================================= */

class InputManager {
  constructor() {
    this.keys = {};
    this.touchAxis = { x: 0, y: 0 };
    this.wheel = 0;
    this._preventCodes = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
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
    }
  }

  onWheel(e) {
    if (typeof G !== 'undefined' && G.mapOpen) e.preventDefault();
    this.wheel += e.deltaY;
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
      respawn: !!k.Enter,
      slot,
    };
  }
}

// Controles en reposo: jugador sin input (menú abierto, remoto sin datos todavía)
const idleControls = () => ({ x: 0, y: 0, run: false, fire: false, use: false, next: false, porro: false, respawn: false, slot: 0 });

// Instancia global e interoperabilidad directa con objeto `keys`
const input = new InputManager();
const keys = input.keys;
