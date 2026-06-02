import { DataType, IVariable, VariableType } from '@baita/shared'

import {
  getDataFromMapping,
  getDataFromPath,
  getDataFromService,
  getMappedData,
  getOutputVariableString,
  getValueFromInputVariable,
  getValueFromServiceVariable,
  OUTPUT_CODE,
  setObjectDataFromPath,
} from '../bot'

describe('getDataFromPath', () => {
  test('should return data when there is no output path', () => {
    const data = { id: '123' }
    expect(getDataFromPath(data)).toStrictEqual(data)
    expect(getDataFromPath(data, '')).toStrictEqual(data)
  })

  test('should return undefined when property does not exist', () => {
    const path = 'person.name'
    expect(getDataFromPath({ person: { age: '35' } }, path)).toBeUndefined()
    expect(getDataFromPath({ age: '35' }, path)).toBeUndefined()
    expect(
      getDataFromPath(undefined as unknown as DataType, path)
    ).toBeUndefined()
    expect(getDataFromPath(null as unknown as DataType, path)).toBeUndefined()
    expect(getDataFromPath('', path)).toBeUndefined()
    expect(getDataFromPath(1, path)).toBeUndefined()
  })

  test('should return property corresponding to output path - simple object', () => {
    const data = { id: '123' }
    const path = 'id'
    expect(getDataFromPath(data, path)).toEqual('123')
  })

  test('should return property corresponding to output path - nested object', () => {
    const data = { person: { age: '35' } }
    const path = 'person.age'
    expect(getDataFromPath(data, path)).toEqual('35')
  })

  test('should return property corresponding to output path - simple array', () => {
    const data = [10, 20, 30]
    const path = '2'
    expect(getDataFromPath(data, path)).toEqual(30)
  })

  test('should return property corresponding to output path - complex object with array', () => {
    const data = [
      {
        person: {
          hobbies: [
            { name: 'reading', freq: 2 },
            { name: 'running', freq: 4 },
          ],
        },
      },
    ]
    const path = '0.person.hobbies.1'
    expect(getDataFromPath(data, path)).toStrictEqual({
      name: 'running',
      freq: 4,
    })
  })
})

describe('getDataFromMapping', () => {
  test('should return an empty object for an empty mapping', () => {
    const data = { firstName: 'Baita', age: 35 }
    const outputMapping = {}
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({})
  })

  test('should return empty object if property in the mapping is not found', () => {
    const data = { firstName: 'Baita', age: 'age' }
    const outputMapping = { name: 'name' }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({})
  })

  test('should return mapped object - simple mapping', () => {
    const data = { firstName: 'Baita', secondName: 'Help', age: 35 }
    const outputMapping = { name: 'firstName' }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      name: 'Baita',
    })
  })

  test('should return mapped object - complex mapping', () => {
    const data = {
      personalInfo: { firstName: 'Baita', secondName: 'Help', age: 35 },
      hobbies: [{ name: 'reading', freq: 4 }],
    }
    const outputMapping = {
      name: 'personalInfo.firstName',
      hobby: 'hobbies.0.name',
    }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      name: 'Baita',
      hobby: 'reading',
    })
  })
})

describe('getMappedData', () => {
  test('should return data when there is no outputMapping', () => {
    const data = { id: '123' }
    expect(getMappedData(data)).toStrictEqual(data)
  })

  test('should return mapped object when data is object', () => {
    const data = { personalInfo: { name: 'Baita' } }
    const outputMapping = { name: 'personalInfo.name' }
    expect(getMappedData(data, outputMapping)).toStrictEqual({
      name: 'Baita',
    })
  })

  test('should return mapped object when data is object', () => {
    const data = [
      { personalInfo: { firstName: 'Baita' } },
      { personalInfo: { firstName: 'Help' } },
      { otherObject: { otherProperty: '' } },
    ]
    const outputMapping = { name: 'personalInfo.firstName' }
    expect(getMappedData(data, outputMapping)).toStrictEqual([
      {
        name: 'Baita',
      },
      {
        name: 'Help',
      },
      {},
    ])
  })

  test('should return mapped object when data is object', () => {
    const data = {
      personalInfo: { firstName: 'Baita' },
      demographicInfo: { age: 35 },
      geographicIngo: { city: 'Help' },
    }
    const outputMapping = {
      'person.name': 'personalInfo.firstName',
      'person.age': 'demographicInfo.age',
      city: 'geographicIngo.city',
    }
    expect(getMappedData(data, outputMapping)).toStrictEqual({
      person: { name: 'Baita', age: 35 },
      city: 'Help',
    })
  })
})

