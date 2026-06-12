import { z } from 'zod'

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
  reaction: z.enum(['like', 'dislike', 'skip']).optional(),
  publishedAt: z.string().optional(),
  seenAt: z.string().optional(),
  ttl: z.number().optional(),
})
export type IContent = z.infer<typeof ContentSchema>
