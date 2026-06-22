/**
 * Service — Execution strategy for a task step
 *
 * DDD Role: Value Object (embedded in Task, no standalone identity)
 *
 * A Service defines WHAT a task does: which executor handles it, what inputs
 * are required, and how outputs are extracted. It is the "strategy" pattern —
 * the same Service definition can be reused across many Tasks with different
 * input values.
 *
 * Relationships:
 * - Embedded in Task (task.service)
 * - ServiceName maps to executor dispatch in backend (executor.ts)
 * - ServiceConfig.inputFields defines the schema; Task.inputData provides values
 * - Connectors define services via operations[] or explicit services[] arrays
 *
 * Key design decision: IVariable is used for BOTH field definitions
 * (service.config.inputFields) and field values (task.inputData). This trades
 * type precision for implementation simplicity across connectors and UI.
 */
import { z } from 'zod'

/** Whether a service is a trigger (starts execution) or an invoke (performs action) */
export enum ServiceType {
  invoke = 'invoke',
  trigger = 'trigger',
}
export const ServiceTypeSchema = z.nativeEnum(ServiceType)

/**
 * Service name identifies both executor dispatch (invoke services) and
 * trigger type (trigger services). Invoke services route through the
 * executor switch. Trigger services are handled externally (EventBridge
 * for schedule, HTTP POST for webhook/phoneEvent) and never hit the executor.
 */
export enum ServiceName {
  code = 'code-execute',
  http = 'http-request',
  queue = 'queue-publish',
  oauth2 = 'oauth2-request',
  method = 'method-execute',
  webhook = 'webhook',
  schedule = 'schedule',
  phoneEvent = 'phone-event',
  locationEvent = 'location-event',
}
export const ServiceNameSchema = z.nativeEnum(ServiceName)

/** Built-in method names for the method-execute service */
export enum MethodName {
  getTodo = 'getTodo',
  publishToFeed = 'publishToFeed',
  sendNotification = 'sendNotification',
  httpRequest = 'httpRequest',
  oauth2Request = 'oauth2Request',
  wait = 'wait',
}
export const MethodNameSchema = z.nativeEnum(MethodName)

/**
 * Variable type determines how the value is resolved at runtime:
 * - code: JavaScript expression (code editor)
 * - user: Auto-filled from user context (timezone, push token)
 * - text: Free-form user input
 * - output: Reference to a previous task's output (via outputIndex + outputPath)
 * - options: Dropdown selection from predefined list
 * - boolean: Toggle
 * - constant: Fixed value (not user-editable, set by connector)
 * - environment: Server-side env var (never exposed to frontend)
 */
export enum VariableType {
  code = 'code',
  user = 'user',
  text = 'text',
  output = 'output',
  options = 'options',
  boolean = 'boolean',
  constant = 'constant',
  environment = 'environment',
}
export const VariableTypeSchema = z.nativeEnum(VariableType)

export type DataType =
  | string
  | number
  | boolean
  | object
  | Array<string | number | boolean | object>

export const DataTypeSchema: z.ZodType<DataType> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.unknown()),
  z.array(
    z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())])
  ),
])

export const TransformOperationSchema = z.enum([
  'first',
  'last',
  'at',
  'count',
  'pluck',
  'filter',
  'join',
  'sort',
])
export type ITransformOperation = z.infer<typeof TransformOperationSchema>

export const TransformSchema = z.object({
  operation: TransformOperationSchema,
  index: z.number().optional(),
  property: z.string().optional(),
  operator: z
    .enum([
      'equals',
      'notEquals',
      'contains',
      'greaterThan',
      'lessThan',
      'exists',
      'notExists',
    ])
    .optional(),
  value: z.string().optional(),
  direction: z.enum(['asc', 'desc']).optional(),
})
export type ITransform = z.infer<typeof TransformSchema>

/**
 * Variable — Dual-purpose field schema
 *
 * Used in TWO contexts (same schema, different semantics):
 * 1. As field DEFINITION in service.config.inputFields (describes available inputs)
 * 2. As field VALUE in task.inputData (stores user-provided data)
 *
 * When type=output, references another task's output via outputIndex + outputPath.
 * Optional transform applies data operations (first, filter, pluck, etc.)
 */
export const VariableSchema = z.object({
  type: VariableTypeSchema,
  name: z.string(),
  label: z.string(),
  value: DataTypeSchema.optional(),
  sampleValue: DataTypeSchema.optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  outputIndex: z.number().optional(),
  outputPath: z.string().optional(),
  customFieldId: z.number().optional(),
  groupName: z.string().optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
  transform: TransformSchema.optional(),
})
export type IVariable = z.infer<typeof VariableSchema>

/** Defines input schema + output extraction for a service */
export const ServiceConfigSchema = z.object({
  methodName: MethodNameSchema.optional(),
  customFields: z.boolean().optional(),
  inputFields: z.array(VariableSchema).optional(),
  outputPath: z.string().optional(),
  outputMapping: z.record(z.string()).optional(),
  bodyEncoding: z.string().optional(),
})
export type IServiceConfig = z.infer<typeof ServiceConfigSchema>

export const ServiceSchema = z.object({
  type: ServiceTypeSchema,
  name: ServiceNameSchema,
  label: z.string(),
  description: z.string().optional(),
  config: ServiceConfigSchema,
})
export type IService = z.infer<typeof ServiceSchema>

/** Pairs a Service with its parent App (used by frontend service picker) */
export interface IServiceApp {
  service: IService
  app: import('./app').IApp
}
