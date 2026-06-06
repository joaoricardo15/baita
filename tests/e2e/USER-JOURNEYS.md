# Baita — User Journeys & Use Cases

This document maps every customer-facing journey in the product to its test coverage. It serves as the **source of truth** for what users can do and how we verify it works.

Every new feature, bug fix, or refactoring should be reviewed against this map to ensure no journey is left unprotected.

---

## Journey 1: Authentication

**Who:** Any visitor → Authenticated user  
**Goal:** Securely log in and access personal data

### Use Cases

| #    | Use Case         | User Action                        | Expected Outcome                                           |
| ---- | ---------------- | ---------------------------------- | ---------------------------------------------------------- |
| 1.1  | First visit      | Open baita.help                    | See landing page with "Log in" button                      |
| 1.2  | Login            | Click "Log in"                     | Redirect to Auth0, enter credentials, return authenticated |
| 1.3  | Route protection | Navigate to /bots without auth     | Redirect to login (no data leak)                           |
| 1.4  | API security     | Call API without token             | 401 Unauthorized                                           |
| 1.5  | Token injection  | Make any API call while logged in  | Auth token automatically attached                          |
| 1.6  | Admin detection  | Login with admin email             | See admin-only features (bot models panel)                 |
| 1.7  | Logout           | Click logout                       | Push subscription cleared, session destroyed               |
| 1.8  | Auth callback    | Return from Auth0 with code/state  | App renders normally (no blank page)                       |
| 1.9  | Auth error       | Return from Auth0 with error param | App renders gracefully (no crash)                          |
| 1.10 | CORS on errors   | API returns 401                    | Response includes CORS headers (frontend can read it)      |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/providers/auth.test.tsx` — userId extraction, admin detection, token delegation
- **Unit (Backend):** `apps/backend/src/authorizer/tests/index.test.ts` — JWT verification, policy generation
- **E2E:** `tests/e2e/tests/user-lifecycle.spec.ts` — Full login/signup flow, resource provisioning
- **E2E:** `tests/e2e/tests/pages-security.spec.ts` — 401 enforcement, CORS headers, invalid/missing token

---

## Journey 2: To-Do Management

**Who:** Authenticated user  
**Goal:** Manage daily tasks, track productivity, build habits

### Use Cases

| #   | Use Case      | User Action                  | Expected Outcome                              |
| --- | ------------- | ---------------------------- | --------------------------------------------- |
| 2.1 | View tasks    | Open /todo                   | See current task list (or empty state)        |
| 2.2 | Add task      | Type task title, press Enter | Task appears in list, persisted to API        |
| 2.3 | Complete task | Click checkbox               | Task moves to "done" section, counter updates |
| 2.4 | Reorder tasks | Drag task up/down            | New order persisted                           |
| 2.5 | Daily goal    | Complete 3+ tasks in a day   | Trophy animation on profile page              |
| 2.6 | Loading state | Open page before data loads  | Skeleton shown (not blank or error)           |
| 2.7 | API failure   | Backend is down              | Error feedback shown (no infinite loading)    |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/views/todo/tests/index.test.tsx` — Rendering, loading, interactions
- **Unit (Frontend):** `apps/frontend/src/providers/user.test.tsx` — retrieveTodoTasks, updateTodoTasks, setTodoTasks
- **Unit (Backend):** `apps/backend/src/controllers/tests/resource.test.ts` — CRUD operations
- **E2E:** `tests/e2e/tests/todo-journey.spec.ts` — Full lifecycle (create → complete → verify → cleanup)

---

## Journey 3: Content Feed

**Who:** Authenticated user  
**Goal:** Discover personalized content (news, tweets) through swipe interactions

### Use Cases

