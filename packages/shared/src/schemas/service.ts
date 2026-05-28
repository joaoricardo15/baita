import { z } from 'zod'

export enum ServiceType {
  invoke = 'invoke',
  trigger = 'trigger',
}
export const ServiceTypeSchema = z.nativeEnum(ServiceType)

export enum ServiceName {
  code = 'code-execute',
  http = 'http-request',
  queue = 'queue-publish',
  oauth2 = 'oauth2-request',
  method = 'method-execute',
  webhook = 'webhook',
  schedule = 'schedule',
}
export const ServiceNameSchema = z.nativeEnum(ServiceName)

export enum MethodName {
  getTodo = 'getTodo',
  publishToFeed = 'publishToFeed',
  sendNotification = 'sendNotification',
  httpRequest = 'httpRequest',
  oauth2Request = 'oauth2Request',
}
export const MethodNameSchema = z.nativeEnum(MethodName)

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
  z.array(z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())])),
])

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

export interface IServiceApp {
  service: IService
  app: import('./app').IApp
}
