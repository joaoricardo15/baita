// Journey: Bot Automation — variable resolution and output mapping engine
// These utilities power task-to-task data chaining in bot execution.
import { DataType, IVariable, VariableType } from '@baita/shared'

import {
  applyTransformToValue,
  buildTransformExpression,
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

  test('should find element in array by property match', () => {
    const data = {
      payload: {
        headers: [
          { name: 'From', value: 'sender@test.com' },
          { name: 'To', value: 'recipient@test.com' },
          { name: 'Subject', value: 'Hello' },
        ],
      },
    }
    expect(getDataFromPath(data, 'payload.headers[name=From].value')).toBe(
      'sender@test.com'
    )
    expect(getDataFromPath(data, 'payload.headers[name=Subject].value')).toBe(
      'Hello'
    )
  })

  test('should return undefined when array find has no match', () => {
    const data = {
      headers: [{ name: 'From', value: 'test@test.com' }],
    }
    expect(getDataFromPath(data, 'headers[name=Missing].value')).toBeUndefined()
  })

  test('should find in nested array with mimeType', () => {
    const data = {
      payload: {
        parts: [
          { mimeType: 'text/html', body: { data: 'html-content' } },
          { mimeType: 'text/plain', body: { data: 'plain-content' } },
        ],
      },
    }
    expect(
      getDataFromPath(data, 'payload.parts[mimeType=text/plain].body.data')
    ).toBe('plain-content')
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

  test('should apply base64url pipe decode', () => {
    const encoded = Buffer.from('Hello World').toString('base64url')
    const data = { body: { data: encoded } }
    const outputMapping = { content: 'body.data|base64url' }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      content: 'Hello World',
    })
  })

  test('should combine array find with pipe decode', () => {
    const encoded = Buffer.from('Email body text').toString('base64url')
    const data = {
      payload: {
        parts: [
          { mimeType: 'text/html', body: { data: 'html' } },
          { mimeType: 'text/plain', body: { data: encoded } },
        ],
        headers: [{ name: 'Subject', value: 'Test' }],
      },
    }
    const outputMapping = {
      subject: 'payload.headers[name=Subject].value',
      body: 'payload.parts[mimeType=text/plain].body.data|base64url',
    }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      subject: 'Test',
      body: 'Email body text',
    })
  })

  test('email-body pipe: simple message (body in payload.body.data)', () => {
    const encoded = Buffer.from('Simple email body').toString('base64url')
    const data = {
      payload: {
        body: { data: encoded, size: 17 },
        mimeType: 'text/plain',
        headers: [{ name: 'Subject', value: 'Simple' }],
      },
    }
    const outputMapping = { body: 'payload|email-body' }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      body: 'Simple email body',
    })
  })

  test('email-body pipe: multipart (text/plain in top-level parts)', () => {
    const encoded = Buffer.from('Multipart body').toString('base64url')
    const data = {
      payload: {
        body: { size: 0 },
        mimeType: 'multipart/alternative',
        parts: [
          { mimeType: 'text/plain', body: { data: encoded, size: 14 } },
          { mimeType: 'text/html', body: { data: 'aHRtbA', size: 100 } },
        ],
      },
    }
    const outputMapping = { body: 'payload|email-body' }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      body: 'Multipart body',
    })
  })

  test('email-body pipe: nested multipart (text/plain inside multipart/alternative inside multipart/mixed)', () => {
    const encoded = Buffer.from('Nested body content').toString('base64url')
    const data = {
      payload: {
        body: { size: 0 },
        mimeType: 'multipart/mixed',
        parts: [
          {
            mimeType: 'multipart/alternative',
            body: { size: 0 },
            parts: [
              {
                mimeType: 'text/plain',
                body: { data: encoded, size: 19 },
              },
              { mimeType: 'text/html', body: { data: 'aHRtbA', size: 50 } },
            ],
          },
          {
            mimeType: 'application/pdf',
            filename: 'doc.pdf',
            body: { attachmentId: 'abc', size: 5000 },
          },
        ],
      },
    }
    const outputMapping = { body: 'payload|email-body' }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      body: 'Nested body content',
    })
  })

  test('email-body pipe: full output mapping with all fields', () => {
    const encoded = Buffer.from('Full email body here').toString('base64url')
    const data = {
      id: 'msg123',
      snippet: 'Full email...',
      payload: {
        body: { size: 0 },
        mimeType: 'multipart/alternative',
        headers: [
          { name: 'From', value: 'sender@test.com' },
          { name: 'To', value: 'receiver@test.com' },
          { name: 'Subject', value: 'Test Subject' },
          { name: 'Date', value: 'Mon, 10 Jun 2026 10:00:00 +0000' },
        ],
        parts: [
          { mimeType: 'text/plain', body: { data: encoded, size: 20 } },
          { mimeType: 'text/html', body: { data: 'aHRtbA', size: 100 } },
        ],
      },
    }
    const outputMapping = {
      id: 'id',
      snippet: 'snippet',
      from: 'payload.headers[name=From].value',
      to: 'payload.headers[name=To].value',
      subject: 'payload.headers[name=Subject].value',
      date: 'payload.headers[name=Date].value',
      body: 'payload|email-body',
    }
    expect(getDataFromMapping(data, outputMapping)).toStrictEqual({
      id: 'msg123',
      snippet: 'Full email...',
      from: 'sender@test.com',
      to: 'receiver@test.com',
      subject: 'Test Subject',
      date: 'Mon, 10 Jun 2026 10:00:00 +0000',
      body: 'Full email body here',
    })
  })

  test('email-body pipe: HTML fallback when text/plain is empty', () => {
    const emptyPlain = Buffer.from('\r\n').toString('base64url')
    const html = Buffer.from(
      '<html><body><p>Hello from Expedia!</p><p>Book your trip.</p></body></html>'
    ).toString('base64url')
    const data = {
      payload: {
        body: { size: 0 },
        mimeType: 'multipart/alternative',
        parts: [
          { mimeType: 'text/plain', body: { data: emptyPlain, size: 2 } },
          { mimeType: 'text/html', body: { data: html, size: 200 } },
        ],
      },
    }
    const outputMapping = { body: 'payload|email-body' }
    const result = getDataFromMapping(data, outputMapping) as {
      body: string
    }
    expect(result.body).toContain('Hello from Expedia!')
    expect(result.body).toContain('Book your trip.')
    expect(result.body).not.toContain('<p>')
  })

  test('email-body pipe: strips style/script tags from HTML', () => {
    const html = Buffer.from(
      '<html><head><style>body{color:red}</style></head><body><script>alert("x")</script><p>Real content</p></body></html>'
    ).toString('base64url')
    const data = {
      payload: {
        body: { size: 0 },
        mimeType: 'multipart/alternative',
        parts: [{ mimeType: 'text/html', body: { data: html, size: 200 } }],
      },
    }
    const outputMapping = { body: 'payload|email-body' }
    const result = getDataFromMapping(data, outputMapping) as {
      body: string
    }
    expect(result.body).toBe('Real content')
    expect(result.body).not.toContain('color:red')
    expect(result.body).not.toContain('alert')
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

  test('should throw error when output variable has incomplete reference (one of outputIndex/outputPath missing)', () => {
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

  test('should return literal value when output variable has neither outputIndex nor outputPath', () => {
    const variable = {
      name: 'property',
      label: 'Property',
      type: VariableType.output,
      value: 'custom text value',
    }

    expect(getValueFromInputVariable(variable, false)).toBe('custom text value')
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
  afterEach(() => {
    delete process.env.envPropertyName
    delete process.env.NEWS_API_KEY
  })

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
  afterEach(() => {
    delete process.env.envPropertyName
    delete process.env.NEWS_API_KEY
  })

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
    process.env.NEWS_API_KEY = 'test-api-key'
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
        value: 'NEWS_API_KEY',
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
        Authorization: 'test-api-key',
      },
      method: 'post',
      path: 'chat/completions',
    })
  })
})

