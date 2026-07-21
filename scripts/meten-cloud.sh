#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ACTION="${1:-help}"
ENV_FILE="${METEN_ENV_FILE:-$ROOT_DIR/.env.production.local}"
YES="false"

shift || true
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --yes) YES="true"; shift ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 2 ;;
  esac
done

log() { printf '\n==> %s\n' "$1"; }
die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

load_environment() {
  [ -f "$ENV_FILE" ] || die "environment file not found: $ENV_FILE"
  if [ "$(uname -s)" = "Linux" ]; then
    local permissions
    permissions="$(stat -c '%a' "$ENV_FILE")"
    case "$permissions" in
      *00) ;;
      *) die "$ENV_FILE must not be readable or writable by group/others; run chmod 600 '$ENV_FILE'" ;;
    esac
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_value() {
  local name="$1"
  local value="${!name:-}"
  [ -n "$value" ] || die "$name is required in $ENV_FILE"
  case "$value" in
    *replace-with*|*replace_*|*generate-*|*URL_ENCODED*|*your-*|*example.com*|*onboarding@resend.dev*) die "$name still contains a placeholder value" ;;
  esac
}

validate() {
  command -v docker >/dev/null 2>&1 || die 'Docker is required'
  command -v curl >/dev/null 2>&1 || die 'curl is required'
  docker info >/dev/null 2>&1 || die 'Docker daemon is not running'
  load_environment

  for name in DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL NEXT_PUBLIC_APP_URL POSTGRES_PASSWORD RESEND_API_KEY RESEND_FROM_EMAIL S3_ENDPOINT S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_BUCKET S3_PUBLIC_BASE_URL; do
    require_value "$name"
  done

  [ "${#BETTER_AUTH_SECRET}" -ge 32 ] || die 'BETTER_AUTH_SECRET must be at least 32 characters'
  case "$BETTER_AUTH_URL" in https://*) ;; *) die 'BETTER_AUTH_URL must use HTTPS' ;; esac
  case "$NEXT_PUBLIC_APP_URL" in https://*) ;; *) die 'NEXT_PUBLIC_APP_URL must use HTTPS' ;; esac
  case "$S3_PUBLIC_BASE_URL" in https://*) ;; *) die 'S3_PUBLIC_BASE_URL must use HTTPS' ;; esac

  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
  printf 'Production configuration is structurally valid.\n'
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

wait_for_health() {
  local base_url="${NEXT_PUBLIC_APP_URL%/}"
  local count=1
  while [ "$count" -le 60 ]; do
    if curl --fail --silent --show-error "$base_url/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    count=$((count + 1))
  done
  return 1
}

deploy() {
  validate
  if [ "$YES" != "true" ]; then
    printf '\nThis will build and deploy Meten using %s.\n' "$ENV_FILE"
    printf 'Database migrations will run; demo data will NOT be seeded.\n'
    printf 'Type DEPLOY to continue: '
    read -r confirmation
    [ "$confirmation" = "DEPLOY" ] || die 'deployment cancelled'
  fi

  log 'Building immutable application image'
  compose build --pull app

  log 'Starting PostgreSQL and waiting for health'
  compose up -d postgres
  local count=1
  until compose exec -T postgres pg_isready -U "${POSTGRES_USER:-meten}" -d "${POSTGRES_DB:-meten}" >/dev/null 2>&1; do
    if [ "$count" -ge 60 ]; then
      compose logs postgres
      die 'PostgreSQL did not become healthy'
    fi
    sleep 2
    count=$((count + 1))
  done

  log 'Applying forward-only Prisma migrations'
  compose run --rm app npm run db:deploy

  log 'Starting application'
  compose up -d app

  log 'Waiting for public health endpoint'
  if ! wait_for_health; then
    compose logs --tail=200 app
    die "health check failed at ${NEXT_PUBLIC_APP_URL%/}/api/health"
  fi

  printf '\nDeployment succeeded: %s\n' "$NEXT_PUBLIC_APP_URL"
  compose ps
}

status() {
  validate
  compose ps
  curl --fail --silent --show-error "${NEXT_PUBLIC_APP_URL%/}/api/health"
  printf '\n'
}

logs() {
  load_environment
  compose logs --tail=200 -f app
}

usage() {
  cat <<'USAGE'
Usage: ./scripts/meten-cloud.sh <command> [options]

Commands:
  check       Validate required production configuration and Docker Compose
  deploy      Build, migrate, deploy, and verify the public health endpoint
  status      Show containers and call the public health endpoint
  logs        Follow production application logs

Options:
  --env-file PATH   Environment file (default: .env.production.local)
  --yes             Non-interactive deploy; intended for controlled automation

Safety:
  - Never seeds production data.
  - Never deletes volumes or rolls migrations backward.
  - Fails on placeholder secrets or non-HTTPS public URLs.
  - Keep the environment file chmod 600 and outside Git.
USAGE
}

case "$ACTION" in
  check) validate ;;
  deploy) deploy ;;
  status) status ;;
  logs) logs ;;
  help|-h|--help) usage ;;
  *) usage; exit 2 ;;
esac
