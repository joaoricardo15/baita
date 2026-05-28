import { ConditionOperator } from 'src/models/bot/interface'
import { VariableType } from 'src/models/service/interface'

import { getConditionsString, getInputString } from '../code'

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
