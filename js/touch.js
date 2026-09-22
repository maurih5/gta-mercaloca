/* =========================================================================
   GTA MERCALOCA - Controles Táctiles para Dispositivos Móviles (Celulares/Tablets)
   ========================================================================= */

class TouchController {
  constructor() {
    this.active = false;
    this.stickTouchId = null;
    this.stickCenter = { x: 0, y: 0 };
    this.maxRadius = 46;
    this.container = null;
    this.stickBase = null;
    this.stickThumb = null;
    this.isTouch = false;

    if (typeof window !== 'undefined') {
      this.detectTouch();
      if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
          this.init();
        }
      }
    }
  }

  detectTouch() {
    this.isTouch = (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      window.innerWidth <= 1024
    );
  }

  init() {
    this.container = document.getElementById('touch-controls');
    this.stickZone = document.getElementById('touch-zone-stick');
    this.stickBase = document.getElementById('stick-base');
    this.stickThumb = document.getElementById('stick-thumb');

    if (!this.container || !this.stickZone || !this.stickBase || !this.stickThumb) return;

    // Mostrar controles si es dispositivo táctil o pantalla pequeña
    if (this.isTouch) {
      this.container.classList.add('active');
    }

    this.bindJoystick();
    this.bindButtons();
    this.bindGlobalTouch();
  }

  bindJoystick() {
    const zone = this.stickZone;
    const base = this.stickBase;
    const thumb = this.stickThumb;

    const handleStart = e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.stickTouchId === null) {
          this.stickTouchId = touch.identifier;
          const rect = zone.getBoundingClientRect();

          // Centrar el joystick donde el usuario tocó dentro de la zona
          const posX = clamp(touch.clientX, rect.left + this.maxRadius, rect.right - this.maxRadius);
          const posY = clamp(touch.clientY, rect.top + this.maxRadius, rect.bottom - this.maxRadius);

          this.stickCenter = { x: posX, y: posY };
          base.style.left = posX + 'px';
          base.style.top = posY + 'px';
          base.classList.add('visible');

          thumb.style.transform = 'translate(-50%, -50%)';
          this.updateStick(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const handleMove = e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.stickTouchId) {
          this.updateStick(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const handleEnd = e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.stickTouchId) {
          this.stickTouchId = null;
          thumb.style.transform = 'translate(-50%, -50%)';
          base.classList.remove('visible');
          input.touchAxis.x = 0;
          input.touchAxis.y = 0;
          keys.KeyW = false;
          keys.KeyS = false;
          keys.KeyA = false;
          keys.KeyD = false;
          break;
        }
      }
    };

    zone.addEventListener('touchstart', handleStart, { passive: false });
    zone.addEventListener('touchmove', handleMove, { passive: false });
    zone.addEventListener('touchend', handleEnd, { passive: false });
    zone.addEventListener('touchcancel', handleEnd, { passive: false });
  }

  updateStick(clientX, clientY) {
    const dx = clientX - this.stickCenter.x;
    const dy = clientY - this.stickCenter.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, this.maxRadius);
    const offsetX = Math.cos(angle) * clampedDist;
    const offsetY = Math.sin(angle) * clampedDist;

    this.stickThumb.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;

    const normX = clampedDist > 8 ? offsetX / this.maxRadius : 0;
    const normY = clampedDist > 8 ? offsetY / this.maxRadius : 0;

    input.touchAxis.x = normX;
    input.touchAxis.y = normY;

    // Actualizar también códigos de teclas para compatibilidad
    keys.KeyD = normX > 0.25;
    keys.KeyA = normX < -0.25;
    keys.KeyS = normY > 0.25;
    keys.KeyW = normY < -0.25;
  }

  bindButtons() {
    const bindBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;

      const down = e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('pressed');
        onDown();
      };
      const up = e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('pressed');
        onUp();
      };

      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };

    // Disparo
    bindBtn(
      'btn-fire',
      () => { keys.Space = true; },
      () => { keys.Space = false; }
    );

    // Entrar / Salir de auto
    bindBtn(
      'btn-car',
      () => {
        keys.KeyE = true;
        setTimeout(() => { keys.KeyE = false; }, 200);
      },
      () => { keys.KeyE = false; }
    );

    // Correr / Turbo
    bindBtn(
      'btn-run',
      () => {
        keys.ShiftLeft = true;
        keys.ShiftRight = true;
      },
      () => {
        keys.ShiftLeft = false;
        keys.ShiftRight = false;
      }
    );

    // Pausa
    bindBtn(
      'btn-pause',
      () => {
        G.paused = !G.paused;
      },
      () => {}
    );
  }

  bindGlobalTouch() {
    // Al tocar la pantalla tras morir, reiniciar la partida automáticamente
    addEventListener('touchstart', () => {
      if (G.player && G.player.dead) {
        startGame(G.player.def);
      }
    }, { passive: true });

    // Habilitar controles si se detecta cualquier toque en la ventana
    addEventListener('touchstart', () => {
      if (!this.container.classList.contains('active')) {
        this.container.classList.add('active');
        this.isTouch = true;
      }
    }, { once: true, passive: true });
  }
}

const touchController = new TouchController();
