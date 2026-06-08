# E2E Test Suite

Integration tests that verify the full system works correctly — authentication, API contracts, page rendering, and security. Uses real Auth0 login via Playwright.

**For the complete user journey map and use cases that these tests protect, see [`USER-JOURNEYS.md`](./USER-JOURNEYS.md).**

## Test Architecture

Tests run in three phases enforced by Playwright project dependencies:

```
setup (user-lifecycle.spec.ts)
  └→ journeys (all feature specs — independent of each other)
       └→ teardown (user-teardown.spec.ts)
```

### Fixed Test User

All runs use the **same fixed email** (`e2e-test@baita.help`) to ensure:

- No orphaned users if tests fail before teardown
- Each run cleans up the previous run's state (login → delete → signup)
- Predictable state in Auth0 and DynamoDB

The password (`BaitaE2e!2024`) is hardcoded — the account is ephemeral and fully deleted after each run. Not a secret.

### Deletion Guarantee

Account deletion uses the **same centralized endpoint** as real users (Profile → Delete Account → `DELETE /user`). This ensures:

- Real users and E2E use identical cleanup logic
- All resource types are covered (bots, connections, SQS queues, DynamoDB records, Auth0 account)
- If deletion partially fails, the next run's setup will clean up leftovers

## Test Files

| File                                 | Journey               | Responsibility                                                         |
| ------------------------------------ | --------------------- | ---------------------------------------------------------------------- |
| `tests/user-lifecycle.spec.ts`       | Setup                 | Clean stale user, sign up fresh, verify provisioning, copy Google conn |
| `tests/todo-journey.spec.ts`         | To-Do Management      | Task CRUD lifecycle (create, complete, verify, cleanup)                |
| `tests/bot-journey.spec.ts`          | Bot Automation        | Full bot lifecycle (create → deploy → trigger → logs → delete)         |
| `tests/connections.spec.ts`          | OAuth Connections     | Connection CRUD, health checks, details                                |
| `tests/pages-security.spec.ts`       | Navigation & Security | Page rendering + auth gate enforcement                                 |
| `tests/notes-journey.spec.ts`        | Notes                 | Note CRUD lifecycle (create → read → update → delete)                  |
| `tests/content-feed.spec.ts`         | Content Feed          | Publish content via bot task, read, verify consumption                 |
| `tests/connectors/baita.spec.ts`     | Baita Services        | Code execute, getTodo, publishToFeed                                   |
| `tests/connectors/google.spec.ts`    | Google Connector      | Gmail API (list messages, labels) via OAuth2                           |
| `tests/connectors/newsapi.spec.ts`   | NewsAPI Connector     | Top headlines, search (server-side API key)                            |
| `tests/connectors/openai.spec.ts`    | OpenAI Connector      | Chat completion via userApiKey                                         |
| `tests/connectors/pipedrive.spec.ts` | Pipedrive Connector   | Person/deal search via OAuth2                                          |
| `tests/connectors/_helpers.ts`       | —                     | Connector test utilities (task builders, executeTask)                  |
| `tests/user-teardown.spec.ts`        | Teardown              | Delete account, verify all resources gone                              |
| `tests/helpers.ts`                   | —                     | Shared utilities (auth loading, headers, API URL)                      |

## Running

### Local (against local backend + frontend)

```bash
cd tests/e2e && npm test
```

Both servers auto-start (reuses existing if already running):

- **Backend**: `serverless offline` on port 5000 (requires AWS profile `baita`)
- **Frontend**: Vite on port 3000

### Against production (same as CI)

```bash
cd tests/e2e && npm run test:prod
```

This hits `https://api.baita.help` and `https://www.baita.help` — identical to how tests run in the GitHub Actions pipeline.

### CI Pipeline

The CI workflow (`e2e` job) runs after both frontend and backend deploy:

- Sets `API_URL=https://api.baita.help`
- Provides `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (for DynamoDB direct access to copy Google connection)
- Same project structure (setup → journeys → teardown)

### Execution modes summary

| Mode       | Command               | API                        | Frontend         | Auto-start   |
| ---------- | --------------------- | -------------------------- | ---------------- | ------------ |
| Local      | `npm test`            | `localhost:5000/prod`      | `localhost:3000` | Both servers |
| Production | `npm run test:prod`   | `api.baita.help`           | `www.baita.help` | None         |
| CI         | `npx playwright test` | `api.baita.help` (env var) | `www.baita.help` | None         |

## Cleaning Up Stale Users

If tests fail repeatedly and leave orphaned users, run the cleanup script:

```bash
# First get the M2M credentials (needed by the cleanup script for Auth0 Management API)
export AUTH0_M2M_CLIENT_ID=$(aws ssm get-parameter --name /baita/prod/auth0-m2m-client-id --with-decryption --profile baita --region us-east-1 --query Parameter.Value --output text)
export AUTH0_M2M_CLIENT_SECRET=$(aws ssm get-parameter --name /baita/prod/auth0-m2m-client-secret --with-decryption --profile baita --region us-east-1 --query Parameter.Value --output text)

