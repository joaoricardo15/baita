import type { ITask, ITaskExecutionResult } from '../schemas/task'
import { TaskExecutionResultSchema, TaskSchema } from '../schemas/task'
import type { IContent, IUser } from '../schemas/user'
import { ContentSchema, UserSchema } from '../schemas/user'
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
