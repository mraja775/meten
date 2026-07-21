# Android Customer App Release

The Android application is in `consumer-android` and is built reproducibly with its checked-in Gradle wrapper. Debug builds use the emulator backend at `http://10.0.2.2:3000`; release builds reject cleartext traffic and must use an HTTPS API URL.

## Local verification

Install Android Studio with Android SDK 36 and JDK 17, start the backend, then run:

```bash
cd consumer-android
./gradlew lintDebug testDebugUnitTest assembleDebug
```

Install `app/build/outputs/apk/debug/app-debug.apk` on an emulator. Request a login code using a seeded student's email or phone, verify it, upload score images, reopen the app, inspect session history and detail, then log out.

## Release configuration

Never commit signing keys or passwords. Set these only in the release environment:

```text
METEN_API_BASE_URL=https://api.your-domain.example
METEN_ANDROID_KEYSTORE_FILE=/secure/path/upload-key.jks
METEN_ANDROID_KEYSTORE_PASSWORD=...
METEN_ANDROID_KEY_ALIAS=...
METEN_ANDROID_KEY_PASSWORD=...
```

Set monotonically increasing versions and create the Play Store bundle:

```bash
./gradlew \
  -PmetenVersionCode=1 \
  -PmetenVersionName=1.0.0 \
  clean lintRelease testReleaseUnitTest bundleRelease
```

The signed bundle is `app/build/outputs/bundle/release/app-release.aab`. If signing variables are absent, Gradle deliberately produces an unsigned release artifact suitable only for CI inspection.

## Store and production checklist

- Point `METEN_API_BASE_URL` at the HTTPS production backend; never ship `api.example.com`.
- Apply all Prisma migrations and verify `/api/health` before testing the app.
- Configure production email/SMS delivery for customer OTP codes; codes must never be returned by the production API or logged.
- Configure durable object storage credentials and backups for customer score images.
- Create and securely back up the Play upload key; enable Play App Signing.
- Supply app icon, feature graphic, screenshots, support contact, privacy-policy URL, and data-safety answers.
- Disclose account identifiers, photos, reflections, and performance records in the Play data-safety form.
- Exercise login throttling, expired/invalid codes, session expiry, logout, upload retry, and tenant isolation on staging.
- Run the GitHub CI workflow and complete device testing on API 26 and API 35 before promotion.
- Use internal testing, then closed testing, staged rollout, and monitor backend error logs/crash reporting.

## Operational security

Bearer tokens are stored using Android encrypted preferences and removed on logout or an unauthorized response. Production networking is HTTPS-only. Rotate signing/API credentials through the deployment platform, use least-privilege object-storage credentials, set retention rules, and provide a support process for account/data deletion requests.
