# Task — Domain Reference

A Task is the atomic unit of execution in Baita. Each task represents a single operation within a bot: it receives resolved input data, invokes a service executor, and produces output data that downstream tasks can reference.

Tasks only execute within a bot context — either via `POST /bots/{botId}/test` (single step) or as part of a full bot run.

---

## Task Schema (ITask)

| Field              | Type                   | Required | Description                                      |
| ------------------ | ---------------------- | -------- | ------------------------------------------------ |
| `taskId`           | `number`               | Yes      | Positional identifier (timestamp-based)          |
| `service`          | `IService`             | No       | What to execute (required for non-trigger tasks) |
| `app`              | `IApp`                 | No       | Application providing the service (API config)   |
| `inputData`        | `IVariable[]`          | Yes      | Input fields with values or output references    |
| `returnData`       | `boolean`              | No       | If true, output becomes the bot's final response |
| `sampleResult`     | `ITaskExecutionResult` | No       | Cached test result (set by test endpoint)        |
| `sampleConfigHash` | `string`               | No       | Fingerprint to detect stale samples              |
| `conditions`       | `ITaskCondition[][]`   | No       | Conditional execution (OR-of-ANDs)               |
| `connectionId`     | `string \| number`     | No       | OAuth/API key connection reference               |
| `retryPolicy`      | `IRetryPolicy`         | No       | Retry on failure (maxAttempts + backoffMs)       |

---

## Execution Flow

```
┌───────────────────────────────────────────────────────────────┐
│  Engine resolves inputs for task i                            │
│                                                               │
│  For each variable in task.inputData:                         │
│    ├─ type=output  → taskOutputs[outputIndex] + path + transform
│    ├─ type=constant → inline value                           │
│    ├─ type=environment → process.env[value]                  │
│    └─ type=text/code/boolean → direct value                  │
│                                                               │
│  Resolved inputs passed to executeTask()                      │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  executeTask({ serviceName, inputData, ... })                 │
│                                                               │
│  Routes by serviceName:                                       │
│    ├─ code-execute   → VM sandbox (5s timeout)               │
│    ├─ method-execute → httpRequest / oauth2Request /          │
│    │                   sendNotification / publishToFeed       │
│    └─ trigger-sample → store webhook test data               │
└───────────────────────────────────────────────────────────────┘
```

---

## Variable Types

| Type          | Resolution                                    | Example                      |
| ------------- | --------------------------------------------- | ---------------------------- |
| `output`      | Previous task's output (by index + JSON path) | Task 1's `articles[0].title` |
| `constant`    | Fixed value from connector config             | API method name              |
| `environment` | Server-side env var                           | `NEWS_API_KEY`               |
| `text`        | User-provided free text                       | Search query                 |
| `code`        | JavaScript code string                        | Custom logic                 |
| `user`        | Auto-filled from user context                 | Timezone, push token         |
| `options`     | Selected from dropdown                        | Country code                 |
| `boolean`     | Toggle                                        | Include attachments          |

---

## Output Reference Resolution

When a variable has `type: 'output'`:

```
taskOutputs[outputIndex]     → get the referenced task's output
  └─ getDataFromPath(outputPath) → navigate to specific value
     └─ applyTransform(transform) → optional array operation
```

Example: `{ outputIndex: 1, outputPath: 'data.users', transform: { operation: 'first' } }`
→ Gets task 1's output → navigates to `data.users` → returns first element.

---

## Testing Tasks

`POST /bots/{botId}/test` with `{ task, taskIndex }`:

1. Loads bot from DB to get previous tasks' `sampleResult.outputData`
2. Builds `taskOutputs[]` from those sample results
3. Resolves the task's inputs against that context
4. Executes the task
5. Stores result as `tasks[taskIndex].sampleResult`

This uses the **same resolver and executor** as production — ensuring test results match real execution.
