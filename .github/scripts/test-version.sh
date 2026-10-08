#!/usr/bin/env bash
# Tests de calcular-version.sh y version-actual.sh. Sin dependencias: bash y git.
# Uso: bash .github/scripts/test-version.sh   (sale con 1 si algún caso falla)
set -uo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
fallas=0

caso() { # caso <descripción> <esperado> <comando...>
  local desc="$1" esperado="$2"; shift 2
  local obtenido
  obtenido=$("$@" 2>&1 | tr '\n' ' ' | sed 's/ $//')
  if [ "$obtenido" = "$esperado" ]; then
    echo "ok   - $desc"
  else
    echo "FAIL - $desc"; echo "       esperado: $esperado"; echo "       obtenido: $obtenido"
    fallas=$((fallas + 1))
  fi
}
falla() { # falla <descripción> <comando...>: tiene que salir con error
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "FAIL - $desc (no dio error)"; fallas=$((fallas + 1)); else echo "ok   - $desc"; fi
}

cv="$dir/calcular-version.sh"
caso "ciclo nuevo desde estable, bugfix"        "version=1.1.3-rc.1 versionCode=11" bash "$cv" dev bugfix 1.1.2 10
caso "ciclo nuevo desde estable, feature"       "version=1.2.0-rc.1 versionCode=11" bash "$cv" dev feature 1.1.2 10
caso "ciclo nuevo desde estable, breaking"      "version=2.0.0-rc.1 versionCode=11" bash "$cv" dev breaking 1.1.2 10
caso "migración desde sufijo -dev"              "version=1.1.3-rc.1 versionCode=11" bash "$cv" dev bugfix 1.1.2-dev 10
caso "rc en curso, bugfix suma rc"              "version=1.1.3-rc.2 versionCode=12" bash "$cv" dev bugfix 1.1.3-rc.1 11
caso "rc patch, feature sube nivel y reinicia"  "version=1.2.0-rc.1 versionCode=13" bash "$cv" dev feature 1.1.3-rc.2 12
caso "rc minor, bugfix no baja el destino"      "version=1.2.0-rc.2 versionCode=14" bash "$cv" dev bugfix 1.2.0-rc.1 13
caso "rc minor, feature suma rc"                "version=1.2.0-rc.3 versionCode=15" bash "$cv" dev feature 1.2.0-rc.2 14
caso "rc minor, breaking sube nivel"            "version=2.0.0-rc.1 versionCode=16" bash "$cv" dev breaking 1.2.0-rc.3 15
caso "rc major, feature suma rc"                "version=2.0.0-rc.2 versionCode=17" bash "$cv" dev feature 2.0.0-rc.1 16
caso "rc de dos dígitos"                        "version=1.0.1-rc.10 versionCode=21" bash "$cv" dev bugfix 1.0.1-rc.9 20
caso "repo nuevo (0.0.0), feature"              "version=0.1.0-rc.1 versionCode=1"  bash "$cv" dev feature 0.0.0 0
caso "main promueve el rc a estable"            "version=1.2.0 versionCode=21"      bash "$cv" main x 1.2.0-rc.4 20
caso "main promueve un -dev viejo"              "version=1.1.2 versionCode=11"      bash "$cv" main x 1.1.2-dev 10
falla "main sin rc nuevo"                       bash "$cv" main x 1.2.0 21
falla "tipo inválido"                           bash "$cv" dev raro 1.2.0 21
falla "versión mal formada"                     bash "$cv" dev bugfix 1.2 5
falla "versionCode no numérico"                 bash "$cv" dev bugfix 1.2.0 abc
falla "destino inválido"                        bash "$cv" qa bugfix 1.2.0 5

# version-actual.sh en un repo temporal con tags.
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
(
  cd "$tmp" && git init -q . && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m inicial
) >/dev/null
va() { (cd "$tmp" && bash "$dir/version-actual.sh" "$@"); }
caso "sin tags: valores iniciales por defecto"   "versionName=0.0.0 versionCode=0"         va
caso "sin tags: valores iniciales recibidos"     "versionName=1.1.2-dev versionCode=20109" va 1.1.2-dev 20109
(cd "$tmp" && git tag 1.0.0-dev && git -c user.name=t -c user.email=t@t tag -a viejo -m "release viejo")
caso "ignora tags livianos y anotados sin versionCode" "versionName=0.0.0 versionCode=0"   va
(cd "$tmp" && for t in "1.1.3-rc.1 20110" "1.2.0-rc.1 20112" "1.1.3-rc.2 20111"; do
  set -- $t; git -c user.name=t -c user.email=t@t tag -a "$1" -m "versionCode=$2"; done)
caso "toma el tag con mayor versionCode"         "versionName=1.2.0-rc.1 versionCode=20112" va 9.9.9 1

echo
if [ "$fallas" -gt 0 ]; then echo "❌ $fallas caso(s) fallaron"; exit 1; fi
echo "✅ todos los casos pasaron"
