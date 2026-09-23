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
    this.stickZone = null;
    this.stickBase = null;
    this.stickThumb = null;
    this.toggleBtn = null;
    this.isTouch = false;
    this.forceVisible = false;

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
    this.toggleBtn = document.getElementById('btn-toggle-touch');

    if (!this.container || !this.stickZone || !this.stickBase || !this.stickThumb) return;

    this.bindJoystick();
    this.bindButtons();
    this.bindGlobalTouch();
    this.updateVisibility();
  }

  updateVisibility() {
    if (!this.container) return;
    const inGame = typeof G !== 'undefined' && G.state === 'play';
    const shouldShow = (inGame || this.forceVisible) && (this.isTouch || this.forceVisible);

    if (shouldShow) {
      this.container.style.display = 'block';
      this.container.classList.add('active');
    } else {
      this.container.style.display = 'none';
      this.container.classList.remove('active');
    }
  }

  resetStickPosition() {
    if (!this.stickBase || !this.stickThumb) return;
    this.stickBase.style.left = '80px';
    this.stickBase.style.top = 'auto';
    this.stickBase.style.bottom = '80px';
    this.stickBase.classList.remove('moving');
    this.stickThumb.style.transform = 'translate(-50%, -50%)';
    input.touchAxis.x = 0;
    input.touchAxis.y = 0;
    keys.KeyW = false;
    keys.KeyS = false;
    keys.KeyA = false;
    keys.KeyD = false;
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

          const posX = clamp(touch.clientX, rect.left + this.maxRadius, rect.right - this.maxRadius);
          const posY = clamp(touch.clientY, rect.top + this.maxRadius, rect.bottom - this.maxRadius);

          this.stickCenter = { x: posX, y: posY };
          base.style.left = posX + 'px';
          base.style.top = posY + 'px';
          base.style.bottom = 'auto';
          base.classList.add('moving');

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
          this.resetStickPosition();
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

    // Mapa global
    bindBtn(
      'btn-map',
      () => {
        if (!G.paused) G.mapOpen = !G.mapOpen;
      },
      () => {}
    );

    // Zoom del mapa (mismo mecanismo que las teclas +/-)
    bindBtn('btn-zoom-in', () => { keys.Equal = true; }, () => { keys.Equal = false; });
    bindBtn('btn-zoom-out', () => { keys.Minus = true; }, () => { keys.Minus = false; });

    // Botón manual de toggle en pantalla
    if (this.toggleBtn) {
      this.toggleBtn.onclick = e => {
        e.preventDefault();
        this.forceVisible = !this.forceVisible;
        if (this.forceVisible) this.isTouch = true;
        this.updateVisibility();
      };
    }
  }

  syncMapButtons() {
    const z = document.getElementById('touch-zoom');
    if (z) z.classList.toggle('show', !!(typeof G !== 'undefined' && G.mapOpen));
  }

  bindGlobalTouch() {
    // Al tocar la pantalla tras morir, reiniciar la partida
    addEventListener('touchstart', () => {
      if (G.player && G.player.dead) {
        startGame(G.player.def);
      }
    }, { passive: true });

    // Habilitar controles si se detecta cualquier toque
    addEventListener('touchstart', () => {
      if (!this.isTouch) {
        this.isTouch = true;
        this.updateVisibility();
      }
    }, { once: true, passive: true });
  }
}

const touchController = new TouchController();
