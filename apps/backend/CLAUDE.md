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
├── authorizer/         # Lambda authorizer (Auth0 JWT verification)
├── connectors/         # Connector definitions (OAuth registry)
├── controllers/        # Business logic classes (Bot, Connection, User, Data)
├── docs/               # OpenAPI spec generation
├── endpoints/          # HTTP Lambda handlers (one per domain)
│   ├── bots/            # Bot CRUD + deploy/test/logs + webhook trigger
│   ├── connections/     # Connection CRUD + health
│   ├── content/         # Content feed
│   ├── data/            # Generic data CRUD
│   ├── bots/template/   # Bot templates (shared automation templates)
│   ├── oauth/           # OAuth callback
│   └── user/            # User create/delete
├── engine/             # Bot execution engine (no HTTP entry point)
│   ├── executor/        # Task executors (code sandbox, HTTP methods)
│   ├── tests/           # Engine unit tests
│   ├── index.ts         # Engine Lambda handler (receives {botId, userId, payload?})
│   ├── run.ts           # Orchestration loop (runBot)
│   ├── resolver.ts      # Input resolution (output references, transforms)
│   ├── conditions.ts    # Condition evaluation (filter tasks)
│   └── data.ts          # Data utilities (path access, mapping, pipes)
├── lib/                # Module-level AWS SDK clients (DynamoDB singleton)
└── utils/              # Shared helpers (API response, auth guard, token refresh)
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

### System Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              AWS Lambda Functions                              │
│                                                                                │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  authorizer   │  │endpoint-bots │  │endpoint-data │  │endpoint-user │  ...  │
│  │  (JWT verify) │  │  (+ trigger) │  │  (generic)   │  │  (lifecycle) │       │
│  └───────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────┐                │
│  │  bot-engine (no HTTP — invoked async by trigger/scheduler) │                │
│  │  Timeout: 300s | Input: {botId, userId, payload?}          │                │
│  └────────────────────────────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌────────────────┐  ┌────────────────┐   ┌────────────────────┐
│   API Gateway  │  │   DynamoDB     │   │  EventBridge       │
│   (REST API)   │  │  (single table)│   │  Scheduler         │
└────────────────┘  └────────────────┘   └────────────────────┘
```

### Layered Architecture

The backend follows a strict layered pattern. Each layer has a single responsibility and only calls the layer below it.

```
┌───────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: HTTP HANDLERS (src/endpoints/)                                  │
│                                                                           │
│  Responsibility: Parse request → extract userId → route → return HTTP     │
│  Pattern: One handler per domain, routes internally by path/method        │
│  Tools: Api class (response formatting), getAuthenticatedUserId (auth)    │
│  Rule: NEVER import Data controller directly (see exceptions below)       │
│                                                                           │
│  bots/index.ts    connections/index.ts    data/index.ts    user/index.ts  │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │ calls
┌────────────────────────────────▼──────────────────────────────────────────┐
│  LAYER 2: CONTROLLERS (src/controllers/)                                  │
│                                                                           │
│  Responsibility: Business logic, validation, AWS service orchestration    │
│  Pattern: Classes holding SDK clients (Scheduler, CloudWatch, Lambda)     │
│  Rule: NEVER import @/lib/dynamodb — delegate to Data controller          │
│  Rule: Own ALL validation (validateTasks, validateBot) for their domain   │
│                                                                           │
│  Bot (CRUD, deploy, test, trigger, logs)                                  │
│  Connection (CRUD, health check, OAuth callback, cascade delete)          │
│  User (create, delete, content feed)                                      │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │ delegates data ops
┌────────────────────────────────▼──────────────────────────────────────────┐
│  LAYER 3: DATA GATEWAY (src/controllers/data.ts)                          │
│                                                                           │
│  Responsibility: Single point of access to DynamoDB                       │
│  Pattern: validate() → DynamoDB operation → return                        │
│  Methods: list, read, create, update, delete, updateNested, appendToList  │
│  Rule: ONLY file that imports @/lib/dynamodb                              │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼──────────────────────────────────────────┐
│  LAYER 4: INFRASTRUCTURE (src/lib/)                                       │
│                                                                           │
│  Responsibility: Module-level AWS SDK client singletons                   │
│  Pattern: Created once at cold start, reused across warm invocations      │
│                                                                           │
│  dynamodb.ts (DynamoDBDocument client)                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

