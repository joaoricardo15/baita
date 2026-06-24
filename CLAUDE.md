# Baita — Monorepo

Personal automation platform aimed at normal people. Turborepo + pnpm workspaces monorepo.

- **`apps/frontend/`** — React 18 + Vite app at https://baita.help
- **`apps/backend/`** — Serverless Framework API at https://api.baita.help
- **`packages/shared/`** — Shared Zod schemas (single source of truth for TypeScript models)
- **`tests/e2e/`** — Playwright E2E tests (runs after every deploy)

Each app has its own `CLAUDE.md` with specific conventions. This file governs cross-workspace rules.

## Core Philosophies

1. **Simplicity first** — Simplest solution possible. No over-engineering, no premature abstractions.
2. **Test what matters** — Every medium/large change must be properly tested.
3. **Document changes** — ALL relevant docs updated before claiming done.
4. **Don't reinvent the wheel** — Search for best practices and existing tools first.
5. **Plan thoroughly, review extensively** — Plan before implementing. Review before claiming ready.
6. **Think in user journeys** — Every change, test, and review must be framed in terms of the user journey it protects. See `tests/e2e/USER-JOURNEYS.md` for the complete map.

### Pre-Commit Checklist (Automatic — Do Not Skip)

Before EVERY commit, verify ALL of these automatically:

1. All quality checks pass (`pnpm turbo run lint spell type-check format:check test --filter=!@baita/e2e`)
2. Documentation reflects new features (CLAUDE.md, README.md)
3. New logic has unit test coverage
4. No stale references in docs (paths, branch names, API shapes)

### Feature Development Methodology

1. Use case mapping → 2. Code review → 3. Propose solutions → 4. Plan → 5. Implement → 6. Document → 7. Test → 8. Final review → 9. Functional E2E testing

### Code Style (Prettier)

- No semicolons
- Single quotes
- Trailing commas (ES5)
- Tab width: 2 spaces

### TypeScript Conventions

- Interfaces prefixed with `I` (e.g., `IUser`, `IBot`, `ITask`)
- Strict mode enabled in all packages
- No `any` type (warn in apps, forbidden in shared)
- Named imports only (no default `React` import in frontend)

## Shared Schemas (`@baita/shared`)

All domain models are defined ONCE in `packages/shared/src/models/` using Zod. Both apps import from `@baita/shared`:

```typescript
import { IBot, ITask, TaskSchema, BotSchema, validateBot } from '@baita/shared'
```

When a model changes, update it in `packages/shared/` — both apps get the change automatically.

### Bot Schema Features

The bot schema includes validation and integrity helpers that protect against common workflow building errors:

- **`validateBot(bot)`** — Pre-deploy validation. Catches forward references, missing services, orphaned output mappings, stale sample data. Returns `{ valid, errors, warnings }`.
- **`removeStepReferences(tasks, deletedTaskId)`** — Called when a step is deleted. Removes broken variable mappings in downstream steps and adjusts positional indices.
- **`clearDownstreamSamples(tasks, changedIndex)`** — Invalidates test data in steps that reference a step whose output shape changed.
- **`computeStepConfigHash(task)`** — Fingerprints a step's config (service + inputs) to detect when sample data becomes stale.
- **`RetryPolicySchema`** — Optional per-task retry config (`{ maxAttempts, backoffMs }`). Code generation emits retry loops with exponential backoff.
- **`StepExecutionSchema`** — Structured per-step execution logging with timing (`duration`), status, input/output snapshots.

### Bot Execution: Wait & Resume

The engine supports a **pause-and-resume** mechanism via EventBridge Scheduler one-time schedules:

