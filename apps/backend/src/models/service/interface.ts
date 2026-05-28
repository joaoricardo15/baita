import { IApp } from '../app/interface'

export enum ServiceType {
  invoke = 'invoke',
  trigger = 'trigger',
}

export enum ServiceName {
  code = 'code-execute',
  http = 'http-request',
  queue = 'queue-publish',
  oauth2 = 'oauth2-request',
  method = 'method-execute',
  webhook = 'webhook',
  schedule = 'schedule',
}

export enum MethodName {
  getTodo = 'getTodo',
  publishToFeed = 'publishToFeed',
  sendNotification = 'sendNotification',
  httpRequest = 'httpRequest',
  oauth2Request = 'oauth2Request',
}

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

export type DataType =
  | string
  | number
  | boolean
  | object
  | Array<string | number | boolean | object>

export interface IVariable {
  type: VariableType
  name: string
  label: string
  value?: DataType
  sampleValue?: DataType
  description?: string
  required?: boolean
  outputIndex?: number
  outputPath?: string
  customFieldId?: number
  groupName?: string
  options?: {
    label: string
    value: string
  }[]
}

export interface IServiceConfig {
  methodName?: MethodName
  customFields?: boolean
  inputFields?: IVariable[]
  outputPath?: string
  outputMapping?: {
    [key: string]: string
  }
}

export interface IService {
  type: ServiceType
  name: ServiceName
  label: string
  config: IServiceConfig
}

export interface IServiceApp {
  service: IService
  app: IApp
}