### Engine Architecture (src/engine/)

The engine is a separate Lambda (`bot-engine`) with NO HTTP entry point. It receives a structured event and runs bot tasks sequentially.

```
┌───────────────────────────────────────────────────────────────────┐
│  CALLERS (fire-and-forget, InvocationType: 'Event')               │
│                                                                   │
│  ┌───────────────────────┐     ┌──────────────────────────┐       │
│  │ Trigger endpoint      │     │ EventBridge Scheduler    │       │
│  │ POST /bots/{id}/run/  │     │ (cron/rate expression)   │       │
│  │ {token}               │     │                          │       │
│  │                       │     │ Input: {botId, userId}   │       │
│  │ Decodes token→userId  │     │                          │       │
│  │ Validates bot exists  │     │                          │       │
│  │ Invokes engine async  │     │ Invokes engine directly  │       │
│  └───────────┬───────────┘     └─────────────┬────────────┘       │
│              │                               │                    │
│              └──────────────┬────────────────┘                    │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ENGINE HANDLER (src/engine/index.ts)                       │  │
│  │  Input: {botId, userId, payload?}                           │  │
│  │                                                             │  │
│  │  1. Validate input (botId + userId required)                │  │
│  │  2. Load bot from DynamoDB                                  │  │
│  │  3. If inactive → store trigger sample, return              │  │
│  │  4. If active → call runBot()                               │  │
│  │  5. Log execution to CloudWatch                             │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ORCHESTRATOR (src/engine/run.ts → runBot())                │  │
│  │                                                             │  │
│  │  For each task (sequentially):                              |  │
│  │    1. Resolve inputs ─── resolver.ts                        │  │
│  │    2. Evaluate conditions ─── conditions.ts                 │  │
│  │    3. Execute (with retry) ─── executor/index.ts            │  │
│  │    4. Collect output → feed next task                       │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  EXECUTOR (src/engine/executor/)                            │  │
│  │                                                             │  │
│  │  Routes by service name:                                    │  │
│  │  • code-execute → VM sandbox (executor/code.ts)             │  │
│  │  • method-execute → HTTP/OAuth2/push (executor/methods.ts)  │  │
│  │  • publish-content → Content feed                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Engine Submodule Responsibilities

| File                         | Responsibility                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/index.ts`            | Lambda handler. Validates event, loads bot, delegates to `runBot()`. Handles pause/resume scheduling.                                     |
| `engine/run.ts`              | Orchestration loop. Iterates tasks, coordinates resolver/conditions/executor, handles retries, detects pause signals, supports resume     |
| `engine/resolver.ts`         | Resolves task inputs. Maps output references (`outputIndex` + `outputPath`) to actual data from previous task outputs. Applies transforms |
| `engine/conditions.ts`       | Evaluates OR-of-AND condition groups. Returns boolean (execute or skip)                                                                   |
| `engine/data.ts`             | Data utilities. Path traversal (`getDataFromPath`), output mapping (`getMappedData`), pipes (base64url decode, email-body extraction)     |
| `engine/executor/index.ts`   | Task dispatch. Routes to code or method executor based on service type                                                                    |
| `engine/executor/code.ts`    | VM sandbox execution (Node.js `vm` module, 5s timeout)                                                                                    |
| `engine/executor/methods.ts` | Method execution. Built-in methods: getTodo, publishToFeed, sendNotification, httpRequest, oauth2Request, wait                            |
| `engine/executor/utils.ts`   | Request helpers. Path param interpolation, body encoding                                                                                  |

### Wait & Resume (Pause-and-Resume Execution)

Bots can include a **Wait** step that pauses execution for a configurable duration:

```
Engine invoked → tasks[0..N] execute → Wait step returns pause signal
  → engine handler creates one-time EventBridge schedule (at(now + delay))
  → schedule auto-deletes after firing (ActionAfterCompletion: DELETE)
  → schedule invokes engine with resumeData: { startStep, taskOutputs, logs, usage }
  → engine resumes from paused step, continues remaining tasks
```

**Safety:**

