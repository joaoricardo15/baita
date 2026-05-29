# @baita/shared

Single source of truth for all TypeScript models and validation logic. Both `apps/frontend` and `apps/backend` import from this package.

## Schemas

All schemas are defined with [Zod](https://zod.dev) — providing both TypeScript types (inferred) and runtime validation from one definition.

| File                 | Models                            | Purpose                                       |
| -------------------- | --------------------------------- | --------------------------------------------- |
| `schemas/user.ts`    | `IUser`, `ITodo`, `IContent`      | User profile, todo tasks, content feed        |
| `schemas/bot.ts`     | `IBot`, `ITask`, `ITaskCondition` | Bot workflow definition + validation          |
| `schemas/service.ts` | `IService`, `IVariable`, enums    | Service/variable types for task configuration |
| `schemas/app.ts`     | `IApp`, `IAppConnection`          | OAuth app definitions                         |
| `schemas/api.ts`     | `ApiResponseSchema`               | Standard API response envelope                |

## Bot Validation & Integrity

The bot schema includes functions that protect workflow integrity:

```typescript
import {
  validateBot,
  removeStepReferences,
  clearDownstreamSamples,
} from '@baita/shared'

// Before deploying a bot
const { valid, errors, warnings } = validateBot(bot)
if (!valid) throw new Error(errors.join('; '))

// When a step is deleted in the UI
const { tasks, removedCount } = removeStepReferences(bot.tasks, deletedTaskId)

// When a step's service changes
const updatedTasks = clearDownstreamSamples(bot.tasks, changedStepIndex)
```

## Testing

```bash
npm run test:run    # 16 tests covering validation, reference integrity, hashing
```

## Usage

Both apps import via workspace reference:

```typescript
import { IBot, ITask, validateBot, VariableType } from '@baita/shared'
```
