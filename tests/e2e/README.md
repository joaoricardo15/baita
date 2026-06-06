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

Account deletion uses the **same centralized endpoint** as real users (Profile → Delete Account → `DELETE /user/{userId}`). This ensures:

- Real users and E2E use identical cleanup logic
- All resource types are covered (bots, connections, SQS queues, DynamoDB records, Auth0 account)
- If deletion partially fails, the next run's setup will clean up leftovers

## Test Files

| File                           | Journey               | Responsibility                                                 |
| ------------------------------ | --------------------- | -------------------------------------------------------------- |
| `tests/user-lifecycle.spec.ts` | Setup                 | Clean stale user, sign up fresh, provision, copy Google conn   |
| `tests/google-gmail.spec.ts`   | Gmail Integration     | Gmail API call via bot task testing                            |
| `tests/todo-journey.spec.ts`   | To-Do Management      | Task CRUD lifecycle (create, complete, verify, cleanup)        |
| `tests/bot-journey.spec.ts`    | Bot Automation        | Full bot lifecycle (create → deploy → trigger → logs → delete) |
| `tests/connections.spec.ts`    | OAuth Connections     | Connection CRUD, health checks, details                        |
| `tests/pages-security.spec.ts` | Navigation & Security | Page rendering + auth gate enforcement                         |
| `tests/notes-journey.spec.ts`  | Notes                 | Note CRUD lifecycle (create → read → update → delete)          |
| `tests/content-feed.spec.ts`   | Content Feed          | Publish content via bot task, read, verify consumption         |
| `tests/user-teardown.spec.ts`  | Teardown              | Delete account, verify all resources gone                      |
| `tests/helpers.ts`             | —                     | Shared utilities (auth loading, headers, API URL)              |

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
# First get the M2M credentials
export AUTH0_M2M_CLIENT_ID=$(aws ssm get-parameter --name /baita/prod/auth0-m2m-client-id --with-decryption --profile baita --region us-east-1 --query Parameter.Value --output text)
export AUTH0_M2M_CLIENT_SECRET=$(aws ssm get-parameter --name /baita/prod/auth0-m2m-client-secret --with-decryption --profile baita --region us-east-1 --query Parameter.Value --output text)

# Run cleanup
cd tests/e2e && npx tsx scripts/cleanup-stale-users.ts
```

This finds all Auth0 users matching `*e2e*@baita.help` and deletes them from Auth0 + DynamoDB + SQS.

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