| #   | Use Case        | User Action          | Expected Outcome                         |
| --- | --------------- | -------------------- | ---------------------------------------- |
| 3.1 | View feed       | Open /feed           | See swipeable content cards              |
| 3.2 | Like content    | Swipe right          | Positive signal recorded, card dismissed |
| 3.3 | Dislike content | Swipe left           | Negative signal recorded, card dismissed |
| 3.4 | Skip content    | Swipe down           | Skip recorded, card dismissed            |
| 3.5 | Open link       | Swipe up             | URL opens in new tab                     |
| 3.6 | Auto-refresh    | ≤3 items remaining   | Fetch more content automatically         |
| 3.7 | Empty feed      | No content available | Empty state shown (not error)            |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/providers/user.test.tsx` — retrieveContent, reactToContent, popContent, auto-refresh
- **Unit (Backend):** `apps/backend/src/controllers/tests/user.test.ts` — SQS message parsing, deduplication, batch delete
- **E2E:** `tests/e2e/tests/content-feed.spec.ts` — Publish content via bot task, read from feed, verify structure, confirm consumption
- **E2E:** `tests/e2e/tests/pages-security.spec.ts` — Feed page renders without errors

---

## Journey 4: Bot Automation

**Who:** Authenticated user (power users)  
**Goal:** Create no-code automations that connect services and run on schedule or trigger

### Use Cases

| #    | Use Case       | User Action                             | Expected Outcome                                     |
| ---- | -------------- | --------------------------------------- | ---------------------------------------------------- |
| 4.1  | View bots      | Open /bots                              | See active bots + available templates                |
| 4.2  | Create bot     | Click "Add bot"                         | New empty bot created with trigger URL               |
| 4.3  | Select trigger | Choose Webhook/Schedule/Manual          | First step configured                                |
| 4.4  | Add task       | Select service + configure inputs       | Task added to workflow chain                         |
| 4.5  | Test task      | Click "Test" on a task                  | Execute in isolation, show sample output             |
| 4.6  | Map variables  | Connect task outputs → next task inputs | Variable references stored                           |
| 4.7  | Deploy bot     | Click "Deploy"                          | Lambda created, scheduler enabled, bot goes live     |
| 4.8  | View logs      | Open /bots/:id/logs                     | See execution history with status/timing             |
| 4.9  | Delete bot     | Click delete + confirm                  | All AWS resources cleaned up                         |
| 4.10 | Use template   | Deploy a pre-built bot model            | Bot created from template definition                 |
| 4.11 | AI assistant   | Describe bot in natural language        | AI generates task configuration                      |
| 4.12 | Bot validation | Deploy with invalid config              | Clear error message (forward refs, missing services) |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/providers/bot.test.tsx` — CRUD state management, getBotInputs
- **Unit (Frontend):** `apps/frontend/src/views/bots/tests/index.test.tsx` — Bot list rendering, model separation
- **Unit (Frontend):** `apps/frontend/src/views/bot/tests/assistant.test.tsx` — AI assistant interaction flow
- **Unit (Frontend):** `apps/frontend/src/utils/tests/ai.test.ts` — AI response parsing, context building
- **Unit (Backend):** `apps/backend/src/controllers/tests/bot.test.ts` — Create, deploy, delete, logs, connections
- **Unit (Backend):** `apps/backend/src/utils/tests/code.test.ts` — Code generation, conditions, retry logic
- **Unit (Backend):** `apps/backend/src/utils/tests/bot.test.ts` — Data path resolution, variable mapping
- **Unit (Backend):** `apps/backend/src/tasks/method-execute/tests/index.test.ts` — Runtime method dispatch
- **Unit (Backend):** `apps/backend/src/tasks/code-execute/tests/index.test.ts` — Sandbox execution, isolation
- **Unit (Backend):** `apps/backend/src/endpoints/bot/deploy/tests/index.test.ts` — Deploy validation + handler
- **Unit (Backend):** `apps/backend/src/endpoints/bot/create/tests/index.test.ts` — Creation handler
- **Unit (Shared):** `packages/shared/src/tests/bot.test.ts` — validateBot, step references, config hashing
- **E2E:** `tests/e2e/tests/bot-journey.spec.ts` — Full lifecycle: create → configure → test task → deploy → trigger → verify logs → deactivate → delete

---

## Journey 5: Notes

**Who:** Authenticated user  
**Goal:** Quickly capture and organize text notes

### Use Cases

