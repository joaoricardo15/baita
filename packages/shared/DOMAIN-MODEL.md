# Baita — Domain Model Reference

This document is the architectural reference for the data model. It explains what each entity is, how they relate, why they're shaped this way, and how the file structure reflects the entity hierarchy.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER (root scope)                          │
│  userId, name, email                                                │
└──────────┬─────────────────────────────┬────────────────────────────┘
           │ owns                        │ owns
           ▼                             ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│    CONNECTION       │     │        BOT (aggregate)      │
│  connectionId       │     │  botId, name, active        │
│  appId ─────────┐   │     │  apiId, triggerUrl          │
│  credentials    │   │     │                             │
└─────────────────┼───┘     │  tasks: [                   │
                  │         │    ┌──────────────────┐     │
                  │         │    │     TASK         │     │
                  │         │    │  taskId (index)  │     │
                  │         │    │  connectionId ───┼─────┼──→ CONNECTION
                  │         │    │                  │     │
                  │         │    │  ┌────────────┐  │     │
                  │         │    │  │  SERVICE   │  │     │
                  │         │    │  │  type,name │  │     │
                  │         │    │  │  config    │  │     │
                  │         │    │  └────────────┘  │     │
                  │         │    │                  │     │
                  │         │    │  ┌────────────┐  │     │
                  │         │    │  │    APP     │  │     │
                  │         │    │  │  appId ────┼──┼─────┼──→ matches CONNECTION.appId
                  │         │    │  │  config    │  │     │
                  │         │    │  └────────────┘  │     │
                  │         │    │                  │     │
                  │         │    │  inputData: Variable[] │
                  │         │    │  sampleResult    │     │
                  │         │    │  conditions      │     │
                  │         │    │  retryPolicy     │     │
                  │         │    └──────────────────┘     │
                  │         │  ]                          │
                  │         └─────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     CONNECTOR (static definition)                    │
│  id, name, appId, auth, base, operations[], services[]               │
│  → converted to App + Service[] at runtime via connectorToAppService │
└──────────────────────────────────────────────────────────────────────┘
```

---

## DDD Classification

| Entity         | Role                | Identity               | Persistence                | Lifecycle                |
| -------------- | ------------------- | ---------------------- | -------------------------- | ------------------------ |
| **User**       | Root Scope          | userId (Auth0)         | DynamoDB PK                | Platform account         |
| **Bot**        | Aggregate Root      | botId (UUID)           | DynamoDB + Lambda + API GW | User-created, deployed   |
| **Task**       | Entity in Aggregate | taskId (array index)   | Nested in Bot record       | Exists only within Bot   |
| **Service**    | Value Object        | None (attributes only) | Embedded in Task           | Immutable config         |
| **App**        | Value Object        | None (attributes only) | Embedded in Task           | Immutable config         |
| **Variable**   | Value Object        | None                   | Embedded in Task/Service   | Immutable                |
| **Connection** | Standalone Entity   | connectionId           | DynamoDB `#CONNECTION#`    | Independent of bots      |
| **Connector**  | Static Definition   | id (slug)              | Code (TypeScript files)    | Never changes at runtime |
| **BotModel**   | Standalone Entity   | modelId                | DynamoDB `#MODEL#`         | Admin-managed templates  |
| **Note**       | Standalone Entity   | noteId                 | DynamoDB `#NOTE#`          | User CRUD                |
| **Place**      | Standalone Entity   | placeId                | DynamoDB `#PLACE#`         | User CRUD                |

---

## File Structure Map

The project follows a consistent pattern: each domain concept has a schema file in `shared`, and (if it has CRUD operations) a matching endpoint + controller in the backend.

### Schemas (`packages/shared/src/schemas/`)

| File            | Entities                                                             | Type                         |
| --------------- | -------------------------------------------------------------------- | ---------------------------- |
| `bot.ts`        | Bot, BotModel, BotLog, BotUsage                                      | Aggregate root + related     |
| `task.ts`       | Task, TaskCondition, TaskExecutionResult, StepExecution, RetryPolicy | Aggregate member + execution |
| `service.ts`    | Service, ServiceConfig, Variable, Transform, DataType                | Value objects                |
| `app.ts`        | App, AppConfig, IAppService                                          | Value objects                |
| `connection.ts` | Connection, Credential                                               | Standalone entity            |
| `connector.ts`  | ConnectorManifest, ConnectorOperation, ConnectorAuth                 | Static definitions           |
| `user.ts`       | User, Content, Todo, TodoTask                                        | Root scope + user data       |
| `note.ts`       | Note                                                                 | Simple entity                |
| `place.ts`      | Place                                                                | Simple entity                |
| `api.ts`        | ApiResponse                                                          | Infrastructure (transport)   |

### Connectors (`packages/shared/src/connectors/`)

| File           | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `index.ts`     | Re-exports schemas from `schemas/connector.ts`           |
| `registry.ts`  | Connector registry + `connectorToAppService()` adapter   |
| `baita.ts`     | Baita platform connector (webhook, schedule, code, etc.) |
| `google.ts`    | Google connector (Gmail, Calendar)                       |
| `pipedrive.ts` | Pipedrive CRM connector                                  |
| `openai.ts`    | OpenAI connector                                         |
| `newsapi.ts`   | NewsAPI connector                                        |

### Backend Endpoints (`apps/backend/src/endpoints/`)

