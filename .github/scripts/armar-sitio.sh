#!/usr/bin/env bash
# Arma el sitio publicable (lo que sirve GitHub Pages) con la versión inyectada.
#
# Uso: armar-sitio.sh <version> <directorio destino>
#   - js/constants.js: VERSION = '<version>' (el juego la muestra en pantalla).
#   - index.html: cada <script src="js/...js?v=..."> pasa a ?v=<version>, para que el
#     navegador no mezcle JS cacheado de otra versión.
# Nada de esto se commitea: la versión publicada sale de los tags.
set -euo pipefail

version="${1:?falta version}"
dest="${2:?falta directorio destino}"
raiz="$(cd "$(dirname "$0")/../.." && pwd)"

error() { echo "❌ $*" >&2; exit 1; }

rm -rf "$dest"
mkdir -p "$dest"
cp -r "$raiz/index.html" "$raiz/js" "$raiz/img" "$dest/"

sed -i -E "s/^(const VERSION = )'[^']*'/\1'$version'/" "$dest/js/constants.js"
grep -qF "const VERSION = '$version'" "$dest/js/constants.js" ||
  error "no se encontró 'const VERSION = ...' en js/constants.js"

sed -i -E "s#(src=\"js/[^\"?]+\.js)(\?v=[^\"]*)?\"#\1?v=$version\"#g" "$dest/index.html"
scripts=$(grep -oE 'src="js/[^"]+"' "$dest/index.html" || true)
[ -n "$scripts" ] || error "index.html no carga ningún script de js/"
if grep -vF "?v=$version\"" <<<"$scripts"; then
  error "quedaron scripts sin la versión en index.html"
fi

for f in "$dest"/js/*.js; do node --check "$f"; done
echo "✅ Sitio $version armado en $dest"
