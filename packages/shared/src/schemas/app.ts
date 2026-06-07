/**
 * App — External service API configuration (value object)
 *
 * DDD Role: Value Object (embedded in Task, no standalone identity)
 *
 * An App describes HOW to reach an external API: its base URL and
 * authentication configuration. It is always embedded inside a Task
 * (never stored independently). Two Tasks using the same connector
 * will have identical App objects.
 *
 * Relationships:
 * - Embedded in Task (task.app)
 * - App.appId matches Connector.appId and Connection.appId
 * - IAppService extends IApp with available services (used by frontend picker)
 *
 * Design decision: App is embedded (not referenced by ID) so that bot code
 * generation has all config inline without needing runtime lookups.
 */
import { z } from 'zod'

// ─── App Config (API endpoint + auth settings) ─────────────────────────────

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

// ─── App (external service identity + config) ──────────────────────────────

export const AppSchema = z.object({
  name: z.string(),
  appId: z.string(),
  icon: z.string().optional(),
  config: AppConfigSchema,
})
export type IApp = z.infer<typeof AppSchema>

/** App with its available services attached (used by frontend service picker) */
export interface IAppService extends IApp {
  services: import('./service').IService[]
}
