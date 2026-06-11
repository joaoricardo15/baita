# Bot Creation & Execution Guide

## Overview

A Baita bot is a data-driven automation workflow. Each bot is a JSON definition (IBot) containing an ordered array of tasks. A shared execution engine interprets and runs bots at runtime — no per-bot infrastructure is deployed.

```
┌────────────────────────────────────────────────────────────────────┐
│                         BOT (IBot)                                  │
│                                                                    │
│  botId: "V1StGXR8iZ5j"                                            │
│  name: "Daily News Digest"                                         │
│  active: true                                                      │
│                                                                    │
│  tasks: [                                                          │
│    ┌─────────────────────────────────────────────────────────┐     │
│    │ Task 0: TRIGGER (webhook or schedule)                    │     │
│    │ → Defines how the bot starts                            │     │
│    └─────────────────────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────────────────────┐     │
│    │ Task 1: Get news from NewsAPI                           │     │
│    │ → service: method-execute (httpRequest)                  │     │
│    │ → inputData: [{ apiKey, query, ... }]                   │     │
│    └─────────────────────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────────────────────┐     │
│    │ Task 2: Send notification                               │     │
│    │ → service: method-execute (sendNotification)            │     │
│    │ → inputData: [{ title: task1.articles[0].title }]       │     │
│    └─────────────────────────────────────────────────────────┘     │
│  ]                                                                 │
└────────────────────────────────────────────────────────────────────┘
```

---

## Bot Lifecycle

```
CREATE ──────► CONFIGURE ──────► TEST ──────► DEPLOY (activate)
  │                │                │               │
  │  POST /bots    │  PATCH /bots   │  POST /bots   │  POST /bots
  │                │  /{botId}      │  /{id}/test   │  /{id}/deploy
  ▼                ▼                ▼               ▼
Empty bot       Add tasks       Verify steps    Enable scheduler
with ID         and config      individually    or webhook URL
```

### 1. Create

`POST /bots` → returns `{ botId, active: false, tasks: [emptyTrigger] }`

### 2. Configure

`PATCH /bots/{botId}` with `{ name, tasks, active: false }`

Set up the trigger (task 0) and action tasks (task 1..N).

### 3. Test

`POST /bots/{botId}/test` with `{ task, taskIndex }`

Executes one task in isolation using previous tasks' sample outputs as context. Results stored as `sampleResult` on the task.

### 4. Deploy (Activate)

`POST /bots/{botId}/deploy` with `{ name, active: true, tasks }`

If the trigger is a schedule: enables the EventBridge Scheduler.
The webhook URL becomes active: `POST /bots/{botId}/run/{token}`.

---

## Execution Flow

```
Trigger arrives (webhook POST or scheduler event)
  │
  ▼
┌─────────────────────────────────────────────┐
│ bot-execute Lambda                           │
│                                             │
│ 1. Decode token → userId                    │
│ 2. Load bot from DynamoDB                   │
│ 3. Parse trigger payload → taskOutputs[0]   │
│                                             │
│ For each task i = 1..N:                     │
│   ├─ resolveInputs(task, taskOutputs)       │
│   ├─ evaluateConditions(task, taskOutputs)  │
│   ├─ if pass: executeTask() with retry      │
│   ├─ store result in taskOutputs[i]         │
│   └─ log { name, status, duration }         │
│                                             │
│ 4. Write execution log (CloudWatch)         │
│ 5. Return { success, data }                 │
└─────────────────────────────────────────────┘
```

---

## Data Chaining Between Tasks

Tasks reference previous outputs via `outputIndex` (which task) + `outputPath` (JSON dot-path):

```typescript
// Task 2 wants the first article title from Task 1's output:
{
  type: 'output',
  name: 'title',
  outputIndex: 1,              // references Task 1
  outputPath: 'articles.0.title',  // navigates the output JSON
  transform: { operation: 'first' }  // optional array transform
}
```

Available transforms: `first`, `last`, `at`, `count`, `pluck`, `filter`, `join`, `sort`.

---

## Trigger Types

| Type         | Config                          | Execution                                            |
| ------------ | ------------------------------- | ---------------------------------------------------- |
| **Webhook**  | No config needed                | External system POSTs to `/bots/{botId}/run/{token}` |
| **Schedule** | Cron/rate expression + timezone | EventBridge Scheduler invokes Lambda on schedule     |

---

## Trigger URL

The trigger URL is computed (not stored):

```
https://api.baita.help/bots/{botId}/run/{token}
```

Where `token = base64url(userId)`. The frontend computes this from `botId` + `userId`. The backend decodes the token at runtime to identify the bot owner.

---

## Conditional Execution

Tasks can have conditions (OR-of-ANDs) that determine whether they execute:

```typescript
conditions: [
  // OR group 1: status equals "active" AND count > 0
  [
    {
      operator: 'equals',
      operand: { outputIndex: 0, outputPath: 'status' },
      comparisonOperand: { value: 'active' },
    },
    { operator: 'exists', operand: { outputIndex: 0, outputPath: 'count' } },
  ],
  // OR group 2: bypass flag is set
  [
    {
      operator: 'equals',
      operand: { outputIndex: 0, outputPath: 'bypass' },
      comparisonOperand: { value: 'true' },
    },
  ],
]
```

If no conditions: task always executes. If conditions fail: task is logged as `filtered`.

---

## Retry Policy

Per-task retry with exponential backoff:

```typescript
retryPolicy: {
  maxAttempts: 3,    // 1-5
  backoffMs: 1000    // 100-60000, multiplied by attempt number
}
```

---

## Available Services

| Service Name     | Method             | What it does                                  |
| ---------------- | ------------------ | --------------------------------------------- |
| `code-execute`   | —                  | Runs JavaScript in isolated VM (5s timeout)   |
| `method-execute` | `httpRequest`      | Makes HTTP/HTTPS calls                        |
| `method-execute` | `oauth2Request`    | Authenticated OAuth2 API calls (auto-refresh) |
| `method-execute` | `sendNotification` | Web Push notification                         |
| `method-execute` | `publishToFeed`    | Publish content to user's feed                |
| `method-execute` | `getTodo`          | Read user's todo list                         |