# Run cleanup
cd tests/e2e && npx tsx scripts/cleanup-stale-users.ts
```

This finds all Auth0 users matching `*e2e*@baita.help` and deletes them from Auth0 + DynamoDB.

### Automated Cleanup (in test flow)

The test setup (`user-lifecycle.spec.ts`) uses two cleanup mechanisms:

1. **Programmatic (ROPG)** — `cleanupStaleUser()` uses Auth0 Resource Owner Password Grant to get a JWT for the test user, then calls `DELETE /user` endpoint which handles all resource cleanup (bots, SQS, DynamoDB, Auth0).
2. **Browser-based fallback** — Logs in via Playwright, extracts token, calls `DELETE /user`.

Both use the proper `DELETE /user` endpoint — never direct AWS resource deletion.

**Required env vars for programmatic cleanup:**

- `AUTH0_E2E_CLIENT_ID` — Auth0 "Regular Web Application" with Password grant enabled
- `AUTH0_E2E_CLIENT_SECRET` — Its client secret

These must be added as GitHub Secrets for CI. If not configured, the browser fallback handles cleanup.

## Adding New Tests

1. Create a new `.spec.ts` file in `tests/` named after the user journey it protects
2. Add a JSDoc header explaining what journey the file covers
3. Add the file to the `journeys` project `testMatch` array in `playwright.config.ts`
4. Use `test.describe.configure({ mode: 'serial' })` for ordered steps
5. Each test should be independent (create its own data, clean up after)
6. Use timestamp-based IDs (`e2e-${Date.now()}`) to avoid collisions
7. Use shared helpers from `tests/helpers.ts` (API URL, token loading, auth headers)
8. Update `USER-JOURNEYS.md` with the new journey's test coverage

## Infrastructure

- **Auth**: Real Auth0 signup/login via Playwright browser automation
- **Fixed user**: `e2e-test@baita.help` — same email every run, cleaned up before and after
- **Token sharing**: `user-lifecycle.spec.ts` saves access token to `playwright/.auth/token.json`; all journey specs load it via `loadAuthData()`
- **Google connection**: Copied from admin user via DynamoDB (AWS SDK) since the auth guard blocks cross-user API reads
- **Shared helpers**: `tests/helpers.ts` — token loading, auth headers, API URL, connection utilities
- **Config**: `playwright.config.ts` — three projects (setup → journeys → teardown) with dependency chaining
- **CI**: GitHub Actions, AWS credentials for DynamoDB access

## OAuth2 Connection Maintenance

Connector tests (Google, Pipedrive, OpenAI, and any future connectors) depend on real OAuth connections copied from an admin user. These connections **must work** — tests fail hard if any connection is broken, never skip silently.

### How it works

1. Setup queries **all** admin user connections from DynamoDB (`#CONNECTION#*` records)
2. Each connection is copied to the E2E test user via the Resource API
3. A health check (`POST /connection/health/{id}`) validates each connection immediately after copy
4. If any connection is unhealthy, **the setup test fails** — blocking all downstream journey tests
5. Individual connector tests assert success — no graceful skips, no silent failures

### When connections break

- **Scopes added** to the connector config (e.g. adding `gmail.readonly`) — existing token doesn't have the new scope
- **Token revoked** — admin changed password, revoked app access, or provider invalidated the token
- **API disabled** — the provider's API was turned off in the developer console
- **Credentials rotated** — SSM parameters (`google-client-id`, `pipedrive-client-id`) updated without re-authorizing
- **API key expired** — OpenAI key rotated or exhausted its quota

### How to fix (30 seconds per connector)

1. Log into https://baita.help as the admin user
2. Go to Connections → disconnect the broken connector
3. Reconnect it (triggers OAuth flow with all current scopes)
4. Verify: `cd tests/e2e && npm run test:prod` — all connector tests must pass

### How you know it's broken

- Setup test fails: `"{AppName} connection unhealthy after copy..."`
- Connector test fails: `"Gmail API failed: {error}. Admin must reconnect..."`
- CI pipeline goes red with an actionable error message pointing to the fix

### Adding a new OAuth2 connector to E2E

1. Connect the service as the admin user at https://baita.help
2. Add the app ID → name mapping in `tests/helpers.ts` (`APP_NAMES` constant)
3. Create `tests/connectors/{name}.spec.ts` using `findConnection()` + `buildXxxTask()` pattern
4. Add a task builder in `tests/connectors/_helpers.ts`
5. The connection will be automatically copied and health-checked — no setup changes needed
