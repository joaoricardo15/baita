import type { IContent, ITodoTask, IUser } from '../schemas/user'
import type { DataType } from '../schemas/service'
import type { IBotLog } from '../schemas/bot'
import type {
  ITask,
  ITaskExecutionInput,
  ITaskExecutionResult,
} from '../schemas/task'

import { BotLogSchema } from '../schemas/bot'
import {
  TaskExecutionInputSchema,
  TaskExecutionResultSchema,
  TaskSchema,
} from '../schemas/task'
import { ContentSchema, TodoTaskSchema, UserSchema } from '../schemas/user'
import { validate } from './validate'

export function validateTasks(tasks: ITask[]): void {
  tasks.forEach((task, i) => validate(TaskSchema, task, `Task[${i}]`))
}

export function validateTaskExecutionResult(
  taskResult: ITaskExecutionResult
): void {
  validate(TaskExecutionResultSchema, taskResult, 'TaskExecutionResult')
}

export function validateTaskExecutionInput(
  input: ITaskExecutionInput<DataType>
): void {
  validate(TaskExecutionInputSchema, input, 'TaskExecutionInput')
}

export function validateBotLog(log: IBotLog): void {
  validate(BotLogSchema, log, 'BotLog')
}

export function validateUser(user: IUser): void {
  validate(UserSchema, user, 'User')
}

export function validateContent(content: IContent[]): void {
  content.forEach((c, i) => validate(ContentSchema, c, `Content[${i}]`))
}

export function validateTodoTasks(todoTasks: ITodoTask[]): void {
  todoTasks.forEach((t, i) => validate(TodoTaskSchema, t, `TodoTask[${i}]`))
}
