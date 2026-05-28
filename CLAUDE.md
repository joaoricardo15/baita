# Baita — Monorepo Root

This is the workspace root for the Baita platform. Two repos live here:

- **`baita-frontend/`** — React 18 + Vite app at https://baita.help
- **`baita-serverless/`** — Serverless Framework API at https://api.baita.help

This file governs cross-repo work. Each repo has its own `CLAUDE.md` with specific conventions.

## Shared Conventions

These are enforced identically in both repos. Changes here must be reflected in both `baita-frontend/CLAUDE.md` and `baita-serverless/CLAUDE.md`.

### Core Philosophies

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
- Strict mode enabled in both repos
- No `any` type (warn in frontend, avoid in backend)
- Named imports only (no default `React` import in frontend)

### Git Workflow

- Always `git pull --rebase` before pushing
- Never push untested code
- Commit messages: concise, imperative mood

### Live Feedback Loop

When a principle or rule is discovered during work in either repo that is broadly applicable:

1. Apply it in the current repo's `CLAUDE.md`
2. Propagate to the other repo's `CLAUDE.md` if it applies there too
3. If it's a shared convention, update this root file as the source of truth

No permission needed — if the principle is obviously general and valuable, capture it proactively.

## Cross-Repo Rules

### Shared TypeScript Models

Both repos define the same data interfaces (`IUser`, `IBot`, `ITask`, `IService`, `IApp`, etc.). When a model changes:

- The change must be reflected in both `baita-frontend/src/models/` and `baita-serverless/src/models/`
- Frontend types may extend backend types with UI-specific fields, but the core shape must match
- If a field is added/removed/renamed on one side, update the other immediately

### API Contract

- Backend endpoints define the contract (request shape, response shape, status codes)
- Frontend Axios calls must match the backend contract exactly
- When adding/modifying an endpoint: update both the handler and the frontend API call
- Response format is always: `{ success: boolean, message?: string, data?: T }`

### Environment Alignment

| Environment | Frontend | Backend |
|---|---|---|
| Production | `https://www.baita.help` | `https://api.baita.help` |
| Local dev | `http://localhost:3000` | `http://localhost:5000/dev` |

### Auth0 Integration

- Both repos use Auth0 for authentication
- Frontend: `@auth0/auth0-react` (token in Authorization header)
- Backend: JWT verification of the same Auth0 tenant
- User ID (`sub` claim) is the primary key across both systems

## Automatic Feedback Mechanism

This system ensures instructions improve continuously across both repos:

### When to Propagate

A change discovered in one repo should propagate when:

1. **It's a code style rule** → Update Prettier/ESLint in both + this file
2. **It's a workflow principle** (e.g., "always test in browser") → Update both CLAUDE.md files + this file
3. **It's a TypeScript convention** → Update both tsconfig/CLAUDE.md files + this file
4. **It's repo-specific** (e.g., "use barrel imports for MUI icons") → Only update that repo's CLAUDE.md

### How to Propagate

When making a cross-repo change:

1. Identify which category (shared vs repo-specific)
2. If shared: edit this root file first, then sync to both repo CLAUDE.md files
3. If repo-specific: edit only that repo's CLAUDE.md
4. In both cases: mention the change explicitly so the user is aware

### Consistency Checks

When working across both repos, verify:

- [ ] Model interfaces match between frontend and backend
- [ ] API calls in frontend match endpoint signatures in backend
- [ ] Both repos use the same Prettier config
- [ ] Both repos use flat ESLint config, husky + lint-staged, cspell, and knip
- [ ] Shared principles are worded consistently in both CLAUDE.md files
- [ ] No contradictions between this file and repo-level files
- [ ] Every page that fetches data on mount handles API failures gracefully (no infinite loading)
- [ ] Both test suites pass (`npm run test:run` in each repo) before pushing any change

## Working Across Both Repos

When a task spans both repos (e.g., new endpoint + frontend integration):

1. Start with the backend (define the contract)
2. Test the endpoint locally (`curl` / Postman)
3. Implement the frontend call
4. Test end-to-end with both servers running (`localhost:3000` + `localhost:5000/dev`)
5. Document in both repos
6. Commit and push each repo independently

### Quick Commands

```bash
# Start both servers
cd baita-serverless && npm start &
cd baita-frontend && npm start

# Run all tests
cd baita-frontend && npm run test:run
cd baita-serverless && npm run test:run

# Check code quality
cd baita-frontend && npm run lint && npm run spell && npm run knip
cd baita-serverless && npm run lint && npm run spell && npm run knip
```

## AWS Context

- **Profile**: Always use `--profile joao --region us-east-1`
- **Frontend (Amplify)**: App ID `d35kx8fgop2qtf`, branch `master`
- **Backend (Serverless)**: Deployed via GitHub Actions on push to `master`
- **Region**: `us-east-1` for everything
