/**
 * Connection — User-authenticated access to an external service
 *
 * DDD Role: Standalone Entity (has global identity, shared across bots)
 *
 * A Connection stores a user's OAuth tokens or API keys for one external
 * service. Multiple bots/tasks can reference the same Connection via
 * `task.connectionId`. Connections have their own lifecycle — they persist
 * independently of any bot that uses them.
 *
 * Relationships:
 * - Connection.appId → matches App.appId and Connector.appId
 * - Connection.userId → owner (User entity)
 * - Task.connectionId → FK reference to this entity
 *
 * Storage: DynamoDB with sortKey `#CONNECTION#{connectionId}`
 * Backend: `endpoints/connection/` handles CRUD + health checks
 */
import { z } from 'zod'

// ─── Credential (opaque auth payload) ──────────────────────────────────────

export const CredentialSchema = z.object({}).passthrough()
export type ICredential = Record<string, unknown>

// ─── App Connection ────────────────────────────────────────────────────────

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
