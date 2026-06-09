/**
 * User — Platform account and user-facing data
 *
 * DDD Role: Root scoping entity
 *
 * The User is the top-level ownership scope. Every Bot, Connection, Note,
 * Place, and Todo belongs to exactly one User (scoped by userId in DynamoDB).
 *
 * This file also contains user-domain value objects:
 * - Content: feed items published by bots to the user's SQS queue
 * - Todo/TodoTask: task management items
 *
 * Relationships:
 * - User.userId is the partition key for all DynamoDB records
 * - Bots, Connections, Resources all reference User via userId
 */
import { z } from 'zod'

export const UserSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  email: z.string(),
  picture: z.string().optional(),
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
  tasks: z.array(TodoTaskSchema),
})
export type ITodo = z.infer<typeof TodoSchema>

export interface ITodoTaskGroup {
  prefix: string
  tasks: ITodoTask[]
  groups?: ITodoTaskGroup[]
}
