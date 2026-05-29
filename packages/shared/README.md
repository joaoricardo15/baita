# @baita/shared

Single source of truth for all TypeScript models, validation logic, and connector definitions. Both `apps/frontend` and `apps/backend` import from this package.

## Installation

Referenced as a workspace dependency (no manual install needed):

```json
"@baita/shared": "workspace:*"
```

## Schemas

All schemas are defined with [Zod](https://zod.dev) — providing both TypeScript types (inferred) and runtime validation from one definition.

| File                 | Models                            | Purpose                                       |
| -------------------- | --------------------------------- | --------------------------------------------- |
| `schemas/user.ts`    | `IUser`, `ITodo`, `IContent`      | User profile, todo tasks, content feed        |
| `schemas/bot.ts`     | `IBot`, `ITask`, `ITaskCondition` | Bot workflow definition + validation          |
| `schemas/service.ts` | `IService`, `IVariable`, enums    | Service/variable types for task configuration |
| `schemas/app.ts`     | `IApp`, `IAppConnection`          | OAuth app definitions                         |
| `schemas/api.ts`     | `ApiResponseSchema`               | Standard API response envelope                |

## Connectors

OAuth connector manifests define how Baita integrates with third-party services:

| File                      | Connector | Capabilities                      |
| ------------------------- | --------- | --------------------------------- |
| `connectors/google.ts`    | Google    | OAuth2, Calendar, Gmail, Drive    |
| `connectors/pipedrive.ts` | Pipedrive | OAuth2, CRM data, deals, contacts |

Each connector exports its OAuth2 config, available scopes, and input/output variable definitions.

## Bot Validation & Integrity

The bot schema includes functions that protect workflow integrity:

```typescript
import {
  validateBot,
  removeStepReferences,
  clearDownstreamSamples,
  computeStepConfigHash,
} from '@baita/shared'

// Before deploying a bot
const { valid, errors, warnings } = validateBot(bot)
if (!valid) throw new Error(errors.join('; '))

// When a step is deleted in the UI
const { tasks, removedCount } = removeStepReferences(bot.tasks, deletedTaskId)

// When a step's service changes
const updatedTasks = clearDownstreamSamples(bot.tasks, changedStepIndex)

// Detect when sample data becomes stale
const hash = computeStepConfigHash(task)
```

## Usage

Both apps import via workspace reference:

```typescript
// Types
import { IBot, ITask, IUser, IApp, IAppConnection } from '@baita/shared'

// Validation
import { validateBot, BotSchema, TaskSchema } from '@baita/shared'

// Enums
import { VariableType, DataType, TaskExecutionStatus } from '@baita/shared'

// Connectors
import { googleConnector, pipedriveConnector } from '@baita/shared'
```

## Commands

```bash
npm run test:run    # Unit tests (validation, reference integrity, hashing)
npm run build       # TypeScript compilation
```