describe('buildTransformExpression', () => {
  test('first returns [0]', () => {
    expect(buildTransformExpression({ operation: 'first' })).toBe('[0]')
  })

  test('last returns .slice(-1)[0]', () => {
    expect(buildTransformExpression({ operation: 'last' })).toBe(
      '.slice(-1)[0]'
    )
  })

  test('at returns [index]', () => {
    expect(buildTransformExpression({ operation: 'at', index: 3 })).toBe('[3]')
  })

  test('count returns .length', () => {
    expect(buildTransformExpression({ operation: 'count' })).toBe('.length')
  })

  test('pluck returns .map expression', () => {
    expect(
      buildTransformExpression({ operation: 'pluck', property: 'title' })
    ).toBe(".map(item => item['title'])")
  })

  test('filter with equals', () => {
    expect(
      buildTransformExpression({
        operation: 'filter',
        property: 'status',
        operator: 'equals',
        value: 'active',
      })
    ).toBe(".filter(item => item['status'] === 'active')")
  })

  test('filter with contains', () => {
    expect(
      buildTransformExpression({
        operation: 'filter',
        property: 'name',
        operator: 'contains',
        value: 'John',
      })
    ).toBe(".filter(item => String(item['name']).includes('John'))")
  })

  test('join returns .join expression', () => {
    expect(buildTransformExpression({ operation: 'join', value: ' | ' })).toBe(
      ".join(' | ')"
    )
  })

  test('sort ascending', () => {
    expect(
      buildTransformExpression({
        operation: 'sort',
        property: 'date',
        direction: 'asc',
      })
    ).toBe(".sort((a, b) => a['date'] > b['date'] ? 1 : -1)")
  })

  test('escapes single quotes in values', () => {
    expect(
      buildTransformExpression({
        operation: 'filter',
        property: 'name',
        operator: 'equals',
        value: "O'Brien",
      })
    ).toBe(".filter(item => item['name'] === 'O\\'Brien')")
  })
})

