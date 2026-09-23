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
}

// Instancia global e interoperabilidad directa con objeto `keys`
const input = new InputManager();
const keys = input.keys;
