import { z } from 'zod'

export const AppConfigSchema = z.object({
  apiUrl: z.string().optional(),
  loginUrl: z.string().optional(),
  authorizeUrl: z.string().optional(),
  auth: z
    .object({
      type: z.string(),
      method: z.string(),
      url: z.string(),
      headers: z.record(z.string()).optional(),
      fields: z
        .object({
          username: z.string(),
          password: z.string(),
        })
        .optional(),
    })
    .optional(),
})
export type IAppConfig = z.infer<typeof AppConfigSchema>

export const AppSchema = z.object({
  name: z.string(),
  appId: z.string(),
  config: AppConfigSchema,
})
export type IApp = z.infer<typeof AppSchema>

export const CredentialSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
})
export type ICredential = z.infer<typeof CredentialSchema>

export const AppConnectionSchema = z.object({
  appId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  credentials: CredentialSchema,
  connectionId: z.union([z.string(), z.number()]),
})
export type IAppConnection = z.infer<typeof AppConnectionSchema>