- Pause signals only accepted from `MethodName.wait` tasks (cannot be injected by user code)
- Payload size validated (<200KB) before schedule creation
- Bot edits during wait detected (startStep bounds check)
- Bot deletion removes all pending wait schedules (deleteScheduleGroup)
- Bot deactivation skips resumed execution (existing active check)

### Bot Execution Flows

**Three ways to run a bot — all converge at the engine:**

```
┌─────────────────────┐   ┌────────────────────────┐   ┌────────────────────────────┐
│  WEBHOOK TRIGGER    │   │  SCHEDULED RUN         │   │  TEST (single step)        │
│                     │   │                        │   │                            │
│  POST /bots/{id}/   │   │  EventBridge fires     │   │  POST /bots/{id}/test      │
│  run/{token}        │   │  with {botId,userId}   │   │  Authenticated (JWT)       │
│                     │   │                        │   │                            │
│  No auth (token is  │   │  Direct Lambda invoke  │   │  Runs ONE task in-process  │
│  the secret)        │   │  (no HTTP, no timeout  │   │  (no async invoke)         │
│                     │   │   limit)               │   │                            │
│  Decodes token →    │   │                        │   │  Uses same resolver +      │
│  userId             │   │                        │   │  executor as engine        │
│                     │   │                        │   │                            │
│  Invokes engine     │   │  Invokes engine        │   │  Returns result directly   │
│  Lambda async       │   │  Lambda directly       │   │  to frontend               │
│  (fire-and-forget)  │   │  (fire-and-forget)     │   │                            │
└──────────┬──────────┘   └───────────┬────────────┘   └────────────┬───────────────┘
           │                          │                             │
           └────────────┬─────────────┘                             │
                        ▼                                           ▼
              ┌──────────────────────┐                 ┌────────────────────────────┐
              │  bot-engine Lambda   │                 │  Bot controller (testBot)  │
              │  (up to 300s)        │                 │  (in-process, same Lambda  │
              │                      │                 │   as the HTTP handler)     │
              │  runBot() → all      │                 │                            │
              │  tasks sequentially  │                 │  resolveTaskInputs() →     │
              └──────────────────────┘                 │  executeTask() → return    │
                                                       └────────────────────────────┘
```

**Key principle:** "Run" always executes ALL tasks from the DB-stored bot definition. "Test" executes ONE task using the editor's current state. Both use the same `resolveTaskInputs()` + `executeTask()` code path.

### Data Flow During Execution

```
taskOutputs[] array — built incrementally as tasks execute:

Index 0: payload (from trigger HTTP body or {} for scheduled)
Index 1: output of task[1] (or null if failed/filtered)
Index 2: output of task[2]
...

Each task can reference any previous output via:
  variable.outputIndex → which task's output
  variable.outputPath  → JSON dot-path within that output
  variable.transform   → optional transform (first, last, count, filter, pluck, join)
```

### Single Data Gateway

**Only `controllers/data.ts` may import `@/lib/dynamodb`.** All other code delegates data operations to the Data controller:

```typescript
const data = new Data(userId, 'bot')
await data.create(botId, botPayload) // Bot controller
await data.deleteAllForUser() // User controller
```

The Data controller handles: `validate()`, `list()`, `read()`, `create()`, `update()`, `delete()`, `updateNested()`, `appendToList()`, `deleteAllForUser()`.

### Entity Type Registry

The registry (`packages/shared/src/registry.ts`) is the source of truth for all entity types. Adding a new entity type = add schema + registry entry → CRUD works automatically via `/data/{type}` endpoints. Zero backend code changes.

### Handler Pattern

Every HTTP endpoint follows this structure:

```typescript
export const handler = async (event, context, callback) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const controller = new DomainController()
    const data = await controller.doSomething(userId, body)
    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
```

**Layer boundary rules:**

- Handlers NEVER import `Data` directly — always use domain controllers
- Handlers NEVER validate domain logic — controllers own all validation
- Sub-handlers (`deploy.ts`, `test.ts`, `health.ts`) extract params and delegate to controllers
- Controllers own `validateTasks()`, `validateBot()`, etc.
- Two documented exceptions: `data/index.ts` (IS the generic dispatcher) and `bots/template/index.ts` (system-scoped CRUD)

**Controller method inventory:**

