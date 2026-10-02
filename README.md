# Mantik Aviation

Mantik Aviation is a Nuxt 3 + TypeScript operations demo for Indonesian regional and pioneer aviation operators. Its fictional Operator Penerbangan Perintis connects Papua, Nusa Tenggara Timur, and Maluku. Workflows use SQLite, deterministic synthetic data, API contracts, and role-based demo accounts. Seeded flight and document references use the fictional `PRT` prefix; `MANTIK_` environment variables remain application configuration names.

## Tech Stack

- Nuxt 3, Vue, TypeScript
- Vuetify via `vuetify-nuxt-module`
- SQLite with Drizzle ORM
- Zod contracts shared by client and server
- Vitest, ESLint, Prettier, Husky, lint-staged

## Getting Started

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install
cp .env.example .env
pnpm demo:reset
pnpm dev
```

Open the Nuxt dev URL shown in the terminal. Use the demo persona switcher in the header to move between operations, finance, maintenance, admin, and pilot views.

If pnpm blocks native build scripts for `better-sqlite3`, run:

```bash
pnpm approve-builds
pnpm demo:reset
```

## Environment

Copy `.env.example` to `.env` for local development.

```env
DEMO_MODE=true
DEMO_SESSION_SECRET=<random-secret-of-at-least-32-bytes>
MANTIK_DB_PATH=./data/mantik-demo.sqlite
# Optional Neon tooling; the application runtime still uses SQLite.
DATABASE_URL=postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/neondb?sslmode=verify-full
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/neondb?sslmode=verify-full
```

Local SQLite databases and generated demo exports under `data/` are ignored by git.

Generate a session secret with `openssl rand -base64 48` and configure it before starting the app. Shared product/operator labels and the local logo are defined in `shared/branding.ts`.

### Deploying the neutral demo

- All project-specific environment variables now use `MANTIK_`. Configure the new names from `.env.example`; previous client-prefixed names are not accepted.
- Start with a new SQLite file, then run `pnpm demo:reset` against that explicitly selected file. Do not point the reset command at data you need to keep. The new defaults use separate `mantik-local-*` manifests and an upload directory under `data/uploads/mantik-local`; existing databases, uploads, and hosting resources are not automatically deleted or renamed.
- Vercel uses `/tmp/mantik-demo.sqlite`. For a disposable demo, set `ALLOW_EPHEMERAL_DEMO_DB=true` and `DEMO_SESSION_SECRET`, then redeploy. Temporary SQLite data can disappear and is not shared between function instances.
- Demo cookies and example passwords changed. Sign in again using the accounts in `server/utils/demo-accounts.ts`; enable `DEMO_ACCOUNT_HELPER=true` only when the example account helper should be visible.
- Storage bucket names refer to actual external resources: set `S3_UPLOAD_BUCKET` to a bucket you have created, and use a new manifest key for the neutral demo. No cloud resource is renamed by these changes.
- PostgreSQL tooling uses `mantik_schema_migrations` as its new ledger. Use a separate demo database for this setup; do not run the baseline tooling against an existing migration ledger as a data migration.

Historical design documents and audit artifacts retain their original context. The application remains a single-operator demo; it does not implement tenant isolation for multiple airlines.

## Scripts

- `pnpm dev`: run Nuxt locally.
- `pnpm build`: build the Nuxt app.
- `pnpm preview`: preview the production build.
- `pnpm db:migrate`: create/update the SQLite application schema.
- `pnpm db:neon:check`: verify the configured Neon database and Flight/Station baseline.
- `pnpm db:neon:verify-baseline`: assert the immutable v2 demo data counts before preview cutover.
- `pnpm db:neon:migrate`: apply versioned PostgreSQL migrations through the direct Neon connection.
- `pnpm db:seed`: seed fictional Operator Demo data.
- `pnpm demo:reset`: drop/recreate the demo DB and reseed.
- `pnpm demo:export`: export demo tables to JSON.
- `pnpm test`: run Vitest.
- `pnpm lint`: run ESLint.
- `pnpm format`: run Prettier.
- `pnpm typecheck`: run Nuxt type checking.

## Project Layout

```text
app/                  Nuxt UI, layouts, pages, components, composables
app/utils/operations/ Pure readiness, authorization, and formatter helpers
shared/contracts/     Zod schemas and typed DTOs used by client and server
shared/types/         Cross-cutting types such as demo roles
server/api/           H3/Nitro route handlers
server/services/      Business workflows and domain actions
server/repositories/  Repository interfaces and SQLite implementations
server/db/            Drizzle schema, local connection, migration and seed helpers
scripts/              Local demo lifecycle commands
docs/                 API and architecture documentation
public/uploads/       Mock receipt files and upload target
```

## GitHub Setup

This repository is ready to push to GitHub. Before opening a pull request, run:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same checks on push and pull request.

## Documentation

- See `docs/README.md` for the fuller local demo flow and architecture notes.
- See `docs/backend-demo/README.md` for the scoped Go backend demo specification. The active TypeScript DTOs and API envelopes live under `shared/contracts/`.
