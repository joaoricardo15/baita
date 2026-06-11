// Journey: Bot Automation — variable resolution and output mapping engine
// These utilities power task-to-task data chaining in bot execution.
import { DataType, VariableType } from '@baita/shared'

import {
  applyTransformToValue,
  getDataFromMapping,
  getDataFromPath,
  getMappedData,
  getValueFromServiceVariable,
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
