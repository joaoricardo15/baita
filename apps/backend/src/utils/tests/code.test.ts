// Journey: Bot Automation — Lambda code generation for deployed bots
// These utilities generate the actual JS code that runs in bot Lambda functions.
import { ConditionOperator, ITask } from '@baita/shared'
import { ServiceName, ServiceType, VariableType } from '@baita/shared'

import {
  getBotInnerCode,
  getCompleteBotCode,
  getConditionsString,
  getInputString,
} from '../code'

describe('getInputString', () => {
  test('should return string version of properties', () => {
    expect(getInputString()).toStrictEqual('""')
    expect(getInputString(0)).toStrictEqual('0')
    expect(getInputString(true)).toStrictEqual('true')
    expect(getInputString('baita')).toStrictEqual('"baita"')
  })

  test('should return an empty string when there is no properties', () => {
    const input = {}
    expect(getInputString(input)).toStrictEqual('{}')
  })

  test('should return string containing list of properties containing primitive types of data', () => {
    const input = {
      age: 35,
      dev: true,
      name: 'baita',
    }

    expect(getInputString(input)).toBe('{"age":35,"dev":true,"name":"baita"}')
  })

  test('should return string containing list of properties containing an object', () => {
    const input = {
      person: {
        age: 35,
        dev: true,
        name: 'baita',
      },
    }

    expect(getInputString(input)).toBe(
      '{"person":{"age":35,"dev":true,"name":"baita"}}'
    )
  })

  test('should return string containing list of properties containing an array', () => {
    const input = {
      types: ['baita', 'help'],
    }

    expect(getInputString(input)).toBe('{"types":["baita","help"]}')
  })

  test('should return string containing list of properties containing an output', () => {
    const input = "###baita.help###task123_outputData['baita']###baita.help###"

    expect(getInputString(input)).toBe("task123_outputData['baita']")
  })

  test('should return string containing list of properties containing all types of data', () => {
    const input = {
      types: ['baita', 'help'],
      person: {
        age: 35,
        dev: true,
        name: 'baita',
        output: "###baita.help###task123_outputData['baita']###baita.help###",
      },
    }

    expect(getInputString(input)).toBe(
      '{"types":["baita","help"],"person":{"age":35,"dev":true,"name":"baita","output":task123_outputData[\'baita\']}}'
    )
  })

  test('should return correct input string regarding a complex real use case', () => {
    const input = {
      bodyParams: {
        max_completion_tokens: 100,
        messages: [
          {
            content:
              "###baita.help###task1_outputData['title']###baita.help###",
            role: 'user',
          },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.9,
      },
      headers: {
        Authorization: 'Bearer xxx',
      },
      method: 'post',
      path: 'chat/completions',
    }

    expect(getInputString(input)).toBe(
      '{"bodyParams":{"max_completion_tokens":100,"messages":[{"content":task1_outputData[\'title\'],"role":"user"}],"model":"gpt-4o-mini","temperature":0.9},"headers":{"Authorization":"Bearer xxx"},"method":"post","path":"chat/completions"}'
    )
  })
})

describe('getConditionsString', () => {
  test('should return an empty string when there is no conditions', () => {
    const conditions = [[]]
    expect(getConditionsString(conditions)).toBe('()')
  })

  test('should return an comparison between two empty strings', () => {
    const conditions = [
      [
        {
          operator: ConditionOperator.equals,
          operand: { type: VariableType.text, name: '', label: '' },
          comparisonOperand: { type: VariableType.text, name: '', label: '' },
        },
      ],
    ]
    expect(getConditionsString(conditions)).toBe('("" == "")')
  })

  test('should return an comparison between two strings', () => {
    const conditions = [
      [
        {
          operator: ConditionOperator.notEquals,
          operand: {
            type: VariableType.text,
            value: 'baita',
            name: '',
            label: '',
          },
          comparisonOperand: {
            type: VariableType.text,
            value: 'help',
            name: '',
            label: '',
          },
        },
      ],
    ]
    expect(getConditionsString(conditions)).toBe('("baita" != "help")')
  })

  test('should return a check if string a includes string b', () => {
    const conditions = [
      [
        {
          operator: ConditionOperator.contains,
          operand: {
            type: VariableType.text,
            value: 'baita',
            name: '',
            label: '',
          },
          comparisonOperand: {
            type: VariableType.text,
            value: 'help',
            name: '',
            label: '',
          },
        },
      ],
    ]
    expect(getConditionsString(conditions)).toBe('("baita".includes("help"))')
  })

  test('should return a check if output exists', () => {
    const conditions = [
      [
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 2,
            outputPath: 'person.name',
          },
        },
      ],
    ]
    expect(getConditionsString(conditions)).toBe(
      "(!!task2_outputData['person']['name'])"
    )
  })

  test('should return a check if output exists', () => {
    const conditions = [
      [
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 1,
            outputPath: 'person.name',
          },
        },
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 2,
            outputPath: 'person.name',
          },
        },
      ],
    ]
    expect(getConditionsString(conditions)).toBe(
      "(!!task1_outputData['person']['name'] && !!task2_outputData['person']['name'])"
    )
  })

  test('should return a check if output exists', () => {
    const conditions = [
      [
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 1,
            outputPath: 'person.name',
          },
        },
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 2,
            outputPath: 'person.name',
          },
        },
      ],
      [
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 3,
            outputPath: 'person.name',
          },
        },
        {
          operator: ConditionOperator.exists,
          operand: {
            name: '',
            label: '',
            type: VariableType.output,
            outputIndex: 4,
            outputPath: 'person.name',
          },
        },
      ],
    ]
    expect(getConditionsString(conditions)).toBe(
      "(!!task1_outputData['person']['name'] && !!task2_outputData['person']['name']) || (!!task3_outputData['person']['name'] && !!task4_outputData['person']['name'])"
    )
  })
})

