# Baita Backend

Backend API for Baita: a personal automation platform aimed at normal people.

**API**: https://api.baita.help | **Docs**: Available via OpenAPI spec at deployment

## Tech Stack

- **Runtime**: Node.js 20.x + TypeScript 5.9 (strict mode)
- **Framework**: Serverless Framework 3.40
- **Cloud**: AWS (Lambda, DynamoDB, S3, SQS, EventBridge Scheduler, CloudWatch, API Gateway)
- **Bundler**: serverless-esbuild
- **Validation**: AJV (JSON Schema)
- **HTTP Client**: Axios (external API calls)
- **Auth**: Auth0 (JWT verification via Lambda authorizer)
- **Push Notifications**: web-push (VAPID-based, standard Web Push API)
- **Testing**: Jest 30 + ts-jest
- **Linting**: ESLint 9 (flat config) + Prettier + CSpell
- **CI/CD**: GitHub Actions (unified monorepo pipeline, deploys on push to `main`)

## Getting Started

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start local dev server (localhost:5000/dev)
npm start

# Run tests (watch mode)
npm test

# Run tests once (CI-friendly)
npm run test:run

# Deploy to production
npm run deploy

# Code quality
npm run lint       # ESLint with auto-fix
npm run format     # Prettier formatting
npm run spell      # CSpell spell check
npm run knip       # Dead code detection
npm run docs       # Generate OpenAPI spec from Zod schemas and deploy to S3
```

## Project Structure

```
src/
├── authorizer/     # Lambda authorizer (Auth0 JWT verification)
├── connectors/     # OAuth callback handlers (unified endpoint)
├── controllers/    # Business logic classes (User, Bot, Task, Resource)
├── docs/           # OpenAPI spec generation
├── endpoints/      # REST API Lambda handlers (one folder per endpoint)
├── lib/            # Module-level AWS SDK clients (DynamoDB singleton)
├── tasks/          # Task execution logic (executor dispatches to code/methods)
└── utils/          # Helpers (API response, bot data, code generation)
```

## Architecture

### Three-Layer Pattern

```
Endpoint (handler) → Controller (business logic) → AWS SDK (data)
```

- **Endpoints**: Parse request, call controller, return HTTP response via `Api` class
- **Controllers**: Business logic, AWS SDK operations
- **Utils**: Shared helpers (code generation, data manipulation, response formatting)

### DynamoDB Single-Table Design

| PK (userId) | SK (sortKey)                 | Description      |
| ----------- | ---------------------------- | ---------------- |
| userId      | #USER                        | User profile     |
| userId      | #BOT#{botId}                 | Bot definition   |
| userId      | #{resourceName}#{resourceId} | Generic resource |
| userId      | #CONTENT#{contentId}         | Content item     |
| userId      | #CONNECTION#{connectionId}   | OAuth connection |

### Bot Execution

1. User creates/edits bot via frontend (visual builder or AI assistant)
2. On deploy: backend generates Lambda code from task definitions
3. Generated code packaged as ZIP → S3 → deployed as standalone Lambda
4. Triggered via HTTP (API Gateway) or schedule (EventBridge Scheduler)
5. Each task executes sequentially, outputs chained
6. Results published to user's SQS queue → content feed

### API Response Format

All endpoints return:

```json
{
  "success": true | false,
  "message": "error message (only on failure)",
  "data": { ... }
}
```

## API Endpoints

### User

- `POST /user` — Create user account (Auth0 Post-Login Action only, API key auth)
- `DELETE /user` — Delete user account (userId from JWT)

### Bots

- `POST /bot/create` — Create bot
- `POST /bot/update/{botId}` — Update bot
- `POST /bot/delete/{botId}` — Delete bot (+ Lambda, API Gateway, Scheduler, S3)
- `POST /bot/deploy/{botId}` — Deploy bot (code gen + Lambda)
- `POST /bot/test/{botId}` — Test individual task (taskIndex in body)
- `POST /bot/logs/{botId}` — Get execution logs (CloudWatch)

### Bot Models (shared templates)

- `POST /model/list` — List available bot models
- `POST /model/read/{modelId}` — Get a bot model
- `POST /model/create` — Create a bot model
- `POST /model/delete/{modelId}` — Delete a bot model
- `POST /bot/model` — Deploy bot from model template (modelId in body)

### Tasks

- `POST /task/execute` — Execute a single task (standalone, no bot)

### Content & Resources

- `GET /content` — Get user content feed (from SQS)
- `POST /resource/{resourceName}/{operation}[/{id}]` — Generic CRUD
  - Operations: `list`, `read`, `delete`, `create`, `update`, `upload`, `remove`

### Connections

- `POST /connection/health/{connectionId}` — Check connection health
- `POST /connection/details/{connectionId}` — Get connection details + linked bots

### OAuth Connectors

- `GET /connectors/oauth` — Unified OAuth callback (handles Google, Pipedrive, etc.)

## Local Development

### Requirements

1. AWS CLI configured with profile `baita` (`~/.aws/credentials`)
2. Node.js 20.x+
3. SSM parameters in AWS (`/baita/prod/*`) — resolved at deploy time

### Secrets Management

All secrets stored in AWS SSM Parameter Store under `/baita/prod/`:

```bash
# List all parameters
aws ssm describe-parameters --profile baita --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/baita/prod/"

# Update a secret
aws ssm put-parameter --profile baita --region us-east-1 \
  --name "/baita/prod/<parameter-name>" --value "<new-value>" \
  --type SecureString --overwrite

# Redeploy to pick up new values
npm run deploy
```

### Test User

A persistent test user exists in production DynamoDB for local endpoint testing:

- **userId**: `test-user-local`
- **email**: `test@baita.help`

```bash
curl http://localhost:5000/dev/content -H "Authorization: Bearer <token>"
curl -X POST http://localhost:5000/dev/resource/bot/list -H "Authorization: Bearer <token>" -d '{}'
```

## CI/CD Pipeline

Part of the monorepo unified workflow (`.github/workflows/ci.yml`) on push to `main`:

1. **Shared Checks**: Type-check `@baita/shared`
2. **Backend Quality**: Lint → Type-check → Jest tests
3. **Backend Deploy**: `serverless deploy --stage prod`
4. **E2E Tests**: Playwright against production

## AWS Resources

- **Region**: `us-east-1`
- **Profile**: `baita`
- **DynamoDB Table**: `baita-help-prod` (on-demand billing, single-table design)
- **S3 Buckets**: `baita-help-prod-bots`, `baita-help-prod-files`, `baita-help-prod-docs`
- **SQS Queues**: `baita-help-prod-user-{userId}` (per-user content feed)
- **Custom Domain**: `api.baita.help` (Route53 + API Gateway)
- **Lambda Runtime**: Node.js 20.x

## Security

- **Auth**: Auth0 JWT verification (RS256) via Lambda authorizer
- **IAM**: Scoped permissions (least privilege per AWS service)
- **CORS**: Gateway-level headers on all responses (including 4XX/5XX)
- **Rate Limiting**: API Gateway stage-level throttling
- **Secrets**: AWS SSM Parameter Store (resolved at deploy time, never in code)
- **Code Execution**: Node.js `vm` module with isolated context + 5s timeout
