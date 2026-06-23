import { z } from 'zod'

export const TodoTaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  body: z.string().optional(),
  done: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ITodoTask = z.infer<typeof TodoTaskSchema>

export const TodoSchema = z.object({
  tasks: z.array(TodoTaskSchema),
})
export type ITodo = z.infer<typeof TodoSchema>

export interface ITodoTaskGroup {
  prefix: string
  tasks: ITodoTask[]
  groups?: ITodoTaskGroup[]
}
