# Meten Implementation Rules

These rules are binding for this repository unless explicitly changed in a future architecture decision.

## Product Rules

- Keep the product limited to Dashboard, Leads, Students, Payments, Messages, and Settings.
- Do not add a module unless it directly supports lead management, student/payment tracking, or simple communication.
- Exception: `/training` is currently a documented prototype for student score uploads and shooting-score OCR. Keep future changes scoped to `docs/product/training-module-handoff.md` until the product scope is formally revised.
- Do not build public websites in this phase.
- Every screen must have one primary purpose.
- Every dashboard metric should link to an action or filtered workflow.

## Data Rules

- Every business table includes:
  - `id`
  - `createdAt`
  - `updatedAt`
  - `deletedAt`
  - `createdBy`
  - `updatedBy`
- Use UUIDs.
- Scope all business records by `academyId`.
- Exclude soft-deleted records by default.
- Do not physically delete business data through normal application flows.

## Authorization Rules

- Roles are only `OWNER` and `STAFF`.
- Settings are owner-only.
- Staff can manage leads, students, payments, and messages.
- All APIs must verify authenticated academy context.

## API Rules

- Validate all input with Zod.
- Return normalized API errors.
- Use typed route handlers.
- Keep route handlers thin; put business logic in `lib/services`.
- Do not leak records across academies.

## UI Rules

- Use the left navigation exactly:
  - Dashboard
  - Leads
  - Students
  - Training
  - Payments
  - Messages
  - Settings
- Minimal visual style.
- No gradients.
- No decorative animation.
- Use whitespace, typography, and alignment for hierarchy.
- Keep cards compact and purposeful.
- Optimize for desktop, but all flows must be responsive.
- Use accessible controls, labels, focus states, and semantic markup.

## Testing Rules

- Add unit tests for validation and pure business logic.
- Add integration tests for API/database behavior.
- Add Playwright tests for critical user journeys.
- Do not mark a module complete without tests or a documented reason.

## Deployment Rules

- Keep Docker development and production paths working.
- Keep `.env.example` up to date.
- Keep migrations committed.
- Maintain a health endpoint.
- Use structured logging for server-side operational events.
