#!/usr/bin/env bash
# Versión publicada más reciente, leída de los tags del repo.
#
# Uso: version-actual.sh [versionName_inicial versionCode_inicial]
# Imprime "versionName=..." y "versionCode=...".
#
# El workflow de publicación crea cada tag anotado con el mensaje "versionCode=N";
# la versión vigente es la del tag con el versionCode más alto. La versión NO se
# commitea en el código: el build la inyecta en el artefacto.
#
# Si todavía no hay ningún tag de ese formato (repo nuevo, o migración desde otro
# esquema), se usan los argumentos; sin argumentos, 0.0.0 / 0. En una migración se
# pasa la última versión publicada con el esquema viejo (p. ej. "1.1.2-dev 20109").
#
# Requiere los tags en el clone (checkout con fetch-depth: 0, o git fetch --tags).
set -euo pipefail

inicial_name="${1:-0.0.0}"
inicial_code="${2:-0}"

ultimo=$(git for-each-ref refs/tags --format='%(refname:short) %(contents:subject)' |
  sed -nE 's/^([^ ]+) versionCode=([0-9]+)$/\2 \1/p' | sort -n | tail -1)

if [ -n "$ultimo" ]; then
  echo "versionName=${ultimo#* }"
  echo "versionCode=${ultimo%% *}"
else
  echo "versionName=$inicial_name"
  echo "versionCode=$inicial_code"
fi
