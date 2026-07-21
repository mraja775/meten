# Contributing to Meten

Thank you for helping improve Meten. Keep changes focused, secure and consistent with the documented product scope.

## Development workflow

1. Open or reference an issue for non-trivial changes.
2. Create a focused branch from `main`.
3. Copy `.env.example` to `.env` and use local-only credentials.
4. Add migrations for schema changes; never edit an applied migration.
5. Add tests that demonstrate the behavior or regression.
6. Run the relevant verification commands before opening a pull request.

```bash
npm ci
docker compose up -d postgres
npm run db:deploy
npm run typecheck
npm run lint
npm test
npm run build
```

For Android changes:

```bash
cd consumer-android
./gradlew lintDebug testDebugUnitTest assembleDebug
```

## Engineering expectations

- Scope every business query by academy and exclude soft-deleted rows.
- Derive customer identity from the authenticated session, never request IDs from customers.
- Validate external input and return normalized API errors.
- Never commit `.env`, credentials, signing keys, customer uploads or production data.
- Keep route handlers thin and reusable logic in `lib/`.
- Preserve accessibility and responsive behavior.
- Update documentation when behavior, configuration or architecture changes.

## Pull requests

Use a clear title, explain why the change is needed, identify migrations or environment changes, and include verification evidence. Small, reviewable pull requests are preferred.
