/**
 * Connector — Integration manifest definition
 *
 * DDD Role: Definition/Manifest (static registry entry)
 *
 * A Connector defines how Baita integrates with an external service (Google,
 * Pipedrive, etc.). It declares authentication requirements, base URLs, and
 * available operations. Connectors are static — they don't change per user.
 *
 * At runtime, `connectorToAppService()` in the registry converts a Connector
 * into the user-facing App + Service[] pair that populates the bot editor.
 *
 * Relationships:
 * - Connector.operations[] → converted to IService[] via registry
 * - Connector.appId → matches App.appId and Connection.appId
 * - Connector.auth → determines how Connection credentials are obtained
 */
import { z } from 'zod'

import { ServiceSchema, VariableSchema } from './service'

// ─── Authentication Strategies ─────────────────────────────────────────────

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

export const UserApiKeyAuthSchema = z.object({
  type: z.literal('userApiKey'),
  headerName: z.string(),
  prefix: z.string().optional(),
})

export const NoAuthSchema = z.object({
  type: z.literal('none'),
})

export const ConnectorAuthSchema = z.discriminatedUnion('type', [
  OAuth2AuthSchema,
  ApiKeyAuthSchema,
  UserApiKeyAuthSchema,
  NoAuthSchema,
])
export type IConnectorAuth = z.infer<typeof ConnectorAuthSchema>

// ─── Operation (single API endpoint a connector exposes) ───────────────────

export const ConnectorOperationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['trigger', 'invoke']).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  path: z.string(),
  inputFields: z.array(VariableSchema),
  outputPath: z.string().optional(),
  outputMapping: z.record(z.string()).optional(),
})
export type IConnectorOperation = z.infer<typeof ConnectorOperationSchema>

// ─── Connector Manifest (complete integration definition) ──────────────────

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
  services: z.array(z.lazy(() => ServiceSchema)).optional(),
})
export type IConnectorManifest = z.infer<typeof ConnectorManifestSchema>
