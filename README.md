# Baita

Personal automation platform aimed at normal people. Create automated workflows (bots) that connect services, run on schedules, and publish results to your feed.

**Live at**: https://baita.help | **API**: https://api.baita.help | **Docs**: https://api.baita.help/

---

## How It Works

Users build **bots** — sequential workflows that trigger on events (webhooks, schedules) and execute tasks (API calls, code, notifications). The platform handles OAuth connections, data piping between steps, and content publishing — all without code.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User's Bot                                    │
│                                                                         │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────────────┐   │
│   │ Trigger │ ──▶ │ Step 1  │ ──▶ │ Step 2  │ ──▶ │ Publish to Feed │   │
│   │         │     │         │     │         │     │                 │   │
│   │Schedule │     │Gmail API│     │Run Code │     │ Content Card    │   │
│   │Webhook  │     │Pipedrive│     │OpenAI   │     │ Push Notify     │   │
│   └─────────┘     └─────────┘     └─────────┘     └─────────────────┘   │
│                                                                         │
│   Each step's output feeds into the next step's input.                  │
│   Conditions can skip steps. Transforms reshape data between steps.     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
              ┌─────────────────────────────────────┐
              │          Frontend (React SPA)       │
              │          www.baita.help             │
              │                                     │
              │  Visual Bot Builder │ Content Feed  │
              │  AI Assistant       │ Todo / Notes  │
              └───────────────┬─────────────────────┘
                              │ HTTPS (JWT)
┌─────────────────────────────▼────────────────────────────────────────┐
│                        AWS (us-east-1)                               │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │  API Gateway (api.baita.help)                             │       │
│  │  ─ Lambda Authorizer (Auth0 JWT verification)             │       │
│  │  ─ CORS headers on all responses (including errors)       │       │
│  └──────────────────────────┬────────────────────────────────┘       │
│                             │                                        │
│  ┌──────────────────────────▼────────────────────────────────┐       │
│  │  Lambda Functions (Node.js 20 + TypeScript)               │       │
│  │                                                           │       │
│  │  endpoint-bots    endpoint-data     endpoint-connections  │       │
│  │  endpoint-user    endpoint-content  endpoint-models       │       │
│  │                                                           │       │
│  └──────────────────────────┬────────────────────────────────┘       │
│                             │                                        │
│  ┌──────────────────────────▼────────────────────────────────┐       │
│  │  Bot Engine Lambda (300s timeout, async invoke)           │       │
│  │  ─ Loads bot definition from DB                           │       │
│  │  ─ Resolves inputs from previous outputs                  │       │
│  │  ─ Evaluates skip conditions                              │       │
│  │  ─ Executes tasks (HTTP, code sandbox, push)              │       │
│  └───────────────────────────────────────────────────────────┘       │
│                                                                      │
│  ┌────────────┐  ┌───────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │  DynamoDB  │  │  S3       │  │  EventBridge  │  │  CloudWatch  │  │
│  │  (single   │  │  (files,  │  │  Scheduler    │  │  (logs,      │  │
│  │   table)   │  │   docs)   │  │  (cron bots)  │  │   alarms)    │  │
│  └────────────┘  └───────────┘  └───────────────┘  └──────────────┘  │
│                                                                      │
│  ┌─────────────┐                                                     │
│  │  Amplify    │                                                     │
│  │  (frontend  │                                                     │
│  │   hosting)  │                                                     │
│  └─────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────┘

              ┌───────────────────────────┐
              │  Auth0 (auth.baita.help)  │
              │  ─ JWT issuance           │
              │  ─ Google + email login   │
              │  ─ User provisioning      │
              └───────────────────────────┘
```

### Bot Execution Flow

```
                            ┌─────────────────────────────┐
                            │    HOW BOTS GET TRIGGERED   │
                            └─────────────────────────────┘

     External System                    Schedule                   User (Test)
          │                                │                           │
          │ POST /bots/{id}/run/{token}    │ EventBridge fires         │ POST /bots/{id}/test
          │ (no auth —▶ token = secret)    │ every N minutes/hours     │ (JWT auth, single step)
          │                                │                           │
          ▼                                ▼                           ▼
   ┌──────────────┐              ┌─────────────────┐          ┌──────────────────┐
   │ Trigger      │              │ Scheduler       │          │ Bot Controller   │
   │ Endpoint     │              │ (direct invoke) │          │ (in-process)     │
   │              │              │                 │          │                  │
   │ Decode token │              │                 │          │ Same resolver +  │
   │ Verify bot   │              │                 │          │ executor, but    │
   │ Invoke       │              │                 │          │ runs ONE task    │
   │ engine async │              │                 │          │ synchronously    │
   └──────┬───────┘              └────────┬────────┘          └────────┬─────────┘
          │                               │                            │
          └──────────────┬────────────────┘                            │
                         ▼                                             │
              ┌──────────────────────┐                                 │
              │   Bot Engine Lambda  │                                 │
              │                      │                                 │
              │  for each task:      │                                 │
              │   1. Resolve inputs  │                                 │
              │   2. Check conditions│                                 │
              │   3. Execute ◀───────┼─────────────────────────────────┘
              │   4. Store output    │
              │                      │
              │  Log → CloudWatch    │
              └──────────────────────┘
