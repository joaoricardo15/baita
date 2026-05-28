import { IApp, IAppConfig } from './app'
import { DataType, IService, IServiceConfig, IVariable } from './service'

export enum TaskExecutionStatus {
  fail = 'fail',
  filtered = 'filtered',
  success = 'success',
}

export interface ITaskExecutionInput<T> {
  userId: string
  botId: string
  appConfig: IAppConfig
  serviceConfig: IServiceConfig
  connectionId?: string | number
  inputData: T
}

export interface ITaskExecutionResult {
  timestamp: number
  inputData: DataType
  outputData: DataType
  status: TaskExecutionStatus
}

export enum ConditionOperator {
  equals = 'Equals',
  notEquals = 'Not equals',
  exists = 'Exists',
  doNotExists = 'Do not exists',
  contains = 'Contains',
  startsWith = 'Starts with',
  endsWith = 'Ends with',
}

export interface ITaskCondition {
  operator: ConditionOperator
  operand: IVariable
  comparisonOperand?: IVariable
}

export interface ITask {
  taskId: number
  app?: IApp
  service?: IService
  returnData?: boolean
  inputData: IVariable[]
  sampleResult?: ITaskExecutionResult
  conditions?: ITaskCondition[][]
  connectionId?: string | number
}

export interface ITaskLog {
  name: string
  timestamp: number
  inputData: DataType
  outputData: DataType
  status: TaskExecutionStatus
}

export interface IBotLog {
  logs: ITaskLog[]
  usage: number
  botId: string
  userId: string
  timestamp: number
}

export interface IBotModel {
  modelId: string
  author: string
  name: string
  tasks: ITask[]
  image?: string
  description?: string
}

export interface IBot {
  botId: string
  userId: string
  modelId?: string
  apiId: string
  name: string
  active: boolean
  triggerUrl: string
  triggerSamples: ITaskExecutionResult[]
  tasks: ITask[]
  image?: string
  description?: string
}