describe('setObjectDataFromPath', () => {
  test('should return data when there is no inputPath', () => {
    const data = { person: { id: '123' } }
    expect(
      setObjectDataFromPath(data, null as unknown as DataType)
    ).toStrictEqual({
      person: { id: '123' },
    })
  })

  test('should return the updated data with an extra property placed accordingly as specified on inputPath and value', () => {
    const data = { person: { id: '123' } }
    const value = 'Baita'
    const inputPath = 'person.name'
    expect(setObjectDataFromPath(data, value, inputPath)).toStrictEqual({
      person: { id: '123', name: 'Baita' },
    })
  })
})

describe('getOutputVariableString', () => {
  test('should return entire task output data object', () => {
    const outputIndex = 123
    const outputPath = ''

    expect(getOutputVariableString(outputIndex, outputPath)).toBe(
      'task123_outputData'
    )
  })

  test('should return specific task output value including object property and array object', () => {
    const outputIndex = 123
    const outputPath = 'baita.0.help'

    expect(getOutputVariableString(outputIndex, outputPath)).toBe(
      "task123_outputData['baita'][0]['help']"
    )
  })
})

describe('getValueFromInputVariable', () => {
  test('should throw error when it is a test case and there is no sample value', () => {
    const variable = {
      name: 'property',
      label: 'Property',
      type: VariableType.constant,
    }

    expect(() => getValueFromInputVariable(variable, true)).toThrow()
  })

  test('should return sample value when it is a test case', () => {
    const variable = {
      name: 'property',
      label: 'Property',
      type: VariableType.constant,
      sampleValue: 'sampleValue',
    }

    expect(getValueFromInputVariable(variable, true)).toBe('sampleValue')
  })

  test('should throw error when it is an output variable and there is no outputIndex or outputPath', () => {
    const variable1 = {
      name: 'property',
      label: 'Property',
      type: VariableType.output,
      outputIndex: 123,
    }

    expect(() => getValueFromInputVariable(variable1, false)).toThrow()

    const variable2 = {
      name: 'property',
      label: 'Property',
      type: VariableType.output,
      outputPath: 'asd',
    }

    expect(() => getValueFromInputVariable(variable2, false)).toThrow()
  })

  test('should return output variable string when it is a output variable', () => {
    const variable = {
      name: 'property',
      label: 'Property',
      type: VariableType.output,
      outputIndex: 123,
      outputPath: 'asd',
    }

    expect(getValueFromInputVariable(variable, false)).toBe(
      `${OUTPUT_CODE}task123_outputData['asd']${OUTPUT_CODE}`
    )
  })

  test('should return value when it is a output variable', () => {
    Object.values(VariableType)
      .filter((type) => type !== VariableType.output)
      .forEach((type) => {
        const variable = {
          name: 'property',
          label: 'Property',
          required: true,
          value: 'constValue',
          type,
        }

        expect(getValueFromInputVariable(variable, false)).toBe('constValue')
      })
  })
})

