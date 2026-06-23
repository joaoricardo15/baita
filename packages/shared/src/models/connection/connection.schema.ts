import { z } from 'zod'

export const CredentialSchema = z.object({}).passthrough()
export type ICredential = Record<string, unknown>

export const ConnectionSchema = z.object({
  appId: z.string(),
  email: z.string(),
  name: z.string(),
  credentials: CredentialSchema,
  connectionId: z.string(),
  connectorId: z.string().optional(),
  createdAt: z.string().optional(),
})
export type IConnection = z.infer<typeof ConnectionSchema>