describe('getCompleteBotCode', () => {
  const triggerTask: ITask = {
    taskId: 1000,
    inputData: [],
    service: {
      type: ServiceType.trigger,
      name: ServiceName.webhook,
      label: 'Webhook',
      config: {},
    },
  }

  test('generates handler with bot metadata', () => {
    const code = getCompleteBotCode('user-1', 'bot-abc', [triggerTask])
    expect(code).toContain("const botId = 'bot-abc'")
    expect(code).toContain("const userId = 'user-1'")
    expect(code).toContain('module.exports.handler')
  })

  test('includes structured log output', () => {
    const code = getCompleteBotCode('user-1', 'bot-abc', [triggerTask])
    expect(code).toContain('console.log(JSON.stringify(')
    expect(code).toContain('logs')
    expect(code).toContain('usage')
    expect(code).toContain('timestamp')
  })
})

describe('getBotInnerCode', () => {
  const triggerTask: ITask = {
    taskId: 1000,
    inputData: [],
    service: {
      type: ServiceType.trigger,
      name: ServiceName.webhook,
      label: 'Webhook',
      config: {},
    },
  }

  test('generates task invocation with Lambda call', () => {
    const tasks: ITask[] = [
      triggerTask,
      {
        taskId: 2000,
        inputData: [],
        service: {
          type: ServiceType.invoke,
          name: ServiceName.code,
          label: 'Run Code',
          config: { inputFields: [] },
        },
      },
    ]

    const code = getBotInnerCode(tasks)
    expect(code).toContain('task1_inputData')
    expect(code).toContain('lambda.invoke')
    expect(code).toContain('endpoint-task')
  })

  test('includes timing instrumentation', () => {
    const tasks: ITask[] = [
      triggerTask,
      {
        taskId: 2000,
        inputData: [],
        service: {
          type: ServiceType.invoke,
          name: ServiceName.code,
          label: 'Code',
          config: { inputFields: [] },
        },
      },
    ]

    const code = getBotInnerCode(tasks)
    expect(code).toContain('task1_startedAt = Date.now()')
    expect(code).toContain('duration: Date.now() - task1_startedAt')
  })

  test('generates retry loop when retryPolicy is set', () => {
    const tasks: ITask[] = [
      triggerTask,
      {
        taskId: 2000,
        inputData: [],
        retryPolicy: { maxAttempts: 3, backoffMs: 2000 },
        service: {
          type: ServiceType.invoke,
          name: ServiceName.http,
          label: 'HTTP',
          config: { inputFields: [] },
        },
      },
    ]

    const code = getBotInnerCode(tasks)
    expect(code).toContain('task1_maxAttempts = 3')
    expect(code).toContain('task1_backoffMs = 2000')
    expect(code).toContain('while (task1_attempts < task1_maxAttempts)')
  })

  test('does not generate retry loop without retryPolicy', () => {
    const tasks: ITask[] = [
      triggerTask,
      {
        taskId: 2000,
        inputData: [],
        service: {
          type: ServiceType.invoke,
          name: ServiceName.code,
          label: 'Code',
          config: { inputFields: [] },
        },
      },
    ]

    const code = getBotInnerCode(tasks)
    expect(code).not.toContain('_maxAttempts')
    expect(code).not.toContain('_backoffMs')
  })
})
