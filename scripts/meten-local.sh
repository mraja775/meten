#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
PID_FILE="$RUN_DIR/backend.pid"
LOG_FILE="$RUN_DIR/backend.log"
APP_PORT="${APP_PORT:-3000}"
ACTION="${1:-help}"
SEED="false"

if [ "${2:-}" = "--seed" ]; then
  SEED="true"
fi

log() { printf '\n==> %s\n' "$1"; }
die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required. Run ./scripts/meten-doctor.sh for details."
}

backend_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-45}"
  local count=1
  while [ "$count" -le "$attempts" ]; do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done
  return 1
}

start() {
  require_command node
  require_command npm
  require_command docker
  require_command curl

  cd "$ROOT_DIR"
  mkdir -p "$RUN_DIR"

  if backend_running; then
    printf 'Meten backend is already running with PID %s.\n' "$(cat "$PID_FILE")"
    status
    return
  fi

  if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
  fi

  if command -v lsof >/dev/null 2>&1 && lsof -ti "tcp:$APP_PORT" >/dev/null 2>&1; then
    die "port $APP_PORT is already in use; stop that process or set APP_PORT to another value"
  fi

  if [ ! -f .env ]; then
    log 'Creating local .env from .env.example'
    cp .env.example .env
  fi

  if [ ! -d node_modules ]; then
    log 'Installing exact Node dependencies with npm ci'
    npm ci
  fi

  log 'Starting PostgreSQL'
  docker compose up -d postgres

  log 'Waiting for PostgreSQL health'
  local count=1
  until docker compose exec -T postgres pg_isready -U meten -d meten >/dev/null 2>&1; do
    if [ "$count" -ge 60 ]; then
      docker compose logs postgres
      die 'PostgreSQL did not become healthy within 60 seconds'
    fi
    sleep 1
    count=$((count + 1))
  done

  log 'Applying committed database migrations'
  npm run db:deploy

  if [ "$SEED" = "true" ]; then
    log 'Restoring the repeatable demo dataset'
    npm run db:seed
  fi

  log "Starting backend on http://localhost:$APP_PORT"
  nohup ./node_modules/.bin/next dev -H 0.0.0.0 -p "$APP_PORT" >"$LOG_FILE" 2>&1 &
  printf '%s\n' "$!" >"$PID_FILE"

  if ! wait_for_url "http://127.0.0.1:$APP_PORT/api/health" 60; then
    printf 'Backend log:\n' >&2
    tail -n 100 "$LOG_FILE" >&2 || true
    stop
    die 'backend did not pass its health check within 60 seconds'
  fi

  printf '\nMeten is ready.\n'
  printf '  Web:  http://localhost:%s\n' "$APP_PORT"
  printf '  API:  http://localhost:%s/api/health\n' "$APP_PORT"
  printf '  Logs: npm run local:logs\n'
  printf '  Stop: npm run local:stop\n'
}

stop() {
  cd "$ROOT_DIR"
  if backend_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    log "Stopping backend PID $pid"
    kill "$pid"
    local count=1
    while kill -0 "$pid" 2>/dev/null && [ "$count" -le 15 ]; do
      sleep 1
      count=$((count + 1))
    done
    if kill -0 "$pid" 2>/dev/null; then
      die "backend PID $pid did not stop; inspect it before terminating manually"
    fi
  else
    printf 'Meten backend is not running under this script.\n'
  fi
  rm -f "$PID_FILE"

  log 'Stopping local Docker services without deleting data'
  docker compose stop
}

status() {
  cd "$ROOT_DIR"
  printf 'Backend: '
  if backend_running; then
    printf 'running (PID %s)\n' "$(cat "$PID_FILE")"
  else
    printf 'stopped\n'
  fi

  printf 'Health:  '
  if curl --fail --silent "http://127.0.0.1:$APP_PORT/api/health" >/dev/null 2>&1; then
    printf 'healthy\n'
  else
    printf 'unavailable\n'
  fi

  printf '\nDocker services:\n'
  docker compose ps
}

logs() {
  mkdir -p "$RUN_DIR"
  touch "$LOG_FILE"
  tail -n 200 -f "$LOG_FILE"
}

usage() {
  cat <<'USAGE'
Usage: ./scripts/meten-local.sh <command> [option]

Commands:
  start           Start Postgres, migrate, and launch the backend in background
  start --seed    Also reset and load the repeatable demo dataset
  stop            Stop the managed backend and Docker services; preserve data
  status          Show backend health and Docker service status
  logs            Follow the backend development log

Environment:
  APP_PORT=3000   Override the local web/API port
USAGE
}

case "$ACTION" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  logs) logs ;;
  help|-h|--help) usage ;;
  *) usage; exit 2 ;;
esac
