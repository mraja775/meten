<p align="center">
  <img src="public/metenlogo.png" alt="Meten" width="280" />
</p>

<p align="center">
  A focused academy CRM and student training companion for sports academies.
</p>

<p align="center">
  <a href="https://github.com/mraja775/meten/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mraja775/meten/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Node 22" src="https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white" />
  <img alt="Android API 26+" src="https://img.shields.io/badge/Android-API%2026%2B-3DDC84?logo=android&logoColor=white" />
</p>

Meten gives academy owners one place to manage leads, students, payments and communication, while students use the native Android app to capture score sheets, review OCR-derived performance data and record training reflections.

## Highlights

- Action-oriented academy dashboard
- Lead pipeline and lead-to-student conversion
- Student and payment tracking
- Communication history and templates
- Owner/staff email OTP authentication
- Native Android customer app with encrypted student sessions
- Camera/gallery score-sheet upload and multipass OCR
- Score history, progress summaries and manual OCR correction
- Explicit academy tenancy across sensitive data
- PostgreSQL migrations, repeatable demo seed and Docker workflows
- S3-compatible production image storage with development fallback

## Architecture

```text
Android app ── Bearer/JSON ─┐
                            ├── Next.js API ── Prisma ── PostgreSQL
Owner/staff web ─ Cookie ───┘       │
                                    ├── Resend (OTP email)
                                    ├── S3-compatible storage
                                    └── Tesseract OCR
```

The web application is built with Next.js 15, React 19 and TypeScript. The Android application uses Kotlin and Jetpack Compose. All customer-facing queries derive academy and student scope from authenticated sessions.

## Quick start

Requirements:

- Node.js 22+
- Docker Desktop or PostgreSQL 16+
- Tesseract for local OCR
- Android Studio with SDK 36 for Android development

```bash
git clone https://github.com/mraja775/meten.git
cd meten
cp .env.example .env
npm ci
docker compose up -d postgres
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in as `owner@meten.local`; without Resend configured, the development OTP is printed in the server console.

For the simplest managed local workflow:

```bash
npm run doctor
npm run local:start -- --seed
npm run android:open
```

See the [operations scripts guide](docs/deployment/operations.md) for start, stop, logs, Android installation, and production deployment commands.

The seed creates one academy, two staff users, 100 students, 30 leads and 75 payments. Re-running it safely restores the same demo baseline.

## Android app

```bash
cd consumer-android
./gradlew lintDebug testDebugUnitTest assembleDebug
```

Debug builds connect to `http://10.0.2.2:3000` from the Android emulator. Release builds require HTTPS and environment-provided signing credentials. See the [Android guide](docs/deployment/android-release.md) and [consumer API contract](docs/deployment/consumer-api.md).

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

GitHub Actions runs backend type checking, lint, tests and production build, plus Android debug and minified release verification.

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | Next.js pages and route handlers |
| `components/` | Web UI and domain components |
| `consumer-android/` | Native Kotlin/Compose customer app |
| `lib/` | Authentication, services, validation, OCR and storage |
| `prisma/` | Database schema, migrations and demo seed |
| `tests/` | Web unit and Playwright tests |
| `docs/` | Product, architecture, API and deployment decisions |

## Documentation

- [Product plan](docs/product/mvp-plan.md)
- [API specification](docs/architecture/api-spec.md)
- [Architecture decisions](docs/architecture/architecture-decisions.md)
- [Implementation rules](docs/architecture/implementation-rules.md)
- [Cloud deployment](docs/deployment/cloud-deployment.md)
- [Operations scripts](docs/deployment/operations.md)
- [Android release](docs/deployment/android-release.md)
- [Privacy policy](docs/legal/privacy-policy.md)

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and follow the [Code of Conduct](CODE_OF_CONDUCT.md). Please report vulnerabilities privately according to [SECURITY.md](SECURITY.md), not through public issues.

## License

Meten is available under the [MIT License](LICENSE).
