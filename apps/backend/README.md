# Baita Backend

Serverless API for the Baita personal automation platform. Handles user management, bot lifecycle, task execution, OAuth integrations, and content delivery.

**API**: https://api.baita.help | **Docs**: https://api.baita.help/

---

## Architecture

### Layered Design

The backend follows a strict 4-layer architecture. Each layer has a single responsibility and only calls the layer below it.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: HTTP HANDLERS (src/endpoints/)                                   │
│                                                                            │
│  Parse HTTP request → extract userId from JWT → route → return response    │
│                                                                            │
│  One Lambda per domain. Routes internally by path + method.                │
│  Uses Api class for response formatting, getAuthenticatedUserId for auth.  │
│                                                                            │
│  bots/  connections/  content/  data/  models/  oauth/  user/              │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 2: CONTROLLERS (src/controllers/)                                   │
│                                                                            │
│  Business logic + AWS service orchestration.                               │
│  Classes that hold SDK clients (Scheduler, CloudWatch).                    │
│                                                                            │
│  Bot: create, deploy, delete, test, logs, scheduler management             │
│  User: create, delete (cascading), content feed, push notifications        │
│  Data: CRUD gateway to DynamoDB (validate, list, read, create, update)     │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 3: DATA GATEWAY (src/controllers/data.ts)                           │
│                                                                            │
│  ONLY file that imports DynamoDB client.                                   │
│  All other code delegates data operations here.                            │
│                                                                            │
│  Methods: validate, list, read, create, update, delete,                    │
│           updateNested, appendToList, deleteAllForUser, getUploadUrl       │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 4: INFRASTRUCTURE (src/lib/)                                        │
│                                                                            │
│  Module-level AWS SDK client singletons.                                   │
│  Created once at cold start, reused across warm Lambda invocations.        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Bot Engine (src/engine/)

