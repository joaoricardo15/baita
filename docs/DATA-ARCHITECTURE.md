# Data Architecture

How data flows through the Baita monorepo: frontend → API → DynamoDB → API → frontend.

## System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React SPA)                        │
│                                                                   │
│  ┌─────────┐   ┌────────────────┐   ┌──────────────────────────┐  │
│  │ Views   │──▶│ TanStack Query │──▶│  apiClient (Axios)       │  │
│  │ (hooks) │◀──│ (cache/dedup)  │◀──│  + Bearer interceptor    │  │
│  └─────────┘   └────────────────┘   └──────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                  API GATEWAY + LAMBDA AUTHORIZER                  │
│  Auth0 JWT verification → userId in authorizer context            │
└───────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                       BACKEND (Lambda handlers)                   │
│                                                                   │
│  ┌────────────┐   ┌──────────────────┐   ┌─────────────────────┐  │
│  │ Endpoints  │──▶│   Controllers    │──▶│ DynamoDB / S3 / SQS │  │
│  │ (handlers) │◀──│ (business logic) │◀──│ (module-level SDK)  │  │
│  └────────────┘   └──────────────────┘   └─────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## API Contract

Every endpoint returns: `{ success: boolean, message?: string, data?: T }`

## Backend

### DynamoDB Single-Table Design

One table (`CORE_TABLE`), composite key: `userId` (PK) + `sortKey` (SK).

| Sort Key Pattern   | Entity           |
| ------------------ | ---------------- |
| `#USER`            | User profile     |
| `#BOT#{botId}`     | Bot definition   |
| `#TODO#{id}`       | Todo list        |
| `#NOTE#{id}`       | Note             |
| `#PLACE#{id}`      | Place            |
| `#CONNECTION#{id}` | OAuth connection |
| `#CONTENT#{id}`    | Content item     |
| `#MODEL#{id}`      | Bot model        |

### Module-Level DDB Client

`src/lib/dynamodb.ts` exports a singleton `ddb` instance. All controllers import it — no per-invocation construction.

### Auth Guard

Every endpoint uses `getAuthenticatedUserId(event)` from `src/utils/authGuard.ts`:

- Extracts `userId` from JWT authorizer context
- Validates it matches the path parameter
- Throws `Unauthorized` or `Forbidden` on mismatch

### Generic Resource CRUD

`POST /user/{userId}/resource/{name}/{operation}[/{id}]`

Operations: `list`, `read`, `create`, `update`, `delete`, `upload`, `remove`

### Bot Endpoints (operation-based routing, all POST)

| Endpoint                                 | Purpose                       |
| ---------------------------------------- | ----------------------------- |
| `POST /user/{userId}/bot/create`         | Create bot                    |
| `POST /user/{userId}/bot/update/{botId}` | Update bot                    |
| `POST /user/{userId}/bot/delete/{botId}` | Delete bot + Lambda + S3      |
| `POST /user/{userId}/bot/deploy/{botId}` | Deploy (code gen + Lambda)    |
| `POST /user/{userId}/bot/test/{botId}`   | Test step (taskIndex in body) |
| `POST /user/{userId}/bot/logs/{botId}`   | CloudWatch logs               |
| `POST /user/{userId}/bot/model`          | Deploy from bot model         |

## Frontend

### Data Fetching: TanStack Query

Server state managed by TanStack Query with 5-minute `staleTime`:

- Automatic caching and request deduplication
- Background refetch on window focus
- 2 retries on failure with exponential backoff
- Optimistic deletes with rollback

### Architecture

```
src/api/client.ts      — Axios singleton + auth interceptor setup
src/api/queries.ts     — Fetch functions (GET/list/read operations)
src/api/mutations.ts   — Mutation functions (create/update/delete)
src/hooks/use*.ts      — TanStack Query hooks per domain
```

### Query Hooks

| Hook               | Query Key                 | Source              |
| ------------------ | ------------------------- | ------------------- |
| `useBots()`        | `['bots', userId]`        | `useBots.ts`        |
| `useBot(botId)`    | `['bot', userId, botId]`  | `useBots.ts`        |
| `useBotModels()`   | `['botModels', 'baita']`  | `useBots.ts`        |
| `useTodo()`        | `['todo', userId]`        | `useTodo.ts`        |
| `useConnections()` | `['connections', userId]` | `useConnections.ts` |
| `useContent()`     | `['content', userId]`     | `useContent.ts`     |
| `useNotes()`       | `['notes', userId]`       | `useNotes.ts`       |
| `usePlaces()`      | `['places', userId]`      | `usePlaces.ts`      |
| `useLogs(botId)`   | `['logs', userId, botId]` | `useLogs.ts`        |

### Mutation Hooks

Mutations invalidate related query keys on success. Deletes use optimistic updates with rollback on error.

### Providers (UI state only)

| Provider               | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `AuthProvider`         | Auth0 wrapper (user, token, login/logout)  |
| `ErrorProvider`        | Global error boundary + Firebase analytics |
| `NotificationProvider` | Snackbar, modal, loading overlay           |
| `AppsProvider`         | Static connector registry (no API)         |