describe('applyTransformToValue', () => {
  const items = [
    { name: 'Alice', age: 30, active: true },
    { name: 'Bob', age: 25, active: false },
    { name: 'Charlie', age: 35, active: true },
  ]

  test('first returns first item', () => {
    expect(applyTransformToValue(items, { operation: 'first' })).toEqual(
      items[0]
    )
  })

  test('last returns last item', () => {
    expect(applyTransformToValue(items, { operation: 'last' })).toEqual(
      items[2]
    )
  })

  test('count returns array length', () => {
    expect(applyTransformToValue(items, { operation: 'count' })).toBe(3)
  })

  test('pluck extracts property', () => {
    expect(
      applyTransformToValue(items, { operation: 'pluck', property: 'name' })
    ).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  test('filter equals', () => {
    expect(
      applyTransformToValue(items, {
        operation: 'filter',
        property: 'active',
        operator: 'equals',
        value: 'true',
      })
    ).toEqual([items[0], items[2]])
  })

  test('join concatenates array', () => {
    expect(
      applyTransformToValue(['a', 'b', 'c'], {
        operation: 'join',
        value: '-',
      })
    ).toBe('a-b-c')
  })
})

describe('getValueFromInputVariable with transform', () => {
  test('appends transform to output reference in code gen', () => {
    const variable: IVariable = {
      name: 'articles',
      label: 'Articles',
      type: VariableType.output,
      outputIndex: 0,
      outputPath: 'articles',
      transform: { operation: 'first' },
    }

    expect(getValueFromInputVariable(variable, false)).toBe(
      `${OUTPUT_CODE}task0_outputData['articles'][0]${OUTPUT_CODE}`
    )
  })

  test('applies transform to sampleValue in test mode', () => {
    const variable: IVariable = {
      name: 'articles',
      label: 'Articles',
      type: VariableType.output,
      outputIndex: 0,
      outputPath: 'articles',
      sampleValue: [{ title: 'A' }, { title: 'B' }],
      transform: { operation: 'pluck', property: 'title' },
    }

    expect(getValueFromInputVariable(variable, true)).toEqual(['A', 'B'])
  })
})
