# Baita Serverless

Backend application for BaitaHelp: the personal automation platform aimed at normal people. API available at https://api.baita.help.

## Core Philosophies

These principles must be considered before any change:

1. **Simplicity first** — The goal should always be achieved by the simplest solution possible. No over-engineering, no premature abstractions.
2. **Test what matters** — Every medium to large/relevant change must be properly unit tested. Handlers should be tested via integration-style tests where feasible.
3. **Document changes** — Write new documentation or update existing documentation for every relevant change. This means ALL relevant docs (README, CLAUDE.md, inline). Do not claim a task is done until documentation is updated.
4. **Don't reinvent the wheel** — Search extensively for best practices and proper, simple, free tools before building custom solutions.
5. **Plan thoroughly, review extensively** — Plan before implementing. Review the solution extensively after implementing and before claiming it is ready.

### Completion Checklist

Before reporting a task as done, self-check:

- Is ALL documentation updated? (README.md, CLAUDE.md, inline docs)
- Are tests written/updated for non-trivial changes?
- Has the solution been verified (builds, passes tests, runs correctly)?
- **Has the endpoint been tested locally?** (`npm start` → test via curl/Postman on localhost:5000/dev)
- Is it the simplest solution that achieves the goal?
- **Code is NEVER pushed before being extensively tested locally**

### Local Verification Rules

- Tests passing ≠ endpoint working. Always hit the endpoint locally before claiming done.
- For new endpoints: test the happy path and error cases with curl or similar tool.
- For data model changes: verify DynamoDB operations work against local or real table.
- When writing tests: every bug fix or new feature must include a unit/integration test that would catch the issue if it regressed.

## Tech Stack

- **Runtime**: Node.js 20.x + TypeScript 5.9 (strict mode)
- **Framework**: Serverless Framework 3.40
- **Cloud**: AWS (Lambda, DynamoDB, S3, EventBridge Scheduler, CloudWatch, API Gateway)
- **Bundler**: serverless-esbuild
- **Validation**: AJV (JSON Schema)
- **HTTP Client**: Axios (external API calls)
- **Auth**: Auth0 (JWT verification)
- **Push Notifications**: web-push (VAPID-based, standard Web Push API)
- **Testing**: Jest 30 + ts-jest
- **Linting**: ESLint 9 (flat config) + Prettier
- **Spell Check**: CSpell
- **Dead Code**: Knip

## Project Structure

```
src/
├── authorizer/     # Lambda authorizer (Auth0 JWT verification)
├── controllers/    # Business logic classes (User, Bot, Task, Data)
├── endpoints/      # RESTful API Lambda handlers (one consolidated handler per domain)
│   ├── bots/        # Bot CRUD + deploy/test/logs
│   ├── connections/ # Connection CRUD + health
│   ├── content/     # Content feed (GET only)
│   ├── data/        # Generic data CRUD (replaces old resource/)
│   ├── models/      # Bot model CRUD + deploy
│   ├── oauth/       # OAuth callback (provider redirect handler)
│   ├── tasks/       # Task execution
│   └── user/        # User profile (POST create + DELETE)
├── lib/            # Module-level AWS SDK clients (DynamoDB singleton)
├── tasks/          # Task execution logic
│   └── executor/   # Service-specific executors (code.ts, methods.ts)
├── utils/          # Helpers (api response, bot data manipulation, code generation, auth guard)
│   └── tests/      # Unit tests
└── docs/           # OpenAPI generated docs
```

## Commands

```bash
npm start          # Local dev server on localhost:5000 (serverless-offline, uses AWS_PROFILE=baita)
npm test           # Jest in watch mode
npm run test:run   # Jest single run (CI-friendly)
npm run deploy     # Deploy to production (serverless deploy --stage prod)
npm run docs       # Generate OpenAPI spec from Zod schemas and deploy to S3
npm run lint       # ESLint with auto-fix
npm run format     # Prettier formatting
npm run spell      # CSpell spell check on source files
npm run knip       # Dead code detection (unused files, exports, deps)
```

