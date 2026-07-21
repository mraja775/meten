# Android Consumer API

Production student access uses email OTP and opaque bearer sessions. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; production refuses console OTP delivery. A student must be active and have an email. If an email exists at multiple academies, send `academySlug` with the OTP request.

## Authentication

- `POST /api/consumer/auth/request-otp` with `{ "email": "student@example.com", "academySlug": "optional-academy-slug" }`.
- `POST /api/consumer/auth/verify-otp` with `{ "email": "student@example.com", "code": "123456" }` returns an opaque `token`, `expiresAt`, and student profile.
- Send `Authorization: Bearer <token>` on every consumer request.
- `GET /api/consumer/auth/me` validates/restores a session.
- `POST /api/consumer/auth/logout` revokes it.

OTP codes expire in ten minutes, are single use, are limited to five attempts, and have a 45-second resend cooldown. API responses do not disclose whether an email is registered. Tokens are random and stored only as SHA-256 hashes.

## Training

- `GET /api/consumer/training-sessions?page=1&pageSize=20` lists only the authenticated student's sessions.
- `POST /api/consumer/training-sessions` accepts multipart `sessionDate`, optional `sessionTime`, `notes`, `reflectionText`, `reflectionInputMode`, and one to six repeated `images`. `studentId` is ignored/derived from the token.
- `GET /api/consumer/training-sessions/:id` returns an owned session or `404`.
- `PATCH /api/consumer/training-sessions/:id/corrections` accepts `shotScores`, optional `seriesTotals`, `groupSizeMm`, and `notes`. Corrections are stored separately in `verifiedScores` and update summary totals without destroying OCR output.

## Object storage

Production requires all `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET` values. `S3_REGION` defaults to `auto`. `S3_PUBLIC_BASE_URL` should be the CDN/public bucket base used by the app to display images. The filesystem fallback is intentionally available only outside production. Uploaded objects are deleted if later processing or database persistence fails.