- **Wait service** (`MethodName.wait`) — A Baita invoke service that pauses bot execution for a configurable duration (1min–2hr).
- **Pause signal** — The `wait()` method returns `{ __pause: true, delayMinutes }`. The orchestration loop (`run.ts`) detects this, serializes execution state (`taskOutputs`, `logs`, `usage`), and the engine handler creates a one-time EventBridge schedule.
- **Resume** — The schedule fires the same bot-engine Lambda with `resumeData` in the event. The engine resumes from the step after the wait with pre-populated state.
- **Self-cleanup** — One-time schedules use `ActionAfterCompletion: 'DELETE'`. Bot deletion (`deleteScheduleGroup`) removes any pending waits.
- **Safety** — Pause signals are only accepted from `MethodName.wait` tasks (user code cannot inject them). Payload size is validated (<200KB). Bot edits during wait are detected (step bounds check).

### iPhone Event Trigger (`ServiceName.phoneEvent`)

A trigger type for bots activated by iPhone Shortcuts automations. Functionally identical to a webhook (same `POST /bots/{id}/run/{token}` endpoint) but with:

- **iOS-only visibility** — Filtered from the service picker on non-iOS devices (frontend-only check via `isIOSDevice()`)
- **Guided setup UI** — The frontend renders step-by-step Shortcuts configuration instructions when this trigger is selected
- **No backend changes** — The backend processes it exactly like any webhook trigger

### Track Mode (Location Intelligence)

Background location tracking with automatic place detection and bot triggers.

**Architecture:**

- **Ingestion**: `POST /geo/ingest/{token}` — accepts GPS point batches (OwnTracks/Overland/Shortcuts compatible), token-based auth (same as bot run endpoint)
- **Processing pipeline** (`src/controllers/geo.ts`): Noise filter → stay-point detection (Li et al. 2008) → place matching → new place detection → bot triggering
- **Geo utilities** (`src/lib/geo.ts`): Haversine distance, stay-point detection, place matching, importance scoring

**Entity types:**

- `usual-place` — Auto-detected places with adaptive radius, visit count, importance score, centroid tracking

**Bot trigger**: `ServiceName.locationEvent` — fires when arriving at/leaving a place, or when a new place is detected. Same async Lambda invocation as webhooks/schedules.

**Push notification**: When a new place is detected, sends a Web Push asking the user if they want to save it.

**Frontend**: Places page has a "Usual" tab showing auto-detected places ranked by importance score.

### API Contract

- Response format: `{ success: boolean, message?: string, data?: T }`
- Backend endpoints define the contract
- Frontend Axios calls must match the backend contract exactly

### Runtime Data Patterns (Not Visible in Static Code)

The generic Data controller (`src/controllers/data.ts`) constructs DynamoDB sortKeys dynamically as `#{type}#{id}`. This means some data records **cannot be found by grepping the codebase** — they are written at runtime via `PUT /data/{type}`. Key examples:

- `#CONTENT#{contentId}` — Written by the frontend when user reacts to feed content (swipe). Used by `publishContent()` for deduplication. The dedup query in `controllers/user.ts` references `#CONTENT` but the write happens through the generic Data CRUD path.
- `#CONNECTION#{connectionId}` — OAuth connections
- Any custom data type the user creates

**When debugging data flow**: always consider that DynamoDB records with any `#TYPE#` pattern may be written through the generic data endpoint, not through a dedicated code path.

### Connector Icons

All connector/service icons live in `apps/frontend/public/icons/` and are referenced as `/icons/{name}.{ext}` in connector manifests (`packages/shared/src/connectors/*.ts`).

**Rules for adding new connector icons:**

1. **Format**: SVG preferred (scales perfectly), PNG at minimum 128x128px as fallback
2. **Location**: `apps/frontend/public/icons/{connector-id}.{svg|png}`
3. **Reference**: Set `icon: '/icons/{connector-id}.{svg|png}'` in the connector manifest
4. **Never use external favicon.ico** — they are 16-32px and look blurry at display size
5. **Never hotlink external CDNs** — they can 404, require auth, or change without notice
6. **Style consistency**: Icons render at 20x20px with `border-radius: 4px` and `object-fit: contain`
7. **Source**: Get official logomarks from the service's brand/press page, or create a clean SVG representation

### Data Formats (Canonical — No Exceptions)

