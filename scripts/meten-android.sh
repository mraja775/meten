#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/consumer-android"
ANDROID_STUDIO_APP="${ANDROID_STUDIO_APP:-/Applications/Android Studio.app}"
ANDROID_SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ANDROID_JAVA_HOME="${JAVA_HOME:-$ANDROID_STUDIO_APP/Contents/jbr/Contents/Home}"
ACTION="${1:-help}"

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

configure_android() {
  [ -d "$ANDROID_SDK" ] || die "Android SDK not found at $ANDROID_SDK; install SDK 36 or set ANDROID_HOME"
  [ -d "$ANDROID_JAVA_HOME" ] || die "JDK not found at $ANDROID_JAVA_HOME; install Android Studio or set JAVA_HOME"
  export ANDROID_HOME="$ANDROID_SDK"
  export JAVA_HOME="$ANDROID_JAVA_HOME"
}

doctor() {
  printf 'Android project: %s\n' "$ANDROID_DIR"
  printf 'Android SDK:     %s\n' "$ANDROID_SDK"
  printf 'Java home:       %s\n' "$ANDROID_JAVA_HOME"
  [ -d "$ANDROID_STUDIO_APP" ] && printf 'Android Studio:   installed\n' || printf 'Android Studio:   not found\n'
  configure_android
  "$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" --version
}

open_studio() {
  [ "$(uname -s)" = "Darwin" ] || die 'the open command is supported only on macOS; open consumer-android manually'
  [ -d "$ANDROID_STUDIO_APP" ] || die "Android Studio not found at $ANDROID_STUDIO_APP"
  open -a "$ANDROID_STUDIO_APP" "$ANDROID_DIR"
  printf 'Opened Android Studio. Start an API 35/36 emulator and run the app configuration.\n'
}

build_debug() {
  configure_android
  cd "$ANDROID_DIR"
  ./gradlew --no-daemon lintDebug testDebugUnitTest assembleDebug
  printf '\nDebug APK: %s\n' "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
}

install_debug() {
  configure_android
  command -v "$ANDROID_SDK/platform-tools/adb" >/dev/null 2>&1 || die 'adb is missing; install Android SDK platform-tools'
  build_debug
  local devices
  devices="$($ANDROID_SDK/platform-tools/adb devices | awk 'NR > 1 && $2 == "device" { count++ } END { print count + 0 }')"
  [ "$devices" -eq 1 ] || die "exactly one running emulator/device is required; found $devices"
  "$ANDROID_SDK/platform-tools/adb" install -r "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  printf 'Installed Meten on the connected emulator/device.\n'
}

usage() {
  cat <<'USAGE'
Usage: ./scripts/meten-android.sh <command>

Commands:
  doctor    Verify Android SDK, JDK, and Gradle
  open      Open consumer-android in Android Studio on macOS
  build     Run debug lint/tests and build the APK
  install   Build and install on exactly one running emulator/device

The debug app connects to http://10.0.2.2:3000. Start the backend first with:
  npm run local:start -- --seed
USAGE
}

case "$ACTION" in
  doctor) doctor ;;
  open) open_studio ;;
  build) build_debug ;;
  install) install_debug ;;
  help|-h|--help) usage ;;
  *) usage; exit 2 ;;
esac
