# Environment & portability (Zeyago Ride)

This project is **local-first**: you keep developing against Postgres + optional file storage while **configuration stays in environment variables**, so you can change database or object storage hosts later **without changing ride, wallet, top-up, payment, or admin business logic**.

## Principles

1. **Database**: Prisma reads `DATABASE_URL` from the environment only. No host, port, user, password, or database name is hardcoded in Nest services.
2. **Storage**: Application code depends on **`StorageService`** (`backend/src/storage/storage.service.ts`) only. The driver (`local` vs `s3`) is selected by `STORAGE_DRIVER` and related env vars.
3. **URLs & CORS**: `API_PUBLIC_URL`, `APP_PUBLIC_URL`, `ADMIN_PUBLIC_URL`, and `CORS_ORIGINS` centralize public URLs and browser origins. Defaults for CORS exist only as a last resort in `main.ts` when nothing is configured (see that file).

## Local development (typical)

1. **Postgres** — create a database and set `DATABASE_URL` in the **repo root** `.env` and/or `backend/.env` (see below).
2. **Env files** — Nest loads **repo root** `.env` first, then `backend/.env` (**later wins**). Put shared `DATABASE_URL` in the root `.env`; use `backend/.env` only for Nest-only vars (`PORT`, storage, etc.). If `DATABASE_URL` exists in **both**, the value in `backend/.env` overrides the root — remove it from `backend/.env` if you want the root URL to apply.
3. **Backend env** — from the `backend/` directory:

   ```bash
   cp .env.example .env
   # optional: set DATABASE_URL here, or only in repo root ../.env
   ```

4. **Migrations & seed** (from `backend/` — scripts load `../.env` then `.env`):

   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

5. **Run Nest**:

   ```bash
   npm run start:dev
   ```

6. **Health** — `GET /health` / `GET /health/ready` check database, storage, and notification delivery readiness; `GET /health/live` is a basic liveness probe.

### Env file loading order

`backend/src/main.ts` uses `loadBackendEnv()` which loads, in order (later overrides earlier):

- Repo root: `.env`, `.env.local`
- Backend: `.env`, `.env.local`, `.env.<NODE_ENV>` (e.g. `.env.development`)

Nest `ConfigModule` is configured with `ignoreEnvFile: true` because dotenv is applied in `main.ts` first; validated env is then available via `ConfigService`.

Prisma CLI (`prisma migrate`, `prisma db seed`) uses the same layering via `dotenv-cli` in `backend/package.json` scripts (`-e ../.env -e .env`).

## Local MinIO (S3-compatible storage)

1. Run MinIO (Docker or binary) and create a bucket.
2. Copy `backend/.env.minio.example` into your `backend/.env` (or merge) and set:
   - `STORAGE_DRIVER=s3`
   - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
   - `S3_FORCE_PATH_STYLE=true` (typical for MinIO)
   - `STORAGE_PUBLIC_BASE_URL` — must match how browsers/CDN reach public objects (for private buckets you would add presigned URLs later; that would still live behind `StorageService`, not in domain modules).

3. Restart the API. `GET /health` reports storage `ok: true` when the bucket is reachable.

## Production-style Postgres + S3 (later)

- Set `DATABASE_URL` to your provider’s connection string (often with `sslmode=require`).
- Set `STORAGE_DRIVER=s3` and fill `S3_*` for AWS S3 or any S3-compatible API.
- Set `CORS_ORIGINS`, `API_PUBLIC_URL`, `APP_PUBLIC_URL`, `ADMIN_PUBLIC_URL` to real HTTPS origins.

**Business logic** (`AppStateService`, wallet, rides, admin controllers) does **not** change when you switch hosts—only env and infrastructure do.

## Pooled DBs (PgBouncer / Neon-style)

Today the Prisma schema uses a single `url = env("DATABASE_URL")`. For providers that require a **direct** connection for migrations and a **pooled** URL for runtime, add to `prisma/schema.prisma`:

```prisma
directUrl = env("DIRECT_URL")
```

Then set `DIRECT_URL` to the non-pooled connection in your env. Until you add that line, Prisma migrate uses `DATABASE_URL` only.

## Required vs optional variables

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | `postgresql://...` |
| `JWT_SECRET` | **Yes** | HMAC signing secret for access tokens |
| `ACCESS_TOKEN_TTL_SECONDS` | No | Default `900` |
| `REFRESH_TOKEN_TTL_SECONDS` | No | Default `2592000` |
| `ADMIN_PHONE_NUMBERS` | No | Comma-separated phones that resolve to `admin` role |
| `AUTH_ALLOW_TEST_OTP` | No | Default `true` outside production, `false` in production |
| `AUTH_TEST_OTP_CODE` | When `AUTH_ALLOW_TEST_OTP=true` | Required fallback OTP until a real provider is integrated |
| `PORT` | No | Default `3000` |
| `CORS_ORIGINS` | No | Comma-separated; fallback in `main.ts` |
| `API_PUBLIC_URL` / `APP_PUBLIC_URL` / `ADMIN_PUBLIC_URL` | No | Recommended for consistent links |
| `STORAGE_DRIVER` | No | Default `local` |
| `STORAGE_PUBLIC_BASE_URL` | No | Defaults via `API_PUBLIC_URL` for local driver |
| `STORAGE_LOCAL_ROOT` | No | Default `./storage` |
| `S3_*` | When `STORAGE_DRIVER=s3` | See validation in `env.validation.ts` |
| `NOTIFICATION_PROVIDER` | No | Currently only `log`; readiness stays degraded in production until replaced |

## Safe deploy order

1. Apply migrations with `npm run prisma:migrate:deploy`.
2. Verify `GET /health/ready` is fully `ok` in the target environment.
3. Start the backend only after env validation passes and `JWT_SECRET` / storage / DB are configured.
4. Keep `AUTH_ALLOW_TEST_OTP=false` in real production.

## Frontend (Vite)

Root `.env.example` documents `VITE_API_BASE_URL` and `VITE_USE_MOCK_API`. Point the app at your API using env; no host is hardcoded in the backend’s domain logic.

## Confirming portability

- Switching **Postgres host**: change `DATABASE_URL` only (and migrations as usual).
- Switching **object storage**: change `STORAGE_DRIVER` and storage-related env vars; **do not** edit `rides`, `wallet`, `wallet`, `admin`, or `top-up` flows for that.