```

**Key insight:** Bots are pure data (JSON in DynamoDB). No per-bot infrastructure. A single shared engine interprets and runs them at runtime.

---

## Tech Stack

| Layer      | Technology                                          | Purpose                          |
| ---------- | --------------------------------------------------- | -------------------------------- |
| Frontend   | React 18, TypeScript 6, Vite 8                      | SPA with PWA support             |
| UI         | MUI Material v5, SCSS, Bootstrap                    | Component library + styling      |
| Auth       | Auth0 (Google + email/password)                     | Authentication + authorization   |
| Backend    | Node.js 20, TypeScript, Serverless Framework        | API + business logic             |
| Database   | DynamoDB (single-table, on-demand)                  | All application data             |
| Storage    | S3                                                  | File uploads, OpenAPI docs       |
| Scheduling | EventBridge Scheduler                               | Bot cron triggers                |
| Hosting    | AWS Amplify                                         | Frontend CDN + deploy            |
| Schemas    | Zod (@baita/shared)                                 | Single source of truth for types |
| Monorepo   | Turborepo + pnpm workspaces                         | Build orchestration + caching    |
| Testing    | Vitest (frontend), Jest (backend), Playwright (E2E) | Multi-layer test coverage        |
| CI/CD      | GitHub Actions                                      | Quality gates + deploy pipeline  |

---

## Monorepo Structure

```
baita/
├── apps/
│   ├── frontend/          React SPA → AWS Amplify
│   │                      See apps/frontend/README.md
│   │
│   └── backend/           Serverless API → AWS Lambda + API Gateway
│                          See apps/backend/README.md
├── packages/
│   └── shared/            @baita/shared — Zod schemas, types, connectors
│                          See packages/shared/README.md
├── tests/
│   └── e2e/               Playwright E2E tests (runs against production)
│
├── infra/
│   └── auth0/             Auth0 tenant config (IaC via auth0-deploy-cli)
│                          See infra/auth0/README.md
│
├── .github/workflows/     CI/CD pipeline
├── turbo.json             Turborepo task definitions
├── pnpm-workspace.yaml    Workspace package declarations
└── CLAUDE.md              AI assistant instructions
```

---

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 11+ (`npm install -g pnpm`)
- AWS CLI configured with profile `baita` (for backend/deploy)

### Install

```bash
git clone https://github.com/joaoricardo15/baita.git
cd baita
pnpm install
```

### Development

```bash
# Start backend API (localhost:5000)
cd apps/backend && npm start

# Start frontend (localhost:3000)
cd apps/frontend && npm start

# Run quality checks (same as CI)
pnpm turbo run lint spell type-check format:check test --filter=!@baita/e2e

# Run E2E tests (hits production after deploy)
cd tests/e2e && npm test
```

---

## CI/CD Pipeline

Single workflow (`.github/workflows/ci.yml`) on push to `main`:

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Quality Gate                                                │  │
│  │  pnpm turbo run lint spell type-check format:check test      │  │
│  │  (parallel, cached — unchanged packages skipped)             │  │
│  └───────────────────────────────┬──────────────────────────────┘  │
│                                  │                                 │
│              ┌───────────────────┼────────────────────┐            │
│              │                   │                    │            │
│              ▼                   ▼                    ▼            │
│   ┌──────────────────┐ ┌─────────────────┐ ┌───────────────────┐   │
│   │ Deploy Frontend  │ │ Deploy Backend  │ │ Deploy Auth0      │   │
│   │ (Vite build →    │ │ (Serverless     │ │ (auth0-deploy-cli │   │
│   │  Amplify upload) │ │  Framework)     │ │  → tenant.yaml)   │   │
│   └────────┬─────────┘ └─────────┬───────┘ └──────────┬────────┘   │
│            │                     │                    │            │
│            └─────────────────────┼────────────────────┘            │
│                                  │                                 │
│                                  ▼                                 │
│               ┌────────────────────────────────┐                   │
│               │  E2E Tests (Playwright)        │                   │
│               │  Sign up → Journey tests →     │                   │
│               │  Cleanup (always)              │                   │
│               └────────────────────────────────┘                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

All domain data lives in a single DynamoDB table (user-scoped). Models are defined once as Zod schemas in `@baita/shared` and shared between frontend and backend:

| Model         | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `IBot`        | Workflow definition (tasks, triggers, connections)   |
| `ITask`       | Single step in a bot (service + inputs + conditions) |
| `IConnection` | OAuth token pair for a third-party service           |
| `IContent`    | Feed item published by a bot execution               |
| `ITodo`       | User's todo list (singleton)                         |
| `INote`       | Text note with optional file attachments             |
| `IPlace`      | Location pin (Google Maps)                           |
| `IUser`       | User profile + preferences                           |

---

## Connectors (Integrations)

| Connector     | Auth    | Capabilities                                                                      |
| ------------- | ------- | --------------------------------------------------------------------------------- |
| **Baita**     | None    | Webhook trigger, schedule, code execution, push notifications, content publishing |
| **Google**    | OAuth2  | Gmail (read/send), Calendar (list/create), Drive                                  |
| **Pipedrive** | OAuth2  | CRM deals, contacts, organizations                                                |
| **OpenAI**    | API Key | Chat completions, text generation                                                 |
| **NewsAPI**   | API Key | Headlines, article search                                                         |

---

## Environment

|                | Frontend                | Backend                   |
| -------------- | ----------------------- | ------------------------- |
| **Production** | https://www.baita.help  | https://api.baita.help    |
| **Local**      | http://localhost:3000   | http://localhost:5000/dev |
| **Region**     | —                       | us-east-1                 |
| **Auth**       | Auth0 (auth.baita.help) | Auth0 JWT verification    |

---

## Security

- **Authentication**: Auth0 JWT (RS256) verified by Lambda Authorizer
- **Authorization**: All data user-scoped (userId as DynamoDB partition key)
- **Secrets**: AWS SSM Parameter Store (never in code)
- **CORS**: Strict origin allowlist on all responses
- **Webhook Auth**: Unguessable token in URL (encodes userId)
- **Code Sandbox**: Node.js `vm` module with 5s timeout for user code execution

---

## License

Private — All rights reserved.