| #   | Use Case    | User Action                           | Expected Outcome               |
| --- | ----------- | ------------------------------------- | ------------------------------ |
| 5.1 | View notes  | Open /notes                           | See note list (or empty state) |
| 5.2 | Create note | Type in editor, click "+" or navigate | Note saved and appears in list |
| 5.3 | Edit note   | Click a note, modify text             | Changes saved on blur          |
| 5.4 | Delete note | Click delete icon                     | Note removed from list         |
| 5.5 | New note    | Click "+" button                      | Editor clears for fresh input  |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/views/notes/tests/index.test.tsx` — Rendering, editing, interactions
- **Unit (Backend):** `apps/backend/src/controllers/tests/resource.test.ts` — Generic CRUD (covers notes)
- **E2E:** `tests/e2e/tests/notes-journey.spec.ts` — Full lifecycle (create → read → update → delete → verify)
- **E2E:** `tests/e2e/tests/pages-security.spec.ts` — Notes page renders without errors

---

## Journey 6: Places

**Who:** Authenticated user  
**Goal:** Save and organize geolocated memories with photos

### Use Cases

| #   | Use Case      | User Action                  | Expected Outcome                      |
| --- | ------------- | ---------------------------- | ------------------------------------- |
| 6.1 | View map      | Open /place                  | See Google Map with saved markers     |
| 6.2 | Save location | Drop pin at current GPS      | Place saved with coordinates          |
| 6.3 | Upload photo  | Attach image to a place      | Photo uploaded to S3, linked to place |
| 6.4 | Edit place    | Click marker, modify details | Changes persisted                     |
| 6.5 | Delete place  | Click delete                 | Place + photos removed                |

### Test Coverage

- **Unit (Backend):** `apps/backend/src/controllers/tests/resource.test.ts` — Generic CRUD + upload/remove
- **E2E:** `tests/e2e/tests/pages-security.spec.ts` — Places page renders without errors (smoke)

---

## Journey 7: OAuth Connections

**Who:** Authenticated user setting up bot integrations  
**Goal:** Authorize Baita to access third-party accounts (Google, Pipedrive)

### Use Cases

| #    | Use Case              | User Action                     | Expected Outcome                                           |
| ---- | --------------------- | ------------------------------- | ---------------------------------------------------------- |
| 7.1  | Connect app           | Click "Connect" on a service    | Redirect to provider OAuth, return with credentials stored |
| 7.2  | View connections      | Open /connections               | See all connected accounts with status                     |
| 7.3  | Token refresh         | Bot uses expired token          | Auto-refresh, new token persisted                          |
| 7.4  | Disconnect            | Click delete on a connection    | Confirmation dialog, credentials deleted from DB           |
| 7.5  | OAuth cancel          | User cancels at provider        | Graceful handling (no 500, no crash)                       |
| 7.6  | Invalid callback      | Bad state param in callback     | Graceful handling, no data corruption                      |
| 7.7  | Health check          | Click "Test" on a connection    | Connection tested, status chip updates                     |
| 7.8  | View details          | Expand a connection card        | See linked bots, creation date                             |
| 7.9  | Delete with warning   | Delete connection used by bot   | Warning shown about affected bots before confirming        |
| 7.10 | Standalone connection | Click "Add" on connections page | Connector picker, OAuth popup, connection saved            |
| 7.11 | Empty state           | Open /connections with no conns | Friendly empty state with "add" prompt                     |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/views/connections/tests/index.test.tsx` — Rendering, loading, health check, delete
- **Unit (Backend):** `apps/backend/src/endpoints/connection/health/tests/index.test.ts` — Health check with refresh
- **Unit (Backend):** `apps/backend/src/endpoints/connection/details/tests/index.test.ts` — Details with linked bots
- **Unit (Backend):** `apps/backend/src/utils/tests/tokenRefresh.test.ts` — Token refresh utility
- **Unit (Backend):** `apps/backend/src/connectors/oauth/tests/index.test.ts` — OAuth callback handler
- **E2E:** `tests/e2e/tests/connections.spec.ts` — Connection CRUD lifecycle, health check, details, linked bots

---

## Journey 8: Push Notifications

**Who:** Authenticated user (mobile + desktop)  
**Goal:** Receive real-time alerts from bot executions

### Use Cases

| #   | Use Case              | User Action                         | Expected Outcome                                 |
| --- | --------------------- | ----------------------------------- | ------------------------------------------------ |
| 8.1 | Subscribe             | Grant notification permission       | PushSubscription stored in bot config            |
| 8.2 | Receive push          | Bot executes successfully           | System notification appears                      |
| 8.3 | Foreground message    | Push received while app is open     | In-app modal shown                               |
| 8.4 | Unsubscribe on logout | Click logout                        | Subscription removed (no cross-user leaks)       |
| 8.5 | iOS PWA               | Installed to Home Screen            | Push notifications work                          |
| 8.6 | Health check          | Open app after period of inactivity | Subscription revalidated, re-subscribed if stale |

### Test Coverage

- **Unit (Frontend):** `apps/frontend/src/utils/push.test.ts` — Platform detection, subscribe/unsubscribe, PWA detection
- **Unit (Backend):** `apps/backend/src/tasks/method-execute/tests/index.test.ts` — sendNotification method dispatch

---

## Journey 9: Profile & Stats

**Who:** Authenticated user  
**Goal:** View productivity metrics and personal achievements

### Use Cases

