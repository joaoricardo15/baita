# Baita

Personal automation platform aimed at normal people. Create automated workflows (bots) that connect services, run on schedules, and publish results to your feed.

**Live at**: https://baita.help | **API**: https://api.baita.help

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Monorepo (Turborepo + pnpm)           │
├──────────────┬──────────────┬────────────────┬───────────────┤
│ apps/frontend│ apps/backend │ packages/shared│ tests/e2e     │
│ React + Vite │ Serverless FW│ Zod Schemas    │ Playwright    │
│ → Amplify    │ → Lambda+API │ → TypeScript   │ → E2E tests   │
└──────────────┴──────────────┴────────────────┴───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │      AWS          │
                    ├───────────────────┤
                    │ API Gateway       │
                    │ Lambda (Node 20)  │
                    │ DynamoDB          │
                    │ S3                │
                    │ SQS               │
                    │ EventBridge       │
                    │ CloudWatch        │
                    │ Amplify Hosting   │
                    └───────────────────┘
```

## Tech Stack

| Layer          | Technology                                       | Purpose                                      |
| -------------- | ------------------------------------------------ | -------------------------------------------- |
| **Frontend**   | React 18, TypeScript, Vite 8                     | SPA with PWA support                         |
| **UI**         | MUI Material v5, SCSS, Bootstrap utilities       | Component library + styling                  |
| **State**      | React Context API                                | Application state management                 |
| **Auth**       | Auth0 (@auth0/auth0-react)                       | Authentication + authorization               |
| **Backend**    | Node.js 20, TypeScript, Serverless Framework 3   | API + business logic                         |
| **Database**   | DynamoDB (single-table design, on-demand)        | Data storage                                 |
| **Storage**    | S3                                               | Bot code, file uploads, docs                 |
| **Messaging**  | SQS                                              | Content feed delivery                        |
| **Scheduling** | EventBridge Scheduler                            | Bot cron triggers                            |
| **Monitoring** | CloudWatch Alarms                                | Lambda errors, DynamoDB throttle, API 5XX    |
| **Hosting**    | AWS Amplify                                      | Frontend CDN + deploy                        |
| **Schemas**    | Zod                                              | Shared runtime validation + TypeScript types |
| **Monorepo**   | Turborepo + pnpm workspaces                      | Build orchestration + caching                |
| **Testing**    | Jest (unit), Vitest (frontend), Playwright (E2E) | Multi-layer test strategy                    |
| **CI/CD**      | GitHub Actions                                   | Automated quality gates + deploy             |

## Project Structure

```
baita/
├── apps/
│   ├── frontend/          # React SPA (see apps/frontend/CLAUDE.md)
│   └── backend/           # Serverless API (see apps/backend/CLAUDE.md)
├── packages/
│   └── shared/            # @baita/shared — Zod schemas, types, enums
├── tests/
│   └── e2e/               # Playwright E2E tests (auth + pages + API)
├── .github/workflows/     # CI/CD pipelines
├── CLAUDE.md              # AI assistant instructions (conventions, rules)
├── turbo.json             # Turborepo task config
└── pnpm-workspace.yaml    # Workspace package declarations
```

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 11+ (`npm install -g pnpm`)
- AWS CLI configured with profile `baita` (for deployment)

### Setup

```bash
git clone https://github.com/joaoricardo15/baita.git
cd baita
pnpm install
```

### Development

```bash
# Start backend (localhost:5000)
cd apps/backend && npm start

# Start frontend (localhost:3000)
cd apps/frontend && npm start

# Run all tests
pnpm turbo run test

# Type-check everything
pnpm turbo run type-check
```

### E2E Tests

```bash
cd tests/e2e && npm test
```

## CI/CD Pipeline

Single unified workflow (`.github/workflows/ci.yml`) on push to `main`:

```
frontend (type-check shared → lint → spell → build → test → deploy to Amplify) ─┐
backend  (type-check shared → lint → type-check → test → deploy → docs)         ─┤→ e2e (Playwright)
```

Both jobs run in parallel. E2E tests run against production after both deploy.

## Shared Schemas (`@baita/shared`)

All domain models are defined once using Zod in `packages/shared/`:

```typescript
// Schemas provide BOTH TypeScript types AND runtime validation
import { IBot, ITask, BotSchema, TaskSchema } from '@baita/shared'

// Runtime validation
const result = TaskSchema.safeParse(untrustedData)
if (result.success) {
  // result.data is fully typed as ITask
}
```

**Models**: `IUser`, `IBot`, `ITask`, `IService`, `IVariable`, `IApp`, `IAppConnection`, `IContent`, `ITodo`

## Bot Execution Architecture

```
User creates bot (visual builder or AI assistant)
    ↓
Bot definition stored as JSON (IBot with ITask[])
    ↓
On deploy: backend generates Lambda code from task definitions
    ↓
Generated code packaged as ZIP → S3 → deployed as standalone Lambda
    ↓
Triggered via HTTP (API Gateway) or schedule (EventBridge)
    ↓
Each task executes sequentially, outputs chained
    ↓
Results published to user's SQS queue → content feed
```

## Security

- **Auth**: Auth0 JWT verification (RS256) via Lambda authorizer
- **IAM**: Scoped permissions (least privilege per AWS service)
- **CORS**: Gateway-level CORS headers on all responses (including 4XX/5XX)
- **Rate Limiting**: API Gateway stage-level throttling
- **Secrets**: AWS SSM Parameter Store (resolved at deploy time)
- **Monitoring**: CloudWatch Alarms for errors, throttling, 5XX

## Environment

| Environment | Frontend               | Backend                   |
| ----------- | ---------------------- | ------------------------- |
| Production  | https://www.baita.help | https://api.baita.help    |
| Local Dev   | http://localhost:3000  | http://localhost:5000/dev |

## AWS Resources

- **Region**: `us-east-1`
- \*\*Profile`: `baita`
- **Amplify App**: `d1yzzk62iq66zd`
- **DynamoDB Table**: `baita-help-prod` (on-demand billing)
- **S3 Buckets**: `baita-help-prod-bots`, `baita-help-prod-files`, `baita-help-prod-docs`
- **SQS Queues**: `baita-help-prod-user-{userId}` (per-user content feed)
- **Custom Domain**: `api.baita.help` (Route53 + API Gateway)

## Contributing

This is a personal project. The `CLAUDE.md` files contain detailed conventions for AI-assisted development.

## License

Private — All rights reserved.
