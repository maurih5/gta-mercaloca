# GTA Mercaloca

Juego HTML5 Canvas + JavaScript vanilla, sin build ni dependencias. Se publica estático en GitHub Pages.
Tests: `node --test selfcheck.js` (corre la lógica y el render con stubs de DOM; cada `test()` es un check en la PR).
Uno solo: `node --test --test-name-pattern="<nombre>" selfcheck.js`. Probar en navegador: `python3 -m http.server 8765`.

## Estructura y gotchas

- Sin módulos: los `js/*.js` son scripts globales que comparten scope, en el orden de los `<script>` de
  `index.html`. Un archivo nuevo va ahí **y** en `scriptFiles` de `selfcheck.js` (mismo orden; `touch.js`
  y `main.js` no se cargan en los tests). Un símbolo nuevo que use un test va en el `return {...}` de `selfcheck.js`.
- No commitear cambios de versión: `VERSION` en `js/constants.js`, los `?v=` de `index.html` y
  `js/novedades.js` (queda `NOVEDADES = []`) los inyecta `.github/scripts/armar-sitio.sh` al compilar.
- `js/songs.js` es generado por `node tools/midi2songs.js` desde `music/*.mid`; no editarlo a mano.
- PRs van a `dev` (`dev` → `main` es el release). La etiqueta `feature`/`breaking` define el bump SemVer;
  sin etiqueta es patch. La PR a `dev` tiene que estar al día con `dev` o falla el check "Compilar sitio".

## El juego es multijugador

Todo cambio tiene que funcionar con varios jugadores en la misma partida, también online.
La red está en `js/net.js` (WebRTC P2P con Trystero): el host simula todo y los clientes solo mandan
sus controles y reciben una foto del mundo 20 veces por segundo. Los clientes **no corren `update()`**.

- **No existe `G.player`.** Los jugadores están en `G.players`; `G.me` es el de esta pantalla.
  Lo que es de cada jugador (guita, búsqueda, arresto, hospital, armas, porros, zona) va en el objeto
  del jugador (`entities.makePlayer`), nunca en `G`.
- **`G` es el mundo compartido** (autos, peatones, yuta, balas, pickups) **y la vista local**
  (cámara, temblor, flash, mensajes, mapa, tienda abierta). Lo de la vista es solo de `G.me`.
- **La simulación no lee el teclado.** Cada jugador se maneja con sus controles `P.ctl`
  (`input.readControls()` para el local; los remotos los recibirán por la red). Para detectar
  "recién apretado" se compara con `P.prev`. Si se agrega una acción, va en `readControls` y en `idleControls`.
- **La IA nunca asume un único jugador:** usar `nearestPlayer`, `distToPlayers`, `farFromPlayers`,
  `inPlay` y `driverOf` (js/game.js). La yuta va por su `tgt`; lo que aparece (peatones, autos, canas)
  se reparte alrededor de un jugador con el parámetro `center` y sin aparecer en la pantalla de otro
  (`offscreenForOthers`). Lo que desaparece, solo si ningún jugador lo ve.
- **El daño tiene autor:** balas y granadas llevan `owner` (jugador o `null` si es de un NPC);
  `hurt(e, dmg, by)` le da la guita y la búsqueda a `by`. Con `PVP` los jugadores se lastiman entre sí.
- **Mensajes y temblor son por jugador:** `say(texto, seg, P)`, `shakeFor(P, n)`, `shakeAt(x, y, n)`.
- **Nada frena el mundo con más de un jugador:** sin pausa, el porro no hace cámara lenta,
  y el arresto, el hospital, el mapa y la tienda dejan al jugador quieto mientras el resto sigue.
  Jugando solo se mantiene el comportamiento de siempre (`G.players.length === 1`).
- **Lo que ve el cliente sale de la foto** (`net.snapshot` / `net.applySnap`): si el render o el HUD
  empiezan a leer un campo nuevo de un jugador, auto, peatón, etc., hay que mandarlo ahí.
- **Efectos y avisos ya viajan solos** si se usan los helpers: `boom`, `puff`, `decal`, `sfx`, `shakeAt`,
  `flashAt` llegan a todos; `say(t, s, P)`, `sfxFor`, `shakeFor`, `flashFor` y `openShop` a la pantalla de P.
  No escribir `G.msg`, `G.shake`, `G.flash` ni abrir menús a mano desde la simulación.
- La ciudad sale de una semilla (`buildCity(seed)`): todo lo que se genere al armar el mundo tiene que
  usar `Math.random` adentro de `buildCity`/`bakeGround`, así sale igual en todas las pantallas.
- Los tests de `describe('multijugador')` en selfcheck.js cubren esto: si se agrega una mecánica,
  agregar el caso con dos jugadores. `describe('multijugador online')` conecta un host y un cliente
  (dos copias del juego) por una red en memoria.
