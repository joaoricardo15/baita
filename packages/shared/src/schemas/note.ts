import { z } from 'zod'

export const NoteSchema = z.object({
  noteId: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  category: z.string().optional(),
})

export type INote = z.infer<typeof NoteSchema>
