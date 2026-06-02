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

export interface IAppService extends IApp {
  services: import('./service').IService[]
}

export const CredentialSchema = z.object({}).passthrough()
export type ICredential = Record<string, unknown>

export const AppConnectionSchema = z.object({
  appId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  credentials: CredentialSchema,
  connectionId: z.union([z.string(), z.number()]),
  connectorId: z.string().optional(),
  createdAt: z.number().optional(),
})
export type IAppConnection = z.infer<typeof AppConnectionSchema>
