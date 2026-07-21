#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${APP_PORT:-3000}"
EXTRA_APP_PORTS="${EXTRA_APP_PORTS:-3001}"

log() {
  printf "\n==> %s\n" "$1"
}

stop_port() {
  local port="$1"
  local pids

  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"

  if [ -z "$pids" ]; then
    printf "Port %s is free.\n" "$port"
    return
  fi

  printf "Stopping process(es) on port %s: %s\n" "$port" "$pids"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    printf "Force stopping process(es) on port %s: %s\n" "$port" "$pids"
    kill -9 $pids 2>/dev/null || true
  fi
}

log "Stopping local Next.js servers"
stop_port "$APP_PORT"

for port in $EXTRA_APP_PORTS; do
  if [ "$port" != "$APP_PORT" ]; then
    stop_port "$port"
  fi
done

log "Clearing generated Next.js cache"
rm -rf .next

log "Starting PostgreSQL"
docker compose up -d postgres

log "Applying database migrations"
npm run db:deploy

log "Starting Meten on http://localhost:${APP_PORT}"
exec npm run dev -- -H 0.0.0.0 -p "$APP_PORT"
