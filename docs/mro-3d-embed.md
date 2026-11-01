# MRO 3D App Shell demo

## Deployment identity (verified 1 November 2026)

`https://aviation.mantik.id` resolves in Vercel to project **avaition-mantik**
(the project name contains that spelling), repository
`MantiqTechnology/aviation-mantik`, branch `demo`. The inspected deployment was
`dpl_HNiRWMLW1MaPJMThAKfeeGi82LNj`, commit
`4bce6528095d8ea157d0af0d9f73767c2f90b3d0`. Do not deploy AMA-Interface.

The separate remote is `MantiqTechnology/Airplane-MRO-3D`, root directory
`mro-web`. Deploy its embed change before enabling the host URL. This change
has not itself deployed either application.

Host environment:

```dotenv
NUXT_PUBLIC_MRO3D_EMBED_URL=https://airplane-mro-3d.vercel.app/embed
```

Leave it empty to show the configuration fallback. HTTPS `/embed` URLs only;
no credentials, query parameters or fragments. Local HTTP is accepted only in
host development mode. Never put session tokens in this public setting.

The host uses its existing default layout and `maintenance.package.read` for
both the menu and direct route access. Remote records remain local IndexedDB
simulation data; they are not Aviation maintenance records or authenticated
approvals. Remote access itself is public; host RBAC does not secure that URL.

The remote production CSP permits framing only by `https://aviation.mantik.id`.
Preview aliases are deliberately not allowed. The remote development config
additionally allows exactly `http://127.0.0.1:3467` for local verification.
No wildcard origin is used. Verify actual deployed CSP/X-Frame-Options and
any host infrastructure `frame-src` policy before declaring production ready.

## Safe local smoke test

Install locked dependencies with Node 22 (`corepack pnpm install --frozen-lockfile`
in host, `npm ci` in remote). Do not use `demo:prepare`, `demo:reset`, or the
standard Playwright configuration for this smoke test.

Terminal 1, in `Airplane-MRO-3D/mro-web`:

```sh
npm run dev -- --port 3100
```

Terminal 2, in `aviation-mantik`:

```sh
mkdir -p /tmp/mro-embed-smoke
DEMO_MODE=true \
DEMO_SESSION_SECRET=mro-embed-isolated-test-secret-32-bytes \
ALLOW_EPHEMERAL_DEMO_DB=true \
MANTIK_DB_PATH=/tmp/mro-embed-smoke/host.sqlite \
MANTIK_SKIP_STARTUP_RESET=true \
MANTIK_UPLOAD_DIR=/tmp/mro-embed-smoke/uploads \
MANTIK_UPLOAD_MANIFEST=/tmp/mro-embed-smoke/uploads.json \
MANTIK_DOCUMENT_MANIFEST=/tmp/mro-embed-smoke/documents.json \
DEMO_ACCOUNT_HELPER=true \
NUXT_PUBLIC_MRO3D_EMBED_URL=http://127.0.0.1:3100/embed \
corepack pnpm dev --host 127.0.0.1 --port 3467
```

The existing startup plugin initializes a new disposable database in `/tmp`;
it does not open/reset/seed the existing project database. Use only isolated
browser profiles. Tests log into the local server using its demo account helper.

Terminal 3, in host:

```sh
corepack pnpm exec vitest run tests/demo-route-access.test.ts tests/utils/mro3d-embed.test.ts tests/i18n/messages.test.ts
corepack pnpm exec playwright test --config=playwright.mro-embed.config.ts
```

The special config has **no webServer or reset command**, uses only fixed local
origins, creates isolated browser contexts, and writes screenshots/traces to
`/tmp/mro-embed-smoke`. It checks standalone and embedded remote modes, 3D
controls, shell navigation, responsive bounds, permission rejection, remote
failure and return to maintenance. Run heavy builds/typechecks sequentially
with browser/dev servers stopped on memory-constrained machines.

## Behavior and limitations

- The iframe is recreated on Retry or revisiting the route; camera selection
  may reset. IndexedDB data stays browser/origin-specific and can be partitioned
  or unavailable in embedded contexts.
- `load` only ends the loading indicator; it does not certify viewer readiness.
  Retry and the external link always remain available. A slow-load message
  appears after 15 seconds. Framing/network failures cannot be reliably inspected
  from the cross-origin parent.
- Remote theme controls remain available; host theme does not automatically
  change the remote theme. No postMessage, SSO, live APIs or database coupling.
