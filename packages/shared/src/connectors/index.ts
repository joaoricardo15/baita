import { z } from 'zod'

import { VariableSchema } from '../schemas/service'

export const OAuth2AuthSchema = z.object({
  type: z.literal('oauth2'),
  authorizationUrl: z.string(),
  tokenUrl: z.string(),
  refreshUrl: z.string().optional(),
  scopes: z.array(z.string()),
  userInfoUrl: z.string(),
  userIdField: z.string(),
  clientId: z.string(),
  clientIdEnvVar: z.string(),
  clientSecretEnvVar: z.string(),
  tokenAuthMethod: z.enum(['basic', 'body']).default('body').optional(),
})

export const ApiKeyAuthSchema = z.object({
  type: z.literal('apiKey'),
  headerName: z.string(),
  prefix: z.string().optional(),
  envVar: z.string(),
})

export const NoAuthSchema = z.object({
  type: z.literal('none'),
})

export const ConnectorAuthSchema = z.discriminatedUnion('type', [
  OAuth2AuthSchema,
  ApiKeyAuthSchema,
  NoAuthSchema,
])

export const ConnectorOperationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  path: z.string(),
  inputFields: z.array(VariableSchema),
  outputPath: z.string().optional(),
})

export const ConnectorManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  category: z.string(),
  appId: z.string(),
  auth: ConnectorAuthSchema,
  base: z.object({
    url: z.string(),
    headers: z.record(z.string()).optional(),
  }),
  healthCheck: z
    .object({
      url: z.string(),
      method: z.enum(['GET', 'POST']).default('GET'),
    })
    .optional(),
  operations: z.array(ConnectorOperationSchema),
})

export type ConnectorManifest = z.infer<typeof ConnectorManifestSchema>
export type ConnectorOperation = z.infer<typeof ConnectorOperationSchema>
export type ConnectorAuth = z.infer<typeof ConnectorAuthSchema>
