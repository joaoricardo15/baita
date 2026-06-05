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
- **Cloud**: AWS (Lambda, DynamoDB, S3, SQS, EventBridge Scheduler, CloudWatch, API Gateway)
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
├── authorizer/     # Lambda authorizer (Auth0 JWT verification)
├── connectors/     # OAuth callback handlers (Google, Pipedrive)
├── controllers/    # Business logic classes (User, Bot, Resource)
├── endpoints/      # REST API Lambda handlers (one folder per endpoint)
├── lib/            # Module-level AWS SDK clients (DynamoDB singleton)
├── tasks/          # Background Lambda task handlers (code-execute, method-execute)
├── utils/          # Helpers (api response, bot data manipulation, code generation, auth guard)
│   └── tests/      # Unit tests
└── docs/           # OpenAPI generated docs
```

## Commands

```bash
npm start          # Local dev server on localhost:5000 (serverless-offline, uses AWS_PROFILE=baita)
npm test           # Jest in watch mode
npm run test:run   # Jest single run (CI-friendly)
npm run deploy     # Deploy to production (serverless deploy --stage prod)
npm run docs       # Generate OpenAPI schema and upload to S3
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

1. **Shared Checks**: Type-check `@baita/shared`
2. **Backend Quality**: Lint → Type-check → Jest tests
3. **Backend Deploy**: `serverless deploy --stage prod`
4. **E2E Tests**: Playwright against production

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

- `/baita/prod/openai-authorization` — OpenAI API bearer token
- `/baita/prod/pipedrive-client-id` — Pipedrive OAuth client ID
- `/baita/prod/pipedrive-client-secret` — Pipedrive OAuth client secret
- `/baita/prod/pipedrive-auth-url` — Pipedrive OAuth token URL
- `/baita/prod/google-client-id` — Google OAuth client ID
- `/baita/prod/google-client-secret` — Google OAuth client secret
- `/baita/prod/google-auth-url` — Google OAuth token URL
- `/baita/prod/news-api-key` — NewsAPI key
- `/baita/prod/vapid-public-key` — Web Push VAPID public key
- `/baita/prod/vapid-private-key` — Web Push VAPID private key

### Test User (for local development)

A persistent test user exists in production DynamoDB for local endpoint testing:

- **userId**: `test-user-local`
- **email**: `test@baita.help`
- **SQS queue**: `baita-help-prod-test-user-local`

Use this for manual API testing:

```bash
# Content feed (should return empty array or queued content)
curl http://localhost:5000/dev/user/test-user-local/content

# List bots
curl -X POST http://localhost:5000/dev/user/test-user-local/resource/bot/list -d '{}'

# List todos
curl -X POST http://localhost:5000/dev/user/test-user-local/resource/todo/list -d '{}'
```

## Architecture

### Three-Layer Pattern

```
Endpoint (handler) → Controller (business logic) → AWS SDK (data)
```

- **Endpoints**: Parse request, call controller, return HTTP response via `Api` class
- **Controllers**: Contain all business logic, use shared AWS SDK clients, perform operations
- **Utils**: Shared helpers for code generation, data manipulation, response formatting
- **Lib**: Module-level AWS SDK clients (DynamoDB) — reused across warm Lambda invocations

### Handler Pattern

Every endpoint follows this structure:

```typescript
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/authGuard'
import SomeController from '@/controllers/someController'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const controller = new SomeController()

  try {
    const userId = getAuthenticatedUserId(event)
    const body = JSON.parse(event.body || '{}')

    const data = await controller.doSomething(userId, body)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
```

### API Response Format

All endpoints return a standardized response:

```json
{
  "success": true | false,
  "message": "error message (only on failure)",
  "data": { ... }
}
```

### DynamoDB Single-Table Design

```
PK (userId) | SK (sortKey)                    | Description
----------- | ------------------------------- | -----------
userId      | #USER                           | User profile
userId      | #BOT#{botId}                    | Bot definition
userId      | #{resourceName}#{resourceId}    | Generic resource
userId      | #CONTENT#{contentId}            | Content item
userId      | #CONNECTION#{connectionId}      | OAuth connection
```

### Bot Execution Architecture

