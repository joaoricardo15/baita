/**
 * Note — Quick-capture text notes
 *
 * DDD Role: Standalone Entity (managed via generic Resource CRUD)
 *
 * Simple text notes stored per-user. Managed through the generic resource
 * endpoint (POST /resource/note/{operation}/{id?}).
 *
 * Storage: DynamoDB with sortKey `#NOTE#{noteId}`
 */
import { z } from 'zod'

export const NoteSchema = z.object({
  noteId: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  category: z.string().optional(),
})

export type INote = z.infer<typeof NoteSchema>
