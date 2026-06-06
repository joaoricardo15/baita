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
- **`StepExecutionSchema`** — Structured per-step execution logging with timing (`durationMs`), status, input/output snapshots.

### API Contract

- Response format: `{ success: boolean, message?: string, data?: T }`
- Backend endpoints define the contract
- Frontend Axios calls must match the backend contract exactly

### Runtime Data Patterns (Not Visible in Static Code)

The generic Resource controller (`src/controllers/resource.ts`) constructs DynamoDB sortKeys dynamically as `#{resourceName}#{resourceId}`. This means some data records **cannot be found by grepping the codebase** — they are written at runtime via `POST /resource/{name}/create/{id}`. Key examples:

- `#CONTENT#{contentId}` — Written by the frontend when user reacts to feed content (swipe). Used by `publishContent()` for deduplication. The dedup query in `controllers/user.ts` references `#CONTENT` but the write happens through the generic Resource CRUD path.
- `#CONNECTION#{connectionId}` — OAuth connections
- Any custom resource the user creates

**When debugging data flow**: always consider that DynamoDB records with any `#RESOURCENAME#` pattern may be written through the generic resource endpoint, not through a dedicated code path.

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
shared → frontend-quality → frontend-deploy ─┐
       ↘ backend-quality  → backend-deploy  ──┤→ e2e
```

Changes to `packages/shared/` trigger BOTH branches.

## E2E Testing

Shared E2E tests in `tests/e2e/` use Playwright and simulate real user flows. They log in via Auth0 (real credentials), then test pages, API endpoints, security, and bot lifecycle.

```bash
# Run E2E tests (starts Vite automatically, logs in via Auth0)
cd tests/e2e && npm test
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

## AWS Context

- **Profile**: Always use `--profile baita --region us-east-1`
- **Frontend (Amplify)**: App ID `d35kx8fgop2qtf`, branch `main`
- **Backend (Serverless)**: Deployed via GitHub Actions on push to `main`
- **Region**: `us-east-1` for everything

## Environment Variables & Secrets

Consistent pattern across the monorepo: **no secrets in source code**.

### Backend (AWS Lambda + SSM Parameter Store)

Secrets stored in AWS SSM under `/baita/prod/*` and resolved at deploy time by Serverless Framework:

| SSM Parameter                         | Purpose                       |
| ------------------------------------- | ----------------------------- |
| `/baita/prod/pipedrive-auth-url`      | Pipedrive OAuth token URL     |
| `/baita/prod/pipedrive-client-id`     | Pipedrive OAuth client ID     |
| `/baita/prod/pipedrive-client-secret` | Pipedrive OAuth client secret |
| `/baita/prod/google-auth-url`         | Google OAuth token URL        |
| `/baita/prod/google-client-id`        | Google OAuth client ID        |
| `/baita/prod/google-client-secret`    | Google OAuth client secret    |
| `/baita/prod/news-api-key`            | NewsAPI key                   |
| `/baita/prod/vapid-public-key`        | Web Push VAPID public key     |
| `/baita/prod/vapid-private-key`       | Web Push VAPID private key    |

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

### Frontend (Vite + Amplify build-time injection)

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

**Production** — set in Amplify Console (or via CLI):

```bash
aws amplify update-app --app-id d35kx8fgop2qtf \
  --environment-variables VITE_GOOGLE_MAPS_API_KEY=<key>,VITE_GOOGLE_MAPS_MAP_ID=<map-id> \
  --profile baita --region us-east-1
```

### Key Principles

1. **Never hardcode secrets** in source code — use SSM (backend) or env vars (frontend)
2. **Frontend keys are inherently public** — security comes from provider-side restrictions (HTTP referrer, API scoping), not from hiding the key
3. **Rotate keys immediately** if accidentally committed — rotate in SSM/GCP Console, update env vars, redeploy
4. **`.env.local` is gitignored** — safe for local development secrets

## Consistency Checks

Before pushing, verify:

- [ ] `pnpm turbo run type-check` passes (all packages, 0 errors)
- [ ] `pnpm turbo run test` passes (all unit tests)
- [ ] Schema changes in `packages/shared/` don't break either app
- [ ] Both apps' CLAUDE.md files are consistent with this root file
- [ ] Every page handles API failures gracefully (no infinite loading)
- [ ] E2E test changes are compatible with CI environment (tests hit `https://api.baita.help` in CI, not localhost)

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

- Three-phase execution: setup → journeys → teardown (Playwright project dependencies)
- Setup (`user-lifecycle.spec.ts`): Clean slate (delete stale user), sign up fresh, provision resources, copy Google connection
- Journeys: `google-gmail`, `todo-journey`, `bot-journey`, `connections`, `pages-security`, `notes-journey`, `content-feed`
- Teardown (`user-teardown.spec.ts`): Delete account, verify all resource types return 401
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
