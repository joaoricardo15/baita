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
│  │ Endpoints  │──▶│   Controllers    │──▶│ DynamoDB / S3       │  │
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

Every endpoint uses `getAuthenticatedUserId(event)` from `src/utils/auth.ts`:

- Extracts `userId` from the Lambda authorizer context (strips `auth0|` prefix)
- Throws `Unauthorized` if authorizer context is missing

### Generic Resource CRUD

`GET/POST/PATCH/DELETE /data/{type}[/{id}]`

### Bot Endpoints

| Endpoint                         | Purpose                             |
| -------------------------------- | ----------------------------------- |
| `POST /bots`                     | Create bot                          |
| `PATCH /bots/{botId}`            | Update bot configuration            |
| `DELETE /bots/{botId}`           | Delete bot + EventBridge Scheduler  |
| `POST /bots/{botId}/deploy`      | Activate/deactivate (scheduler)     |
| `POST /bots/{botId}/test`        | Test single step                    |
| `GET /bots/{botId}/logs`         | Execution logs (CloudWatch)         |
| `POST /bots/{botId}/run/{token}` | Trigger execution (public, no auth) |

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

| Hook               | Query Key         | Source              |
| ------------------ | ----------------- | ------------------- |
| `useBots()`        | `['bots']`        | `useBots.ts`        |
| `useBot(botId)`    | `['bot', botId]`  | `useBots.ts`        |
| `useBotModels()`   | `['botModels']`   | `useBots.ts`        |
| `useTodo()`        | `['todo']`        | `useTodo.ts`        |
| `useConnections()` | `['connections']` | `useConnections.ts` |
| `useContent()`     | `['content']`     | `useContent.ts`     |
| `useNotes()`       | `['notes']`       | `useNotes.ts`       |
| `usePlaces()`      | `['places']`      | `usePlaces.ts`      |
| `useLogs(botId)`   | `['logs', botId]` | `useLogs.ts`        |

### Mutation Hooks

Mutations invalidate related query keys on success. Deletes use optimistic updates with rollback on error.

### Providers (UI state only)

| Provider               | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `AuthProvider`         | Auth0 wrapper (user, token, login/logout)  |
| `ErrorProvider`        | Global error boundary + Firebase analytics |
| `NotificationProvider` | Snackbar, modal, loading overlay           |
| `AppsProvider`         | Static connector registry (no API)         |