| Concern                                | Format                                  | Example                                |
| -------------------------------------- | --------------------------------------- | -------------------------------------- |
| Place ID                               | UUID v4                                 | `00ab5797-5242-4adc-944c-55c70046bbd3` |
| Usual-Place ID                         | `up-{timestamp}-{random}`               | `up-1719043200000-abc123`              |
| Bot/Connection ID                      | `generateId()` (12-char alphanumeric)   | `aBcDeFgHiJkL`                         |
| S3 image key                           | `{placeId}-{uuid}.{ext}` (flat, no `/`) | `00ab5797-...-f47ac10b-....jpg`        |
| Date fields (`createdAt`, `updatedAt`) | ISO 8601 string                         | `2025-06-15T10:30:00.000Z`             |
| Connection ID type                     | `string` only                           | Never `number`                         |

**Rules:**

- **No numeric timestamps** — always `new Date().toISOString()` for date fields
- **No slashes in S3 keys** — flat keys only, use `-` as separator
- **No `_new-` prefix** — generate placeId before upload (use `crypto.randomUUID()`)
- **Connection IDs are always strings** — no `z.union([z.string(), z.number()])`
- **Image URLs** — always `${FILES_BASE_URL}/${encodeURIComponent(key)}` (safe because keys have no `/`)

## CI/CD Pipeline

Single unified workflow in `.github/workflows/ci.yml` triggered on push to `main`:

```
quality (turbo: lint + spell + type-check + format:check + test — all parallel, cached)
    │
    ├── deploy-frontend (build + CloudFormation + Amplify upload)
    ├── deploy-backend  (Serverless Framework + OpenAPI docs)
    ├── deploy-auth0    (auth0-deploy-cli)
    │
    └───────┬── e2e (setup → journey tests → cleanup)
```

Quality gate uses Turborepo to run all checks in parallel with remote caching (via `rharkor/caching-for-turbo`). Unchanged packages are skipped entirely on subsequent runs. All three deploys run in parallel after quality passes. E2E tests run after all deploys complete.

**Quality**: `pnpm turbo run lint spell type-check format:check test` — runs across `@baita/shared`, `@baita/frontend`, and `@baita/backend` in parallel. Turbo remote cache means unchanged packages return instantly.

**Deploy Frontend**: Builds frontend (Vite), deploys CloudFormation stack (Amplify app), uploads to Amplify.

**Deploy Backend**: Serverless Framework deploys Lambda functions, API Gateway, DynamoDB table, S3 buckets, and IAM roles. Generates and deploys OpenAPI docs to S3.

**Deploy Auth0**: Uses `auth0-deploy-cli` to apply `infra/auth0/tenant.yaml` — manages actions, clients, connections, and grants.

**E2E**: Sets up test user (Auth0 signup), runs Playwright journey specs against production, cleans up (`if: always()`).

## E2E Testing

Shared E2E tests in `tests/e2e/` use Playwright and simulate real user flows. They use a fixed test user (`e2e-test@baita.help`) — each run signs up fresh via browser-based Auth0 login and deletes the user in cleanup.

- **Auth method**: Browser-only (Playwright clicks through Auth0 login — no ROPG/API-based auth)
- **System connections**: Connector tests copy OAuth tokens from the `baita` system user to the test user (avoids re-authenticating with providers)
- **CI**: Hits production (`API_URL=https://api.baita.help`) after both apps deploy
- **Three-phase execution**: `e2e:setup` → `e2e:test` → `e2e:cleanup` (all npm scripts, all TypeScript)
- **Cleanup**: Pure Node script (no browser) — reads saved token, calls `DELETE /user`. Runs `if: always()` in CI.

```bash
# Run E2E tests locally (auto-starts backend + frontend, cleanup runs regardless)
cd tests/e2e && npm test

# Run against production (same as CI)
cd tests/e2e && npm run test:prod

# Run individual phases
cd tests/e2e && npm run e2e:setup    # Sign up user, save token
cd tests/e2e && npm run e2e:test     # Run journey specs
cd tests/e2e && npm run e2e:cleanup  # Delete user via API
```

