# Meten Engineering Bootstrap

Last updated: July 21, 2026

This is the primary bootstrap and handoff document for engineers and coding agents working in this repository. Read it before modifying code, database schema, deployment configuration, authentication, or the Android application.

## Repository

- GitHub: `https://github.com/mraja775/meten`
- Default branch: `main`
- License: MIT
- Main branch protection policy: `.github/branch-protection.json`
- CI workflow: `.github/workflows/ci.yml`
- Local repository owner identity: `mraja775 <mraja775@users.noreply.github.com>`

`main` is protected. Changes must normally be made on a branch and merged through a pull request. Required status checks are `web` and `android`. One approval, resolved conversations, and linear history are required. Force pushes and branch deletion are disabled, and protections currently apply to administrators.

The machine may have multiple GitHub accounts configured. Check the active account before GitHub operations:

```bash
gh auth status --hostname github.com
gh auth switch --hostname github.com --user mraja775
```

Never place GitHub tokens, OTPs, session tokens, `.env` contents, signing credentials, or customer information in commits, logs, documentation, or chat responses.

## Product Overview

Meten is an academy CRM and native Android student training companion for sports academies.

The staff web application supports:

- Dashboard and daily actions
- Lead pipeline and lead-to-student conversion
- Student management
- Payment tracking
- Message composition/history
- Academy settings
- Staff-assisted training score uploads

The Android customer application supports:

- Student email OTP authentication
- Encrypted bearer-session persistence
- Camera and gallery score-sheet selection
- Up to six images per training session
- Typed and Android speech-recognition reflections
- Training history and session detail
- OCR-derived metrics and recommendations
- Manual score correction
- Progress summaries
- Profile and logout

## Technology

Web/backend:

- Next.js 15 and React 19
- TypeScript
- PostgreSQL 16
- Prisma 5
- Zod validation
- Tailwind CSS
- Vitest and Playwright
- Docker Compose
- Local Tesseract OCR
- S3-compatible production object storage
- Resend production OTP delivery

Android:

- Kotlin 2.2
- Jetpack Compose
- Android Gradle Plugin 8.13
- Gradle 8.13 wrapper
- Compile SDK 36, target SDK 35, minimum SDK 26
- OkHttp
- Coil
- Android encrypted preferences

## Repository Map

```text
app/                        Next.js pages and API route handlers
components/                 Web UI and domain components
consumer-android/           Native Android customer application
docs/                       Product, architecture and deployment documentation
lib/auth/                   Staff and student authentication/session logic
lib/training/               OCR, parsing, uploads and storage
lib/validations/            Zod request validation
prisma/                     Schema, migrations and repeatable demo seed
public/uploads/             Development runtime data; ignored by Git
tests/                      Web unit and Playwright tests
.github/                    CI, Dependabot and contribution templates
```

## Important Documentation

Read these before changing the corresponding area:

- `README.md`: public project overview and quick start
- `docs/product/mvp-plan.md`: staff CRM scope
- `docs/product/training-module-handoff.md`: training implementation history
- `docs/architecture/architecture-decisions.md`: durable architecture decisions
- `docs/architecture/implementation-rules.md`: binding implementation rules
- `docs/architecture/api-spec.md`: API conventions and endpoints
- `docs/deployment/cloud-deployment.md`: backend deployment runbook
- `docs/deployment/consumer-api.md`: Android authentication/API contract
- `docs/deployment/android-release.md`: Android build, signing and store process
- `docs/legal/privacy-policy.md`: privacy policy template requiring publication
- `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`: public project policies

## Local Bootstrap

Requirements:

- Node.js 22 or newer
- npm 10-compatible lockfile usage in CI
- Docker Desktop
- Android Studio with Android SDK 36
- Android Studio bundled JDK or JDK 17+
- Tesseract for local OCR testing

From the repository root:

