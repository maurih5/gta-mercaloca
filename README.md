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

## 🌐 Jugar online

Hasta **4 jugadores en el mismo barrio**, cada uno desde su compu o su celular. No hace falta servidor ni cuenta.

1. Uno entra a **JUGAR ONLINE → CREAR SALA**, elige personaje y arranca. Arriba aparece el código de la sala (`SALA 7X9HJ`) y el link queda copiado.
2. Los demás abren ese link (o ponen el código en **JUGAR ONLINE**), eligen personaje y caen al lado.

* La guita, las estrellas, los fierros y la yuta son de cada uno. Las balas, las granadas y los autos lastiman a todos (PvP).
* Con otros jugando no hay pausa, el porro no frena el mundo y al morir reaparece solo el que murió.
* **El que crea la sala tiene que dejar el juego abierto**: es el que mueve el mundo de todos. Si cierra, la sala se termina.
* La conexión es directa entre navegadores (WebRTC con [Trystero](https://github.com/dmotz/trystero), que se encuentra por relays públicos de Nostr). En algunas redes muy cerradas (ciertas redes de empresa o de datos móviles) puede no conectar.

---

## 👥 Personajes actuales

* **El Moro**
* **El Ivo**
* **El Ciego Augusto**
* **El Kevin**
* **El Alexis**
* **El Ger**

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

* **Siguen su carril**, centrados entre la raya y el cordón, apuntando a un punto adelante y con radio de giro mínimo: nada de teletransportarse. Aparecen a mitad de cuadra, con lugar adelante y ya andando (nunca adentro de una bocacalle).
* **Doblan con curva**: cerrada a la derecha, abierta a la izquierda, frenando antes y con **guiño**. En la avenida se acomodan en el carril que corresponde (si al lado viene alguien, siguen derecho y doblan en la próxima) y cambian de carril para pasar a uno lento, mirando que el de atrás no venga más rápido.
* **Distancia y frenado (IDM)**: mantienen distancia con el de adelante, que buscan sobre el camino que van a hacer (también en la curva o cambiándose de carril), y frenan suave para el semáforo, la curva o la gente. Paran antes de la cebra. Luces de freno y guiños se ven, también de noche.
* **Reserva de bocacalles**: entran solo con verde, si hay lugar del otro lado y si nadie adentro hace una maniobra que se cruce. Comprometidos no frenan, así la bocacalle se vacía y no se arman nudos. **Para doblar a la izquierda esperan un hueco** entre los que vienen de frente; el que espera mucho reclama su turno.
* **La Diagonal** tiene tránsito en las dos manos y sus bocacalles un **semáforo de tres fases**, con luz propia para la Diagonal. En las puntas se entra y se sale doblando.
* **Rotonda del Obelisco**: sentido antihorario, ceden el paso a los que ya circulan, los dos carriles de la avenida entran de a uno y salen por cualquiera de las cuatro salidas.
* **Cada chofer maneja a su manera**: tranquilo (colectivos y camionetas), normal o picante (taxis y deportivos): velocidad, distancia, si se manda con el amarillo y cuánto toca bocina.
* **Reaccionan como en GTA**:
  * Con **tiros o explosiones** cerca se asustan y salen rajando, sin mirar el semáforo y para el lado contrario. Si están atascados, se bajan y salen corriendo y el auto queda con las **balizas** puestas.
  * Si **los chocás**, tocan bocina y se asustan o **se calientan y te salen a buscar** para chocarte (al que los chocó, no al otro).
  * Pegan un **volantazo** si se les viene un auto encima, y **se tiran al cordón y paran** cuando viene la yuta con sirena.
  * **Esquivan** autos parados usando la mano contraria si viene libre, **pegan la vuelta** en calles cortadas y le tocan **bocina** a quien se planta en la calle.
* **Los autos paran las balas**: la chapa se abolla, humea y, si no da más, revienta. Sirven de cobertura.
* **Robar un auto**: si tiene chofer, lo bajás de una y sale corriendo (y suma búsqueda). Al bajarte, el auto queda donde lo dejaste (rueda si venías andando) y te podés volver a subir sin lío.
* **La yuta** maneja por las calles hacia vos, esquiva el tránsito y te apunta adelante para encajonarte.

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
- [x] Cambiar y pulir los nombres de los personajes (#72)
- [ ] Incorporar nuevos personajes seleccionables (#73)
  - [x] El Ger
- [x] **Arma / Ítem especial:** Incorporar el **bastón verde del Ciego Augusto** (arma de combate cuerpo a cuerpo)
- [x] Sistema base de NPCs con nombre y parodias de famosos: spawn, diálogo, comportamiento único, recompensas y despawn (#9)
  - [x] Parodia de crack del fútbol (Messi): diálogo propio, suelta "balones de oro" (guita) al caer (#10)
  - [x] Parodia de ídolo del fútbol (Maradona): diálogo propio, suelta merca al caer (#11)
  - [x] Parodia de conductor de TV (Marley): deja un rastro de partículas cómico al caminar (#12)
  - [x] Parodia de celebridad de playa (Ricardo Fort): solo aparece en la playa, suelta chocolates (#13)
  - [x] NPC cómico inmortal (Listorti): no se puede eliminar, reacciona con una frase propia a los disparos (#14)
  - [x] Parodia volando en helicóptero (Gaspi): pathing aéreo, aparece como encuentro especial (#2)

### 🌿 Mecánicas & Jugabilidad
- [x] **Ítems de curación:**
  - [x] Consumibles desperdigados por el mapa para recuperar vida (pernil, choripán, mate)
  - [x] Hospitales donde entrar, esperar unos segundos y curarte al 100%
- [x] **Fumarse un porro:**
  - [x] Efecto "bullet time" (ralentiza el paso del tiempo durante unos segundos)
  - [x] Efecto visual de gradiente/filtro verde en pantalla
- [x] Necesidades de hambre y sed: comida, bebida, efectos de estado e inventario (#41)
- [x] Mecánica de asado: combinar carbón + carne + parrilla, tiempo de cocción y resultado consumible (#40)
- [x] Respeto por jugador: robarle el trapo a una barra da respeto y la pone en tu contra (#81)

### 🗺️ Mundo & Ubicaciones
- [x] Ampliar el mapa a 24x24 (#38)
- [x] Riachuelo que cruza el mapa y desemboca en la playa (#39)
  - [x] Agua con profundidad, espuma, corriente y embarcaciones
  - [x] Puentes con estilo propio, veredas, faroles y Transbordador
  - [x] Playas con gente, puestos, guardavidas, vóley y muelles
- [x] IA de autos al estilo GTA: choferes que reaccionan (tiros, choques, sirenas), la Diagonal con semáforo propio, sin choques entre autos ni atascos en el borde del mapa (#92)
- [x] Obelisco como landmark navegable (#33)
- [x] Casa Rosada como landmark, con actividad de NPCs (#34)
- [x] Supermercado CHOTO, parodia de Coto (con carne) (#30)
- [x] Supermercado económico NOCHE %, parodia de Día (sin carne, más barato) (#31)
- [x] Poder robar los supermercados: alarma, botín, testigos, respuesta policial (#32)
- [x] CHOTO de Lanús: sin carne, cartel sin la O, changuitos dados vuelta y un perro durmiendo en la puerta (#35)
- [x] Estadios de los cuatro grandes, con los colores de cada club: LA CHOCOLATERA (BOCA JUNIORES, le falta una tribuna), EL MONUMENTAZO (RIVER PLATO), LOS DEUDORES DE AMERICA (DEPENDIENTE) y EL TERMO (RASIN CLUB)
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
  - [x] Corralito que te saca la mitad de la plata del banco (#79)
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
- [x] Modo multijugador online en tiempo real (#74):
  - [x] Red P2P con WebRTC (el host simula, los demás mandan controles)
  - [x] Soporte para salas / lobbies compartidos
  - [x] Sincronización de jugadores en el mapa (movimiento, autos y disparos)
  - [x] Cooperativo y PvP barrial
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

### Atajos para probar

Agregados a la dirección (por ejemplo `http://localhost:8000/?famoso=messi`):

| Parámetro | Qué hace |
| :--- | :--- |
| `?play` | Arranca directo a jugar, sin menú |
| `?novedades` | Abre el cartel de novedades aunque ya lo hayas tildado. Con datos de verdad: `node .github/scripts/novedades.js local > js/novedades.js` (no commitearlo) |
| `?sala=7X9HJ` | Entra a esa sala online (es el link que se comparte) |
| `?famoso=messi` | Arranca con ese famoso al lado (`listorti`, `messi`, `maradona`, `gaspi`, `conductor`, `fort`) |
| `&h=22` | Hora del día (0-24) |
| `&x=1200&y=800` | Arranca parado en ese punto del mapa |
| `&w=3` | Arranca con ese nivel de búsqueda |

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
