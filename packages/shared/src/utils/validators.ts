import type { IContent, ITodoTask, IUser } from '../schemas/user'
import type { DataType } from '../schemas/service'
import type {
  IBotLog,
  ITask,
  ITaskExecutionInput,
  ITaskExecutionResult,
} from '../schemas/bot'

import {
  BotLogSchema,
  TaskExecutionInputSchema,
  TaskExecutionResultSchema,
  TaskSchema,
} from '../schemas/bot'
import { ContentSchema, TodoTaskSchema, UserSchema } from '../schemas/user'
import { validate } from './validate'

export const validateTasks = (tasks: ITask[]) => {
  tasks.forEach((task, i) => validate(TaskSchema, task, `Task[${i}]`))
}

export const validateTaskExecutionResult = (
  taskResult: ITaskExecutionResult
) => {
  validate(TaskExecutionResultSchema, taskResult, 'TaskExecutionResult')
}

export const validateTaskExecutionInput = (
  input: ITaskExecutionInput<DataType>
) => {
  validate(TaskExecutionInputSchema, input, 'TaskExecutionInput')
}

export const validateBotLog = (log: IBotLog) => {
  validate(BotLogSchema, log, 'BotLog')
}

export const validateUser = (user: IUser) => {
  validate(UserSchema, user, 'User')
}

export const validateContent = (content: IContent[]) => {
  content.forEach((c, i) => validate(ContentSchema, c, `Content[${i}]`))
}

export const validateTodoTasks = (todoTasks: ITodoTask[]) => {
  todoTasks.forEach((t, i) => validate(TodoTaskSchema, t, `TodoTask[${i}]`))
}
