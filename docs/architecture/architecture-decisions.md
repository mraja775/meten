# Meten Architecture Decisions

This document records durable technical decisions for the Meten MVP so future engineers can continue without rediscovering product and architecture intent.

## ADR 001: Build an Academy CRM, Not an ERP

Decision: Meten MVP is limited to dashboard, leads, students, payments, messages, and settings.

Rationale:

- The commercial objective is to onboard the first three paying academies.
- Academy owners need operational clarity, not a broad platform.
- Narrow scope improves quality, speed, and supportability.

Consequences:

- No attendance, scheduling, coach, accounting, website, or parent/student portals.
- Data model should avoid premature entities for future modules.

## ADR 002: Multi-Tenant by Academy

Decision: Every business entity belongs to an academy through `academyId`.

Rationale:

- SaaS tenancy must be explicit from day one.
- Academy-level scoping is simple and sufficient for MVP.

Consequences:

- All queries must scope by `academyId`.
- All list/detail APIs must exclude `deletedAt` records by default.
- Tests should verify tenant isolation for sensitive APIs.

## ADR 003: Soft Delete All Business Tables

Decision: Business tables include `deletedAt`.

Rationale:

- Academy data should not be accidentally destroyed.
- Undo/recovery is valuable for operational software.

Consequences:

- Deletes should set `deletedAt`, not physically delete.
- Unique constraints must account for soft delete where appropriate.

## ADR 004: UUID Primary Keys

Decision: Use UUID primary keys for all tables.

Rationale:

- Avoid exposing sequential IDs.
- Work well for distributed systems and imports later.

Consequences:

- Prisma models use `String @id @default(uuid())`.

## ADR 005: Simple OTP Authentication for Owners

Decision: Use a simple owner OTP login for the MVP.

Rationale:

- The first commercial workflow needs academy owners to sign in with minimal friction.
- OTP avoids password reset flows and keeps the MVP small.
- The implementation still uses hashed OTPs, short expiry, attempt limits, and httpOnly session cookies.

Consequences:

- Product authorization remains in `lib/permissions`.
- Session helpers expose current user, role, and academy.
- Local development logs OTP codes to the server console.
- Production must replace console OTP delivery with Resend before onboarding real academies.

## ADR 006: Two Roles Only

Decision: Roles are `OWNER` and `STAFF`.

Rationale:

- Simple permission model is enough for first customers.
- More roles would create configuration burden.

Consequences:

- Owner can access everything.
- Staff can manage leads, students, payments, and messages.
- Settings are owner-only.

## ADR 007: REST APIs for Data Operations

Decision: Use App Router route handlers for REST-style APIs. Use Server Actions selectively for form flows where it improves ergonomics.

Rationale:

- REST APIs are easy to test and consume with TanStack Query.
- Server Actions are useful but should not hide core business flows.

Consequences:

- Routes live under `app/api`.
- Validation schemas live in `lib/validations`.
- API responses use a consistent JSON envelope.

## ADR 008: Zod for Input Validation

Decision: All inbound API and form payloads are validated with Zod.

Rationale:

- Runtime validation complements TypeScript.
- Shared schemas reduce drift between forms and APIs.

Consequences:

- Do not trust `request.json()` directly.
- Validation failures return `400` with structured field errors.

## ADR 009: Prisma as Database Boundary

Decision: Prisma is the only application database access layer.

Rationale:

- Type-safe queries.
- Migration support.
- Clear schema ownership.

Consequences:

- No raw SQL unless justified and documented.
- Complex dashboard queries may use Prisma transactions before introducing raw SQL.

## ADR 010: Store-Only Messaging in MVP

Decision: Messages are composed and stored, but external provider sending is not implemented in MVP.

Rationale:

- Provider integration adds operational complexity.
- Academies first need message history and templates.

Consequences:

- Message statuses include `DRAFT`, `RECORDED`, `SENT`, and `FAILED`, but MVP will primarily use `DRAFT` and `RECORDED`.
- Provider adapters can be added later behind `lib/messaging`.

## ADR 011: No Public Academy Website in MVP

Decision: Do not build public academy websites or admissions forms in this repository phase.

Rationale:

- The user explicitly separated academy websites from this plan.
- Internal CRM workflows are the commercial priority.

Consequences:

- No `/site/[academySlug]` routes.
- No public admissions API.
- No CMS/content tables.

## ADR 012: Action-Oriented Dashboard

Decision: Dashboard prioritizes tasks and operational exceptions over analytics.

Rationale:

- Academy owners need to know what to do today.

Consequences:

- Metrics should link to filtered workflows.
- Avoid charts unless they directly drive an action.

## ADR 013: Component Strategy

Decision: Use a small local component system compatible with shadcn/ui conventions.

Rationale:

- shadcn/ui provides composable primitives without framework lock-in.
- The product should feel quiet, dense, and professional.

Consequences:

- Components live in `components/ui` and domain-specific component folders.
- Avoid decorative gradients, large marketing sections, and unnecessary animation.

## ADR 014: Testing Pyramid

Decision: Use unit tests for pure logic and validation, integration tests for API/database flows, and Playwright for core user journeys.

Rationale:

- The MVP must be safe to deploy and iterate.

Consequences:

- Validation, permissions, and dashboard aggregation need tests.
- E2E should cover sign-in, lead creation, lead conversion, payment recording, and dashboard visibility.

## ADR 015: Docker-First Deployment

Decision: Provide Dockerfile and docker-compose files for development and production.

Rationale:

- One-command deployment and reproducible environments reduce setup risk.

Consequences:

- `.env.example` must remain current.
- Health endpoint must check app and database state.

## ADR 016: Training Upload Prototype Exception

Decision: Add a mobile-first authenticated training upload prototype even though student login and performance tracking are outside the original CRM MVP.

Rationale:

- The immediate product experiment is to let students or staff capture shooting score sheets from mobile.
- The fastest usable path is inside the existing authenticated app with a student picker.
- The data/API shape can later move behind student authentication without discarding the module.

Consequences:

- `/training` exists in the authenticated app.
- Desktop navigation includes Training and mobile navigation includes a Training bottom-tab.
- `TrainingSession` belongs to both `academyId` and `studentId`.
- Score photos are processed through local multipass Tesseract OCR and deterministic score parsing.
- Improvement suggestions are stored in `parsedScores` as generated metadata.
- Student auth, manual correction, and production object storage were subsequently implemented; see `docs/deployment/consumer-api.md` and `docs/deployment/android-release.md`.
