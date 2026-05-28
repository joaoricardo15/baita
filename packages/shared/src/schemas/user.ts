import { z } from 'zod'

export const UserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  picture: z.string(),
})
export type IUser = z.infer<typeof UserSchema>

export const ContentAuthorSchema = z.object({
  name: z.string(),
  accountName: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  url: z.string().optional(),
  location: z.string().optional(),
  followers: z.number().optional(),
})

export const ContentSchema = z.object({
  contentId: z.string(),
  date: z.string(),
  header: z.string(),
  body: z.string().optional(),
  source: z.string().optional(),
  image: z.string().optional(),
  url: z.string().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  author: ContentAuthorSchema,
})
export type IContent = z.infer<typeof ContentSchema>

export const TodoTaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  body: z.string().optional(),
  done: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ITodoTask = z.infer<typeof TodoTaskSchema>

export const TodoSchema = z.object({
  userId: z.string(),
  tasks: z.array(TodoTaskSchema),
})
export type ITodo = z.infer<typeof TodoSchema>

export const TodoTaskGroupSchema: z.ZodType = z.object({
  prefix: z.string(),
  tasks: z.array(TodoTaskSchema),
  groups: z.lazy(() => z.array(TodoTaskGroupSchema)).optional(),
})
export type ITodoTaskGroup = z.infer<typeof TodoTaskGroupSchema>
