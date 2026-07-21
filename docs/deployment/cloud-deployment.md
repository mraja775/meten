# Cloud Deployment Runbook

This runbook prepares Meten for a Docker-based cloud deployment. It is provider-neutral on purpose; use it for Render, Railway, Fly.io, a VPS, AWS ECS, or any container platform that can run a Next.js container and connect to PostgreSQL.

## Current Deployment Status

Ready:

- Dockerfile
- `docker-compose.yml` for local development
- `docker-compose.prod.yml` for production-style deployment
- PostgreSQL schema and migration
- Seed script
- Health endpoint at `/api/health`
- Production build passes

Deployment configuration still required:

- Configure Resend; production customer OTP endpoints refuse console delivery.
- Configure HTTPS, domain, managed database backups, and the public privacy-policy URL.
- Configure S3-compatible storage and `S3_PUBLIC_BASE_URL`; production does not use the local filesystem fallback.
- Configure the signed Android release with the final HTTPS API URL.

## Required Environment Variables

```txt
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET
S3_REGION
S3_PUBLIC_BASE_URL
```

For the current MVP, only these are required to boot:

```txt
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
```

## Local Production Smoke Test

Docker Desktop must be running.

```bash
docker compose up -d postgres
npm run db:deploy
npm run db:seed
DATABASE_URL="postgresql://meten:meten@localhost:5432/meten?schema=public" npm run build
DATABASE_URL="postgresql://meten:meten@localhost:5432/meten?schema=public" npm run dev
```

Open:

```txt
http://localhost:3000/dashboard
```

Smoke test:

- Create a lead.
- Change lead status.
- Convert a lead to student.
- Create a student.
- Add a payment due.
- Mark a payment paid.
- Record a message.
- Update settings.
- Check `/api/health`.

## Cloud Deployment Sequence

1. Create a managed PostgreSQL database.
2. Create the app service from this repository.
3. Configure the app as a Docker deployment.
4. Set environment variables.
5. Run migrations:

```bash
npm run db:deploy
```

6. Seed only for demo/staging:

```bash
npm run db:seed
```

7. Start the app:

```bash
npm run start
```

8. Verify:

```txt
/api/health
/dashboard
/leads
/students
/payments
/messages
/settings
```

## Production Checks Before First Paying Academy

- Replace console OTP delivery with Resend.
- Create owner onboarding flow.
- Confirm database backups are enabled.
- Confirm logs are retained.
- Confirm HTTPS is active.
- Set `BETTER_AUTH_SECRET` to a long random production secret.
- Disable seed script in production deployment automation.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.

## Rollback

For the MVP, rollback is platform-level:

- Redeploy the previous image or commit.
- Do not run destructive database commands.
- Restore database backup only if data corruption is confirmed.