```bash
cp .env.example .env
npm ci
docker compose up -d postgres
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Demo staff login:

```text
owner@meten.local
```

When Resend is not configured outside production, the OTP is printed in the development server log.

The repeatable seed creates:

- One academy: Bangalore Precision Shooting Academy
- Academy slug: `bangalore-precision-shooting-academy`
- Two staff users
- 100 students
- 30 leads
- 75 payments
- One recorded payment reminder

The seed deletion order intentionally removes training and authentication child records before students. It was fixed and tested by seeding repeatedly before and after creating live training/authentication records.

## PostgreSQL State and Verification

There are six committed migrations:

1. Initial CRM schema
2. Staff OTP authentication
3. Training sessions
4. Training images and reflections
5. Student OTP authentication and bearer sessions
6. Verified score corrections

Apply and inspect them with:

```bash
npm run db:deploy
npx prisma migrate status
npm run db:seed
```

PostgreSQL integration was tested against the Docker Postgres 16 service. Verified behavior includes:

- All six migrations apply successfully
- Migration history contains no failed or rolled-back migration
- Seed is repeatable
- Foreign keys for academies, students, training sessions, OTPs, and sessions are active
- No orphan training sessions remain after seed/reset
- Student OTP creation and consumption persist correctly
- Bearer sessions persist and logout revokes them
- Revoked tokens return HTTP 401
- Training image metadata, OCR text, parsed scores, and audit fields persist
- Manual corrections persist in `verifiedScores` without destroying original OCR output
- Corrected totals, best score, notes, and verification timestamp update correctly
- A different student receives HTTP 404 for another student's training session

After integration testing, smoke-test database rows and the generated smoke-test image were removed, and the database was restored to the clean seed baseline.

## Authentication and Authorization

Staff web authentication:

- Email OTP
- Hashed OTP using HMAC and `BETTER_AUTH_SECRET`
- Ten-minute expiry
- Five-attempt limit
- Single use
- Hashed opaque database session
- Secure, HTTP-only cookie in production
- Roles are only `OWNER` and `STAFF`

Android customer authentication:

- `POST /api/consumer/auth/request-otp`
- `POST /api/consumer/auth/verify-otp`
- `GET /api/consumer/auth/me`
- `POST /api/consumer/auth/logout`
- Opaque bearer token stored only as a SHA-256 hash on the server
- Android token stored using encrypted preferences
- Student identity and academy are derived server-side from the token
- OTP requests are enumeration resistant and have a resend cooldown
- Production refuses console OTP delivery and requires Resend

All sensitive data access must remain academy scoped. Customer endpoints must additionally scope by the authenticated student. Do not accept a customer-provided `studentId` as authority.

## Training and Storage

Training upload behavior:

- Accepts one to six images
- Maximum 12 MB per image and 36 MB total
- Rotates and normalizes images with Sharp
- Runs multipass local Tesseract OCR
- Parses shot scores, series totals, average, spread, dropped shots, group size, MPI, confidence, and recommendations
- Stores original parsed output in `parsedScores`
- Stores student corrections separately in `verifiedScores`

Development stores images under `public/uploads/training-sessions`. This directory is ignored by Git. Production requires S3-compatible object storage and does not use the local fallback. Partial failures clean up uploaded objects.

Required production storage configuration:

```text
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET
S3_REGION
S3_PUBLIC_BASE_URL
```

## Android Local Testing on macOS

Start the backend first:

```bash
docker compose up -d postgres
npm run db:deploy
npm run db:seed
npm run dev
```

Open this folder in Android Studio:

```text
consumer-android
```

Create and start an API 35 or 36 emulator, then run the `app` configuration. Debug builds use `http://10.0.2.2:3000`, which maps the emulator to the Mac backend.

Demo customer login:

```text
Email: student100@example.com
Academy code: bangalore-precision-shooting-academy
```

Read the six-digit OTP from the `npm run dev` console. Test login, session restoration, gallery/camera upload, reflection, history, detail, score correction, progress, logout, and post-logout access.

Command-line Android verification on macOS:

```bash
cd consumer-android
ANDROID_HOME="$HOME/Library/Android/sdk" \
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
./gradlew --no-daemon lintDebug testDebugUnitTest assembleDebug
```

Debug APK:

