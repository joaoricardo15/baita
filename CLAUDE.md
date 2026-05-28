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
import { IBot, ITask, TaskSchema, BotSchema } from '@baita/shared'
```

When a model changes, update it in `packages/shared/` — both apps get the change automatically.

### API Contract

- Response format: `{ success: boolean, message?: string, data?: T }`
- Backend endpoints define the contract
- Frontend Axios calls must match the backend contract exactly

## CI/CD Pipeline

All workflows live in `.github/workflows/` and trigger on push to `main`:

| Workflow          | Triggers On                              | Steps                                           |
| ----------------- | ---------------------------------------- | ----------------------------------------------- |
| `ci-backend.yml`  | `apps/backend/**`, `packages/shared/**`  | lint → type-check → test → deploy → smoke-tests |
| `ci-frontend.yml` | `apps/frontend/**`, `packages/shared/**` | lint → spell → build → test → Amplify deploy    |
| `e2e.yml`         | After either CI completes                | Playwright E2E tests against production         |

Changes to `packages/shared/` trigger BOTH app pipelines.

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