A separate Lambda with **no HTTP entry point**. Receives `{botId, userId, payload?}` via async invoke, loads the bot definition from DynamoDB, and executes all tasks sequentially.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  CALLERS                                                                   │
│                                                                            │
│  ┌────────────────────────┐        ┌──────────────────────────┐            │
│  │  Trigger Endpoint      │        │  EventBridge Scheduler   │            │
│  │  POST /bots/{id}/run/  │        │  (fires on cron schedule)│            │
│  │  {token}               │        │                          │            │
│  │                        │        │  Payload: {botId, userId}│            │
│  │  Decode token → userId │        │                          │            │
│  │  Validate bot exists   │        │                          │            │
│  │  Invoke engine async   │        │  Invoke engine directly  │            │
│  └────────────┬───────────┘        └─────────────┬────────────┘            │
│               │                                  │                         │
│               └────────────────┬─────────────────┘                         │
│                                ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ENGINE LAMBDA (src/engine/index.ts)  —  Timeout: 300s               │  │
│  │                                                                      │  │
│  │  1. Validate input (botId + userId required)                         │  │
│  │  2. Load bot from DynamoDB                                           │  │
│  │  3. If bot inactive → store trigger sample → return                  │  │
│  │  4. If bot active → runBot()                                         │  │
│  │  5. Log execution result to CloudWatch                               │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ORCHESTRATOR (src/engine/run.ts)                                    │  │
│  │                                                                      │  │
│  │  For each task in sequence:                                          │  │
│  │  ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐    │  │
│  │  │ Resolve Inputs │ → │ Check Conditions │ → │ Execute (+retry) │    │  │
│  │  │ (resolver.ts)  │   │ (conditions.ts)  │   │ (executor/)      │    │  │
│  │  └────────────────┘   └──────────────────┘   └──────────────────┘    │  │
│  │                                                                      │  │
│  │  Output of each task feeds into the next via taskOutputs[] array.    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  EXECUTOR (src/engine/executor/)                                     │  │
│  │                                                                      │  │
│  │  Routes by service type:                                             │  │
│  │  • code-execute  → Node.js VM sandbox (5s timeout)                   │  │
│  │  • method-execute → HTTP calls, OAuth2 refresh, push notifications   │  │
│  │  • publish-content → Write to user's content feed                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── authorizer/         Auth0 JWT verification (Lambda Authorizer)
├── connectors/         OAuth connector registry
├── controllers/        Business logic (Bot, User, Data)
├── docs/               OpenAPI spec generation script
├── endpoints/          HTTP Lambda handlers
│   ├── bots/            Bot CRUD + deploy + test + logs + webhook trigger
│   ├── connections/     OAuth connection CRUD + health check
│   ├── content/         Content feed (list fresh items, react)
│   ├── data/            Generic entity CRUD (dynamic types)
│   ├── models/          Shared bot templates
│   ├── oauth/           OAuth callback (provider redirect)
│   └── user/            Account creation (Auth0 Action) + deletion
├── engine/             Bot execution engine
│   ├── executor/        Task executors (code sandbox, HTTP methods)
│   ├── index.ts         Lambda handler ({botId, userId, payload?})
│   ├── run.ts           Orchestration loop (runBot)
│   ├── resolver.ts      Variable resolution (output refs → data)
│   ├── conditions.ts    Skip-condition evaluation
│   └── data.ts          Path traversal, mapping, pipes
├── lib/                DynamoDB client singleton
└── utils/              API response formatting, auth guard, token refresh
```

---

## API Endpoints

All authenticated endpoints use the Lambda Authorizer (Auth0 JWT).

### Bots

| Method | Path                        | Auth  | Description                      |
| ------ | --------------------------- | ----- | -------------------------------- |
| GET    | `/bots`                     | JWT   | List user's bots                 |
| POST   | `/bots`                     | JWT   | Create new bot                   |
| GET    | `/bots/{botId}`             | JWT   | Get bot definition               |
| PATCH  | `/bots/{botId}`             | JWT   | Update bot                       |
| DELETE | `/bots/{botId}`             | JWT   | Delete bot + cleanup scheduler   |
| POST   | `/bots/{botId}/deploy`      | JWT   | Enable/disable bot schedule      |
| POST   | `/bots/{botId}/test`        | JWT   | Execute single task (in-process) |
| GET    | `/bots/{botId}/logs`        | JWT   | Query execution history          |
| POST   | `/bots/{botId}/run/{token}` | Token | Webhook trigger (public)         |

### Data (Generic CRUD)

| Method | Path                               | Auth | Description                 |
| ------ | ---------------------------------- | ---- | --------------------------- |
| GET    | `/data/{type}`                     | JWT  | List records by type        |
| PUT    | `/data/{type}`                     | JWT  | Create record               |
| GET    | `/data/{type}/{id}`                | JWT  | Read record                 |
| PATCH  | `/data/{type}/{id}`                | JWT  | Update record               |
| DELETE | `/data/{type}/{id}`                | JWT  | Delete record               |
| POST   | `/data/{type}/{id}/upload`         | JWT  | Get S3 presigned upload URL |
| DELETE | `/data/{type}/{id}/files/{fileId}` | JWT  | Delete file from S3         |

### Connections

| Method | Path                                 | Auth | Description                  |
| ------ | ------------------------------------ | ---- | ---------------------------- |
| GET    | `/connections`                       | JWT  | List connections             |
| POST   | `/connections`                       | JWT  | Create connection            |
| GET    | `/connections/{connectionId}`        | JWT  | Get connection + linked bots |
| DELETE | `/connections/{connectionId}`        | JWT  | Delete connection            |
| POST   | `/connections/{connectionId}/health` | JWT  | Verify token is still valid  |

### Other

| Method | Path                       | Auth    | Description                     |
| ------ | -------------------------- | ------- | ------------------------------- |
| GET    | `/content`                 | JWT     | Fetch fresh content feed        |
| PATCH  | `/content/{contentId}`     | JWT     | React to content item           |
| GET    | `/models`                  | JWT     | List shared bot templates       |
| POST   | `/models/{modelId}/deploy` | JWT     | Create bot from template        |
| POST   | `/user`                    | API Key | Create user (Auth0 Action only) |
| DELETE | `/user`                    | JWT     | Delete account + all data       |
| GET    | `/oauth/callback`          | None    | OAuth provider redirect handler |

---

## DynamoDB Design

Single table, single partition key pattern. All data is user-scoped.

```
Table: baita-backend-prod
Billing: On-demand (PAY_PER_REQUEST)

┌──────────────┬──────────────────────────────┬────────────────────────────┐
│  PK (userId) │  SK (sortKey)                │  Description               │
├──────────────┼──────────────────────────────┼────────────────────────────┤
│  userId      │  #USER                       │  Profile (singleton)       │
│  userId      │  #TODO                       │  Todo list (singleton)     │
│  userId      │  #BOT#{botId}                │  Bot workflow definition   │
│  userId      │  #CONNECTION#{connectionId}  │  OAuth token pair          │
│  userId      │  #CONTENT#{contentId}        │  Feed item (7-day TTL)     │
│  userId      │  #NOTE#{noteId}              │  Text note                 │
│  userId      │  #PLACE#{placeId}            │  Location pin              │
└──────────────┴──────────────────────────────┴────────────────────────────┘

