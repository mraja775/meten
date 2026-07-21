# Meten Cloud Deployment

This guide deploys the Meten backend to one Linux server or VM using Docker
Compose. It starts both the Next.js application and PostgreSQL 16, applies
forward-only database migrations, and verifies the public health endpoint.

> This workflow does **not** publish the Android app. Deploy the backend first,
> then follow [Android release](android-release.md) to build and publish the
> signed Android App Bundle.

## What this deployment includes

- A production Next.js container built from the repository `Dockerfile`
- PostgreSQL 16 with data stored in the `postgres_data` Docker volume
- Prisma migrations applied before the application starts
- Tesseract OCR and OpenSSL in the application image
- Automatic container restart unless explicitly stopped
- A health check at `https://YOUR_DOMAIN/api/health`

You must provide the server, DNS, HTTPS reverse proxy or load balancer,
backups, email delivery, object storage, and monitoring.

## Prerequisites

Before cloning the repository, prepare:

- A supported Linux server or VM with enough storage for PostgreSQL and uploads
- Docker Engine with the Docker Compose plugin
- A non-root deployment user with permission to run Docker
- A domain whose DNS points to the server
- HTTPS termination through a reverse proxy or managed load balancer
- A Resend API key and verified sender address
- An S3-compatible private bucket and credentials

Allow inbound SSH, HTTP, and HTTPS through the firewall. Do not expose the
PostgreSQL service publicly. Port 3000 should be reachable only by the reverse
proxy or load balancer.

## 1. Clone the repository

```bash
git clone https://github.com/mraja775/meten.git
cd meten
git switch main
```

Confirm Docker is available:

```bash
docker --version
docker compose version
docker info
```

## 2. Create the private configuration

Copy the documented template. The populated file is ignored by Git and must
never be committed:

```bash
cp .env.production.example .env.production.local
chmod 600 .env.production.local
```

Edit `.env.production.local` and replace every example value.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | Database created by the bundled PostgreSQL container |
| `POSTGRES_USER` | Database owner used by the application |
| `POSTGRES_PASSWORD` | Strong, unique database password |
| `DATABASE_URL` | Prisma connection URL using host `postgres` |
| `BETTER_AUTH_SECRET` | Random authentication secret of at least 32 characters |
| `BETTER_AUTH_URL` | Public HTTPS backend URL |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS application URL |
| `RESEND_API_KEY` | Production Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, for example `Meten <login@example.com>` |
| `S3_ENDPOINT` | S3-compatible API endpoint |
| `S3_ACCESS_KEY_ID` | Object-storage access key |
| `S3_SECRET_ACCESS_KEY` | Object-storage secret |
| `S3_BUCKET` | Production bucket name |
| `S3_REGION` | Storage region, or `auto` when supported |
| `S3_PUBLIC_BASE_URL` | HTTPS URL from which stored images are served |

Generate secrets with a cryptographically secure tool. If the database
password contains reserved URL characters, URL-encode it in `DATABASE_URL`.
For the bundled database, its host must remain `postgres`, for example:

```text
DATABASE_URL="postgresql://meten:URL_ENCODED_PASSWORD@postgres:5432/meten?schema=public"
```

The S3 identity should have access only to the production bucket. Configure
the bucket and CDN according to the application's privacy requirements; do not
make customer score sheets broadly discoverable.

## 3. Configure HTTPS

Put a TLS reverse proxy or load balancer in front of `127.0.0.1:3000`. Set
`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that public origin, without an
extra path. Example:

```text
https://app.example.com
```

DNS and HTTPS must work before deployment because the deploy script checks the
public `/api/health` URL before reporting success.

## 4. Validate and deploy

Validation checks required values, rejects obvious placeholders and insecure
public URLs, verifies Docker, and renders the Compose configuration. It does
not start or change services:

```bash
./scripts/meten-cloud.sh check
```

Deploy interactively:

```bash
./scripts/meten-cloud.sh deploy
```

Review the prompt and type `DEPLOY`. The command then:

1. Builds a fresh application image.
2. Starts PostgreSQL and waits for readiness.
3. Applies committed Prisma migrations.
4. Starts the application.
5. Waits for the public health endpoint.

It never seeds demo data, deletes Docker volumes, or rolls migrations back.

For controlled automation, use a protected environment file and explicitly
skip the prompt:

```bash
./scripts/meten-cloud.sh deploy --env-file /secure/meten.env --yes
```

## 5. Verify the deployment

```bash
./scripts/meten-cloud.sh status
./scripts/meten-cloud.sh logs
curl --fail --show-error https://YOUR_DOMAIN/api/health
```

Also test staff OTP delivery, customer OTP delivery, authentication, one image
upload, OCR processing, and image retrieval using staging accounts. A healthy
endpoint alone does not verify Resend or S3 credentials.

## Updating production

Create a database backup and review new migration SQL before updating. Then:

```bash
git pull --ff-only
./scripts/meten-cloud.sh check
./scripts/meten-cloud.sh deploy
```

The deployment rebuilds the image and applies pending migrations. It preserves
the PostgreSQL volume and existing application data.

## Backups and recovery

The Docker volume is persistent storage, but it is not a backup. Configure
automated encrypted PostgreSQL backups outside the server and regularly test a
restore. Keep at least one backup from before every schema migration.

For an application rollback, redeploy a known-good Git commit or image. Prisma
migrations are forward-only: never edit or delete an applied migration and do
not automatically reverse schema changes. Prefer a forward repair migration.
Restore a database backup only during a deliberate recovery procedure.

## Using managed PostgreSQL

The included script expects the bundled `postgres` Compose service and waits
for it directly. Setting an external `DATABASE_URL` alone does not convert this
workflow to managed PostgreSQL.

To use a managed database:

1. Enable TLS, automated backups, and point-in-time recovery with the provider.
2. Restrict database network access to the application environment.
3. Use the provider's TLS `DATABASE_URL`.
4. Remove the `postgres` service, volume, and the application's `depends_on`
   entry from a deployment-specific Compose configuration.
5. Run `npm run db:deploy` as a one-off release task before starting the new
   application version.
6. Replace the bundled-Postgres readiness section of `meten-cloud.sh`, or use
   the platform's native release command.

Do not run `npm run db:seed` against production.

## Managed container platforms

Render, Railway, Fly.io, ECS, Kubernetes, and similar platforms should use the
repository `Dockerfile`, but translate this workflow into native services:

- Build the application image from the repository root.
- Store secrets in the platform secret manager, not an uploaded env file.
- Connect to a backed-up PostgreSQL service over TLS.
- Run `npm run db:deploy` once per release before application rollout.
- Run the container on port 3000.
- Check `/api/health` for readiness.
- Keep Resend and S3 configuration identical to the table above.

## Troubleshooting

Configuration validation fails:

- Replace every value copied from `.env.production.example`.
- Ensure all public URLs use HTTPS.
- Ensure `BETTER_AUTH_SECRET` contains at least 32 characters.
- On Linux, run `chmod 600` on the environment file.
- URL-encode special characters in the database password.

The public health check fails:

```bash
./scripts/meten-cloud.sh logs
docker compose --env-file .env.production.local -f docker-compose.prod.yml ps
docker compose --env-file .env.production.local -f docker-compose.prod.yml logs --tail=200 postgres
```

Check DNS, TLS, reverse-proxy routing, port 3000, database connectivity, and
migration output. Avoid printing or sharing the environment file while
troubleshooting.

For architecture and provider-neutral context, see the broader
[cloud deployment runbook](cloud-deployment.md). For local backend, PostgreSQL,
Android Studio, and APK commands, use the [local development README](../local/README.md).
