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

1. All affected test suites pass (`pnpm turbo run test`)
2. Type-check passes (`npx tsc --noEmit` on affected packages)
3. Documentation reflects new features (CLAUDE.md, README.md)
4. New logic has unit test coverage
5. No stale references in docs (paths, branch names, API shapes)

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

All domain models are defined ONCE in `packages/shared/src/schemas/` using Zod. Both apps import from `@baita/shared`:

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

### API Contract

- Response format: `{ success: boolean, message?: string, data?: T }`
- Backend endpoints define the contract
- Frontend Axios calls must match the backend contract exactly

### Runtime Data Patterns (Not Visible in Static Code)

The generic Data controller (`src/controllers/data.ts`) constructs DynamoDB sortKeys dynamically as `#{type}#{id}`. This means some data records **cannot be found by grepping the codebase** — they are written at runtime via `POST /data/{type}`. Key examples:

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

## CI/CD Pipeline

Single unified workflow in `.github/workflows/ci.yml` triggered on push to `main`:

```
quality (shared type-check → frontend lint/spell/type-check/test/build → backend lint/type-check/test)
    │
    ▼
deploy-auth0 (identity layer — apps depend on it)
    │
    ├── deploy-frontend (CloudFormation + Amplify upload)
    ├── deploy-backend  (Serverless Framework)
    │       │
    │       └── deploy-docs (OpenAPI spec → S3, after backend creates the bucket)
    │
    └───────┬── e2e (setup → journey tests → cleanup)
```

Quality gate runs once — all checks for all packages. Auth0 deploys first (identity layer). Frontend and backend deploy in parallel after Auth0. Docs deploy after backend (depends on S3 bucket). E2E tests run after frontend + backend are live.

**Quality**: Shared type-check, frontend lint/spell/type-check/test/build, backend lint/type-check/test. Produces frontend build artifact for deploy.

**Deploy Auth0**: Uses `auth0-deploy-cli` to apply `infra/auth0/tenant.yaml` — manages actions, clients, connections, and grants. Runs first because both apps depend on the identity layer.

**Deploy Frontend**: Downloads build artifact from quality, deploys CloudFormation stack (Amplify app), uploads to Amplify.

**Deploy Backend**: Serverless Framework deploys Lambda functions, API Gateway, DynamoDB table, S3 buckets, and IAM roles.

**Deploy Docs**: Generates OpenAPI spec from Zod schemas and uploads to S3 docs bucket (created by backend stack).

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

# Run all tests
pnpm turbo run test

# Type-check everything
pnpm turbo run type-check

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

1. Create schema in `packages/shared/src/schemas/{type}.ts`
2. Add entry to `entityRegistry` in `packages/shared/src/registry.ts`
3. Export from `packages/shared/src/index.ts`
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

- [ ] `pnpm turbo run type-check` passes (all packages, 0 errors)
- [ ] `pnpm turbo run test` passes (all unit tests)
- [ ] Schema changes in `packages/shared/` don't break either app
- [ ] Both apps' CLAUDE.md files are consistent with this root file
- [ ] Every page handles API failures gracefully (no infinite loading)
- [ ] E2E test changes are compatible with CI environment (tests hit `https://api.baita.help` in CI, not localhost)

## AWS Resource Integrity

User accounts are data-only entities in DynamoDB (no per-user infrastructure). Bots have coupled AWS resources (Lambda + API Gateway + S3 + Scheduler) that MUST be cleaned up on deletion.

**Critical rules:**

- **Never delete DynamoDB user records directly** — use `DELETE /user` endpoint
- **Never delete bots directly from DynamoDB** — use `DELETE /bots/{botId}` (cleans up Lambda + API Gateway + S3 + Scheduler)
- **Any code that creates/deletes users or bots MUST go through the controller methods** — they handle all coupled resource cleanup

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
- Journeys: `google-gmail`, `todo-journey`, `bot-journey`, `connections`, `pages-security`, `notes-journey`, `content-feed`
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