| Controller | Methods                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot        | getBot, listBots, createBot, updateBot, deleteBot, deployBot, deployBotTemplate, testBot, triggerBot, getBotLogs, addTriggerSample, addConnection |
| Connection | listConnections, createConnection, getConnectionDetails, deleteConnection, checkHealth, handleOAuthCallback                                       |
| User       | createUser, deleteUser, getContent, reactToContent, publishContent                                                                                |
| Data       | validate, list, read, create, update, delete, updateNested, appendToList, deleteAllForUser, upload, remove                                        |

### API Response Format

```json
{ "success": true|false, "message": "error (only on failure)", "data": {...} }
```

### DynamoDB Single-Table Design

Table: `baita-backend-prod` — all data is user-scoped.

```
PK (userId) | SK (sortKey)                    | Description
----------- | ------------------------------- | -----------
userId      | #USER                           | User profile (singleton)
userId      | #BOT#{botId}                    | Bot definition
userId      | #TODO                           | Todo list (singleton)
userId      | #{TYPE}#{id}                    | Generic data record
userId      | #CONTENT#{contentId}            | Content item
userId      | #CONNECTION#{connectionId}      | OAuth connection
userId      | #FEELING#{feelingId}            | Feeling entry
userId      | #GUIDE#{guideId}                | Place guide (ordered collection)
userId      | #PLACE#{placeId}                | Place
```

Sort key format: `#TYPE` for singletons, `#TYPE#id` for collections.

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
- Endpoints: lowercase folders organized by domain (`bots/`, `connections/`, `content/`, `data/`, `oauth/`, `user/`)
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
- Other SDK clients (Scheduler, CloudWatchLogs) instantiated in controller constructors
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
- `DELETE /bots/{botId}` — Delete bot (cleans up EventBridge Scheduler)
- `POST /bots/{botId}/deploy` — Deploy/deactivate bot (enable/disable schedule)
- `POST /bots/{botId}/test` — Test individual task (taskIndex in body)
- `GET /bots/{botId}/logs` — Get execution logs
- `POST /bots/{botId}/run/{token}` — Trigger bot execution (public, no auth — token encodes userId)

### Bot Templates (shared, system user)

- `GET /bot-templates` — List shared bot templates (userId='baita')
- `PUT /bot-templates/{templateId}` — Create/update template
- `GET /bot-templates/{templateId}` — Get specific template
- `DELETE /bot-templates/{templateId}` — Delete template
- `POST /bot-templates/{templateId}/deploy` — Deploy as bot from template

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

### Location (Track Mode)

- `POST /location/ingest/{token}` — Ingest GPS location points (public, token-based auth)

## Track Mode Architecture

Location intelligence feature: background GPS tracking → place detection → activity recognition → bot triggers.

### Endpoint: `POST /location/ingest/{token}`

**Auth**: Token-based (same `decodeTriggerToken` as bot run endpoint). No Lambda authorizer — the token IS the secret.

**Payload**:

```json
{
  "points": [
    {
      "lat": 38.7223,
      "lng": -9.1393,
      "timestamp": 1719043200000,
      "accuracy": 10,
      "speed": 1.2
    }
  ],
  "source": "shortcuts"
}
```

**Sources**: iPhone Shortcuts (arrive/leave automations), OwnTracks (HTTP mode), Overland app, or custom native app.

**Response**:

```json
{
  "success": true,
  "data": {
    "pointsStored": 5,
    "source": "shortcuts",
    "staysDetected": 1,
    "activitiesDetected": 1,
    "newPlacesDetected": 0,
    "visitsRecorded": 1
  }
}
```

### Processing Pipeline (`src/endpoints/location/processor.ts`)

Runs synchronously within the endpoint Lambda:

```
1. Noise filter → reject points with accuracy > 65m or speed > 200 km/h
2. Stay-point detection (Li et al. 2008) → radius=50m, dwell=5min
3. For each detected stay:
   a. Load user's usual-places
   b. Haversine match to known places (within place.radiusM)
   c. If matched → record visit + update place stats + trigger 'arrive' bots
   d. If new (>150m from all known) → create usual-place + trigger 'new_place' bots + send push
4. Detect activities between stays (speed-based: walk/cycle/drive/run/transit)
5. Store activity records
```

