#!/usr/bin/env bash
# Arma lo que sirve GitHub Pages a partir de los zips adjuntos a los releases (los
# mismos archivos que se compilaron y probaron en cada PR; nada se recompila):
#   /     -> la última versión estable (X.Y.Z)
#   /rc/  -> el último release candidate (X.Y.Z-rc.N)
#
# Uso: armar-pages.sh <directorio destino>
# Requiere los tags en el clone y GH_TOKEN para bajar los assets de los releases.
# Si todavía no hay ninguna estable, la raíz sirve la rama main tal cual (lo que
# publicaba Pages antes de este pipeline).
set -euo pipefail

dest="${1:?falta directorio destino}"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# Tag de mayor versionCode cuyo nombre cumple el patrón (ver version-actual.sh).
ultimo_tag() {
  git for-each-ref refs/tags --format='%(refname:short) %(contents:subject)' |
    sed -nE 's/^([^ ]+) versionCode=([0-9]+)$/\2 \1/p' | sort -n | awk '{print $2}' |
    grep -E "$1" | tail -1 || true
}

# Baja el zip del release <tag> y lo descomprime en <dir>.
extraer() {
  local tag="$1" dir="$2"
  gh release download "$tag" --pattern '*.zip' --dir "$tmp/$tag" --clobber
  mkdir -p "$dir"
  unzip -q "$tmp/$tag"/*.zip -d "$dir"
  echo "✅ $tag en ${dir#"$dest"}/"
}

rm -rf "$dest"
mkdir -p "$dest"

estable=$(ultimo_tag '^[0-9]+\.[0-9]+\.[0-9]+$')
rc=$(ultimo_tag '^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$')

if [ -n "$estable" ]; then
  extraer "$estable" "$dest"
else
  git fetch -q origin main
  git archive origin/main index.html js img | tar -x -C "$dest"
  echo "ℹ️ Todavía no hay una estable: la raíz sirve main tal cual"
fi

if [ -n "$rc" ]; then
  extraer "$rc" "$dest/rc"
else
  echo "ℹ️ Todavía no hay un release candidate: no se publica /rc/"
fi
