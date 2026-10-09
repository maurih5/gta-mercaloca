# GTA Mercaloca

Juego HTML5 Canvas + JavaScript vanilla, sin build ni dependencias. Se publica estático en GitHub Pages.
Tests: `node --test selfcheck.js` (corre la lógica y el render con stubs de DOM; cada `test()` es un check en la PR).

## El juego es multijugador

Todo cambio tiene que funcionar con varios jugadores en la misma partida, aunque hoy se juegue solo.
La red (WebRTC P2P, el host simula y los demás mandan controles) todavía no está; el modelo ya está preparado para ella.

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
- Los tests de `describe('multijugador')` en selfcheck.js cubren esto: si se agrega una mecánica,
  agregar el caso con dos jugadores.
