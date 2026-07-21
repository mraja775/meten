# Meten Customer Android App

Native Android application for students to securely capture score sheets, add typed or speech reflections, review history and progress, inspect OCR results, and correct extracted scores.

## Customer flow

1. Request a one-time code using the email on the student's academy record.
2. Verify the code. The opaque bearer session is held in encrypted Android storage.
3. Capture or select up to six score-sheet images and save the session.
4. Review session history, details, parsed scores and progress; correct OCR values where necessary.
5. Log out from Profile to revoke and erase the local session.

The backend derives the student and academy from the bearer token. The app never asks customers for database IDs, cookies, or an API URL.

## Build and test

Android Studio with SDK 36 is supported, or use the checked-in wrapper with JDK 17 or newer:

```bash
./gradlew lintDebug testDebugUnitTest assembleDebug
```

Debug builds connect to `http://10.0.2.2:3000` and permit cleartext traffic only for emulator development. Start the Next.js backend, apply migrations, seed a student with an email, and request the OTP. Outside production the code is written to the backend log when Resend is not configured.

Release builds are HTTPS-only. Supply `METEN_API_BASE_URL` and the signing variables described in [`docs/deployment/android-release.md`](../docs/deployment/android-release.md); never commit signing material.

## API

The app uses `/api/consumer/auth/*` and customer-scoped `/api/consumer/training-sessions/*` endpoints. See [`docs/deployment/consumer-api.md`](../docs/deployment/consumer-api.md) for the complete authentication, storage, and request contract.