describe('getValueFromServiceVariable', () => {
  test('should throw error when there is no value in constant variable', () => {
    const variable = {
      name: 'constProperty',
      label: 'ConstProperty',
      type: VariableType.constant,
    }

    expect(() => getValueFromServiceVariable(variable)).toThrow()
  })

  test('should return value from variable', () => {
    const variable = {
      name: 'constProperty',
      label: 'ConstProperty',
      type: VariableType.constant,
      value: 'constPropertyValue',
    }

    expect(getValueFromServiceVariable(variable)).toBe('constPropertyValue')
  })

  test('should throw error when there is no environment value in environment variable', () => {
    const variable = {
      name: 'envProperty',
      label: 'EnvProperty',
      type: VariableType.environment,
    }

    expect(() => getValueFromServiceVariable(variable)).toThrow()
  })

  test('should return environment value from environment variable', () => {
    process.env.envPropertyName = 'envPropertyValue'
    const variable = {
      name: 'envProperty',
      label: 'EnvProperty',
      type: VariableType.environment,
      value: 'envPropertyName',
    }

    expect(getValueFromServiceVariable(variable)).toBe('envPropertyValue')
  })

  test('should return undefined for all other variable types', () => {
    Object.values(VariableType)
      .filter(
        (type) => type in [VariableType.constant, VariableType.environment]
      )
      .forEach((type) => {
        const variable = {
          name: 'property',
          label: 'Property',
          type,
        }

        expect(getValueFromServiceVariable(variable)).toBeUndefined()
      })
  })
})

