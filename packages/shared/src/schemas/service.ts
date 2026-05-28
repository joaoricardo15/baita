import { z } from 'zod'

export const ServiceTypeSchema = z.enum(['invoke', 'trigger'])
export type ServiceType = z.infer<typeof ServiceTypeSchema>

export const ServiceNameSchema = z.enum([
  'code-execute',
  'http-request',
  'queue-publish',
  'oauth2-request',
  'method-execute',
  'webhook',
  'schedule',
])
export type ServiceName = z.infer<typeof ServiceNameSchema>

export const MethodNameSchema = z.enum([
  'getTodo',
  'publishToFeed',
  'sendNotification',
  'httpRequest',
  'oauth2Request',
])
export type MethodName = z.infer<typeof MethodNameSchema>

export const VariableTypeSchema = z.enum([
  'code',
  'user',
  'text',
  'output',
  'options',
  'boolean',
  'constant',
  'environment',
])
export type VariableType = z.infer<typeof VariableTypeSchema>

export const DataTypeSchema: z.ZodType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.unknown()),
  z.array(z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())])),
])
export type DataType = z.infer<typeof DataTypeSchema>

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
})
export type IVariable = z.infer<typeof VariableSchema>

export const ServiceConfigSchema = z.object({
  methodName: MethodNameSchema.optional(),
  customFields: z.boolean().optional(),
  inputFields: z.array(VariableSchema).optional(),
  outputPath: z.string().optional(),
  outputMapping: z.record(z.string()).optional(),
})
export type IServiceConfig = z.infer<typeof ServiceConfigSchema>

export const ServiceSchema = z.object({
  type: ServiceTypeSchema,
  name: ServiceNameSchema,
  label: z.string(),
  config: ServiceConfigSchema,
})
export type IService = z.infer<typeof ServiceSchema>
