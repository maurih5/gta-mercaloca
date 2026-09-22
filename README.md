# 🔫 GTA MERCALOCA

> **"San Andreas &mdash; Grove St. 4 Life. El barrio es de Mercaloca. Que no te lo saquen."**

Juego estilo GTA top-down retro 2D desarrollado en HTML5 Canvas y JavaScript vanilla. Recorré el barrio, esquivá a la yuta, robá autos, juntá guita y defendé la zona con tu crew.

🎮 **[¡JUGAR ONLINE EN GITHUB PAGES!](https://maurih5.github.io/gta-mercaloca/)**

---

## 🕹️ Controles

| Tecla | Acción |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> | Mover personaje / Conducir vehículo |
| <kbd>Espacio</kbd> | Disparar arma |
| <kbd>E</kbd> | Entrar / Salir de un auto |
| <kbd>Shift</kbd> | Correr (a pie) |
| <kbd>P</kbd> | Pausa |

---

## 👥 Personajes actuales

* **El Smoke**
* **Academia**
* **Palmera**
* **El Jefe**
* **La Piedra**

---

## 🗺️ Roadmap de pendientes

Lista de características planificadas y mejoras en desarrollo:

### 🔊 Audio & Efectos de sonido
- [ ] Agregar efectos de sonido (SFX):
  - [ ] Disparos e impactos de balas
  - [ ] Sirenas de la policía al subir el nivel de búsqueda
  - [ ] Sonido de motores, aceleración, frenadas y choques de autos
  - [ ] Sonido al levantar fajos de guita
- [ ] Música de fondo / radio de los vehículos estilo GTA retro

### 🎭 Personajes & Lore
- [ ] Cambiar y pulir los nombres de los personajes
- [ ] Incorporar nuevos personajes seleccionables
- [ ] **Arma / Ítem especial:** Incorporar el **bastón verde del Ciego Augusto** (arma de combate cuerpo a cuerpo)

### 🌿 Mecánicas & Jugabilidad
- [ ] **Fumarse un porro:**
  - [ ] Efecto "bullet time" (ralentiza el paso del tiempo durante unos segundos)
  - [ ] Efecto visual de gradiente/filtro verde en pantalla
- [ ] **Ítems de curación:**
  - [ ] Consumibles/botiquines en el mapa para recuperar vida

### 📱 Experiencia Móvil
- [x] Soporte para jugar desde el celular:
  - [x] Controles táctiles en pantalla (joystick virtual flotante para movimiento/dirección)
  - [x] Botones de acción táctiles (disparo 🔫, entrar/salir de auto 🚗, correr/sprint ⚡, pausa ⏸)
  - [x] Optimización de viewport, prevención de scroll/zoom no deseado y layout adaptable a pantallas móviles

### 🌐 Multijugador (Multiplayer)
- [ ] Modo multijugador online en tiempo real:
  - [ ] Soporte para salas / lobbies compartidos
  - [ ] Sincronización de jugadores en el mapa (movimiento, autos y disparos)
  - [ ] Cooperativo y PvP barrial

---

## 🚀 Cómo correrlo localmente

No requiere instalación ni dependencias. Simplemente clona el repositorio y abre `index.html` en tu navegador:

```bash
git clone https://github.com/maurih5/gta-mercaloca.git
cd gta-mercaloca
# Abrir directamente en el navegador o iniciar un servidor local:
python3 -m http.server 8000
```
Luego entra a `http://localhost:8000`.
