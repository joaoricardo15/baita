# Data Layer — Consistency Fixes & Deviations

Specific files that deviate from established patterns, with proposed fixes.

## Backend Deviations

### 1. DynamoDB Client — Per-Invocation Construction

**Pattern violation:** Client should be at module level for warm-start reuse.

**Files affected:**

- `apps/backend/src/controllers/resource.ts` (line 43)
- `apps/backend/src/controllers/bot.ts` (constructor)
- `apps/backend/src/controllers/user.ts` (constructor)

**Fix:** Create `apps/backend/src/lib/dynamodb.ts`:

```typescript
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

export const ddb = DynamoDBDocument.from(new DynamoDB({}), {
  marshallOptions: { removeUndefinedValues: true },
})
```

Then import `ddb` in all controllers instead of constructing in constructors.

---

### 2. S3 Client Inconsistency

**Files affected:**

- `apps/backend/src/controllers/bot.ts` — uses `new S3({})` (aggregated class)
- `apps/backend/src/controllers/resource.ts` — uses `new S3Client({})` + commands (modular pattern)

**Note:** The `S3` aggregated class is NOT deprecated — both patterns are valid. However, `S3Client` + commands is preferred for Lambda because it produces smaller bundles (tree-shakable), which reduces cold start time.

**Fix:** Standardize on `S3Client` + command pattern. Create `apps/backend/src/lib/s3.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3'
export const s3 = new S3Client({})
```

---

### 3. Bot Controller Bypasses Resource Sort Key Pattern

**File:** `apps/backend/src/controllers/bot.ts`

**Issue:** Hardcodes `'#BOT#' + botId` in every method instead of using a shared `sortKey()` helper.

**Fix:** Either extend Resource class or extract sort key construction to a shared utility:

