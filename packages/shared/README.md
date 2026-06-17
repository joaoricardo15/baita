# @baita/shared

Single source of truth for all TypeScript models, validation logic, and connector definitions shared across the Baita monorepo.

Both `apps/frontend` and `apps/backend` import from this package — changing a schema here propagates to both apps automatically.

---

## How It Fits

```
┌────────────────────────────────────────────────────────┐
│  @baita/shared                                         │
│                                                        │
│  Zod Schemas ─── TypeScript Types ─── Runtime Checks   │
│                                                        │
│  Connectors ─── Entity Registry ─── Utility Functions  │
└──────────────┬────────────────────────────┬────────────┘
               │                            │
               ▼                            ▼
      apps/frontend                 apps/backend
      (types + connectors)          (types + validation + registry)
```

---

## Installation

Referenced as a workspace dependency (no manual install needed):

```json
"@baita/shared": "workspace:*"
```

---

## Schemas

All schemas are defined with [Zod](https://zod.dev) — providing both TypeScript types (inferred) and runtime validation from one definition.

| File                    | Models                                      | Purpose                                       |
| ----------------------- | ------------------------------------------- | --------------------------------------------- |
| `schemas/user.ts`       | `IUser`, `ITodo`, `IContent`                | User profile, todo tasks, content feed        |
| `schemas/bot.ts`        | `IBot`, `IBotModel`, `IBotLog`              | Bot workflow definition + validation helpers  |
| `schemas/task.ts`       | `ITask`, `ITaskCondition`, `IStepExecution` | Task execution + conditions + retry policy    |
| `schemas/service.ts`    | `IService`, `IVariable`, enums              | Service/variable types for task configuration |
| `schemas/app.ts`        | `IApp`, `IAppConfig`                        | App value objects (embedded in Task)          |
| `schemas/connection.ts` | `IConnection`, `ICredential`                | OAuth connection entity                       |
| `schemas/connector.ts`  | `IConnectorManifest`, `IConnectorOperation` | Connector static definitions                  |
| `schemas/feeling.ts`    | `IFeeling`                                  | Feeling entity (mood + tags)                  |
| `schemas/place.ts`      | `IPlace`                                    | Place entity                                  |
| `schemas/api.ts`        | `ApiResponseSchema`                         | Standard API response envelope                |

---

## Connectors

Connector manifests define how Baita integrates with third-party services:

| File                      | Connector | Auth    | Capabilities                                      |
| ------------------------- | --------- | ------- | ------------------------------------------------- |
| `connectors/baita.ts`     | Baita     | None    | Webhook, schedule, code, push, content publishing |
| `connectors/google.ts`    | Google    | OAuth2  | Gmail (read/send), Calendar, Drive                |
| `connectors/pipedrive.ts` | Pipedrive | OAuth2  | CRM deals, contacts, organizations                |
| `connectors/openai.ts`    | OpenAI    | API Key | Chat completions, text generation                 |
| `connectors/newsapi.ts`   | NewsAPI   | API Key | Headlines, article search                         |

Each connector exports a manifest with auth config, available operations, and service definitions. The registry (`connectors/registry.ts`) converts manifests to App + Service pairs at runtime.

---

## Entity Registry

The registry (`src/registry.ts`) maps each entity type to its schema, ID field, and storage pattern:

```typescript
entityRegistry = {
  user: { schema: UserSchema, idField: '', singleton: true },
  bot: { schema: BotSchema, idField: 'botId', singleton: false },
  model: { schema: BotSchema, idField: 'modelId', singleton: false },
  connection: {
    schema: ConnectionSchema,
    idField: 'connectionId',
    singleton: false,
  },
  feeling: { schema: FeelingSchema, idField: 'feelingId', singleton: false },
  place: { schema: PlaceSchema, idField: 'placeId', singleton: false },
  todo: { schema: TodoSchema, idField: '', singleton: true },
  content: { schema: ContentSchema, idField: 'contentId', singleton: false },
  image: { schema: null, idField: '', singleton: false },
}
```

The backend's generic `/data/{type}` endpoints use this registry to validate and route CRUD operations — adding a new entity type requires only a schema + registry entry.

---

## Bot Validation & Integrity

The bot schema includes functions that protect workflow integrity during editing and deployment:

```typescript
import {
  validateBot,
  removeStepReferences,
  clearDownstreamSamples,
  computeStepConfigHash,
} from '@baita/shared'

// Pre-deploy validation (catches forward refs, missing services, stale data)
const { valid, errors, warnings } = validateBot(bot)

// When a step is deleted — cleans downstream references
const { tasks, removedCount } = removeStepReferences(bot.tasks, deletedTaskId)

// When a step's config changes — invalidates stale sample data
const updatedTasks = clearDownstreamSamples(bot.tasks, changedStepIndex)

// Detect when sample data no longer matches the step config
const hash = computeStepConfigHash(task)
```

---

## Utilities

| File                  | Exports                                            | Purpose                               |
| --------------------- | -------------------------------------------------- | ------------------------------------- |
| `utils/id.ts`         | `generateId()`                                     | NanoID-based 12-char base62 IDs       |
| `utils/trigger.ts`    | `computeTriggerToken()`, `decodeTriggerToken()`    | Encode/decode userId for webhook URLs |
| `utils/validate.ts`   | `validate()`                                       | Schema validation using registry      |
| `utils/validators.ts` | `validateTasks()`, `validateTaskExecutionResult()` | Domain-specific validation helpers    |

---

## Usage

```typescript
// Types
import {
  IBot,
  ITask,
  IUser,
  IConnection,
  IConnectorManifest,
} from '@baita/shared'

// Validation
import { validateBot, BotSchema, TaskSchema } from '@baita/shared'

// Enums
import {
  VariableType,
  DataType,
  TaskExecutionStatus,
  ServiceName,
} from '@baita/shared'

// Connectors
import {
  googleConnector,
  pipedriveConnector,
  connectorToAppService,
} from '@baita/shared'

// Utilities
import {
  generateId,
  computeTriggerToken,
  decodeTriggerToken,
} from '@baita/shared'

// Registry
import { entityRegistry, getRegisteredTypes } from '@baita/shared'
```

---

## Commands

```bash
npm test            # Unit tests (validation, reference integrity, hashing)
npm run test:watch  # Watch mode
npm run type-check  # TypeScript compilation check
```