1. User creates/edits bot via frontend (visual workflow builder)
2. On deploy: backend generates Lambda code from bot task definitions
3. Generated code packaged as ZIP, uploaded to S3, deployed as standalone Lambda
4. Bot triggered via HTTP (API Gateway) or schedule (EventBridge Scheduler)
5. Each task executes sequentially, outputs chained via `task${n}_outputData` variables
6. Results published to user's SQS queue for content feed
7. Execution logs captured in CloudWatch, queryable via logs endpoint

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
- Controllers: PascalCase class names matching the domain (e.g., `Bot`, `User`, `Resource`)
- Endpoints: lowercase folders organized by domain (`bot/create/`, `bot/deploy/`)
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
- Other SDK clients (Lambda, S3, Scheduler, etc.) instantiated in controller constructors
- Use `DynamoDBDocument.from()` for simplified DynamoDB operations
- `removeUndefinedValues: true` in marshall options for DynamoDB puts

### Authentication & Authorization

- The Lambda authorizer verifies Auth0 JWTs and returns `context: { userId: verified.sub }`
- **Every endpoint MUST use `getAuthenticatedUserId(event)`** from `src/utils/authGuard.ts`
- This utility extracts userId from the authorizer context AND validates it matches the path parameter
- Never trust `event.pathParameters.userId` alone — always use the auth guard
- The guard throws `'Unauthorized'` if no auth context, or `'Forbidden'` if user mismatch

## API Endpoints

### User

- `POST /user` — Create user account

### Bots

- `POST /user/{userId}/bot` — Create bot
- `PUT /user/{userId}/bot/{botId}` — Update bot
- `DELETE /user/{userId}/bot/{botId}/api/{apiId}` — Delete bot
- `POST /user/{userId}/bot/{botId}/deploy` — Deploy/publish bot
- `POST /user/{userId}/bot/{botId}/test/{taskIndex}` — Test individual task
- `GET /user/{userId}/bot/{botId}/logs` — Get execution logs
- `POST /user/{userId}/bot/{botId}/bud` — Bot assistant operation

### Content & Resources

- `GET /user/{userId}/content` — Get user content feed (from SQS)
- `POST /user/{userId}/resource/{resourceName}/{operation}` — Generic CRUD
  - Operations: `list`, `read`, `delete`, `create`, `update`, `upload`, `remove`

### OAuth Connectors

- `GET /connectors/oauth` — Generic OAuth callback (handles all providers)

### Connections

- `POST /user/{userId}/connection/{connectionId}/health` — Test connection health (token validity)
- `POST /user/{userId}/connection/{connectionId}/details` — Get connection details + linked bots

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

E2E tests live in `tests/e2e/` at the monorepo root. They use Playwright with real Auth0 login (test user: `test@baita.help`) — no token bypass.

```bash
cd tests/e2e && npm test
```

### Test Coverage

| Page/Feature        | Endpoint                       | Tested | Notes                                     |
| ------------------- | ------------------------------ | ------ | ----------------------------------------- |
| Home (Content Feed) | GET /content                   | Yes    | Auth + SQS access                         |
| Todo                | POST /resource/todo/list       | Yes    | DynamoDB query                            |
| Bots List           | POST /resource/bot/list        | Yes    | DynamoDB query                            |
| Connections         | POST /resource/connection/list | Yes    | DynamoDB query                            |
| Resource CRUD       | POST /resource/smoke-note/\*   | Yes    | Full create/read/update/list/delete cycle |
| Bot Lifecycle       | POST /bots + logs + delete     | Yes    | Lambda + S3 + API Gateway + Scheduler     |
| Auth Rejection      | GET without token              | Yes    | Security — 401 returned                   |
| CORS on Errors      | GET with Origin header         | Yes    | CORS headers on 4XX                       |
| Error Handling      | Invalid operations             | Yes    | Structured error response                 |
| Bot Deploy          | POST /bot/{id}/deploy          | Future | Requires code generation                  |
| Bot Test            | POST /bot/{id}/test/{idx}      | Future | Requires active deployed bot              |
| File Upload         | POST /resource/\*/upload       | Future | S3 presigned URL flow                     |
| OAuth Connectors    | GET /connectors/\*             | Future | Requires interactive OAuth                |
| Push Notifications  | —                              | N/A    | Frontend-only feature                     |

### Adding New Tests

When adding a new endpoint or feature:

1. Add the test case to the relevant `.spec.ts` file in `tests/e2e/tests/`
2. Update the coverage table above
3. Ensure tests clean up after themselves (delete created resources)
4. Use `test-` prefix for test resource names to avoid collision with real data

### Infrastructure

- **Auth**: Real Auth0 login via Playwright (`auth.setup.ts` extracts token from localStorage)
- **Test user**: `test@baita.help` (Auth0 database connection `baita-users`)
- **CI**: GitHub Actions uses `TEST_EMAIL` + `TEST_PASSWORD` secrets

## Known Limitations

- No structured logging library (raw `console.log` with JSON)
