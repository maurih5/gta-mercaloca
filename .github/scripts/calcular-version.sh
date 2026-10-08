#!/usr/bin/env bash
# Calcula versionName/versionCode del artefacto a publicar.
#
# Uso: calcular-version.sh <destino> <tipo> <versionName actual> <versionCode actual>
#   destino: dev  -> release candidate X.Y.Z-rc.N
#            main -> release estable X.Y.Z (promueve el rc vigente de dev)
#   tipo:    bugfix | feature | breaking (etiqueta de la PR; solo aplica a dev)
#   versionName/versionCode actuales: la última versión publicada, según los tags
#   (salida de version-actual.sh).
#
# Imprime "version=..." y "versionCode=..." (formato de $GITHUB_OUTPUT).
#
# Ciclo de versiones en dev:
#   - Si la última publicada es estable (X.Y.Z, recién publicada en main) o tiene el
#     sufijo viejo -dev, arranca un ciclo nuevo: se sube X.Y.Z según el tipo y
#     se empieza en rc.1.
#   - Si hay un rc en curso (X.Y.Z-rc.N), un cambio del mismo nivel o
#     menor suma 1 al rc; uno de mayor nivel cambia la versión destino y
#     reinicia en rc.1. El nivel ya alcanzado se deduce de la versión destino
#     (X.Y.0 ya es al menos feature, X.0.0 ya es breaking).
#   Ej. desde 1.1.2: bugfix 1.1.3-rc.1, bugfix 1.1.3-rc.2, feature 1.2.0-rc.1,
#       bugfix 1.2.0-rc.2; main publica 1.2.0; bugfix 1.2.1-rc.1.
#
# versionCode siempre es el actual + 1: como las PRs a dev tienen que estar al día
# y el build espera a las publicaciones en curso, crece en el orden en que se publica.
set -euo pipefail

destino="${1:?falta destino (dev|main)}"
tipo="${2:-bugfix}"
version_actual="${3:?falta versionName actual}"
code_actual="${4:?falta versionCode actual}"

error() { echo "❌ $*" >&2; exit 1; }

[[ "$code_actual" =~ ^[0-9]+$ ]] || error "versionCode '$code_actual' no es numérico"
re='^([0-9]+)\.([0-9]+)\.([0-9]+)(-dev|-rc\.([0-9]+))?$'
[[ "$version_actual" =~ $re ]] ||
  error "versionName '$version_actual' no tiene el formato esperado X.Y.Z, X.Y.Z-rc.N o X.Y.Z-dev"
major=${BASH_REMATCH[1]}
minor=${BASH_REMATCH[2]}
patch=${BASH_REMATCH[3]}
sufijo=${BASH_REMATCH[4]}
rc=${BASH_REMATCH[5]}

case "$destino" in
  dev)
    case "$tipo" in bugfix|feature|breaking) ;; *) error "tipo de release '$tipo' inválido" ;; esac
    if [[ "$sufijo" == -rc.* ]]; then
      # Ciclo en curso: ¿el cambio sube el nivel de la versión destino?
      sube=false
      case "$tipo" in
        feature)  (( patch != 0 )) && sube=true ;;
        breaking) (( minor != 0 || patch != 0 )) && sube=true ;;
      esac
      if $sube; then
        rc=1
      else
        rc=$(( rc + 1 ))
        tipo=ninguno
      fi
    else
      rc=1
    fi
    case "$tipo" in
      bugfix)   patch=$(( patch + 1 )) ;;
      feature)  minor=$(( minor + 1 )); patch=0 ;;
      breaking) major=$(( major + 1 )); minor=0; patch=0 ;;
    esac
    version="$major.$minor.$patch-rc.$rc"
    ;;
  main)
    [[ -n "$sufijo" ]] ||
      error "la última versión publicada es la estable $version_actual: no hay un release candidate nuevo para publicar"
    version="$major.$minor.$patch"
    ;;
  *)
    error "destino '$destino' inválido (dev|main)"
    ;;
esac

echo "version=$version"
echo "versionCode=$(( code_actual + 1 ))"