describe('getDataFromService', () => {
  test('should throw error if there is no corresponding input variable from required service variable', () => {
    const serviceVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
        required: true,
      },
    ]
    const inputVariables: IVariable[] = []

    expect(() => getDataFromService(serviceVariables, inputVariables)).toThrow()
  })

  test('should throw error if there is no value in corresponding input variable from required service variable', () => {
    const serviceVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
        required: true,
      },
    ]
    const inputVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
      },
    ]

    expect(() => getDataFromService(serviceVariables, inputVariables)).toThrow()
  })

  test('should return value of corresponding input variable from service variable', () => {
    const serviceVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
      },
    ]
    const inputVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
        value: 'textPropertyValue',
      },
    ]

    expect(getDataFromService(serviceVariables, inputVariables)).toStrictEqual({
      textProperty: 'textPropertyValue',
    })
  })

  test('should return sample value of corresponding input variable from service variable', () => {
    const serviceVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
      },
    ]
    const inputVariables = [
      {
        name: 'textProperty',
        label: 'TextProperty',
        type: VariableType.text,
        sampleValue: 'textPropertySampleValue',
      },
    ]

    expect(
      getDataFromService(serviceVariables, inputVariables, true)
    ).toStrictEqual({
      textProperty: 'textPropertySampleValue',
    })
  })

  test('should return constant value of service variable', () => {
    const serviceVariables = [
      {
        name: 'constProperty',
        label: 'ConstProperty',
        type: VariableType.constant,
        value: 'constPropertyValue',
      },
    ]
    const inputVariables: IVariable[] = []

    expect(getDataFromService(serviceVariables, inputVariables)).toStrictEqual({
      constProperty: 'constPropertyValue',
    })
  })

  test('should return environment variable value of service variable', () => {
    process.env.envPropertyName = 'envPropertyValue'
    const serviceVariables = [
      {
        name: 'envProperty',
        label: 'EnvProperty',
        value: 'envPropertyName',
        type: VariableType.environment,
      },
    ]
    const inputVariables: IVariable[] = []

    expect(getDataFromService(serviceVariables, inputVariables)).toStrictEqual({
      envProperty: 'envPropertyValue',
    })
  })

  test('should return value when there is a custom input variable', () => {
    const serviceVariables: IVariable[] = []
    const inputVariables = [
      {
        name: 'customProperty',
        label: 'CustomProperty',
        type: VariableType.constant,
        customFieldId: 123,
        value: 'customValue',
      },
    ]

    expect(getDataFromService(serviceVariables, inputVariables)).toStrictEqual({
      customProperty: 'customValue',
    })
  })

  test('should return sample value when it is a test case and there is a custom input variable', () => {
    const serviceVariables = [
      {
        name: 'method',
        label: 'Method',
        type: VariableType.constant,
        value: 'getTodo',
      },
    ]
    const inputVariables: IVariable[] = []

    expect(
      getDataFromService(serviceVariables, inputVariables, true)
    ).toStrictEqual({
      method: 'getTodo',
    })
  })

  test('should return sample value when it is a test case and there is a custom input variable', () => {
    const serviceVariables: IVariable[] = []
    const inputVariables = [
      {
        name: 'customProperty',
        label: 'CustomProperty',
        type: VariableType.constant,
        customFieldId: 123,
        sampleValue: 'customSampleValue',
      },
    ]

    expect(
      getDataFromService(serviceVariables, inputVariables, true)
    ).toStrictEqual({
      customProperty: 'customSampleValue',
    })
  })

  test('should return all correct values when there are all use case variables', () => {
    process.env.envPropertyName = 'envPropertyValue'
    const serviceVariables = [
      {
        name: 'constProperty',
        label: 'ConstProperty',
        value: 'constPropertyValue',
        type: VariableType.constant,
      },
      {
        name: 'envProperty',
        label: 'EnvProperty',
        value: 'envPropertyName',
        type: VariableType.environment,
      },
      {
        name: 'inputProperty',
        label: 'InputProperty',
        type: VariableType.text,
      },
      {
        name: 'inputRequiredProperty',
        label: 'InputRequiredProperty',
        type: VariableType.text,
        required: true,
      },
    ]
    const inputVariables = [
      {
        name: 'inputRequiredProperty',
        label: 'InputRequiredProperty',
        type: VariableType.text,
        value: 'inputRequiredPropertyValue',
      },
      {
        name: 'inputCustomProperty',
        label: 'InputCustomProperty',
        type: VariableType.text,
        customFieldId: 123,
        value: 'inputCustomPropertyValue',
      },
      {
        name: 'outputCustomProperty',
        label: 'OutputCustomProperty',
        type: VariableType.output,
        customFieldId: 456,
        outputIndex: 789,
        outputPath: 'outputPathValue',
      },
    ]

    expect(getDataFromService(serviceVariables, inputVariables)).toStrictEqual({
      constProperty: 'constPropertyValue',
      envProperty: 'envPropertyValue',
      inputRequiredProperty: 'inputRequiredPropertyValue',
      inputCustomProperty: 'inputCustomPropertyValue',
      outputCustomProperty: `${OUTPUT_CODE}task789_outputData['outputPathValue']${OUTPUT_CODE}`,
    })
  })

  test('should return correct input object regarding a complex real use case', () => {
    process.env.OPENAI_API_AUTHORIZATION = 'Bearer xxx'
    const serviceVariables = [
      {
        name: 'method',
        label: 'Method',
        type: VariableType.constant,
        value: 'post',
        required: true,
      },
      {
        name: 'path',
        label: 'Path',
        type: VariableType.constant,
        value: 'chat/completions',
        required: true,
      },
      {
        name: 'headers.Authorization',
        label: 'Authorization',
        type: VariableType.environment,
        value: 'OPENAI_API_AUTHORIZATION',
        required: true,
      },
      {
        name: 'bodyParams.model',
        label: 'Model',
        type: VariableType.constant,
        value: 'gpt-4o-mini',
        required: true,
      },
      {
        name: 'bodyParams.temperature',
        label: 'Temperature',
        type: VariableType.constant,
        value: 0.9,
      },
      {
        name: 'bodyParams.max_completion_tokens',
        label: 'Max tokens',
        type: VariableType.constant,
        value: 100,
      },
      {
        name: 'bodyParams.messages.0.role',
        label: 'Role of chat message',
        type: VariableType.constant,
        value: 'user',
        required: true,
      },
      {
        name: 'bodyParams.messages.0.content',
        label: 'Content of chat message',
        type: VariableType.output,
        required: true,
      },
    ]

    const inputVariables = [
      {
        outputIndex: 1,
        outputPath: 'title',
        name: 'bodyParams.messages.0.content',
        label: 'title: Plan trip to Italy',
        type: VariableType.output,
        sampleValue: 'Plan trip to Italy',
        value: 'Plan trip to Italy',
        required: true,
      },
    ]

    expect(getDataFromService(serviceVariables, inputVariables)).toStrictEqual({
      bodyParams: {
        max_completion_tokens: 100,
        messages: [
          {
            content: `${OUTPUT_CODE}task1_outputData['title']${OUTPUT_CODE}`,
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
    })
  })
})
