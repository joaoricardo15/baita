# Baita — Monorepo

Personal automation platform (Zapier-inspired, aimed at normal people). Turborepo + pnpm workspaces monorepo.

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

## CI/CD Pipeline

Single unified workflow in `.github/workflows/ci.yml` triggered on push to `main`:

```
shared → frontend-quality → frontend-deploy ─┐
       ↘ backend-quality  → backend-deploy  ──┤→ e2e (23 tests)
```

Changes to `packages/shared/` trigger BOTH branches.

## E2E Testing

Shared E2E tests in `tests/e2e/` use Playwright and simulate real user flows against production. They run automatically after any deploy.

```bash
# Run locally
cd tests/e2e && SMOKE_TEST_TOKEN=<token> npx playwright test
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

# Run E2E against prod
cd tests/e2e && SMOKE_TEST_TOKEN=<token> npx playwright test
```

## AWS Context

- **Profile**: Always use `--profile joao --region us-east-1`
- **Frontend (Amplify)**: App ID `d35kx8fgop2qtf`, branch `master`
- **Backend (Serverless)**: Deployed via GitHub Actions on push to `main`
- **Region**: `us-east-1` for everything

## Consistency Checks

Before pushing, verify:

- [ ] `pnpm turbo run type-check` passes (all packages, 0 errors)
- [ ] `pnpm turbo run test` passes (all unit tests)
- [ ] Schema changes in `packages/shared/` don't break either app
- [ ] Both apps' CLAUDE.md files are consistent with this root file
- [ ] Every page handles API failures gracefully (no infinite loading)

## Live Feedback Loop

When a principle or rule is discovered during work that is broadly applicable, capture it proactively in this file. No permission needed.
