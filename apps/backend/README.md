# Baita Backend

Backend API for Baita: a personal automation platform (Zapier-inspired, aimed at normal people).

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
npm run docs       # Generate OpenAPI schema
```

## Project Structure

```
src/
├── authorizer/     # Lambda authorizer (Auth0 JWT verification)
├── connectors/     # OAuth callback handlers (unified endpoint)
├── controllers/    # Business logic classes (User, Bot, Resource)
├── endpoints/      # REST API Lambda handlers (one folder per endpoint)
├── models/         # TypeScript interfaces + JSON schemas + validation
├── tasks/          # Background Lambda task handlers (code-execute, method-execute)
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

- `POST /user` — Create user account

### Bots

- `POST /user/{userId}/bots` — Create bot
- `PUT /user/{userId}/bots/{botId}` — Update bot
- `DELETE /user/{userId}/bots/{botId}/api/{apiId}` — Delete bot
- `POST /user/{userId}/bots/{botId}/deploy` — Deploy bot
- `POST /user/{userId}/bots/{botId}/test/{taskIndex}` — Test individual task
- `GET /user/{userId}/bots/{botId}/logs` — Get execution logs
- `POST /user/{userId}/bots/{botId}/bud` — Bot assistant operation

### Content & Resources

- `GET /user/{userId}/content` — Get user content feed (from SQS)
- `POST /user/{userId}/resource/{resourceName}/{operation}` — Generic CRUD
  - Operations: `list`, `read`, `delete`, `create`, `update`, `upload`, `remove`

### OAuth Connectors

- `GET /connectors/oauth` — Unified OAuth callback (handles Google, Pipedrive, etc.)

## Local Development

### Requirements

1. AWS CLI configured with profile `joao` (`~/.aws/credentials`)
2. Node.js 20.x+
3. SSM parameters in AWS (`/baita/prod/*`) — resolved at deploy time

### Secrets Management

All secrets stored in AWS SSM Parameter Store under `/baita/prod/`:

```bash
# List all parameters
aws ssm describe-parameters --profile joao --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/baita/prod/"

# Update a secret
aws ssm put-parameter --profile joao --region us-east-1 \
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
curl http://localhost:5000/dev/user/test-user-local/content
curl -X POST http://localhost:5000/dev/user/test-user-local/resource/bot/list -d '{}'
```

## CI/CD Pipeline

Part of the monorepo unified workflow (`.github/workflows/ci.yml`) on push to `main`:

1. **Shared Checks**: Type-check `@baita/shared`
2. **Backend Quality**: Lint → Type-check → Jest tests
3. **Backend Deploy**: `serverless deploy --stage prod`
4. **E2E Tests**: Playwright against production

## AWS Resources

- **Region**: `us-east-1`
- **Profile**: `joao`
- **DynamoDB Table**: `baita-help-prod` (on-demand billing, single-table design)
- **S3 Buckets**: `baita-help-prod-bots`, `baita-help-prod-files`, `baita-help-prod-docs`
- **SQS Queues**: `baita-help-prod-{userId}` (per-user, with DLQ)
- **Custom Domain**: `api.baita.help` (Route53 + API Gateway)
- **Lambda Runtime**: Node.js 20.x

## Security

- **Auth**: Auth0 JWT verification (RS256) via Lambda authorizer
- **IAM**: Scoped permissions (least privilege per AWS service)
- **CORS**: Gateway-level headers on all responses (including 4XX/5XX)
- **Rate Limiting**: API Gateway stage-level throttling
- **Secrets**: AWS SSM Parameter Store (resolved at deploy time, never in code)
- **Code Execution**: Node.js `vm` module with isolated context + 5s timeout
