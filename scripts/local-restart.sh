#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf 'Restarting Meten through the safe local process manager.\n'
"$ROOT_DIR/scripts/meten-local.sh" stop
"$ROOT_DIR/scripts/meten-local.sh" start "$@"