| Folder         | Handles                            | Schema Counterpart                    |
| -------------- | ---------------------------------- | ------------------------------------- |
| `bots/`        | Bot CRUD + deploy + test + logs    | `schemas/bot.ts` + `schemas/task.ts`  |
| `tasks/`       | Standalone task execution          | `schemas/task.ts`                     |
| `connections/` | Connection CRUD + health + details | `schemas/connection.ts`               |
| `user/`        | User create + delete               | `schemas/user.ts`                     |
| `data/`        | Generic CRUD for Note, Place, etc. | `schemas/note.ts`, `schemas/place.ts` |
| `content/`     | Content feed (GET only)            | `schemas/user.ts` (ContentSchema)     |
| `models/`      | Bot model CRUD + deploy            | `schemas/bot.ts`                      |
| `oauth/`       | OAuth callback                     | —                                     |

### Backend Controllers (`apps/backend/src/controllers/`)

| File      | Responsibility                                       |
| --------- | ---------------------------------------------------- |
| `bot.ts`  | Bot lifecycle (create, update, deploy, delete, logs) |
| `task.ts` | Task execution orchestration                         |
| `user.ts` | User provisioning, deletion, content feed            |
| `data.ts` | Generic DynamoDB CRUD (single gateway to DDB)        |

---

## Key Design Decisions

### 1. Service vs Task — Why they're separate

**Service** = execution strategy (WHAT to do)
**Task** = complete operation (HOW to do it, WITH what data)

This is the Strategy pattern. The same HTTP Request service is reused across many tasks with different URLs, methods, and parameters. Service defines the schema; Task stores the values.

Industry equivalent:

- n8n: Node Type (definition) vs Node Instance (in workflow)
- Zapier: Action Type vs Step Configuration

### 2. App embedded in Task — Why not referenced by ID

App config is embedded directly in each Task (not referenced via appId lookup) because:

- Bot code generation needs all config inline (no runtime lookups)
- The generated Lambda function is a self-contained artifact
- Performance: no DynamoDB reads during bot execution for static config

### 3. Connection as standalone entity — Why not embedded

Unlike App, Connection stores sensitive credentials and is:

- Shared across multiple bots/tasks
- Has independent lifecycle (outlives any single bot)
- Security boundary (credentials fetched only at execution time, never in generated code)

### 4. Variable's dual role — Known compromise

`IVariable` is used for both field DEFINITIONS (`service.config.inputFields`) and field VALUES (`task.inputData`). This trades type precision for implementation simplicity:

- One component renders both contexts in the UI
- Connectors define fields using the same shape users fill in
- Validators compare definition against value using same field names

Alternative (n8n's approach): separate `INodeProperties` and `INodeExecutionData` types. Rejected because it would double the surface area of every connector, validator, and UI component.

### 5. taskId as positional index — Why not UUID

Tasks are never referenced externally (only within their parent Bot). Using array index as identity:

- Simplifies forward-reference validation (`outputIndex < currentIndex`)
- Maps directly to generated code (`task0_outputData`, `task1_outputData`)
- Avoids UUID-to-position mapping in code generation

Trade-off: reordering tasks requires updating all `outputIndex` references. Handled by `removeStepReferences()`.

---

## Data Flow

### Design-Time (User building a bot in the editor)

```
Connector (static) → connectorToAppService() → IAppService (App + Service[])
                                                      │
User picks Service ──────────────────────────────────→ task.service = IService
                                                       task.app = IApp
User picks Connection ───────────────────────────────→ task.connectionId = string
User fills inputs ───────────────────────────────────→ task.inputData = IVariable[]
User clicks Test ────────────────────────────────────→ task.sampleResult = ITaskExecutionResult
```

### Runtime (Bot executing after deployment)

```
Trigger event (webhook/schedule) → Generated Lambda handler
  │
  ├── Task 0: parse trigger event → task0_outputData
  │
  ├── Task 1: lambda.invoke('endpoint-task', {
  │     direct: true,
  │     userId, connectionId, appConfig, serviceConfig, inputData
  │   })
  │   → executor.ts dispatches by serviceName:
  │     - 'code-execute' → VM sandbox
  │     - 'method-execute' → built-in methods (HTTP, OAuth2, push, etc.)
  │   → task1_outputData
  │
  └── Task N: same pattern, can reference task0..taskN-1 outputs
```

### Execution Payload (ITaskExecutionInput)

When a task executes (whether standalone test or within a bot Lambda):

```typescript
{
  userId: string          // Who owns this (for credential lookups)
  botId: string           // Which bot (for audit logging)
  connectionId?: string   // Which credentials to use
  appConfig: IAppConfig   // API base URL + auth settings
  serviceConfig: IServiceConfig  // Method name, output path, field schema
  inputData: DataType     // Resolved concrete values (not Variable[], already flattened)
}
```

---

## Validation & Integrity

The shared package includes validators that protect workflow integrity:

| Function                                      | Purpose                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `validateBot(bot)`                            | Pre-deploy check: forward references, missing services, required fields, stale test data |
| `removeStepReferences(tasks, deletedTaskId)`  | Cascading cleanup when a step is deleted                                                 |
| `clearDownstreamSamples(tasks, changedIndex)` | Invalidate test data after upstream config change                                        |
| `computeStepConfigHash(task)`                 | Fingerprint step config to detect when test data becomes stale                           |

---

## Anti-Patterns Avoided

| Antipattern                    | How we avoid it                                       |
| ------------------------------ | ----------------------------------------------------- |
| God entity                     | Each entity has one responsibility                    |
| Circular references            | All data flows forward (task → earlier task only)     |
| Schema definitions scattered   | All Zod schemas in `schemas/` folder                  |
| Mixing persistence with domain | Schemas in `shared/`, DynamoDB ops in controllers     |
| Credentials in generated code  | Connection resolved at execution time, never baked in |
| No validation boundaries       | `validateBot()` enforces integrity before deploy      |
| Implicit data relationships    | Variable.outputIndex explicitly links task outputs    |