```text
consumer-android/app/build/outputs/apk/debug/app-debug.apk
```

Release verification requires a real HTTPS base URL at build time:

```bash
METEN_API_BASE_URL=https://api.example.com \
./gradlew --no-daemon lintRelease testReleaseUnitTest assembleRelease
```

Release builds enable R8/resource shrinking and reject cleartext traffic. Signing secrets are supplied through environment variables documented in `docs/deployment/android-release.md`; never commit them.

## Verification Commands

Web/backend:

```bash
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

At the last verification:

- TypeScript passed
- ESLint passed
- 10 Vitest tests passed
- Optimized Next.js production build passed
- Android debug lint, unit tests, and APK assembly passed
- Android release tests, R8 minification, resource shrinking, and assembly passed
- GitHub Actions `web` and `android` jobs passed

The lockfile was regenerated with npm 10 for Node 22 CI compatibility. Vitest was upgraded to 4.1.10 to remove a critical development-server advisory. Do not casually regenerate the lockfile with a different npm major without verifying `npm ci` on Node 22.

`npm audit` may still report a moderate PostCSS advisory through Next.js' bundled dependency. npm currently proposes an incorrect/breaking Next.js downgrade as the automated fix. Do not use `npm audit fix --force`; upgrade Next.js through a tested framework upgrade instead.

## CI and Dependency Automation

GitHub Actions runs on pushes to `main` and pull requests.

The `web` job runs:

- `npm ci`
- TypeScript
- ESLint
- Vitest
- Next.js production build

The `android` job runs:

- Debug lint, tests, and APK assembly
- Release lint, tests, minification, and release assembly using a non-production placeholder HTTPS URL

Dependabot is enabled for npm, Gradle, and GitHub Actions. Dependabot pull requests must pass the same protected checks. Review major upgrades rather than merging them blindly.

## Git and Public Repository Hygiene

Ignored and prohibited content includes:

- `.env` and environment-specific files
- `node_modules`
- `.next`, coverage, Playwright reports, and test output
- TypeScript build caches
- Android `.gradle`, build output, `local.properties`, keystores, and signing material
- Runtime uploads under `public/uploads`
- Database dumps and customer data

Before committing:

```bash
git diff --check
git status --short
npm run typecheck
npm run lint
npm test
```

Use focused branches and conventional-style commit messages. Because `main` is protected, create a pull request and wait for `web` and `android` checks.

## Production Configuration Still Required Per Deployment

The source code and builds are ready, but each real deployment must supply and smoke-test its own external services:

- Managed PostgreSQL and backups
- HTTPS domain
- Strong `BETTER_AUTH_SECRET`
- Resend API key and verified sender
- S3-compatible bucket, credentials, region, and public/CDN base URL
- Published privacy-policy URL and support/security mailboxes
- Android production API base URL
- Android Play upload key and signing passwords
- Play Console listing, data-safety disclosure, screenshots, and staged rollout
- Monitoring, crash reporting, retention, and data-deletion support process

Never claim provider integration is verified until the selected production Resend and S3 credentials have been smoke-tested against staging.

## Known Engineering Follow-ups

These are enhancements, not blockers for local development:

- Add live database-backed API integration tests to CI
- Add Android Compose instrumentation/device tests
- Add an optional stronger OCR/vision provider for difficult score sheets
- Add historical parser reprocessing after future parser-version changes
- Expand coach review and longitudinal analytics if product scope requires them
- Plan and test a future Next.js major upgrade to clear bundled transitive advisories

## Rules for Future Agents

1. Read this file and the relevant linked documentation before acting.
2. Preserve existing user changes and never expose secrets.
3. Keep tenant and student isolation explicit in every sensitive query.
4. Add migrations; never rewrite applied migrations.
5. Test seed repeatability after schema changes.
6. Verify both web and Android when changing shared API contracts.
7. Update this file when architecture, deployment steps, protection rules, or known limitations materially change.
8. Do not mark work production-ready solely because it compiles; verify migrations, authorization boundaries, failure behavior, and deployment configuration.