Sort key format: #TYPE for singletons, #TYPE#id for collections.
The Data controller constructs sort keys dynamically from the entity type.
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 11+ (from monorepo root)
- AWS CLI with profile `baita` configured (`~/.aws/credentials`)

### Local Development

```bash
# From monorepo root
pnpm install

# Start local API server (serverless-offline on port 5000)
cd apps/backend && npm start

# Run tests
npm test              # Watch mode
npm run test:run      # Single run (CI)

# Quality checks
npm run type-check    # TypeScript strict mode
npm run lint          # ESLint + auto-fix
npm run spell         # CSpell
npm run format:check  # Prettier check
```

### Deploy

```bash
npm run deploy        # Serverless Framework → AWS (prod stage)
npm run docs          # Generate + upload OpenAPI spec to S3
```

---

## Lambda Functions

| Function               | Handler                                   | Timeout | HTTP Events               |
| ---------------------- | ----------------------------------------- | ------- | ------------------------- |
| `authorizer`           | `src/authorizer/index.handler`            | 10s     | — (token authorizer)      |
| `endpoint-bots`        | `src/endpoints/bots/index.handler`        | 30s     | 9 routes (CRUD + actions) |
| `endpoint-data`        | `src/endpoints/data/index.handler`        | 30s     | 7 routes (generic CRUD)   |
| `endpoint-connections` | `src/endpoints/connections/index.handler` | 30s     | 5 routes                  |
| `endpoint-content`     | `src/endpoints/content/index.handler`     | 30s     | 2 routes                  |
| `endpoint-models`      | `src/endpoints/models/index.handler`      | 30s     | 5 routes                  |
| `endpoint-user`        | `src/endpoints/user/index.handler`        | 30s     | 2 routes                  |
| `oauth-callback`       | `src/endpoints/oauth/callback.handler`    | 30s     | 1 route (public)          |
| `bot-engine`           | `src/engine/index.handler`                | 300s    | None (async invoke only)  |

---

## Key Concepts

### Trigger Token

The webhook URL `POST /bots/{botId}/run/{token}` uses a token that encodes the `userId` (base64url). This allows the trigger endpoint to resolve the user without a database lookup, then load the bot directly via `GetItem(PK=userId, SK=#BOT#{botId})`.

### Entity Type Registry

Adding a new data type requires zero backend code changes:

1. Define a Zod schema in `packages/shared/src/schemas/`
2. Register it in `packages/shared/src/registry.ts`
3. The generic `/data/{type}` endpoints handle CRUD automatically

### Async Engine Invocation

The engine Lambda is never called synchronously. Callers (trigger endpoint, scheduler) use `InvocationType: 'Event'` — they fire and forget. The engine can run up to 300 seconds without blocking the caller. Results are logged to CloudWatch.

---

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript 5.9 (strict mode)
- **Framework**: Serverless Framework 3.40
- **Cloud**: AWS Lambda, API Gateway, DynamoDB, S3, EventBridge Scheduler, CloudWatch
- **Auth**: Auth0 (JWT verification via Lambda Authorizer)
- **HTTP Client**: Axios (external API calls, OAuth token exchange)
- **Push**: web-push (VAPID-based)
- **Testing**: Jest 30 + ts-jest
- **Linting**: ESLint 9 + Prettier + CSpell
- **Bundler**: serverless-esbuild

---

## Testing

```bash
npm test              # Watch mode (development)
npm run test:run      # Single run (CI)
```

Tests are organized alongside the code they test:

- `src/engine/tests/` — Engine orchestration, resolver, conditions, data utilities
- `src/engine/executor/tests/` — Task executor methods
- `src/controllers/tests/` — Controller logic
- `src/utils/tests/` — API response formatting, auth guard
- `src/authorizer/tests/` — JWT verification
- `src/connectors/oauth/tests/` — OAuth registry

---

## Environment

All secrets live in AWS SSM Parameter Store (`/baita/prod/*`) and are resolved at deploy time. Public config (Auth0 domain, OAuth URLs) is hardcoded in `serverless.yml`.

| Category       | Examples                                 | Storage                    |
| -------------- | ---------------------------------------- | -------------------------- |
| Infrastructure | Table name, bucket names, ARNs           | serverless.yml (computed)  |
| Public config  | Auth0 domain, OAuth token URLs           | serverless.yml (hardcoded) |
| Secrets        | Client IDs/secrets, API keys, VAPID keys | AWS SSM (`${ssm:/path}`)   |
