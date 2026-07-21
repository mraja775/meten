# Training Module Handoff

This document records the quick student training upload module added after the original CRM MVP scope. It is intentionally written as a continuation point for future agents.

## Status

Implemented as a production-oriented staff web flow and native Android student flow.

The web flow uses owner/staff cookie authentication and a student picker. The Android customer app uses student email OTP, encrypted bearer-session storage, and server-derived student identity.

## User Flow

Route:

- `/training`

Mobile-first workflow:

1. User logs into Meten.
2. User opens Training from desktop sidebar or mobile bottom nav.
3. User picks the training day and time.
4. User selects the student.
5. User captures a score-sheet photo with the phone camera or uploads an existing image.
6. User adds optional session notes.
7. Upload API stores the normalized image, runs OCR, parses scores, stores digital metrics, and returns improvement suggestions.
8. Recent sessions show the uploaded image, score summary, digital metrics, and suggested actions.

## Files Added Or Changed

Data and migrations:

- `prisma/schema.prisma`
- `prisma/migrations/20260703000000_training_sessions/migration.sql`

API and validation:

- `app/api/training-sessions/route.ts`
- `lib/validations/training.ts`

OCR, score parsing, and recommendations:

- `lib/training/ocr.ts`
- `lib/training/score-parser.ts`

UI and navigation:

- `app/(app)/training/page.tsx`
- `components/training/training-session-uploader.tsx`
- `components/app-shell/nav-items.ts`
- `components/app-shell/mobile-bottom-nav.tsx`
- `components/app-shell/sidebar-nav.tsx`
- `components/app-shell/app-shell.tsx`

Tests:

- `tests/unit/training-score-parser.test.ts`

Docs:

- `docs/product/training-module-handoff.md`
- `docs/architecture/api-spec.md`
- `docs/architecture/architecture-decisions.md`
- `docs/architecture/implementation-rules.md`
- `README.md`

## Data Model

New enum:

- `TrainingProcessingStatus`
  - `PENDING`
  - `PROCESSED`
  - `FAILED`
  - `UNAVAILABLE`

New table:

- `TrainingSession`

Important fields:

- `academyId`
- `studentId`
- `sessionDate`
- `notes`
- `imageUrl`
- `imagePath`
- `imageMimeType`
- `imageSizeBytes`
- `imageWidth`
- `imageHeight`
- `originalFileName`
- `ocrProvider`
- `ocrStatus`
- `ocrText`
- `parsedScores`
- `bestScore`
- `totalScore`
- standard audit fields: `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`

`parsedScores` is JSON and currently stores:

- `rawNumbers`
- `shotScores`
- `shotCount`
- `averageShotScore`
- `scoreSpread`
- `droppedShots`
- `seriesTotals`
- `bestScore`
- `totalScore`
- `groupSizeMm`
- `mpi`
- `actionSuggestions`
- `confidence`

## Upload API

### GET `/api/training-sessions`

Protected route. Returns recent training sessions for the signed-in user's academy.

Query params:

- `page`
- `pageSize`

Response includes each session and selected student fields.

### POST `/api/training-sessions`

Protected route. Accepts multipart form data.

Fields:

- `studentId`: UUID
- `sessionDate`: date
- `sessionTime`: optional time
- `notes`: optional text
- `image`: image file

Behavior:

1. Validates user session and academy scope.
2. Validates student belongs to current academy.
3. Validates uploaded file is an image.
4. Uses Sharp to rotate, resize, and store a normalized JPEG.
5. Saves images to S3-compatible object storage in production, with a development-only local fallback.
6. Runs local OCR through `recognizeScoreText`.
7. Parses digital scores through `parseTrainingScores`.
8. Creates `TrainingSession`.
9. Returns the saved session with student summary.

## OCR Implementation

Current OCR provider:

- Local Tesseract, wrapped as `tesseract-multipass`.

Local binary resolution order:

1. `TESSERACT_BINARY` environment variable
2. `/opt/homebrew/bin/tesseract`
3. `/usr/local/bin/tesseract`
4. `tesseract`

OCR strategy:

- Sharp rotates according to EXIF.
- Image is resized to a larger OCR-friendly width.
- Three OCR passes are run:
  - normalized layout, `--psm 6`
  - high-contrast sparse text, `--psm 11`
  - thresholded score image, `--psm 6`
- Successful pass text is concatenated.
- One failed OCR pass does not fail the upload.
- If all passes fail or return no text, `ocrStatus` is `FAILED`.

The OCR was smoke-tested against the provided shooting-score photo. It extracted plausible values such as:

- series totals like `94.8`, `100.7`, `99.5`, `96.2`
- shot scores around `8.0` to `10.7`
- group size
- MPI
- improvement actions

## Score Parser

Parser file:

- `lib/training/score-parser.ts`

The parser handles common OCR mistakes seen in blurred phone photos:

- `1014` as `10.1`
- `987` as `9.9`
- `962` as `96.2`
- `117mm` as `11.7 mm`
- `Senes`, `Seniestotal`, `Seriestota`, and similar variants
- `¥` as `Y` for MPI parsing

Digital metrics:

- shot scores
- shot count
- average shot score
- score spread
- dropped shots below 9
- series totals
- best score
- total score
- group size in mm
- MPI X/Y in mm
- confidence

Recommendation rules currently use deterministic heuristics:

- Wide group size suggests stability, trigger, and follow-through work.
- MPI offset suggests checking zero, sight alignment, and natural point of aim.
- Large score spread suggests routine/cadence consistency work.
- Multiple sub-9 shots suggests reviewing low-value shots immediately after strings.
- Stable high average suggests preserving routine and adding pressure sets.
- No detected shots suggests retaking the photo with clearer framing.

## UI Details

The Training screen is mobile-first:

- Compact day selector for the last 7 days.
- Student picker.
- Time input.
- Camera capture input with `capture="environment"`.
- File upload fallback.
- Image preview.
- Notes textarea.
- Android consumer workflow posts repeated `images` files plus optional `reflectionText`.
- Speech reflections should be transcribed client-side and sent with `reflectionInputMode=speech`.
- Full-width save button.
- Recent session cards showing:
  - image
  - student
  - date/time
  - score
  - totals count
  - shot count
  - group size
  - average
  - spread
  - dropped shots
  - score chips
  - notes
  - action suggestions
  - OCR status and confidence

Navigation:

- Desktop sidebar now includes Training.
- Mobile bottom nav includes Dashboard, Students, Training, and Payments.

## Remaining enhancements

- OCR is local Tesseract; a dedicated vision provider may improve difficult images.
- A formal coach review workflow and richer longitudinal analytics remain product enhancements.
- Existing records retain their upload-time parser output; add a reprocess job when parser versions require historical updates.
- Live provider smoke tests still require the deployer's PostgreSQL, Resend, and S3 credentials.

## Recommended Next Steps

1. Add an optional stronger OCR/vision provider behind `lib/training/ocr.ts`.
2. Add a reprocess endpoint/job for historical sessions after parser upgrades.
3. Expand trend cards:
   - average score over time
   - group size trend
   - dropped-shot count
   - MPI drift
4. Add database-backed API integration tests and Android instrumentation tests to the device lab.

## Commands Run

Successful verification commands:

```bash
npm run db:generate
npm run db:deploy
npm run typecheck
npm run lint
npm run test
```

Runtime checks:

```txt
GET /api/health -> 200
GET /training -> 307 when unauthenticated
```

`307` for `/training` is expected without a valid login session.
