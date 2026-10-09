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
| <kbd>E</kbd> | Entrar / Salir de un auto · Entrar a la armería (en la puerta) |
| <kbd>Q</kbd> / <kbd>1</kbd>-<kbd>6</kbd> | Cambiar de arma |
| <kbd>F</kbd> | Fumarse un porro (cámara lenta) |
| <kbd>Shift</kbd> | Correr (a pie) |
| <kbd>M</kbd> | Mapa global |
| <kbd>+</kbd> <kbd>-</kbd> | Zoom del mapa (con el mapa abierto) |
| <kbd>P</kbd> | Pausa (solo jugando solo) |
| <kbd>N</kbd> | Prender / apagar el sonido |
| <kbd>R</kbd> | Cambiar de emisora / apagar la radio (manejando) |

---

## 👥 Personajes actuales

* **El Smoke**
* **Academia**
* **Palmera**
* **El Jefe**
* **La Piedra**

---

## 🔫 Armas y armerías

| # | Arma | Detalle |
| :--- | :--- | :--- |
| 1 | **Bastón del Ciego** | Cuerpo a cuerpo, empuja al que le pegás |
| 2 | **Pistola 9mm** | Arma inicial, balas infinitas |
| 3 | **Escopeta** | 6 perdigones, corto alcance. La yuta a veces la suelta |
| 4 | **Uzi** | Ráfaga rápida, ideal desde el auto |
| 5 | **AK-47** | Pega fuerte y llega lejos |
| 6 | **Granadas** | Explotan en área y revientan autos (con reacción en cadena) |

* Hay **fierros tirados por el mapa** (brillo amarillo, punto amarillo en el radar).
* Hay **5 armerías** "Fierros del Barrio" (cartel rojo **ARMAS** en el techo, ícono naranja en el radar). Ahí se compran armas, balas y **chaleco antibalas**.
* Con 2 estrellas o más el armero no te atiende.
* Si te agarra la yuta, te sacan los fierros y el chaleco.

---

## 🏚️ Villas y tranzas

Hay dos villas en el mapa: **Villa La Chapita** (sudoeste) y **Villa El Fierro** (noreste). Tienen casillas de chapa y ladrillo, calles de tierra con charcos, pasillos, ropa colgada, tachos prendidos y un potrero.

* **La yuta a pie no entra.** Adentro la búsqueda baja el doble de rápido. Los patrulleros sí pueden entrar por las calles.
* **Tranzas** en las esquinas (violeta en el radar). Con <kbd>E</kbd> les comprás **porros**, una **Uzi** usada y **granadas**. Atienden aunque te busque la yuta, pero más caro que la armería.
* **Si atacás a un tranza se pudre toda la villa:** los demás te cagan a tiros durante un rato (rojos en el radar). Si los bajás, sueltan guita y a veces la Uzi.

### 🌿 Porro
Con <kbd>F</kbd> (o el botón 🌿) el mundo va en cámara lenta durante 7 segundos mientras vos te movés y disparás a velocidad normal. La pantalla se pone verde y recuperás un poco de vida. Entran 5 en el bolsillo.

---

## 🚦 Tránsito

Los autos manejan con volante y frenos de verdad (`js/traffic.js`):

* **Siguen su carril** apuntando a un punto adelante, con radio de giro mínimo: nada de teletransportarse.
* **Doblan con curva**: cerrada a la derecha, abierta a la izquierda, frenando antes y con **guiño**. En la avenida se acomodan en el carril que corresponde y cambian de carril para pasar a uno lento.
* **Distancia y frenado (IDM)**: mantienen distancia con el de adelante y frenan suave para el semáforo, la curva o la gente. Luces de freno y guiños se ven, también de noche.
* **Reserva de bocacalles**: entran solo con verde, si hay lugar del otro lado y si nadie adentro hace una maniobra que se cruce. Comprometidos no frenan, así la bocacalle se vacía y no se arman nudos. El que espera mucho (ej. doblar a la izquierda contra un chorro de autos) reclama su turno.
* **Rotonda del Obelisco**: sentido antihorario, ceden el paso a los que ya circulan y salen por cualquiera de las cuatro salidas.
* **Esquivan** autos parados o patrulleros usando la mano contraria si viene libre, **pegan la vuelta** en calles cortadas, **se tiran al cordón** cuando viene un patrullero con sirena y le tocan bocina a quien se planta en la calle.

---

## 🌊 Riachuelo y playas

El Riachuelo cruza el mapa con meandros y desemboca en la playa grande.

