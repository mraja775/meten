# Meten Operations Scripts

This guide provides the shortest safe paths for local development, Android testing, and Docker-based production deployment. Every script resolves the repository root itself, fails on errors, and prints actionable diagnostics.

## Command summary

| Goal | Command |
| --- | --- |
| Check local prerequisites | `npm run doctor` |
| Start backend and preserve existing data | `npm run local:start` |
| Start backend with clean demo data | `npm run local:start -- --seed` |
| Show backend/Postgres status | `npm run local:status` |
| Follow backend logs | `npm run local:logs` |
| Stop backend/Postgres without deleting data | `npm run local:stop` |
| Open Android Studio | `npm run android:open` |
| Build/test Android debug APK | `npm run android:build` |
| Install APK on one emulator/device | `./scripts/meten-android.sh install` |
| Validate cloud configuration | `./scripts/meten-cloud.sh check` |
| Deploy on a Docker host | `./scripts/meten-cloud.sh deploy` |

## First local setup on macOS

Install Docker Desktop, Node.js 22 or newer, Android Studio, and Android SDK 36. Tesseract is optional but recommended:

```bash
brew install tesseract
```

Clone and inspect the machine:

```bash
git clone https://github.com/mraja775/meten.git
cd meten
npm ci
npm run doctor
```

The doctor checks Node, npm, Docker, the Docker daemon, curl, `.env`, Node dependencies, Tesseract, Android Studio's bundled JDK, Android SDK, and the Gradle wrapper. Backend requirements fail the command; optional Android/OCR omissions are warnings.

## Start the local backend

For the initial demo setup:

```bash
npm run local:start -- --seed
```

This command:

1. Creates `.env` from `.env.example` only when `.env` is absent.
2. Runs `npm ci` only when `node_modules` is absent.
3. Starts the local PostgreSQL container.
4. Waits for `pg_isready`.
5. Applies all committed Prisma migrations.
6. Resets and loads demo data only with `--seed`.
7. Starts Next.js in the background.
8. Waits for `/api/health` before reporting success.

The process ID and log live under ignored `.run/`. The script refuses to kill an unknown process if port 3000 is occupied.

Daily use without resetting data:

```bash
npm run local:start
npm run local:status
npm run local:logs
```

Stop safely without deleting PostgreSQL data:

```bash
npm run local:stop
```

Never use `docker compose down -v` unless permanent local database deletion is intentional.

Use another port if needed:

```bash
APP_PORT=3001 npm run local:start
```

The Android debug build expects port 3000 unless its debug build configuration is changed.

## Open and test Android

```bash
npm run local:start -- --seed
npm run android:open
```

In Android Studio, wait for Gradle sync, start an API 35 or 36 emulator, and run the `app` configuration.

Sign in with:

```text
Email: student100@example.com
Academy code: bangalore-precision-shooting-academy
```

Read the development OTP with `npm run local:logs`. The emulator connects to the Mac backend through `http://10.0.2.2:3000`.

Build without Android Studio:

```bash
npm run android:build
```

With exactly one emulator or USB-debugging device running, build and install:

```bash
./scripts/meten-android.sh install
```

The installer fails with zero or multiple devices so it cannot install to the wrong target.

## Production deployment model

`scripts/meten-cloud.sh` targets a Linux server or VM with Docker Compose and a public HTTPS domain. Managed platforms such as Render, Railway, Fly.io, ECS, or Kubernetes should translate the same build, environment, migration, health, and storage requirements into their native deployment mechanisms.

The production script:

- Validates Docker and the daemon.
- Rejects missing or obvious placeholder values.
- Requires a 32-character authentication secret.
- Requires HTTPS application and asset URLs.
- Validates the rendered Compose configuration.
- Builds a fresh image.
- Waits for PostgreSQL.
- Runs forward-only Prisma migrations before application startup.
- Never seeds demo data.
- Waits for the public `/api/health` endpoint.
- Never deletes volumes or reverses migrations.

## Prepare a Docker cloud host

1. Install Docker Engine and Docker Compose using Docker's official instructions.
2. Configure a firewall allowing SSH, HTTP, and HTTPS only.
3. Put a TLS reverse proxy or managed load balancer in front of port 3000.
4. Clone the repository into a non-root deployment account.
5. Configure database backups.
6. Configure Resend and S3-compatible storage.

Create the private environment:

```bash
cp .env.production.example .env.production.local
chmod 600 .env.production.local
```

Generate strong values rather than using the examples literally. URL-encode the database password inside `DATABASE_URL`.

Validate without changing services:

```bash
./scripts/meten-cloud.sh check
```

Deploy interactively:

```bash
./scripts/meten-cloud.sh deploy
```

The script requires typing `DEPLOY`. For controlled automation only:

```bash
./scripts/meten-cloud.sh deploy --env-file /secure/meten.env --yes
```

Inspect production:

```bash
./scripts/meten-cloud.sh status
./scripts/meten-cloud.sh logs
```

## External managed PostgreSQL

The production Compose file includes PostgreSQL for a simple single-host deployment. For managed PostgreSQL, set `DATABASE_URL` to the provider's TLS URL, restrict network access, enable backups and point-in-time recovery, and run migrations as a one-off deployment task.

If removing the Compose Postgres service, also remove the app's `depends_on` entry and adapt the script's database readiness step. Never run `npm run db:seed` in production.

## Android production distribution

The cloud script deploys the backend, not Android. To release Android:

1. Deploy and verify the HTTPS backend.
2. Set `METEN_API_BASE_URL` to the public HTTPS URL.
3. Provide Play upload-key environment variables.
4. Build the signed bundle using `android-release.md`.
5. Upload the `.aab` to Play Console internal testing.
6. Complete privacy/data-safety declarations and use staged rollout.

Never ship the debug APK or emulator URL to customers.

## Updating production

```bash
git pull --ff-only
./scripts/meten-cloud.sh check
./scripts/meten-cloud.sh deploy
```

The deployment rebuilds the image and applies pending forward migrations. Confirm backups and review migration SQL before database-sensitive releases.

## Rollback

Redeploy a known-good Git commit or image. Database migrations remain forward-only:

- Never edit or delete applied migrations.
- Never automatically reverse schema changes.
- Restore a backup only for confirmed corruption or a planned recovery.
- Prefer a forward repair migration when possible.

## Troubleshooting

Backend health:

```bash
npm run local:status
npm run local:logs
docker compose logs postgres
```

Android cannot connect:

- Confirm `/api/health` works on the Mac.
- Use `10.0.2.2`, not `localhost`, from the emulator.
- Confirm port 3000 and a debug build are used.

Cloud validation fails:

- Replace every placeholder.
- Use HTTPS URLs.
- URL-encode database credentials.
- Keep the environment file readable only by its owner.

Cloud health fails:

- Inspect application logs.
- Verify DNS, TLS, reverse proxy, database connectivity, and migration output.