## Quick Commands

```bash
# Install all dependencies
pnpm install

# Start both servers for local dev
cd apps/backend && npm start &
cd apps/frontend && npm start

# Run all quality checks (same as CI)
pnpm turbo run lint spell type-check format:check test --filter=!@baita/e2e

# Run tests in watch mode (local dev)
cd apps/frontend && npm run test:watch
cd apps/backend && npm run test:watch

# Run E2E tests
cd tests/e2e && npm test
```

## Data Architecture

All domain data is user-scoped and stored in a single DynamoDB table (`baita-backend-prod`). The **Entity Type Registry** (`packages/shared/src/registry.ts`) is the central source of truth for all entity types — it maps each type to its Zod schema, ID field, and singleton flag.

```
┌─────────────────────────────────────────────────────────────────┐
│  Entity Type Registry (packages/shared/src/registry.ts)         │
│  ─ schema, idField, singleton per type                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │ imports
┌────────────────────────────────▼────────────────────────────────┐
│  Data Controller (apps/backend/src/controllers/data.ts)         │
│  ─ validate(), list(), read(), create(), update(), delete()     │
│  ─ updateNested(), appendToList(), deleteAllForUser()           │
│  ─ ONLY file that imports @/lib/dynamodb                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │ DynamoDB ops
┌────────────────────────────────▼────────────────────────────────┐
│  DynamoDB (baita-backend-prod) — Single-table design                    │
│  PK: userId  |  SK: #TYPE or #TYPE#id                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

- **Single Data Gateway**: Only `controllers/data.ts` touches DynamoDB. All other controllers delegate data operations to it.
- **User-scoped storage**: Every record uses `userId` as partition key. The `userId` is NOT stored inside entity schemas — it's a storage concern handled by the Data controller.
- **Schema-driven validation**: The Data controller calls `validate()` using the registry's Zod schema before writes. Adding a new entity type = add a schema + registry entry. Zero backend code changes.
- **Self-documenting API**: OpenAPI docs use `getRegisteredTypes()` to dynamically populate the type enum — docs stay in sync automatically.

### Adding a New Entity Type

1. Create schema in `packages/shared/src/models/{type}/{type}.schema.ts`
2. Add entry to `entityRegistry` in `packages/shared/src/registry.ts`
3. Export from `packages/shared/src/models/index.ts`
4. Done — CRUD endpoints (`/data/{type}`) work automatically

## AWS Context

- **Profile**: Always use `--profile baita --region us-east-1`
- **Region**: `us-east-1` for everything
- **Backend stack**: `baita-backend-prod` (Serverless Framework / CloudFormation)
- **Frontend stack**: `baita-frontend-prod` (CloudFormation — Amplify app + branch)
- **Resource prefix**: `baita-backend-prod` (DynamoDB table, S3 buckets, Lambda roles)
- **Amplify App ID**: Dynamic — read from `baita-frontend-prod` stack outputs in CI (not hardcoded)

## Environment Variables & Secrets

Consistent pattern across the monorepo: **no secrets in source code**.

### GitHub Secrets (CI/CD)

| Secret                       | Purpose                          |
| ---------------------------- | -------------------------------- |
| `AWS_ACCESS_KEY_ID`          | AWS deploy credentials           |
| `AWS_SECRET_ACCESS_KEY`      | AWS deploy credentials           |
| `E2E_TEST_PASSWORD`          | E2E test user Auth0 password     |
| `VITE_GOOGLE_MAPS_API_KEY`   | Google Maps JS API key (build)   |
| `VITE_GOOGLE_MAPS_MAP_ID`    | Google Maps map style ID (build) |
| `AUTH0_DEPLOY_CLIENT_ID`     | Auth0 M2M client ID (deploy)     |
| `AUTH0_DEPLOY_CLIENT_SECRET` | Auth0 M2M client secret (deploy) |

### Backend (AWS Lambda + SSM Parameter Store)

Genuine secrets stored in AWS SSM under `/baita/prod/*` — resolved at deploy time by Serverless Framework. Public config (Auth0 domain, OAuth token URLs) is hardcoded in `serverless.yml`.

| SSM Parameter                           | Purpose                         |
| --------------------------------------- | ------------------------------- |
| `/baita/prod/auth0-m2m-client-id`       | Auth0 M2M application client ID |
| `/baita/prod/auth0-m2m-client-secret`   | Auth0 M2M application secret    |
| `/baita/prod/auth0-create-user-api-key` | Auth0 Post-Login Action API key |
| `/baita/prod/pipedrive-client-id`       | Pipedrive OAuth client ID       |
| `/baita/prod/pipedrive-client-secret`   | Pipedrive OAuth client secret   |
| `/baita/prod/google-client-id`          | Google OAuth client ID          |
| `/baita/prod/google-client-secret`      | Google OAuth client secret      |
| `/baita/prod/news-api-key`              | NewsAPI key                     |
| `/baita/prod/vapid-public-key`          | Web Push VAPID public key       |
| `/baita/prod/vapid-private-key`         | Web Push VAPID private key      |

```bash
# List all parameters
aws ssm describe-parameters --profile baita --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/baita/prod/"

# Update a secret
aws ssm put-parameter --profile baita --region us-east-1 \
  --name "/baita/prod/<param>" --value "<value>" --type SecureString --overwrite

# After updating: redeploy backend to pick up new values
cd apps/backend && npm run deploy
```

### Frontend (Vite + build-time injection)

Frontend env vars use Vite's `import.meta.env.VITE_*` pattern — injected at **build time**, NOT runtime.

| Variable                   | Purpose                      | Security                                           |
| -------------------------- | ---------------------------- | -------------------------------------------------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JS API key       | Public (restrict via HTTP referrer in GCP Console) |
| `VITE_GOOGLE_MAPS_MAP_ID`  | Google Maps custom map style | Public                                             |

**Local development** — create `apps/frontend/.env.local` (gitignored):

```bash
VITE_GOOGLE_MAPS_API_KEY=<key>
VITE_GOOGLE_MAPS_MAP_ID=<map-id>
```

**Production** — set as GitHub Secrets. They're passed to the Vite build step in `.github/workflows/ci.yml`.

### Key Principles

1. **Never hardcode secrets** in source code — use SSM (backend) or GitHub Secrets (frontend build)
2. **Frontend keys are inherently public** — security comes from provider-side restrictions (HTTP referrer, API scoping), not from hiding the key
3. **Rotate keys immediately** if accidentally committed — rotate in SSM/GCP Console, update secrets, redeploy
4. **`.env.local` is gitignored** — safe for local development secrets
5. **Public config in code** — Auth0 domain, OAuth token URLs, audience are NOT secrets — hardcoded in `serverless.yml`

## Consistency Checks

Before pushing, verify:

- [ ] `pnpm turbo run lint spell type-check format:check test --filter=!@baita/e2e` passes
- [ ] Schema changes in `packages/shared/` don't break either app
- [ ] Both apps' CLAUDE.md files are consistent with this root file
- [ ] Every page handles API failures gracefully (no infinite loading)
- [ ] E2E test changes are compatible with CI environment (tests hit `https://api.baita.help` in CI, not localhost)

## AWS Resource Integrity

User accounts are data-only entities in DynamoDB (no per-user infrastructure). Bots have coupled AWS resources (EventBridge Scheduler) that MUST be cleaned up on deletion.

**Deletion safety order** — always delete external/coupled resources FIRST, DynamoDB LAST:

- **User deletion**: Auth0 → bot schedulers → DynamoDB records
- **Bot deletion**: EventBridge Scheduler group → DynamoDB record
- **Connection deletion**: Clear bot task references → DynamoDB record

**Critical rules:**

- **Never delete DynamoDB user records directly** — use `DELETE /user` endpoint
- **Never delete bots directly from DynamoDB** — use `DELETE /bots/{botId}` (cleans up EventBridge Scheduler)
- **Never delete connections directly** — use `DELETE /connections/{connectionId}` (cascades to linked bots)
- **Any code that creates/deletes users or bots MUST go through the controller methods** — they handle all coupled resource cleanup
- **Never swallow errors on external resource cleanup** — if scheduler/Auth0 deletion fails, propagate so the user can retry

**Resource audit**: Run `cd apps/backend && ./scripts/audit-resources.sh` to detect orphaned schedulers, S3 files, or DDB records without a parent user.

## Self-Verification with Playwright MCP

After implementing frontend changes, verify them using the Playwright MCP browser tools:

1. Start the Vite dev server: `cd apps/frontend && npx vite --port 3000 --open false &`
2. Navigate: `browser_navigate` to `http://localhost:3000`
3. Check for errors: `browser_console_messages` (filter by `error` level)
4. Check network: `browser_network_requests` (look for failed requests)
5. Verify content: `browser_snapshot` (accessibility tree shows rendered page structure)
6. If errors found → fix them → repeat from step 2

The frontend dev server includes a mock API plugin (see `vite.config.ts`) that serves local JSON data — no backend needed for UI verification.

## Testing Strategy

Tests are organized around **user journeys** — every test file maps to a customer-facing flow. See `tests/e2e/USER-JOURNEYS.md` for the complete reference.

### Test Layers

| Layer               | Location                          | Purpose                                             |
| ------------------- | --------------------------------- | --------------------------------------------------- |
| **Unit (Frontend)** | `apps/frontend/src/**/*.test.tsx` | Component rendering, provider state, utility logic  |
| **Unit (Backend)**  | `apps/backend/src/**/*.test.ts`   | Controller logic, endpoint handlers, task execution |
| **Unit (Shared)**   | `packages/shared/src/tests/`      | Schema validation, integrity helpers                |
| **E2E**             | `tests/e2e/tests/*.spec.ts`       | Full user journeys against real API + Auth0         |

### E2E Test Suite

```bash
cd tests/e2e && npm test        # Local (auto-starts backend + frontend)
cd tests/e2e && npm run test:prod  # Against production (same as CI)
```

- Three-phase execution: `e2e:setup` → `e2e:test` → `e2e:cleanup` (npm scripts)
- Setup (`user-lifecycle.spec.ts`): Clean slate (delete stale user), sign up fresh, provision resources, copy Google connection
- Journeys: `google-gmail`, `todo-journey`, `bot-journey`, `connections`, `pages-security`, `feelings-journey`, `content-feed`
- Cleanup (`scripts/cleanup.ts`): Delete account via API (pure Node, no browser)
- Clean-state principle: nothing exists before tests, everything deleted after
- Local: both servers auto-start (serverless offline + Vite)
- CI: hits production after deploy (`API_URL=https://api.baita.help`)

### Test Cleanup Rules

Tests that create resources in DynamoDB **MUST** clean up:

- Use `test.afterAll()` hooks for guaranteed cleanup even on test failure
- Use timestamp-based IDs (`smoke-${Date.now()}`) to avoid collisions
- Never leave orphaned bots (they cost Lambda/API Gateway resources)

## User Journey Mindset

**This is a mandatory operating principle.** When working in this repo:

1. **Before implementing** — Ask: "Which user journey does this change serve?" If you can't answer, the scope is unclear.
2. **Before writing tests** — Frame tests as: "User does X, expects Y." Not: "Function returns Z."
3. **Before reviewing** — Check: "Are all affected user journeys still protected by tests?"
4. **Before claiming done** — Verify: "Would a user completing this journey notice the change works?"
5. **When adding features** — Update `tests/e2e/USER-JOURNEYS.md` with new use cases and coverage.
6. **When deleting tests** — Only delete if the user journey it protected is no longer valid.

The full journey map lives at `tests/e2e/USER-JOURNEYS.md`. Keep it current.

## Live Feedback Loop

When a principle or rule is discovered during work that is broadly applicable, capture it proactively in this file. No permission needed.