```typescript
const botSortKey = (botId: string) => `#BOT#${botId}`
```

---

### 4. Resource.update() Does Not Return Updated Item

**File:** `apps/backend/src/controllers/resource.ts` (line 119)

**Issue:** `ddb.update()` called without `ReturnValues`, returns nothing. Bot controller uses `ReturnValues: 'ALL_NEW'`.

**Fix:** Add `ReturnValues: 'ALL_NEW'` and return the updated item:

```typescript
const result = await this.ddb.update({
  ...params,
  ReturnValues: 'ALL_NEW',
})
return result.Attributes
```

---

### 5. No userId Ownership Verification (CRITICAL SECURITY)

**Files affected:** ALL endpoint handlers

**Issue:** Every endpoint reads `userId` from `event.pathParameters` but never compares it against the authenticated identity. The authorizer returns a wildcard policy (`/*/*`) that permits access to ALL paths once authenticated. Any authenticated user can access any other user's data (IDOR vulnerability).

**Verified:** The authorizer sets both `principalId: verified.sub` and `context: { userId: verified.sub }`. These appear in handlers as `event.requestContext.authorizer.principalId` and `event.requestContext.authorizer.userId` respectively. Context values are always coerced to strings by API Gateway.

**Fix:** Create a shared auth guard utility:

```typescript
// src/utils/authGuard.ts
import { APIGatewayProxyEvent } from 'aws-lambda'

export function getAuthenticatedUserId(event: APIGatewayProxyEvent): string {
  const authUserId = event.requestContext.authorizer?.userId
  const pathUserId = event.pathParameters?.userId

  if (!authUserId) {
    throw new Error('Unauthorized: missing authentication context')
  }

  if (pathUserId && pathUserId !== authUserId) {
    throw new Error('Forbidden: user mismatch')
  }

  return authUserId
}
```

Then in every endpoint, replace `const { userId } = event.pathParameters || {}` with `const userId = getAuthenticatedUserId(event)`.

---

### 6. No Pagination in Resource.list()

**File:** `apps/backend/src/controllers/resource.ts` (line 52)

**Issue:** `query()` returns all matching items with no `Limit`. Will break when users accumulate many items.

**Fix:** Accept optional `cursor` and `limit` params:

```typescript
async list(cursor?: string, limit = 50) {
  const params = {
    TableName: CORE_TABLE,
    KeyConditionExpression: '...',
    ExpressionAttributeValues: { ... },
    Limit: limit,
    ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64url').toString()) }),
  }
  const result = await ddb.query(params)
  return {
    items: result.Items,
    cursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
      : undefined,
  }
}
```

---

## Frontend Deviations

### 7. Feed — Missing Error Handling (BUG)

**File:** `apps/frontend/src/views/feed/index.tsx` (line 61)

**Current:**

```typescript
const updateContent = () => {
  setFetching(true)
  retrieveContent().then(() => setFetching(false))
}
```

**Fix:**

```typescript
const updateContent = () => {
  setFetching(true)
  retrieveContent()
    .catch(() => showSnack(labels.loadError, 'error'))
    .finally(() => setFetching(false))
}
```

---

### 8. Bot Detail — Missing Error Handling (BUG)

**File:** `apps/frontend/src/views/bot/index.tsx` (line 23-26)

**Current:**

```typescript
useEffect(() => {
  if (botId && !bot) {
    getBot(botId)
  }
}, [botId])
```

**Fix:** Add error state:

```typescript
const [error, setError] = useState(false)

useEffect(() => {
  if (botId && !bot) {
    getBot(botId).catch(() => setError(true))
  }
}, [botId])

// In render:
if (error) return <ErrorState onRetry={() => { setError(false); getBot(botId!) }} />
```

---

### 9. ToDo — Duplicate Fetch on Mount

**Files:** `apps/frontend/src/providers/user.tsx` (line 89) + `apps/frontend/src/views/todo/index.tsx` (line 43-45)

**Issue:** UserProvider already fetches `retrieveTodoTasks()` on mount. ToDo view also calls it on its own mount. Result: 2 identical requests.

**Fix (short term):** Remove the `useEffect` in ToDo view — rely on provider's eager fetch.

**Fix (long term):** With TanStack Query, both would use the same query key and dedup automatically.

---

### 10. ApiRequest() — Creates New Axios Instance Every Time

**File:** `apps/frontend/src/utils/requests.ts` (line 20-35)

**Issue:** Called from providers and views. Each invocation creates a NEW Axios instance with its own interceptor. No connection reuse, no shared state.

**Fix (Phase 3):** Replace with module-level singleton:

```typescript
// src/api/client.ts
import axios from 'axios'
import appConfig from '@/utils/config'

export const apiClient = axios.create({
  baseURL: appConfig.apiUrl,
  headers: { 'Content-Type': 'application/json' },
})

export function setupAuthInterceptor(getToken: () => Promise<string>) {
  apiClient.interceptors.request.use(async (config) => {
    config.headers.Authorization = `Bearer ${await getToken()}`
    return config
  })
}
```

---

### 11. ConnectionCard — Calls ApiRequest() in a Child Component

**File:** `apps/frontend/src/views/connections/components/connectionCard.tsx` (line 22)

**Issue:** `ApiRequest()` called inside a list item component. If there are 10 connections, 10 Axios instances are created (one per card render).

**Fix:** Move health check logic to a query hook or lift API call to parent.

---

### 12. Places — Re-fetches ALL Data on Modal Close

**File:** `apps/frontend/src/views/places/index.tsx` (line 37-41)

**Current:**

```typescript
const onClose = () => {
  setPlace(undefined)
  apiRequest.listPlaces().then(...)  // Full re-fetch even if nothing changed
}
```

**Fix:** Only re-fetch if a mutation was performed (pass a `changed` flag from modal), or use cache invalidation.

---

### 13. Logs — Missing .catch() on getLogs

**File:** `apps/frontend/src/views/logs/index.tsx` (line 23-33)

**Current:** Has `.finally()` but no `.catch()`. If `getLogs` rejects, the error propagates to global unhandled rejection handler.

**Fix:**

```typescript
apiRequest
  .getLogs(botId)
  .then((logs) => setBotLogs(logs))
  .catch(() => showSnack(labels.loadError, 'error'))
  .finally(() => setFetching(false))
```

---

### 14. Inconsistent Mutation Patterns

| File                        | Action            | Strategy                                   | Should Be                 |
| --------------------------- | ----------------- | ------------------------------------------ | ------------------------- |
| `providers/bot.tsx:71`      | Delete bot        | Optimistic (remove from list, then API)    | ✓ Correct                 |
| `providers/bot.tsx:92`      | Update bot        | Optimistic (set state, then API)           | ⚠️ No rollback on failure |
| `providers/user.tsx:80`     | Delete connection | Confirm (API first, then remove from list) | ✓ Correct                 |
| `views/notes/index.tsx:53`  | Save note         | Full re-fetch after success                | ⚠️ Wasteful               |
| `views/places/index.tsx:37` | Any modal close   | Full re-fetch unconditionally              | ⚠️ Wasteful               |

**Target pattern:**

- Deletes → optimistic with rollback
- Creates → confirm (need server-generated ID)
- Updates → optimistic with rollback
- Never full re-fetch; invalidate cache instead

---

## Priority Summary

| Priority | Fix                                      | Effort   | Impact                             |
| -------- | ---------------------------------------- | -------- | ---------------------------------- |
| **P0**   | #7 Feed infinite loading bug             | 5 min    | Prevents user-facing bug           |
| **P0**   | #8 Bot detail infinite skeleton          | 15 min   | Prevents user-facing bug           |
| **P0**   | #5 userId ownership check                | 30 min   | Security vulnerability             |
| **P1**   | #1 DDB client module-level               | 20 min   | Performance (cold starts)          |
| **P1**   | #9 ToDo duplicate fetch                  | 5 min    | Eliminates wasted request          |
| **P2**   | #2 S3 client standardization             | 15 min   | Code consistency                   |
| **P2**   | #3 Bot sort key pattern                  | 15 min   | Code consistency                   |
| **P2**   | #4 Resource.update return value          | 10 min   | API consistency                    |
| **P2**   | #13 Logs error handling                  | 5 min    | Prevents silent failures           |
| **P3**   | #10-14 Full frontend data layer refactor | 2-3 days | Solves all perf/consistency issues |
| **P3**   | #6 Pagination                            | 1 day    | Scalability                        |
