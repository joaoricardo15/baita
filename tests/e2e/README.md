# E2E Test Suite

Integration tests that verify the full system works correctly — authentication, API contracts, page rendering, and security. Uses real Auth0 login via Playwright.

## Test Files

| File                            | Responsibility                               |
| ------------------------------- | -------------------------------------------- |
| `tests/pages.spec.ts`           | All pages render without JS errors           |
| `tests/user-auth.spec.ts`       | User login flow (Baita auth via Auth0)       |
| `tests/connector-oauth.spec.ts` | Partner connections (3rd party OAuth)        |
| `tests/api-health.spec.ts`      | API endpoints, bot lifecycle, CRUD, security |
| `tests/bot-page.spec.ts`        | Bot page UI (AI Assistant tab visibility)    |

## Use Cases Covered

### User Authentication (`user-auth.spec.ts`)

| Use Case                | What's Tested                               | Why It Matters                                    |
| ----------------------- | ------------------------------------------- | ------------------------------------------------- |
| Unauthenticated landing | Login button visible when not logged in     | Users must be able to find the login              |
| Route protection        | Protected pages redirect to login           | Security — no data leaks to unauthenticated users |
| API rejection           | 401 for requests without token              | Backend security gate works                       |
| Login redirect          | Click login → navigates to Auth0            | OAuth flow starts correctly                       |
| Callback with code      | App renders after ?code=x&state=y redirect  | Auth0 callback doesn't crash the app              |
| SW bypass               | Service worker doesn't cache auth callbacks | Mobile PWA auth works (was a real bug)            |
| Callback with error     | App handles ?error=access_denied gracefully | Users see the app, not a blank page               |
| Valid token → 200       | Real Auth0 token accepted by API            | Authorizer + Lambda cold start work               |
| Invalid token → 401     | Bad tokens rejected                         | Security enforcement                              |
| CORS on errors          | 401 responses include CORS headers          | Frontend can read error responses                 |

### OAuth Connector (`connector-oauth.spec.ts`)

| Use Case                    | What's Tested                         | Why It Matters                            |
| --------------------------- | ------------------------------------- | ----------------------------------------- |
| List connections            | Returns array (empty or populated)    | Page loads without error                  |
| Create + read               | Store credentials, verify persistence | Connections actually save                 |
| Token refresh persist       | Updated credentials survive           | Prevents stale token bug (was real issue) |
| Endpoint without params     | /connectors/oauth responds (no 500)   | Endpoint deployed correctly               |
| Endpoint with error         | Handles OAuth denial gracefully       | User canceling auth doesn't crash backend |
| Endpoint with invalid state | Bad state doesn't crash               | Security + resilience                     |
| Full lifecycle              | Create → read → update → delete       | Complete CRUD works end-to-end            |

### API Health (`api-health.spec.ts`)

| Use Case          | What's Tested                           | Why It Matters                  |
| ----------------- | --------------------------------------- | ------------------------------- |
| Content feed      | GET /content returns valid response     | Home page data loads            |
| Todo list         | POST /resource/todo/list                | Todo page works                 |
| Bot list          | POST /resource/bot/list                 | Bots page works                 |
| Connection list   | POST /resource/connection/list          | Connections available           |
| Resource CRUD     | create → read → update → list → delete  | DynamoDB operations work        |
| Bot create        | POST /bots creates Lambda + API Gateway | Bot infrastructure provisioning |
| Bot logs          | GET /bots/{id}/logs                     | Observability works             |
| Bot read          | POST /resource/bot/read                 | Bot data accessible             |
| Bot delete        | DELETE /bots/{id}/api/{apiId}           | Cleanup works                   |
| No auth → 401     | Rejects unsigned requests               | Security                        |
| Bad auth → 401    | Rejects invalid tokens                  | Security                        |
| CORS headers      | Present on error responses              | Frontend can handle errors      |
| Invalid operation | Returns structured error (not 500)      | Error handling works            |

### Bot Page (`bot-page.spec.ts`)

| Use Case                 | What's Tested                              | Why It Matters             |
| ------------------------ | ------------------------------------------ | -------------------------- |
| AI Assistant tab visible | Tab shows on bot page (even when disabled) | UI renders correctly       |
| Info icon on unavailable | Shows info icon when Chrome AI unavailable | Graceful degradation works |

## Running

```bash
cd tests/e2e && npm test
```

Logs in via Auth0 (test credentials in `.env` file, gitignored), then runs all tests against localhost. Auto-starts Vite dev server if not running. Requires backend on port 5000.

## Adding New Tests

1. Create a new `.spec.ts` file in `tests/` with ONE clear responsibility
2. Add a JSDoc header explaining what the file tests and why
3. Use `test.describe()` to group related use cases
4. Each test should be independent (create its own data, clean up after)
5. Use `test-` prefix for test resource IDs to avoid collision with real data
6. Update this README with the new use cases and test count

## Infrastructure

- **Auth**: Real Auth0 login via Playwright (test user: `test@baita.help`)
- **Token extraction**: `auth.setup.ts` saves storageState + access token from localStorage
- **Config**: `playwright.config.ts` — auto-detects `TEST_ENV=local` to point at localhost
- **CI**: GitHub Actions uses `TEST_EMAIL` + `TEST_PASSWORD` secrets
