import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import {
  ConditionOperator,
  IBotLog,
  ITask,
  ITaskExecutionInput,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from 'src/models/bot/interface'
import { DataType } from 'src/models/service/interface'

const ajv = new Ajv()
addFormats(ajv)

const dataSchema: any = {
  type: ['string', 'number', 'boolean', 'object', 'array'],
}
const variableSchema: any = { type: 'object' }
const serviceConfigSchema: any = { type: 'object' }
const serviceSchema: any = { type: 'object' }
const appConfigSchema: any = { type: 'object' }
const appSchema: any = { type: 'object' }

const taskConditionSchema: any = {
  type: 'object',
  properties: {
    operator: {
      type: 'string',
      enum: Object.values(ConditionOperator) as readonly ConditionOperator[],
    },
    operand: variableSchema,
    comparisonOperand: {
      nullable: true,
      ...variableSchema,
    },
  },
  required: ['operator', 'operand'],
}

const taskResultSchema: any = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: Object.values(
        TaskExecutionStatus
      ) as readonly TaskExecutionStatus[],
    },
    timestamp: {
      type: 'number',
    },
    inputData: dataSchema,
    outputData: dataSchema,
  },
  required: ['status', 'timestamp', 'inputData', 'outputData'],
}

const tasksSchema: any = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      taskId: {
        type: 'number',
      },
      app: {
        nullable: true,
        ...appSchema,
      },
      service: {
        nullable: true,
        ...serviceSchema,
      },
      returnData: {
        type: 'boolean',
        nullable: true,
      },
      connectionId: {
        type: 'string',
        nullable: true,
      },
      inputData: {
        type: 'array',
        items: variableSchema,
      },
      conditions: {
        type: 'array',
        nullable: true,
        items: {
          type: 'array',
          items: taskConditionSchema,
        },
      },
      sampleResult: {
        nullable: true,
        ...taskResultSchema,
      },
    },
    required: ['taskId', 'inputData'],
  },
}

const taskExecutionInputSchema: any = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
    },
    botId: {
      type: 'string',
    },
    connectionId: {
      type: ['string', 'number'],
      nullable: true,
    },
    appConfig: appConfigSchema,
    serviceConfig: serviceConfigSchema,
    inputData: dataSchema,
  },
  required: ['userId', 'botId', 'appConfig', 'serviceConfig'],
}

const taskLogSchema: any = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    status: {
      type: 'string',
      enum: Object.values(
        TaskExecutionStatus
      ) as readonly TaskExecutionStatus[],
    },
    timestamp: {
      type: 'number',
    },
    inputData: dataSchema,
    outputData: dataSchema,
  },
  required: ['name', 'status', 'timestamp'],
}

const botLogSchema: any = {
  type: 'object',
  properties: {
    botId: {
      type: 'string',
    },
    userId: {
      type: 'string',
    },
    timestamp: {
      type: 'number',
    },
    usage: {
      type: 'number',
    },
    logs: {
      type: 'array',
      items: taskLogSchema,
    },
  },
  required: ['botId', 'userId', 'timestamp', 'usage', 'logs'],
}

export const validateTasks = (tasks: ITask[]) => {
  const validate = ajv.compile(tasksSchema)

  if (!validate(tasks)) {
    throw Error(`Invalid Tasks: ${ajv.errorsText(validate.errors)}`)
  }
}

export const validateTaskExecutionResult = (
  taskResult: ITaskExecutionResult
) => {
  const validate = ajv.compile(taskResultSchema)

  if (!validate(taskResult)) {
    throw Error(
      `Invalid TaskExecutionResult: ${ajv.errorsText(validate.errors)}`
    )
  }
}

export const validateBotLog = (log: IBotLog) => {
  const validate = ajv.compile(botLogSchema)

  if (!validate(log)) {
    throw Error(`Invalid BotLog: ${ajv.errorsText(validate.errors)}`)
  }
}

export const validateTaskExecutionInput = (
  input: ITaskExecutionInput<DataType>
) => {
  const validate = ajv.compile(taskExecutionInputSchema)

  if (!validate(input)) {
    throw Error(
      `Invalid TaskExecutionInput: ${ajv.errorsText(validate.errors)}`
    )
  }
}
