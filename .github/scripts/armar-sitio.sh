#!/usr/bin/env bash
# Arma el sitio publicable (lo que sirve GitHub Pages) con la versión inyectada.
#
# Uso: armar-sitio.sh <version> <directorio destino>
#   - js/constants.js: VERSION = '<version>' (el juego la muestra en pantalla).
#   - index.html: cada <script src="js/...js?v=..."> pasa a ?v=<version>, para que el
#     navegador no mezcle JS cacheado de otra versión.
#   - js/novedades.js: las novedades que el juego muestra al arrancar, con los títulos
#     de las PRs (ver novedades.js). Si se pasan NOVEDADES_PR y NOVEDADES_TITULO (la PR
#     a dev que se está compilando), esa PR entra como novedad de esta versión.
# Nada de esto se commitea: la versión publicada sale de los tags.
set -euo pipefail

version="${1:?falta version}"
dest="${2:?falta directorio destino}"
raiz="$(cd "$(dirname "$0")/../.." && pwd)"

error() { echo "❌ $*" >&2; exit 1; }

rm -rf "$dest"
mkdir -p "$dest"
cp -r "$raiz/index.html" "$raiz/js" "$raiz/img" "$dest/"
# Los temas grabados de la radio (los .mid ya están en js/songs.js, no hace falta subirlos)
if [ -d "$raiz/music" ]; then
  mkdir -p "$dest/music"
  find "$raiz/music" -maxdepth 1 -type f \( -iname '*.ogg' -o -iname '*.mp3' -o -iname '*.m4a' -o -iname '*.wav' \) -exec cp {} "$dest/music/" \;
fi

sed -i -E "s/^(const VERSION = )'[^']*'/\1'$version'/" "$dest/js/constants.js"
grep -qF "const VERSION = '$version'" "$dest/js/constants.js" ||
  error "no se encontró 'const VERSION = ...' en js/constants.js"

sed -i -E "s#(src=\"js/[^\"?]+\.js)(\?v=[^\"]*)?\"#\1?v=$version\"#g" "$dest/index.html"
scripts=$(grep -oE 'src="js/[^"]+"' "$dest/index.html" || true)
[ -n "$scripts" ] || error "index.html no carga ningún script de js/"
if grep -vF "?v=$version\"" <<<"$scripts"; then
  error "quedaron scripts sin la versión en index.html"
fi

(cd "$raiz" && node .github/scripts/novedades.js "$version" "${NOVEDADES_PR:-}" "${NOVEDADES_TITULO:-}") \
  > "$dest/js/novedades.js"
grep -q "^const NOVEDADES = " "$dest/js/novedades.js" || error "no se generó js/novedades.js"
grep -qF 'src="js/novedades.js' "$dest/index.html" || error "index.html no carga js/novedades.js"

for f in "$dest"/js/*.js; do node --check "$f"; done
echo "✅ Sitio $version armado en $dest"