## AWS / Deployment

- **AWS Profile**: Always use `--profile baita` for AWS CLI commands in this repo
- **CI/CD**: GitHub Actions (unified pipeline in monorepo root `.github/workflows/ci.yml`)
- **Region**: `us-east-1`
- **Custom Domain**: `api.baita.help` (Route53 + serverless-domain-manager)
- **Stage**: `prod` (single production stage)
- **Before pushing**: Always `git pull --rebase` to sync with remote
- **GitHub Secrets**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (partner secrets are in AWS SSM)

### CI/CD Pipeline

Part of the monorepo unified workflow (`.github/workflows/ci.yml`) on push to `main`:

Single "Backend" job: Type-check shared → Lint → Type-check → Test → Deploy (`serverless deploy --stage prod --conceal`) → Generate & deploy OpenAPI docs (`npm run docs`)

Runs in parallel with the Frontend job. E2E tests run after both complete.

### Local Development Requirements

1. AWS profile `baita` configured in `~/.aws/credentials`
2. Node.js 20.x installed
3. SSM parameters stored in `/baita/prod/*` (resolved at deploy time via `${ssm:...}` in serverless.yml)

### Updating secrets

All secrets are stored in AWS SSM Parameter Store under `/baita/prod/`:

```bash
# List all parameters
aws ssm describe-parameters --profile baita --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/baita/prod/"

# Update a secret
aws ssm put-parameter --profile baita --region us-east-1 \
  --name "/baita/prod/<parameter-name>" --value "<new-value>" \
  --type SecureString --overwrite

# After updating: redeploy to pick up new values
npm run deploy
```

Parameters:

- `/baita/prod/auth0-m2m-client-id` — Auth0 M2M application client ID
- `/baita/prod/auth0-m2m-client-secret` — Auth0 M2M application secret
- `/baita/prod/auth0-create-user-api-key` — API key for Auth0 Post-Login Action user provisioning
- `/baita/prod/pipedrive-client-id` — Pipedrive OAuth client ID
- `/baita/prod/pipedrive-client-secret` — Pipedrive OAuth client secret
- `/baita/prod/google-client-id` — Google OAuth client ID
- `/baita/prod/google-client-secret` — Google OAuth client secret
- `/baita/prod/news-api-key` — NewsAPI key
- `/baita/prod/vapid-public-key` — Web Push VAPID public key
- `/baita/prod/vapid-private-key` — Web Push VAPID private key

Public config (Auth0 domain/audience, OAuth token URLs) is hardcoded in `serverless.yml` — not secrets.

## Architecture

### Two-Tier Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│  Endpoint Layer (src/endpoints/)                                │
│  ─ Parse request, extract userId, call controller, return HTTP  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│  Functional Layer (src/controllers/)                            │
│  ─ Bot: code gen, deploy, logs                                  │
│  ─ User: signup, deletion, content feed                            │
│  ─ Data: CRUD, validation, nested updates (single DDB gateway)  │
└─────────────────────────────────────────────────────────────────┘
```

- **Endpoints**: Parse request, call controller, return HTTP response via `Api` class
- **Controllers**: Business logic. Bot and User controllers delegate ALL data operations to Data controller.
- **Data Controller** (`controllers/data.ts`): The **single gateway** to DynamoDB. Only file that imports `@/lib/dynamodb`. Handles validate(), list(), read(), create(), update(), delete(), updateNested(), appendToList(), deleteAllForUser().
- **Utils**: Shared helpers for code generation, data manipulation, response formatting
- **Lib**: Module-level AWS SDK clients (DynamoDB singleton) — reused across warm Lambda invocations

### Single Data Gateway Principle

**Only `controllers/data.ts` may import `@/lib/dynamodb`.** All other controllers delegate data operations:

```typescript
// In Bot controller — delegates to Data controller
const data = new Data(userId, 'bot')
await data.create(botId, botPayload)