- The remote keeps its component tree and workspace tabs as functional controls,
  while hiding its branding header in embed mode. Presentation controls remain.
- Existing `/maintenance/quality` menu points to a missing page; this feature
  does not alter that pre-existing condition.

## Rollback

Clear `NUXT_PUBLIC_MRO3D_EMBED_URL` and redeploy the host to display the safe
fallback immediately. To remove the feature, revert only the MRO embed changes
listed in the implementation report in each repository and redeploy. No schema,
data or lockfile rollback is required. Reverting the remote first while leaving
the host URL enabled may display the standalone chrome until host rollback.

## Verification record (1 November 2026)

- Deployment identity verified via Vercel deployment metadata (repo, branch,
  commit, alias), not inferred from project spelling.
- Remote typecheck and production build passed. Browser smoke passed for both
  production `/` (summary) and `/embed` (3D). Production CSP was inspected and
  browser-tested to reject a non-allowlisted local ancestor.
- Local integration: standalone/embedded controls, host sidebar and active state,
  Topbar title, permission rejection, retry, external link, unavailable remote,
  return to Maintenance, and 1440/1024/768px overflow checks passed. Screenshots
  were inspected. Camera drag/wheel input and existing camera controls were exercised.
- Targeted unit tests: 27 passed. ESLint on all changed/new TypeScript and Vue
  files passed without warnings.
- Host typecheck: 193 diagnostics in 50 source files. Every diagnostic source
  file was compared byte-for-byte with HEAD and is unchanged; no diagnostic
  points at the feature's modified/new files. The log is
  `/tmp/mro-host-typecheck.log`. The full baseline typecheck comparison was
  interrupted to reduce memory use; this is source comparison evidence, not a
  claim that a separate baseline run completed.
- All 189 existing host page files are byte-identical to HEAD. Host app.vue,
  default layout, backend/schema/API, dependencies and lockfiles are unchanged.
  AMA-Interface remains clean. Browser regression coverage is sampled, not all
  189 pages.
- Production deployment of these changes and an iframe smoke test on the live
  host have not been performed. Do not treat local success as production signoff.

## Change manifest

Host (`aviation-mantik`):

| File | Purpose |
| --- | --- |
| `app/pages/mro-3d.vue` (new) | Default-layout iframe, loading, slow-load notice, retry and fallback |
| `app/utils/mro3dEmbed.ts` (new) | Public URL validation |
| `app/components/layout/sidebar/Sidebar.vue` | MRO menu entry and permission |
| `app/components/layout/Topbar.vue` | Route title |
| `app/utils/demoRouteAccess.ts` | Explicit maintenance permission rule |
| `shared/i18n/messages.ts` | English/Indonesian labels and fallback text |
| `nuxt.config.ts` | Public runtime configuration |
| `.env.example` | Remote URL setting |
| `tests/demo-route-access.test.ts` | Allowed/denied roles |
| `tests/utils/mro3d-embed.test.ts` (new) | Safe/invalid URL cases |
| `tests/mro-embed/embed.spec.ts` (new) | Remote and shell browser regression |
| `playwright.mro-embed.config.ts` (new) | Local-only smoke without reset setup |
| `docs/mro-3d-embed.md` (new) | Deployment, testing, limitations and rollback |

Remote (`Airplane-MRO-3D/mro-web`):

| File | Purpose |
| --- | --- |
| `app/app.vue` | Path-selected embed mode and relocated demo controls |
| `app/assets/embed.css` (new) | Embedded viewport and internal scrolling |
| `nuxt.config.ts` | Exact framing allowlist, development override, embed styles |
| `DEMO.md` | Embed usage and framing requirements |

The default Node-preset host build completed client and SSR bundling but failed
in Nitro with the existing 6144 MB V8 heap limit (`/tmp/mro-host-build.log`).
No memory/dependency configuration was changed. The deployment-specific
`build:vercel` check is recorded separately below; the application already
sets `ssr: false` when `VERCEL=1` to reduce the deployment graph.

Host deployment build **passed**:
`NUXT_BUILD_DIR=.nuxt-embed-vercel corepack pnpm build:vercel`.
Output: `.vercel/output`; log: `/tmp/mro-host-vercel-build.log`.
This validates the local Vercel adapter build, not a new live deployment.

An additional browser check with the host runtime URL empty passed: the
configuration fallback appears, no iframe is created, and the shell remains
visible. Screenshot: `/tmp/mro-embed-smoke/empty-config.png`. All task-owned
local preview/dev servers were stopped after verification.
