import {
  MethodName,
  ServiceName,
  ServiceType,
  VariableType,
} from './interface'

export const dataSchema: any = {
  anyOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'object' },
    {
      type: 'array',
      items: {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
          { type: 'object' },
        ],
      },
    },
  ],
}

export const variableSchema: any = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: Object.values(VariableType) as readonly VariableType[],
    },
    name: {
      type: 'string',
    },
    label: {
      type: 'string',
    },
    value: dataSchema,
    sampleValue: dataSchema,
    description: {
      type: 'string',
      nullable: true,
    },
    required: {
      type: 'boolean',
      nullable: true,
    },
    outputIndex: {
      type: 'number',
      nullable: true,
    },
    outputPath: {
      type: 'string',
      nullable: true,
    },
    customFieldId: {
      type: 'number',
      nullable: true,
    },
    groupName: {
      type: 'string',
      nullable: true,
    },
    options: {
      type: 'array',
      nullable: true,
      items: {
        type: 'object',
        properties: {
          label: {
            type: 'string',
          },
          value: {
            type: 'string',
          },
        },
        required: ['label', 'value'],
      },
    },
  },
  required: ['type', 'name', 'label'],
} as never // never added here as a workaround for the 'nullable cannot be used without type' issue

export const serviceConfigSchema: any = {
  type: 'object',
  properties: {
    methodName: {
      type: 'string',
      enum: Object.values(MethodName) as readonly MethodName[],
      nullable: true,
    },
    customFields: {
      type: 'boolean',
      nullable: true,
    },
    inputFields: {
      type: 'array',
      nullable: true,
      items: variableSchema,
    },
    outputPath: {
      type: 'string',
      nullable: true,
    },
    outputMapping: {
      type: 'object',
      nullable: true,
      required: [],
    },
  },
}

export const serviceSchema: any = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: Object.values(ServiceType) as readonly ServiceType[],
    },
    name: {
      type: 'string',
      enum: Object.values(ServiceName) as readonly ServiceName[],
    },
    label: {
      type: 'string',
    },
    config: serviceConfigSchema,
  },
  required: ['type', 'name', 'label', 'config'],
}
