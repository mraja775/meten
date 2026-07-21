# Meten API Specification

This is the target API surface for the internal Academy CRM MVP.

## Conventions

All protected APIs require an authenticated user and academy context.

Successful responses:

```json
{
  "data": {}
}
```

List responses:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "pageSize": 25
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "fields": {}
  }
}
```

## Health

### GET `/api/health`

Returns application and database health.

## Dashboard

### GET `/api/dashboard/summary`

Returns:

- New leads count
- Pending follow-ups count
- Trials scheduled count
- Pending payments count
- Overdue payments count
- Recent admissions
- Today's tasks
- Recent activity

## Leads

### GET `/api/leads`

Query params:

- `search`
- `status`
- `source`
- `assignedTo`
- `page`
- `pageSize`

### POST `/api/leads`

Creates a lead.

### GET `/api/leads/:id`

Returns lead detail and timeline.

### PATCH `/api/leads/:id`

Updates a lead.

### DELETE `/api/leads/:id`

Soft deletes a lead.

### POST `/api/leads/:id/convert`

Converts a lead into a student and marks the lead as joined.

### POST `/api/leads/:id/activity`

Adds lead activity.

## Students

### GET `/api/students`

Query params:

- `search`
- `status`
- `page`
- `pageSize`

### POST `/api/students`

Creates a student.

### GET `/api/students/:id`

Returns student detail, linked payments, and timeline.

### PATCH `/api/students/:id`

Updates a student.

### DELETE `/api/students/:id`

Soft deletes a student.

## Training Sessions

This module supports authenticated staff web access and customer-scoped Android access. See `docs/product/training-module-handoff.md` and `docs/deployment/consumer-api.md`.

### GET `/api/training-sessions`

Returns recent training sessions for the signed-in user's academy.

Query params:

- `page`
- `pageSize`

### POST `/api/training-sessions`

Creates a training session from a score-sheet image upload.

Content type:

- `multipart/form-data`

Fields:

- `studentId`
- `sessionDate`
- `sessionTime`
- `notes`
- `image` for the legacy single-image client
- `images` repeated for Android or other clients that capture multiple score sheets
- `reflectionText`
- `reflectionInputMode` with `typed` or `speech`

Server behavior:

- Validates authenticated academy context.
- Validates the selected student belongs to the academy.
- Stores normalized JPEGs in S3-compatible object storage in production, with a development-only local fallback.
- Runs multipass local Tesseract OCR for each uploaded image.
- Parses scores and shooting metadata.
- Stores digital metrics and deterministic improvement suggestions in `parsedScores`.

## Student Consumer API

Consumer endpoints use `Authorization: Bearer <opaque-token>` and always return JSON errors.

- `POST /api/consumer/auth/request-otp` accepts `email` and optional `academySlug`.
- `POST /api/consumer/auth/verify-otp` accepts `email` and a six-digit `code`.
- `GET /api/consumer/auth/me` returns the authenticated student profile.
- `POST /api/consumer/auth/logout` revokes the current token.
- `GET|POST /api/consumer/training-sessions` lists/creates only the authenticated student's sessions. The server derives `studentId`.
- `GET /api/consumer/training-sessions/:id` returns only an owned session.
- `PATCH /api/consumer/training-sessions/:id/corrections` stores student-verified score data without overwriting OCR output.

See `docs/deployment/consumer-api.md` for deployment and storage prerequisites.

## Payments

### GET `/api/payments`

Query params:

- `status`
- `studentId`
- `dueFrom`
- `dueTo`
- `page`
- `pageSize`

### POST `/api/payments`

Creates a payment.

### GET `/api/payments/:id`

Returns payment detail.

### PATCH `/api/payments/:id`

Updates payment detail.

### DELETE `/api/payments/:id`

Soft deletes a payment.

### POST `/api/payments/:id/mark-paid`

Marks a payment as paid.

## Messages

### GET `/api/messages`

Returns message history.

### POST `/api/messages`

Creates a draft or recorded message.

### GET `/api/messages/:id`

Returns message detail and recipients.

### POST `/api/messages/:id/record`

Records a message as sent outside Meten.

## Settings

### GET `/api/settings`

Returns academy settings.

### PATCH `/api/settings`

Updates academy settings. Owner only.
