# Meten Local Development

This guide is the complete local runbook for the Meten web backend, PostgreSQL database, and Android customer application. Run all commands from the repository root unless a section says otherwise.

For a production server, use the separate cloud deployment README. Do not copy local demo credentials or development settings into production.

## What runs locally

- The Next.js web application and API run directly on the Mac at `http://localhost:3000`.
- PostgreSQL 16 runs in Docker Compose and keeps its data in a named Docker volume.
- The Android debug application runs in an emulator or on a connected device.
- An Android emulator reaches the Mac backend at `http://10.0.2.2:3000`.

## Requirements

Install:

- Node.js 22 or newer
- Docker Desktop with Docker Compose
- Git and `curl`
- Android Studio with Android SDK 36 for Android development
- Tesseract for local OCR testing (recommended)

On macOS, Tesseract can be installed with:

```bash
brew install tesseract
```

Start Docker Desktop before continuing. Then clone the repository and check the machine:

```bash
git clone https://github.com/mraja775/meten.git
cd meten
npm run doctor
```

`npm run doctor` checks the required backend tools and Docker daemon. It also reports optional OCR and Android tooling. The managed start command installs exact Node dependencies and creates the local `.env` when either is missing.

## First start

Start PostgreSQL, apply migrations, load the repeatable demo dataset, and launch the backend:

```bash
npm run local:start -- --seed
```

Wait for `Meten is ready`, then open:

- Web application: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

Demo staff email:

```text
owner@meten.local
```

In development, when Resend is not configured, the login OTP is written to the backend log:

```bash
npm run local:logs
```

Press `Ctrl+C` to stop following the log. This does not stop the backend.

## Daily commands

| Task | Command |
| --- | --- |
| Check required software | `npm run doctor` |
| Start using existing data | `npm run local:start` |
| Start and restore demo data | `npm run local:start -- --seed` |
| Show backend health and containers | `npm run local:status` |
| Follow backend logs | `npm run local:logs` |
| Stop backend and containers | `npm run local:stop` |
| Open the Android project | `npm run android:open` |
| Test and build the debug APK | `npm run android:build` |
| Install on one connected target | `./scripts/meten-android.sh install` |

Use `npm run local:start` for normal daily work. Use `--seed` only when you deliberately want the seed script to restore the repeatable demo baseline.

`npm run local:stop` stops the managed backend and Compose services without deleting PostgreSQL data. It does not run `docker compose down -v`.

## What the local start script does

`scripts/meten-local.sh` performs these steps in order:

1. Verifies Node.js, npm, Docker, and `curl`.
2. Refuses to start if the selected port is already occupied.
3. Copies `.env.example` to `.env` only if `.env` does not exist.
4. Runs `npm ci` only if `node_modules` does not exist.
5. Starts the Compose PostgreSQL service.
6. Waits for PostgreSQL to report ready.
7. Applies committed Prisma migrations with `npm run db:deploy`.
8. Runs the repeatable seed only when `--seed` is supplied.
9. Starts Next.js in the background.
10. Waits for `/api/health` before reporting success.

Runtime logs and the managed process ID are stored under the ignored `.run/` directory.

To use a different web port:

```bash
APP_PORT=3001 npm run local:start
```

The Android debug build is configured for port 3000. Keep the default port when testing Android unless you also change its debug API URL.

## Android emulator workflow

Start the demo backend, then open Android Studio:

```bash
npm run local:start -- --seed
npm run android:open
```

In Android Studio:

1. Allow Gradle sync to finish.
2. Create or start an API 35 or API 36 emulator.
3. Select the `app` run configuration.
4. Run the application.

Demo customer login:

```text
Email: student100@example.com
Academy code: bangalore-precision-shooting-academy
```

Request an OTP in the Android application, then read it from:

```bash
npm run local:logs
```

The emulator uses `10.0.2.2` because `localhost` inside the emulator refers to the emulator itself, not the Mac.

## Android command-line build and install

Verify, test, and assemble the debug APK:

```bash
npm run android:build
```

Output:

```text
consumer-android/app/build/outputs/apk/debug/app-debug.apk
```

With exactly one running emulator or USB-debugging device, build and install it:

```bash
./scripts/meten-android.sh install
```

The installer intentionally fails when zero or multiple eligible devices are connected. Inspect targets with:

```bash
$HOME/Library/Android/sdk/platform-tools/adb devices
```

If Android Studio or the SDK is installed elsewhere, override the detected paths:

```bash
ANDROID_STUDIO_APP="/Applications/Android Studio.app" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
./scripts/meten-android.sh doctor
```

## Database commands

The managed start command applies migrations automatically. These direct commands are useful when developing schema changes:

```bash
npm run db:generate
npm run db:deploy
npx prisma migrate status
npm run db:seed
npm run db:studio
```

Use a new Prisma migration for schema changes. Never edit a migration that has already been applied.

Local PostgreSQL is configured by `.env` and `docker-compose.yml`. Do not commit `.env`; it is ignored because it can contain secrets.

## Verification before committing

Run the web checks:

```bash
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

Run Android checks:

```bash
npm run android:build
```

## Troubleshooting

### Docker is not running

Start Docker Desktop and wait until it is ready, then run:

```bash
npm run doctor
npm run local:start
```

### Port 3000 is occupied

Find the existing listener:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Stop the known process, or run the backend on another port. Do not terminate a process unless you know what it is.

### Backend does not become healthy

```bash
npm run local:status
npm run local:logs
docker compose logs postgres
```

Also verify PostgreSQL migration state:

```bash
npx prisma migrate status
```

### Android cannot reach the backend

- Confirm `http://localhost:3000/api/health` works on the Mac.
- Confirm the debug application is being used.
- Confirm the emulator build uses `http://10.0.2.2:3000`.
- Do not use `localhost:3000` from the Android emulator.
- The checked-in debug build targets the Android emulator. A physical device requires changing the debug API URL to a reachable Mac address (or a matching ADB reverse setup) and rebuilding; `10.0.2.2` is emulator-specific.

### Start reports that the backend is already running

Inspect it rather than starting a duplicate:

```bash
npm run local:status
npm run local:logs
```

### Resetting local data

The supported demo reset is:

```bash
npm run local:start -- --seed
```

Normal stop/start cycles preserve data. Deleting Docker volumes is irreversible and is not part of the routine workflow.

## Script help

The scripts also expose their command-level help:

```bash
./scripts/meten-local.sh --help
./scripts/meten-android.sh --help
./scripts/meten-doctor.sh
```

For architecture, API, cloud deployment, Android release signing, and production safeguards, return to the repository's main documentation index in `README.md`.
