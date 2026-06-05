# Data Architecture & Access Patterns

Complete reference for how data flows through the Baita monorepo: from frontend acquisition, through the API, into DynamoDB, and back.

## Table of Contents

1. [System Overview](#system-overview)
2. [Backend Data Layer](#backend-data-layer)
3. [Frontend Data Layer](#frontend-data-layer)
4. [Page-by-Page Fetching Analysis](#page-by-page-fetching-analysis)
5. [Identified Issues](#identified-issues)
6. [Improvement Plan](#improvement-plan)

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React SPA)                         │
│                                                                      │
│  ┌─────────┐   ┌───────────────┐   ┌──────────────────────────────┐  │
│  │ Views   │──▶│  Providers    │──▶│  ApiRequest() — Axios hook   │  │
│  │ (pages) │◀──│  (Context)    │◀──│  + Bearer token interceptor  │  │
│  └─────────┘   └───────────────┘   └──────────────────────────────┘  │
│       ▲              OR                           │                  │
│       └──────────────────────────── Direct call ──┘                  │
└──────────────────────────────────────────────────────────────────────┘
                                    │ HTTP (always 200)
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY + LAMBDA AUTHORIZER                   │
│  Auth0 JWT verification → passes userId in authorizer context        │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Lambda handlers)                    │
│                                                                      │
│  ┌────────────┐   ┌──────────────────┐   ┌───────────────────────┐   │
│  │ Endpoints  │──▶│   Controllers    │──▶│  DynamoDB / S3 / SQS  │   │
│  │ (handlers) │◀──│ (business logic) │◀──│  (AWS SDK v3)         │   │
│  └────────────┘   └──────────────────┘   └───────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Contract

Every API response follows this shape (defined in `@baita/shared`):

```typescript
{ success: boolean, message?: string, data?: T }
```

HTTP status is always `200`. Success/failure determined by the `success` field.

---

## Backend Data Layer

### DynamoDB Single-Table Design

One table (`CORE_TABLE`) stores all entities using composite keys:

| Partition Key (userId) | Sort Key (sortKey)   | Entity                     |
| ---------------------- | -------------------- | -------------------------- |
| `user-abc`             | `#USER`              | User profile               |
| `user-abc`             | `#BOT#bot-123`       | Bot definition             |
| `user-abc`             | `#TODO#todo-1`       | Todo list                  |
| `user-abc`             | `#NOTE#note-1`       | Note                       |
| `user-abc`             | `#PLACE#place-1`     | Place                      |
| `user-abc`             | `#CONNECTION#conn-1` | OAuth connection           |
| `user-abc`             | `#CONTENT#content-1` | Content item               |
| `user-abc`             | `#MODEL#model-1`     | Bot model (template)       |
| `baita`                | `#MODEL#model-1`     | Shared bot models (global) |

### Controllers

| Controller           | Role                              | DynamoDB Ops                                   |
| -------------------- | --------------------------------- | ---------------------------------------------- |
| `Resource` (generic) | CRUD for any entity               | `query`, `get`, `put`, `update`, `delete`      |
| `Bot` (specialized)  | Bot lifecycle + AWS orchestration | All DDB ops + Lambda + S3 + API GW + Scheduler |
| `User`               | User creation + SQS content feed  | `put`, `query` + SQS                           |

### Resource Controller — Generic CRUD

All "simple" resources (todo, note, place, connection, content, model, bot-as-resource) go through one dynamic endpoint:

```
POST /user/{userId}/resource/{resourceName}/{operation}[/{resourceId}]
```

Operations: `list`, `read`, `create`, `update`, `delete`, `upload`, `remove`

The Resource class builds DynamoDB sort keys dynamically:

```typescript
sortKey(resourceId?) → '#' + RESOURCE_NAME + '#' + resourceId
```

### Bot Controller — Specialized

Bot operations have dedicated endpoints because they orchestrate multiple AWS services:

- `POST /bot` — create (DDB put)
- `PUT /bot/{botId}` — update (DDB update)
- `DELETE /bot/{botId}/api/{apiId}` — delete (DDB + Lambda + S3 + API GW + Scheduler)
- `POST /bot/{botId}/deploy` — deploy (code gen + S3 + Lambda + API GW + DDB)
- `POST /bot/{botId}/test/{taskIndex}` — test step (Lambda invoke + DDB update)
- `GET /bot/{botId}/logs` — logs (CloudWatch)

### Endpoint Handler Pattern

Every endpoint follows this exact structure:

```typescript
handler(event, context, callback) {
  const api = new Api(event, context)        // timeout safety + response helpers
  const controller = new SomeController()    // business logic

  try {
    // 1. Extract params from path/body
    // 2. Validate with @baita/shared
    // 3. Call controller
    // 4. Return success: api.httpResponse(callback, 'success', undefined, data)
  } catch (err) {
    api.httpResponse(callback, 'fail', err)  // always HTTP 200, success: false
  }
}
```

### Error Handling

- Controllers normalize errors: `throw err instanceof Error ? err : new Error(String(err))`
- Api class parses errors via `parseError()` (handles Error, Axios errors, objects, strings)
- All errors returned as HTTP 200 with `{ success: false, message: "..." }`

---

## Frontend Data Layer

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Provider Hierarchy                   │
│                                                         │
│  AuthProvider (Auth0 wrapper)                           │
│    └─ UserProvider (connections, content, todo)         │
│         └─ AppsProvider (static connector data)         │
│              └─ BotProvider (bots, bot, botModels)      │
│                   └─ All authenticated routes           │
└─────────────────────────────────────────────────────────┘
```

### ApiRequest() — The HTTP Client

Located at `src/utils/requests.ts`. It is a **hook-like function** (uses `useContext`) that:

1. Creates a NEW Axios instance on every call
2. Adds a request interceptor that calls `getToken()` (Auth0's `getAccessTokenSilently`)
3. Provides a `getApiResponse<T>(method, url, data, userId)` helper
4. Exports ~30 typed API methods (getBots, getTodo, deleteNote, etc.)

The `getApiResponse` helper:

- Prepends `user/${userId}/` to all URLs
- Rejects if `!response.data.success`
- Resolves with `response.data.data` (the typed payload)

### Two Data Fetching Patterns

| Pattern             | Used By                                     | How It Works                                                       |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| **Provider-backed** | Bots, Bot, Connections, ToDo, Feed, Profile | View reads state from Context; provider holds data + fetch methods |
| **Direct API**      | Notes, Places, Logs                         | View calls `ApiRequest()` directly, manages own `useState`         |

### State Management

- **No caching** — every navigation re-fetches
- **No request deduplication** — N components calling same method = N requests
- **No background sync** — data goes stale while tab is open
- **No retry** — single failed request = empty state forever
- **Eager fetching** — UserProvider fetches ALL data (connections, content, todo) on mount regardless of which page the user navigates to

---

## Page-by-Page Fetching Analysis

### Home / ToDo (`/` and `/todo`)

| Aspect                 | Current Behavior                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| **Data source**        | `UserContext.todoTasks`                                                                               |
| **When fetched**       | TWICE: (1) UserProvider mounts → `retrieveTodoTasks()`, (2) ToDo mounts → `retrieveTodoTasks()` again |
| **Redundant requests** | Yes — always fetches twice on first visit                                                             |
| **Error handling**     | Provider catches → sets `[]`. View relies on provider catch.                                          |
| **Loading state**      | `!todoTasks` → Skeleton                                                                               |
| **Mutations**          | Optimistic: updates local state immediately, fires API in background (no rollback on failure)         |
| **Issues**             | Duplicate fetch on mount. No error feedback to user. No retry.                                        |

### Bots (`/bots`)

| Aspect             | Current Behavior                                                                 |
| ------------------ | -------------------------------------------------------------------------------- |
| **Data source**    | `BotContext.bots` + `BotContext.botModels`                                       |
| **When fetched**   | On mount via `useEffect` → `Promise.all([getBotModels(), getBots()])`            |
| **Error handling** | `.catch(() => {}).finally(() => setFetching(false))` — errors silently swallowed |
| **Loading state**  | `fetching \|\| !bots` → Skeleton                                                 |
| **Guard**          | `if (!fetching)` prevents double-fetch while in flight                           |
| **Issues**         | Silent error swallowing. botModels uses special `userId = 'baita'`.              |

### Bot Detail (`/bots/:botId`)

| Aspect             | Current Behavior                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data source**    | `BotContext.bot`                                                                                                                                                   |
| **When fetched**   | On mount, only if `!bot`: `if (botId && !bot) getBot(botId)`                                                                                                       |
| **Error handling** | NONE — if `getBot()` fails, `bot` stays `undefined` forever                                                                                                        |
| **Loading state**  | `!bot` → Skeleton (forever if fetch fails)                                                                                                                         |
| **Issues**         | No error handling = potential infinite skeleton. If user navigated from /bots, bot might already be in context but isn't — provider only stores ONE bot at a time. |

### Connections (`/connections`)

| Aspect             | Current Behavior                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Data source**    | `UserContext.connections`                                                                                                        |
| **When fetched**   | Pre-fetched by UserProvider on mount. View does NOT refetch.                                                                     |
| **Error handling** | Provider catches → sets `[]`                                                                                                     |
| **Loading state**  | `connections === undefined` → Skeleton                                                                                           |
| **Issues**         | Stale data — if user adds a connection via OAuth popup, the list won't update unless `retrieveConnections()` is called manually. |

### Feed (`/feed`)

| Aspect             | Current Behavior                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Data source**    | `UserContext.contents`                                                                                                          |
| **When fetched**   | (1) UserProvider eagerly fetches on mount. (2) Feed mounts → checks `if (!contents \|\| contents.length === 0)` → fetches again |
| **Error handling** | `updateContent()` uses `.then(() => setFetching(false))` with **NO `.catch()` or `.finally()`**                                 |
| **Loading state**  | `!contents \|\| fetching` → Skeleton                                                                                            |
| **BUG**            | If `retrieveContent()` rejects, `fetching` stays `true` forever → **infinite skeleton**                                         |
| **Issues**         | Missing error handling. Potential infinite loading. No user feedback on failure.                                                |

### Notes (`/notes`)

| Aspect             | Current Behavior                                                           |
| ------------------ | -------------------------------------------------------------------------- |
| **Data source**    | Local `useState` via direct `ApiRequest()`                                 |
| **When fetched**   | On mount via `useEffect` → `refreshNotes()`                                |
| **Error handling** | `.catch(() => showSnack(labels.loadError, 'error'))` ✓                     |
| **Loading state**  | `!notes` → Skeleton                                                        |
| **Mutations**      | After save/delete → calls `refreshNotes()` (full re-fetch, not optimistic) |
| **Issues**         | Full re-fetch after every mutation is wasteful. No local cache.            |

### Places (`/place`)

| Aspect             | Current Behavior                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Data source**    | Local `useState` via direct `ApiRequest()`                                                                           |
| **When fetched**   | On mount via `useEffect` → `listPlaces()`                                                                            |
| **Error handling** | Initial: `.catch(() => setPlaces([]))` (silent). Refresh: `.catch(() => showSnack(...))`                             |
| **Loading state**  | `!places` → Skeleton                                                                                                 |
| **Mutations**      | After modal close → full re-fetch via `listPlaces()`                                                                 |
| **Issues**         | Inconsistent error handling (silent on mount, snack on refresh). Re-fetches all on close even if no change was made. |

### Logs (`/bots/:botId/logs`)

| Aspect             | Current Behavior                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Data source**    | Local `useState` (logs) + `BotContext.bot` (bot metadata)                                            |
| **When fetched**   | On mount: (1) `getBot(botId)` if not loaded, (2) `getLogs(botId)`                                    |
| **Error handling** | `.finally(() => setFetching(false))` but **no `.catch()`** — errors propagate to unhandled rejection |
| **Loading state**  | `fetching \|\| !botLogs` → Skeleton                                                                  |
| **Issues**         | Missing explicit error handling. Manual refresh button exists (good).                                |

### Profile (`/profile`)

| Aspect             | Current Behavior                                                 |
| ------------------ | ---------------------------------------------------------------- |
| **Data source**    | `AuthContext.user` + `UserContext.todoTasks`                     |
| **When fetched**   | No fetch — relies entirely on pre-fetched data from UserProvider |
| **Error handling** | N/A (no fetch)                                                   |
| **Loading state**  | `!statistics` → Skeleton (derived from todoTasks)                |
| **Issues**         | None — properly relies on already-fetched data.                  |

---

## Identified Issues

### Critical (Bugs)

| #   | Issue                               | Location                  | Impact                                                            |
| --- | ----------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| 1   | **Infinite skeleton on Feed**       | `views/feed/index.tsx:61` | If `retrieveContent()` rejects, `fetching` stays `true` forever   |
| 2   | **Infinite skeleton on Bot detail** | `views/bot/index.tsx:23`  | If `getBot()` rejects, `bot` stays `undefined` forever            |
| 3   | **No userId ownership check**       | All endpoints             | Authenticated user can access another user's data by changing URL |

### Performance

| #   | Issue                                | Location                         | Impact                                                                  |
| --- | ------------------------------------ | -------------------------------- | ----------------------------------------------------------------------- |
| 4   | **Duplicate fetch on ToDo mount**    | UserProvider + ToDo view         | 2 identical API calls on first visit                                    |
| 5   | **Eager fetch of ALL data on login** | UserProvider `useEffect([], [])` | 3 API calls (content, todo, connections) regardless of destination page |
| 6   | **New Axios instance per call**      | `requests.ts`                    | No connection reuse, no request deduplication                           |
| 7   | **No caching**                       | All pages                        | Every navigation re-fetches from API                                    |
| 8   | **Full re-fetch after mutations**    | Notes, Places                    | CRUD operations refetch entire list instead of updating cache           |
| 9   | **DynamoDB client in constructor**   | Bot & Resource controllers       | New SDK client per invocation, no warm-start connection reuse           |
| 10  | **No pagination**                    | `Resource.list()`                | Returns ALL items, breaks at scale                                      |

### Consistency

| #   | Issue                                        | Location                                         | Impact                                                                                    |
| --- | -------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 11  | **Two fetching patterns**                    | Provider-backed vs Direct API                    | No rule for when to use which                                                             |
| 12  | **Inconsistent error handling**              | Across all views                                 | Silent (Bots), snack (Notes), none (Bot, Logs), infinite loading (Feed)                   |
| 13  | **Mixed mutation strategies**                | BotProvider vs Notes vs Connections              | Optimistic (delete bot) vs confirm-then-update (delete connection) vs refetch-all (notes) |
| 14  | **S3 client style mismatch**                 | Bot (S3 class) vs Resource (S3Client + commands) | Two SDK usage patterns in same backend                                                    |
| 15  | **Bot controller bypasses Resource pattern** | `controllers/bot.ts`                             | Hardcodes `'#BOT#' + botId` instead of using Resource's `sortKey()`                       |

### Architecture

| #   | Issue                          | Location            | Impact                                                  |
| --- | ------------------------------ | ------------------- | ------------------------------------------------------- |
| 16  | **HTTP 200 for errors**        | `utils/api.ts`      | CloudWatch, alerting, and WAF cannot detect error rates |
| 17  | **No retry logic**             | Frontend or backend | Single point of failure per request                     |
| 18  | **No background data sync**    | Frontend            | Data goes stale while user has tab open                 |
| 19  | **Provider stores single bot** | BotProvider         | Navigating between bots requires re-fetch each time     |

---

## Improvement Plan

### Phase 1: Fix Critical Bugs (immediate, no new dependencies)

1. **Fix Feed infinite loading** — Add `.catch().finally()` to `updateContent()`
2. **Fix Bot detail infinite loading** — Add error state + retry in Bot view
3. **Add userId ownership check** — Compare `event.requestContext.authorizer.principalId` with path `userId` in every endpoint

### Phase 2: Backend Quick Wins (low effort, high impact)

4. **Extract DynamoDB client to module-level singleton**

   ```typescript
   // src/lib/dynamodb.ts
   export const ddb = DynamoDBDocument.from(new DynamoDB({}), {
     marshallOptions: { removeUndefinedValues: true },
   })
   ```

   Import in all controllers instead of constructing in constructors.

5. **Standardize S3 client** — Use `S3Client` + command pattern everywhere (already the recommended v3 approach).

6. **Add pagination to Resource.list()** — Implement cursor-based pagination with `Limit` + base64-encoded `LastEvaluatedKey`.

### Phase 3: Frontend Data Layer Refactor (the big win)

**Replace provider-based server state with TanStack Query.**

This single change solves issues #4-8, #11-13, #17-19 simultaneously:

| Problem                      | How TanStack Query Solves It                                    |
| ---------------------------- | --------------------------------------------------------------- |
| Duplicate fetches            | Automatic request deduplication by query key                    |
| Eager fetching everything    | Lazy — only fetches when component mounts                       |
| No caching                   | Built-in cache with configurable staleTime                      |
| Full re-fetch after mutation | `invalidateQueries` or optimistic cache updates                 |
| Two fetching patterns        | One pattern for everything: `useQuery` / `useMutation`          |
| Inconsistent error handling  | Global `onError` callback + per-query error state               |
| No retry                     | Configurable exponential backoff (default 3 retries)            |
| No background sync           | Refetch on window focus, reconnect, and intervals               |
| Single bot in provider       | Cache keyed by `['bot', botId]` — all bots cached independently |

**Migration steps:**

```
Step 1: Install @tanstack/react-query
Step 2: Create singleton apiClient (module-level Axios, not a hook)
Step 3: Create query hooks (useBots, useBot, useTodo, useNotes, etc.)
Step 4: Create mutation hooks (useCreateBot, useDeleteBot, etc.)
Step 5: Replace BotProvider internals with query hooks
Step 6: Replace UserProvider internals with query hooks
Step 7: Convert direct-API views (Notes, Places, Logs) to query hooks
Step 8: Delete ApiRequest() hook
Step 9: Keep AuthContext, ErrorContext, NotificationContext (UI state)
```

**Target architecture:**

```typescript
// src/api/client.ts — singleton, no hook dependency
const apiClient = axios.create({ baseURL: appConfig.apiUrl })

// Token injected once from app root
export function setupAuth(getToken: () => Promise<string>) {
  apiClient.interceptors.request.use(async (config) => {
    config.headers.Authorization = `Bearer ${await getToken()}`
    return config
  })
}

// src/api/bots.ts — plain functions, importable anywhere
export const fetchBots = (userId: string) =>
  apiClient.post(`user/${userId}/resource/bot/list`).then((r) => r.data.data)

// src/hooks/useBots.ts — the React integration
export function useBots() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['bots', user.userId],
    queryFn: () => fetchBots(user.userId),
    staleTime: 30_000,
  })
}
```

### Phase 4: Backend Consistency (medium effort)

7. **Migrate to proper HTTP status codes** — Return 400/404/500 while keeping `{ success, message, data }` body for backward compat. This enables Axios `.catch()` for errors and proper CloudWatch metrics.

8. **Bot controller to use Resource pattern for DDB ops** — Extract shared `sortKey` logic; Bot only adds orchestration on top.

9. **Consolidate validation** — All endpoints validate request body with Zod `safeParse` early, return 400 on failure.

### Phase 5: Polish (low priority, high consistency)

10. **Standardize mutation strategy** — Optimistic for deletes (user intent is clear), confirm for creates (need server ID), invalidate for updates.

11. **Add loading states to all mutations** — Button shows spinner during save/deploy.

12. **Remove AppsProvider** — It's purely synchronous; replace with a simple `useConnectors()` hook that calls `getAllConnectors()` directly.

---

## Target State Summary

| Aspect             | Current                                    | Target                                         |
| ------------------ | ------------------------------------------ | ---------------------------------------------- |
| Frontend state lib | React Context (server + UI state mixed)    | TanStack Query (server) + Context (UI only)    |
| API client         | Hook creating new Axios per call           | Module-level singleton                         |
| Caching            | None                                       | 30s stale time, 5min garbage collection        |
| Error handling     | Inconsistent (5 different patterns)        | Global onError toast + per-page error state    |
| Loading            | Manual useState + undefined checks         | `isLoading` from useQuery, consistent Skeleton |
| Mutations          | Mixed (optimistic / confirm / refetch-all) | Standardized per operation type                |
| Backend DDB client | Per-invocation in constructor              | Module-level singleton (warm-start reuse)      |
| HTTP status codes  | Always 200                                 | Proper codes (200/201/400/404/500)             |
| Pagination         | None                                       | Cursor-based with configurable limit           |
| Request dedup      | None                                       | Automatic via query keys                       |
| Background sync    | None                                       | Refetch on focus + reconnect                   |
| Retry              | None                                       | 3 retries with exponential backoff             |
