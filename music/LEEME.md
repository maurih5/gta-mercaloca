# Música de la radio

Los temas de la radio de los autos van en esta carpeta. Hay dos formas de sumarlos.

## Grabados: `.ogg` o `.mp3`

Suenan tal cual, con cualquier instrumento o voz. Pesan más (1-2 MB por tema en `.ogg`).

1. Exportá el tema desde tu programa (LMMS, BeepBox, Audacity...) como `.ogg` o `.mp3`.
2. Copialo acá, por ejemplo `music/cumbia-villera-1.ogg`.
3. Sumalo a una emisora en `STATIONS` (`js/radio.js`) con el nombre del archivo:
   ```js
   { name: 'FM LA CUMBIANCHA', songs: ['cumbia-del-riachuelo', 'cumbia-villera-1.ogg'] },
   ```

## Sintetizados: `.mid`

El juego toca las notas con su sintetizador (estilo 8 bits). Pesan casi nada.

1. Exportá el tema como MIDI (en [BeepBox](https://www.beepbox.co): *Export* → *.mid*).
2. Copialo acá, por ejemplo `music/rock-barrial.mid`.
3. Convertilo:
   ```bash
   node tools/midi2songs.js
   ```
   Eso regenera `js/songs.js` con todos los `.mid` de esta carpeta.
4. Sumalo a una emisora en `STATIONS` con el nombre sin extensión: `'rock-barrial'`.

Del MIDI se usa el instrumento de cada canal para elegir la onda (bajos → triangular,
guitarras y cuerdas → diente de sierra, el resto → cuadrada) y el canal 10 como batería.
El tempo es el primero del archivo: si el tema cambia de tempo, va a sonar parejo.

## Temas escritos a mano

También se pueden escribir directo en `js/radio.js` con notas (`'A4:1'` es un la de un
tiempo, `'-:0.5'` medio tiempo de silencio). Así están hechos los dos temas que vienen.

Solo temas propios o libres: nada con derechos de autor.
