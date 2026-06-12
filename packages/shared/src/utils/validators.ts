import type { IContent } from '../models/content/content.schema'
import { ContentSchema } from '../models/content/content.schema'
import type { IUser } from '../models/user/user.schema'
import { UserSchema } from '../models/user/user.schema'
import type { ITask, ITaskExecutionResult } from '../schemas/task'
import { TaskExecutionResultSchema, TaskSchema } from '../schemas/task'
import { validate } from './validate'

export function validateTasks(tasks: ITask[]): void {
  tasks.forEach((task, i) => validate(TaskSchema, task, `Task[${i}]`))
}

export function validateTaskExecutionResult(
  taskResult: ITaskExecutionResult
): void {
  validate(TaskExecutionResultSchema, taskResult, 'TaskExecutionResult')
}

export function validateUser(user: IUser): void {
  validate(UserSchema, user, 'User')
}

export function validateContent(content: IContent[]): void {
  content.forEach((c, i) => validate(ContentSchema, c, `Content[${i}]`))
}