### Geo Utilities (`src/lib/geo.ts`)

Core algorithms (22 unit tests):

| Function                                                 | Purpose                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `haversineMeters(lat1, lng1, lat2, lng2)`                | Great-circle distance between two points     |
| `filterNoise(points, maxAccuracy, maxSpeed)`             | Remove GPS outliers                          |
| `detectStayPoints(points, distThreshold, timeThreshold)` | Li et al. 2008 algorithm                     |
| `classifyActivity(points)`                               | Speed-based: walking/running/cycling/driving |
| `segmentActivities(points, windowSize)`                  | Split trace into activity legs               |
| `matchToPlace(lat, lng, places)`                         | Find nearest known place within radius       |
| `isNewPlace(lat, lng, places, threshold)`                | Check if >150m from all known                |
| `computePlaceScore(visits, daysSince, avgDwell)`         | Importance score (0-1)                       |

### Entity Types (DynamoDB)

| Sort Key Pattern    | Entity      | Description                           |
| ------------------- | ----------- | ------------------------------------- |
| `#USUAL-PLACE#{id}` | IUsualPlace | Auto-detected places with visit stats |
| `#VISIT#{id}`       | IVisit      | Individual visit records              |
| `#ACTIVITY#{id}`    | IActivity   | Detected movement segments            |

### Bot Trigger Integration

When the processor detects a location event, it:

1. Queries all user's active bots
2. Filters for bots with `ServiceName.locationEvent` trigger
3. Matches the configured `eventType` (arrive/leave/new_place)
4. Invokes the bot engine async (same path as webhooks/schedules)

### Push Notification

On new place detection:

- Reads user's push subscription from `#USER` record
- Sends Web Push with title "Novo local detectado" + deep link to Places page
- Silently catches expired subscriptions

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
| Bot Lifecycle       | POST /bots + GET logs + DELETE            | Yes    | EventBridge Scheduler                     |
| Bot Deploy          | POST /bots/{botId}/deploy                 | Yes    | Enable/disable Scheduler                  |
| Bot Test            | POST /bots/{botId}/test                   | Yes    | Task execution via engine resolver        |
| Connector Services  | POST /bots/{botId}/test                   | Yes    | Baita, Google, NewsAPI, OpenAI, Pipedrive |
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

`deleteUser()` cascades through (in this order):

1. Delete Auth0 user (via M2M token — done first because it's external and most failure-prone)
2. Delete all bots (via `deleteBot()` — cleans up EventBridge Scheduler)
3. Delete all DynamoDB records (via `deleteAllForUser()`)

### Bot Deletion

`deleteBot()` cascades through (in this order):

1. Delete EventBridge Scheduler group (external resource — done first)
2. Delete DynamoDB record (only after AWS resources are cleaned)

If scheduler deletion fails, the DDB record is preserved and the user can retry.

### Connection Deletion

`DELETE /connections/{id}` cascades through:

1. Clear `connectionId` references from all linked bot tasks
2. Delete connection DynamoDB record

### Deletion Safety Rules

- **External resources FIRST, DynamoDB LAST** — if external deletion fails, DDB record still exists and the operation is retryable
- **Never delete DynamoDB user records directly** — use `DELETE /user` endpoint
- **Never delete bots directly from DynamoDB** — use `DELETE /bots/{botId}`
- **Any code that deletes users or bots MUST go through controller methods**
- **Never swallow errors on external resource cleanup** — propagate so the caller knows to retry

### Resource Audit

Run the audit script to detect orphaned resources:

```bash
cd apps/backend && ./scripts/audit-resources.sh
```

### Constants

| Constant                     | Value                 | Purpose                                   |
| ---------------------------- | --------------------- | ----------------------------------------- |
| MAX_TRIGGER_SAMPLES          | 10                    | Cap on webhook trigger samples per bot    |
| CONTENT_BATCH_LIMIT          | 10                    | Max content items published per execution |
| CONTENT_TTL_DAYS             | 7                     | Auto-expire unread content                |
| DISABLED_SCHEDULE_EXPRESSION | cron(0 0 1 \* ? 2030) | Placeholder for disabled schedules        |

## Known Limitations

- No structured logging library (raw `console.log` with JSON)