// In User controller — delegates for cleanup
const data = new Data(userId, '')
await data.deleteAllForUser()
```

### Entity Type Registry

The registry (`packages/shared/src/registry.ts`) is the source of truth for all entity types:

```typescript
export const entityRegistry: Record<string, IEntityTypeConfig> = {
  user: { schema: UserSchema, idField: '', singleton: true },
  bot: { schema: BotSchema, idField: 'botId', singleton: false },
  connection: {
    schema: ConnectionSchema,
    idField: 'connectionId',
    singleton: false,
  },
  note: { schema: NoteSchema, idField: 'noteId', singleton: false },
  // ... add new types here
}
```

Adding a new entity type: add schema + registry entry → CRUD works automatically via `/data/{type}` endpoints. Zero backend code changes needed.

### Handler Pattern

Every endpoint follows this structure:

```typescript
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'
import SomeController from '@/controllers/someController'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const controller = new SomeController()

  try {
    const userId = getAuthenticatedUserId(event)
    const body = JSON.parse(event.body || '{}')

    const data = await controller.doSomething(userId, body)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
```

### API Response Format

All endpoints return a standardized response:

```json
{
  "success": true | false,
  "message": "error message (only on failure)",
  "data": { ... }
}
```

### DynamoDB Single-Table Design

Table name: `baita-backend-prod` (env var `CORE_TABLE` = `SERVICE_PREFIX`)

All data is **user-scoped** — every record uses `userId` as the partition key. The `userId` is NOT stored inside entity schemas (it's a storage concern, not domain data). The Data controller injects it automatically.

```
PK (userId) | SK (sortKey)                    | Description
----------- | ------------------------------- | -----------
userId      | #USER                           | User profile (singleton)
userId      | #BOT#{botId}                    | Bot definition
userId      | #TODO                           | Todo list (singleton)
userId      | #{TYPE}#{id}                    | Generic data record
userId      | #CONTENT#{contentId}            | Content item
userId      | #CONNECTION#{connectionId}      | OAuth connection
userId      | #NOTE#{noteId}                  | Note
userId      | #PLACE#{placeId}                | Place
```

Sort key format: `#TYPE` for singletons, `#TYPE#id` for collections. The Data controller constructs these dynamically from the entity type name.

### Bot Execution Architecture

1. User creates/edits bot via frontend (visual workflow builder)
2. On deploy: backend generates Lambda code from bot task definitions (`src/utils/code.ts`)
3. Generated code packaged as ZIP, uploaded to S3, deployed as standalone Lambda
4. Bot triggered via HTTP (API Gateway) or schedule (EventBridge Scheduler)
5. Each task executes sequentially, outputs chained via `task${n}_outputData` variables
6. Task execution: bot Lambda invokes `endpoint-task` via direct Lambda-to-Lambda call (not HTTP)
7. The task endpoint dispatcher (`src/tasks/executor.ts`) routes to the correct executor:
   - `code-execute` → VM sandbox execution (`src/tasks/executor/code.ts`)
   - `method-execute` → Built-in methods like HTTP, OAuth2, notifications (`src/tasks/executor/methods.ts`)
   - `trigger-sample` → Stores test data for the trigger step
8. Results stored in DynamoDB as fresh content for the user's feed
9. Execution logs captured in CloudWatch, queryable via logs endpoint

**IAM note**: Bot Lambda role (`botsRole`) only has `lambda:InvokeFunction` + CloudWatch. It cannot access DynamoDB/SSM directly — all data operations go through `endpoint-task` which has full permissions.

### Content Feed Lifecycle

The content feed is entirely DynamoDB-based. Fresh content persists until the user reacts to it:

1. **Publish**: Bot's "Publish content to feed" step calls `publishContent()` which:
   - Queries DynamoDB for all existing `#CONTENT#{contentId}` records (seen or fresh)
   - Filters out duplicates (any existing contentId is skipped)
   - Writes new items to DynamoDB with `publishedAt` timestamp and a 7-day `ttl`
   - Batch limit: `CONTENT_BATCH_LIMIT` (10) new items per publish
2. **Fetch**: Frontend calls `GET /content` → `getContent()` queries all content records and returns only those where `seenAt` is absent (fresh items)
3. **React**: User swipes content → frontend calls `PATCH /content/{contentId}` → sets `seenAt` timestamp + reaction, removes `ttl` (item persists permanently for history)
4. **Expiry**: Unread content auto-expires after 7 days via DynamoDB TTL (`CONTENT_TTL_DAYS`)
5. **Dedup**: At publish time, any contentId that already exists (fresh or seen) is skipped

### Code Execution Safety

- Uses Node.js `vm` module with isolated context (`vm.createContext()`)
- 5-second timeout limit per execution
- Custom variable injection into sandbox
- Error boundaries prevent crashes from affecting other tasks

## Environment Configuration

- **Production**: API at `https://api.baita.help`, frontend at `https://www.baita.help`
- **Local dev**: API at `http://localhost:5000/dev`, frontend at `http://localhost:3000`
- **Secrets**: Stored in AWS SSM Parameter Store (`/baita/prod/*`), resolved at deploy time

## Conventions

### Naming

- Interfaces: Prefixed with `I` (e.g., `IUser`, `IBot`, `ITask`, `IVariable`)
- Enums: PascalCase values (e.g., `TaskExecutionStatus.success`)
- Controllers: PascalCase class names matching the domain (e.g., `Bot`, `User`, `Data`)
- Endpoints: lowercase folders organized by domain (`bots/`, `connections/`, `content/`, `data/`, `models/`, `oauth/`, `tasks/`, `user/`)
- Environment variables: UPPER_SNAKE_CASE

### TypeScript

- Full strict mode enabled (`strict: true`)
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` enabled
- Interfaces for all data models (shared between frontend and backend where applicable)
- Path aliases: `src/*` maps to `<rootDir>/src/*`
- ES2020 target with Node module resolution

### Code Style (Prettier)

- No semicolons
- Single quotes
- Trailing commas (ES5)
- Tab width: 2 spaces

### Error Handling

- Controllers throw errors, endpoints catch and format via `Api.httpResponse()`
- Errors parsed consistently (string, Error object, or JSON serialized)
- Timeout safety: `Api` class logs automatically 200ms before Lambda timeout

### AWS SDK Usage

- DynamoDB client lives at module level in `src/lib/dynamodb.ts` — shared across warm Lambda invocations
- Other SDK clients (Lambda, S3, Scheduler, etc.) instantiated in controller constructors
- Use `DynamoDBDocument.from()` for simplified DynamoDB operations
- `removeUndefinedValues: true` in marshall options for DynamoDB puts

### Authentication & Authorization

- The Lambda authorizer verifies Auth0 JWTs and returns `context: { userId: verified.sub }`
- **Every user-facing endpoint MUST use `getAuthenticatedUserId(event)`** from `src/utils/auth.ts`
- This utility extracts userId from the authorizer context (strips `auth0|` prefix)
- Never trust path parameters for identity — the JWT is the single source of truth
- The guard throws `'Unauthorized'` if no auth context is present

#### System Endpoint: POST /user (API Key Auth)

User provisioning is called exclusively by the Auth0 Post-Login Action on first signup:

- **No Lambda authorizer** — validated by `X-Api-Key` header in the handler itself
- **API key stored in SSM**: `/baita/prod/auth0-create-user-api-key`
- **Handler**: `src/endpoints/user/index.ts` (same Lambda as DELETE /user, routes by HTTP method)
- **Must NEVER be called by E2E tests, frontend, or any source other than Auth0**
- Auth0 Action secrets: `BAITA_API_URL`, `BAITA_CREATE_USER_API_KEY`

## API Endpoints

All authenticated endpoints extract userId from the JWT token (via Lambda authorizer). No userId in URL paths. RESTful design: proper HTTP verbs, plural nouns, actions as sub-paths.

### User (System Endpoints)

- `POST /user` — Create user account (Auth0 Action only, API key auth, excluded from OpenAPI docs)
- `DELETE /user` — Delete user account + all resources (JWT auth)

### Content

- `GET /content` — Get fresh content feed
- `PATCH /content/{contentId}` — React to content (marks as seen)

### Bots

- `GET /bots` — List bots
- `POST /bots` — Create bot
- `GET /bots/{botId}` — Get bot
- `PATCH /bots/{botId}` — Update bot
- `DELETE /bots/{botId}` — Delete bot (cleans up Lambda + API Gateway + S3 + Scheduler)
- `POST /bots/{botId}/deploy` — Deploy/deactivate bot
- `POST /bots/{botId}/test` — Test individual task (taskIndex in body)
- `GET /bots/{botId}/logs` — Get execution logs

### Models (shared, system user)

- `GET /models` — List shared bot models (userId='baita')
- `POST /models` — Create model
- `GET /models/{modelId}` — Get specific model
- `PATCH /models/{modelId}` — Update model
- `DELETE /models/{modelId}` — Delete model
- `POST /models/{modelId}/deploy` — Deploy as bot from model

### Tasks

- `POST /tasks/execute` — Execute task (also accepts direct Lambda invoke from bots)

### Connections

- `GET /connections` — List connections
- `POST /connections` — Create connection (API key type)
- `GET /connections/{connectionId}` — Get connection details + linked bots
- `DELETE /connections/{connectionId}` — Delete connection
- `POST /connections/{connectionId}/health` — Check connection health

### Data (generic CRUD)

- `GET /data/{type}` — List records
- `POST /data/{type}` — Create record
- `GET /data/{type}/{id}` — Read record
- `PATCH /data/{type}/{id}` — Update record
- `DELETE /data/{type}/{id}` — Delete record
- `POST /data/{type}/{id}/upload` — Get S3 presigned URL
- `DELETE /data/{type}/{id}/files/{fileId}` — Remove file

### OAuth

- `GET /oauth/callback` — Generic OAuth provider callback (public, no auth)

## Feature Development Methodology

When developing or reviewing a feature, follow this use-case-driven approach:

1. **Use case mapping** — Identify ALL scenarios (authenticated/not, valid/invalid input, edge cases, concurrent operations, timeouts)
2. **Review** — Trace the code path for each use case, identify gaps
3. **Propose** — Design solutions for unhandled cases
4. **Plan** — Write implementation steps before coding
5. **Implement** — Code the solutions
6. **Document** — Update all relevant docs
7. **Test** — Write unit tests covering each use case
8. **Final review** — Verify all use cases work end-to-end locally
9. **Functional testing** — Test the full flow with the frontend connected

This ensures no edge case is missed and every feature is robust from the start.

## Live Feedback Loop

When the user provides an instruction or rule that is clearly valuable and applicable beyond the immediate task, generalize it and add it to these instructions (CLAUDE.md) and/or memory. This creates a continuous improvement cycle — the more we work together, the better aligned the assistance becomes. No need to ask permission; if the principle is obviously general and valuable, capture it proactively.

## Code Quality Enforcement

Consistency is enforced at 3 levels:

### Editor-time (ESLint — `eslint.config.mjs`)

- **No `any` type** — warn (fix incrementally)
- **Strict equality** — `===` enforced, `==` blocked
- **No console.log** — warn (use `console.warn`/`console.error` if needed)
- **Import sorting** — auto-sorted alphabetically by `eslint-plugin-simple-import-sort`

### Pre-commit (Husky + lint-staged)

- **CSpell** — catches typos before they enter the codebase
- **ESLint --fix** — auto-fixes and blocks on errors
- **Prettier** — formats staged files

### Build-time (TypeScript — `tsconfig.json`)

- **strict** — full strict mode (includes strictNullChecks, noImplicitAny, etc.)
- **noUnusedLocals** — errors on unused variables/imports
- **noUnusedParameters** — errors on unused function params (prefix with `_` to skip)
- **noImplicitReturns** — all code paths must return

### On-demand

- `npm run knip` — detects unused files, exports, and dependencies

## E2E Tests

E2E tests live in `tests/e2e/` at the monorepo root. Three-phase execution via npm scripts:

```bash
cd tests/e2e && npm run e2e:setup    # Sign up user via Auth0, save token
cd tests/e2e && npm run e2e:test     # Run journey specs (API + browser)
cd tests/e2e && npm run e2e:cleanup  # Delete user (pure Node, no browser)

# Or run all phases together (cleanup runs regardless of test result):
cd tests/e2e && npm test
```

### Test Coverage

| Page/Feature        | Endpoint                                  | Tested | Notes                                     |
| ------------------- | ----------------------------------------- | ------ | ----------------------------------------- |
| Home (Content Feed) | GET /content                              | Yes    | DynamoDB query + filter                   |
| Todo                | GET /data/todo                            | Yes    | DynamoDB query                            |
| Bots List           | GET /bots                                 | Yes    | DynamoDB query                            |
| Connections         | GET /connections                          | Yes    | DynamoDB query                            |
| Data CRUD           | GET/POST/PATCH/DELETE /data/smoke-note/\* | Yes    | Full create/read/update/list/delete cycle |
| Bot Lifecycle       | POST /bots + GET logs + DELETE            | Yes    | Lambda + S3 + API Gateway + Scheduler     |
| Bot Deploy          | POST /bots/{botId}/deploy                 | Yes    | Code generation + Lambda deploy           |
| Bot Test            | POST /bots/{botId}/test                   | Yes    | Task execution via executor               |
| Connector Services  | POST /tasks/execute                       | Yes    | Baita, Google, NewsAPI, OpenAI, Pipedrive |
| Connection Health   | POST /connections/{connectionId}/health   | Yes    | OAuth token refresh + API probe           |
| Connection Details  | GET /connections/{connectionId}           | Yes    | Linked bots lookup                        |
| User Deletion       | DELETE /user                              | Yes    | Full cleanup (DDB, Auth0, bots)           |
| Auth Rejection      | GET without token                         | Yes    | Security — 401 returned                   |
| CORS on Errors      | GET with Origin header                    | Yes    | CORS headers on 4XX                       |
| Error Handling      | Invalid operations                        | Yes    | Structured error response                 |
| File Upload         | POST /data/\*/upload                      | Future | S3 presigned URL flow                     |
| Push Notifications  | —                                         | N/A    | Frontend-only feature                     |

### Adding New Tests

When adding a new endpoint or feature:

1. Add the test case to the relevant `.spec.ts` file in `tests/e2e/tests/`
2. Update the coverage table above
3. Ensure tests clean up after themselves (delete created resources)
4. Use `test-` prefix for test resource names to avoid collision with real data

### Infrastructure

- **Auth**: Real Auth0 signup/login via Playwright (browser-based)
- **Fixed test user**: `e2e-test@baita.help` — same email every run
- **Cleanup**: Pure Node script (`scripts/cleanup.ts`) — reads token, calls DELETE /user. No browser needed.
- **CI**: GitHub Actions — three explicit steps (`e2e:setup` → `e2e:test` → `e2e:cleanup`)

## User Lifecycle

User accounts are **data-only** — creating a user writes a single DynamoDB record (`#USER`). No per-user infrastructure is provisioned.

### Creation

`createUser()` writes one DynamoDB record. That's it. The Auth0 Post-Login Action calls `POST /user` on first login (uses `app_metadata.provisioned` flag for retry semantics).

### Deletion

`deleteUser()` cascades through:

1. Delete all bots (via `deleteBot()` — cleans up Lambda + API Gateway + S3 + Scheduler)
2. Delete all DynamoDB records (via `deleteAllForUser()`)
3. Delete Auth0 user (via M2M token — required, cannot be avoided)

### Rules

- **Never delete DynamoDB user records directly** — use `DELETE /user` endpoint
- **Never delete bots directly from DynamoDB** — use `DELETE /bots/{botId}`
- **Any code that deletes users or bots MUST go through controller methods**

## Known Limitations

- No structured logging library (raw `console.log` with JSON)
