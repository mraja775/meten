#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0

ok() { printf '  [ok] %s\n' "$1"; }
warn() { printf '  [--] %s\n' "$1"; }
fail() { printf '  [!!] %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

has_command() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "$1: $(command -v "$1")"
  else
    fail "$1 is not installed or not on PATH"
  fi
}

printf 'Meten local environment doctor\nRepository: %s\n\n' "$ROOT_DIR"

printf 'Required backend tools\n'
for command_name in node npm docker curl; do
  has_command "$command_name"
done

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok 'Docker daemon is running'
  else
    fail 'Docker is installed but the daemon is not running'
  fi
fi

if [ -f "$ROOT_DIR/.env" ]; then
  ok '.env exists'
else
  warn '.env is missing; local start will copy .env.example'
fi

if [ -d "$ROOT_DIR/node_modules" ]; then
  ok 'Node dependencies are installed'
else
  warn 'node_modules is missing; local start will run npm ci'
fi

printf '\nOptional OCR tool\n'
if command -v tesseract >/dev/null 2>&1; then
  ok "$(tesseract --version 2>&1 | head -n 1)"
else
  warn 'Tesseract is missing; uploads work but local OCR will be unavailable'
fi

printf '\nAndroid tools\n'
ANDROID_STUDIO_JDK="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
ANDROID_SDK_DEFAULT="$HOME/Library/Android/sdk"

if [ -d "$ANDROID_STUDIO_JDK" ]; then
  ok 'Android Studio bundled JDK found'
elif command -v java >/dev/null 2>&1; then
  ok "Java found: $(command -v java)"
else
  warn 'Android Studio/JDK not found; backend development is still available'
fi

if [ -d "${ANDROID_HOME:-$ANDROID_SDK_DEFAULT}" ]; then
  ok "Android SDK found: ${ANDROID_HOME:-$ANDROID_SDK_DEFAULT}"
else
  warn 'Android SDK not found; install SDK 36 through Android Studio'
fi

if [ -x "$ROOT_DIR/consumer-android/gradlew" ]; then
  ok 'Android Gradle wrapper is executable'
else
  fail 'Android Gradle wrapper is missing or not executable'
fi

printf '\n'
if [ "$FAILURES" -gt 0 ]; then
  printf 'Doctor found %s required problem(s). Fix them before starting Meten.\n' "$FAILURES"
  exit 1
fi

printf 'Required checks passed. Optional warnings may be addressed as needed.\n'