| #   | Use Case      | User Action                       | Expected Outcome               |
| --- | ------------- | --------------------------------- | ------------------------------ |
| 9.1 | View profile  | Open /profile                     | See avatar, name, email, stats |
| 9.2 | Daily counter | Complete tasks throughout the day | Counter updates in real-time   |
| 9.3 | Achievement   | Complete 3+ tasks in a day        | Trophy animation shown         |

### Test Coverage

- **E2E:** `tests/e2e/tests/pages-security.spec.ts` — Profile page renders without errors (smoke)

---

## Journey 10: Account Management

**Who:** Any visitor → Authenticated user → Deleted user  
**Goal:** Create an account, use the platform, and delete all data permanently when done

### Use Cases

| #    | Use Case       | User Action                          | Expected Outcome                                       |
| ---- | -------------- | ------------------------------------ | ------------------------------------------------------ |
| 10.1 | Sign up        | Click "Log in" → Sign up tab         | Auth0 account created, redirected to app authenticated |
| 10.2 | Provisioning   | First login                          | DynamoDB record + SQS queue created automatically      |
| 10.3 | Delete account | Profile → "Delete Account" → Confirm | All bots, queues, DynamoDB records, Auth0 user deleted |
| 10.4 | Post-delete    | Try to access API with old token     | 401 Unauthorized (auth guard rejects deleted user)     |

### Test Coverage

- **E2E:** `tests/e2e/tests/user-lifecycle.spec.ts` — Sign up/login, verify provisioning
- **E2E:** `tests/e2e/tests/user-teardown.spec.ts` — Delete account via API, verify 401 post-delete
- **Unit (Backend):** `apps/backend/src/controllers/tests/user.test.ts` — deleteUser cascade logic

---

## Journey 11: Gmail Integration

**Who:** Authenticated user with Google connection  
**Goal:** Use Gmail API in bot automations (read emails, send emails)

### Use Cases

| #    | Use Case         | User Action                            | Expected Outcome                             |
| ---- | ---------------- | -------------------------------------- | -------------------------------------------- |
| 11.1 | Connect Google   | OAuth flow → grant Gmail scopes        | Connection stored with refresh token         |
| 11.2 | List emails      | Add Gmail task to bot → Test           | Email messages returned from API             |
| 11.3 | Token refresh    | Bot uses connection after hours        | Refresh token exchanges for new access token |
| 11.4 | Scope validation | Test Gmail task without required scope | Clear error about missing permission         |

### Test Coverage

- **E2E:** `tests/e2e/tests/google-gmail.spec.ts` — Verify connection, create bot with Gmail task, test API call, verify output

---

## Coverage Matrix

| Journey                | Unit (FE) | Unit (BE) | Unit (Shared) | E2E        |
| ---------------------- | --------- | --------- | ------------- | ---------- |
| 1. Authentication      | ✅        | ✅        | —             | ✅         |
| 2. To-Do               | ✅        | ✅        | —             | ✅         |
| 3. Content Feed        | ✅        | ✅        | —             | ✅         |
| 4. Bot Automation      | ✅        | ✅        | ✅            | ✅         |
| 5. Notes               | ✅        | ✅        | —             | ✅         |
| 6. Places              | —         | ✅        | —             | ✅ (smoke) |
| 7. OAuth Connections   | ✅        | ✅        | —             | ✅         |
| 8. Push Notifications  | ✅        | ✅        | —             | —          |
| 9. Profile & Stats     | —         | —         | —             | ✅ (smoke) |
| 10. Account Management | —         | ✅        | —             | ✅         |
| 11. Gmail Integration  | —         | —         | —             | ✅         |

---

## E2E Test Architecture

Tests use Playwright project dependencies to enforce execution order:

```
setup (user-lifecycle.spec.ts)
  └→ journeys (google-gmail, todo-journey, bot-journey, connections, pages-security, notes-journey, content-feed)
       └→ teardown (user-teardown.spec.ts)
```

- **Setup** creates a test user via Auth0, provisions resources, copies a Google OAuth connection
- **Journeys** exercise individual feature flows independently (can run in any order)
- **Teardown** deletes the test user and verifies all data is gone

All specs share auth state via a file-based token (`playwright/.auth/token.json`).

---

## Principles

1. **Every test must map to a user journey** — If you can't explain what user action it protects, it shouldn't exist.
2. **Tests that create resources MUST clean up** — Use `afterAll` hooks or cleanup steps. No orphaned data in DynamoDB.
3. **Test the flow, not the implementation** — Test what the user sees and does, not internal function calls.
4. **Cover the unhappy path** — API failures, invalid input, network errors. Users hit these every day.
5. **Keep tests independent** — Each journey spec should be runnable alone (given setup has run). Use timestamp-based IDs to avoid collisions.
