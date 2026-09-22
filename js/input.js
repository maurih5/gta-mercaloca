/* =========================================================================
   GTA MERCALOCA - Manejo de Entrada / Teclado
   ========================================================================= */

class InputManager {
  constructor() {
    this.keys = {};
    this._preventCodes = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    this._boundDown = this.onKeyDown.bind(this);
    this._boundUp = this.onKeyUp.bind(this);
    this.attach();
  }

  attach() {
    if (typeof addEventListener !== 'undefined') {
      addEventListener('keydown', this._boundDown);
      addEventListener('keyup', this._boundUp);
    }
  }

  detach() {
    if (typeof removeEventListener !== 'undefined') {
      removeEventListener('keydown', this._boundDown);
      removeEventListener('keyup', this._boundUp);
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
    return (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) -
           (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
  }

  getVerticalAxis() {
    return (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) -
           (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0);
  }
}

// Instancia global e interoperabilidad directa con objeto `keys`
const input = new InputManager();
const keys = input.keys;