* **Agua con profundidad**: orilla barrosa y verdosa, centro hondo, espuma que corre por la orilla y destellos que siguen la corriente (también de noche).
* **Embarcaciones**: lanchas, botes, remolcadores y barcazas con estela, y camalotes, basura y patos a la deriva.
* **Puentes con estilo propio**: atirantado blanco en la 9 de Julio, reticulados verde, celeste y rojo, puentes de hormigón con miradores y el **Transbordador** cerca de la desembocadura. Tienen veredas, faroles y pilas con espuma, y aparecen en el minimapa.
* **Playas con vida**: arena mojada y seca con médanos, sombrillas, reposeras, toallas con gente tomando sol, puestos de choripán, torres de guardavidas, cancha de vóley, fogones, carpas, kayaks y muelles con pescadores.

---

## 🗺️ Roadmap de pendientes

Lista de características planificadas y mejoras en desarrollo. Cada ítem linkea al issue correspondiente:

### 🔊 Audio & Efectos de sonido
- [x] Agregar efectos de sonido (SFX) (#70):
  - [x] Disparos e impactos de balas
  - [x] Sirenas de la policía al subir el nivel de búsqueda
  - [x] Sonido de motores, aceleración, frenadas y choques de autos
  - [x] Sonido al levantar fajos de guita
- [x] Música de fondo / radio de los vehículos estilo GTA retro (#71)

### 🎭 Personajes & Lore
- [ ] Cambiar y pulir los nombres de los personajes (#72)
- [ ] Incorporar nuevos personajes seleccionables (#73)
- [x] **Arma / Ítem especial:** Incorporar el **bastón verde del Ciego Augusto** (arma de combate cuerpo a cuerpo)
- [ ] Sistema base de NPCs con nombre y parodias de famosos: spawn, diálogo, comportamiento único, recompensas y despawn (#9)
  - [ ] Parodia de crack del fútbol (Messi): diálogo propio, suelta "balones de oro" (guita) al caer (#10)
  - [ ] Parodia de ídolo del fútbol (Maradona): diálogo propio, suelta merca al caer (#11)
  - [ ] Parodia de conductor de TV (Marley): deja un rastro de partículas cómico al caminar (#12)
  - [ ] Parodia de celebridad de playa (Ricardo Fort): solo aparece en la playa, suelta chocolates (#13)
  - [ ] NPC cómico inmortal (Listorti): no se puede eliminar, reacciona con una frase propia a los disparos (#14)
  - [ ] Parodia volando en helicóptero (Gaspi): pathing aéreo, aparece como encuentro especial (#2)

### 🌿 Mecánicas & Jugabilidad
- [x] **Ítems de curación:**
  - [x] Consumibles desperdigados por el mapa para recuperar vida (pernil, choripán, mate)
  - [x] Hospitales donde entrar, esperar unos segundos y curarte al 100%
- [x] **Fumarse un porro:**
  - [x] Efecto "bullet time" (ralentiza el paso del tiempo durante unos segundos)
  - [x] Efecto visual de gradiente/filtro verde en pantalla
- [ ] Necesidades de hambre y sed: comida, bebida, efectos de estado e inventario (#41)
- [ ] Mecánica de asado: combinar carbón + carne + parrilla, tiempo de cocción y resultado consumible (#40)
- [ ] Respeto por jugador: robarle el trapo a una barra da respeto y la pone en tu contra (#81)

### 🗺️ Mundo & Ubicaciones
- [x] Ampliar el mapa a 24x24 (#38)
- [x] Riachuelo que cruza el mapa y desemboca en la playa (#39)
  - [x] Agua con profundidad, espuma, corriente y embarcaciones
  - [x] Puentes con estilo propio, veredas, faroles y Transbordador
  - [x] Playas con gente, puestos, guardavidas, vóley y muelles
- [x] Obelisco como landmark navegable (#33)
- [x] Casa Rosada como landmark, con actividad de NPCs (#34)
- [ ] Supermercado Coto (con carne) (#30)
- [ ] Supermercado económico estilo Día (sin carne, más barato) (#31)
- [ ] Poder robar los supermercados: alarma, botín, testigos, respuesta policial (#32)
- [ ] Supermercado de Lanús con detalle cómico distintivo (#35)
- [ ] Casas personales personalizables: interior, guardado, mejoras (#28)
- [ ] Autos personales: propiedad, guardado, personalización, recuperación (#29)
- [ ] Bares como lugar social: pedidos, NPCs, minijuegos, reputación (#36)
- [ ] Bolichos/lugares nocturnos más chicos: música, gente bailando (#37)
- [ ] Casino jugable (#3)

### 🎮 Modos de juego
- [ ] Invasión zombie por oleadas, con dificultad creciente (#7)
  - [ ] Mejoras de barricadas y armas entre oleadas (#75)
- [ ] Variante de invasión de carpinchos zombies (#8)
- [ ] Toma y control de territorios (#4)
- [ ] Ranking global con score (#5)

### 🎲 Eventos aleatorios
- [ ] Sistema de eventos aleatorios en el mundo abierto: piquetes, cortes de luz, operativos policiales, festejos, corralito, guerra de bandas, etc. (#6)
  - [ ] Rugbiers que te persiguen y te cagan a palos (#76)
  - [ ] Tren que descarrila y corta calles (#77)
  - [ ] Festejos del Mundial en el Obelisco (#78)
  - [ ] Corralito que te saca la mitad de la guita (#79)
  - [ ] Operativo policial en tu casa (#80)

### 📜 Misiones
- [ ] Buscar a un personaje escondido en el mapa, vestido de "Wally" (#16)
- [ ] Misión coleccionable: encontrar las manos de Perón (#17)
- [ ] Recuperar una base militar en Tierra del Fuego (#18)
- [ ] Carreras callejeras: rutas, checkpoints, largada, rivales (#19)
- [ ] Cortar la General Paz: objetivos, respuesta policial escalable (#20)
- [ ] Correr a famosos por guita (misiones de persecución) (#21)
- [ ] Carrera estilo Fórmula 1 con piloto joven parodiado (#22)
- [ ] Misión con auto deportivo y expresidente parodiado (#23)
- [ ] Misión de manejo caótico: NPC músico que choca todo (#24)
- [ ] Llevar cables trifásicos a una antena (#25)
- [ ] Reparar una cafetera y trasladar al NPC a una cabaña (#26)
- [ ] Misterio de investigación ficticio ambientado en un baño (#27)

### 📱 Experiencia Móvil
- [x] Soporte para jugar desde el celular:
  - [x] Controles táctiles en pantalla (joystick virtual flotante para movimiento/dirección)
  - [x] Botones de acción táctiles (disparo 🔫, entrar/salir de auto 🚗, correr/sprint ⚡, pausa ⏸)
  - [x] Optimización de viewport, prevención de scroll/zoom no deseado y layout adaptable a pantallas móviles

### 🌐 Multijugador (Multiplayer)
- [x] Base multijugador: el juego simula varios jugadores en la misma partida (guita, búsqueda, armas y arresto por jugador; IA, yuta y spawns que reparten entre todos; daño con autor y PvP)
- [ ] Modo multijugador online en tiempo real (#74):
  - [ ] Red P2P con WebRTC (el host simula, los demás mandan controles)
  - [ ] Soporte para salas / lobbies compartidos
  - [ ] Sincronización de jugadores en el mapa (movimiento, autos y disparos)
  - [ ] Cooperativo y PvP barrial
- [ ] Sesiones multijugador en bares: reglas de sesión, fuego amigo, moderación, respawn (#15)

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

### Tests

```bash
node --test selfcheck.js
```

Corre el juego headless (mundo, semáforos, 60 s de simulación, arresto, hospital...).
En cada PR cada test aparece como un check propio.

### Música de la radio

Los temas van en `music/`: grabados (`.ogg`/`.mp3`) o en MIDI, que el juego sintetiza.
Cómo sumarlos a una emisora: [music/LEEME.md](music/LEEME.md).

---

## 📦 Versiones y releases

La versión **no se escribe en el código**: vive en tags `X.Y.Z` y el build la inyecta en
el juego (se ve en el menú) y en los `?v=` de `index.html`.

1. Las PRs van a **`dev`**. Etiquetá la PR con `bugfix` (default), `feature` o `breaking`.
2. Para mergear tienen que pasar los checks `test` y `Compilar sitio`, y la PR tiene que
   estar al día con `dev`. El check `Compilar sitio` arma el zip con la versión definitiva.
3. Al mergear a `dev` se publica ese mismo zip como **release candidate** (`0.2.0-rc.1`)
   y se juega en **https://maurih5.github.io/gta-mercaloca/rc/**.
4. La PR **`dev` → `main`** publica la **estable** (`0.2.0`) en
   **https://maurih5.github.io/gta-mercaloca/**.

Cada release en GitHub tiene adjunto el zip del sitio.
