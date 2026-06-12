import { z } from 'zod'

export const UserSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  email: z.string(),
  picture: z.string().optional(),
})
export type IUser = z.infer<typeof UserSchema>
