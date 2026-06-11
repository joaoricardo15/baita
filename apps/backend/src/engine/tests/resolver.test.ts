import { IVariable, VariableType } from '@baita/shared'

import { resolveTaskInputs, resolveVariable } from '../resolver'

describe('resolveVariable', () => {
  const taskOutputs = [
    { user: { name: 'Alice', items: ['a', 'b', 'c'] } },
    { result: 'success', count: 42 },
  ]

  it('resolves output variable with path', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'userName',
      label: 'User Name',
      outputIndex: 0,
      outputPath: 'user.name',
    }
    expect(resolveVariable(variable, taskOutputs)).toBe('Alice')
  })

  it('resolves output variable with nested path', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'count',
      label: 'Count',
      outputIndex: 1,
      outputPath: 'count',
    }
    expect(resolveVariable(variable, taskOutputs)).toBe(42)
  })

  it('returns undefined for out-of-bounds outputIndex', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'data',
      label: 'Data',
      outputIndex: 5,
      outputPath: 'value',
    }
    expect(resolveVariable(variable, taskOutputs)).toBeUndefined()
  })

  it('returns undefined for non-existent path', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'missing',
      label: 'Missing',
      outputIndex: 0,
      outputPath: 'nonexistent.path',
    }
    expect(resolveVariable(variable, taskOutputs)).toBeUndefined()
  })

  it('falls back to value when outputIndex/outputPath are undefined', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'fallback',
      label: 'Fallback',
      value: 'static-value',
    }
    expect(resolveVariable(variable, taskOutputs)).toBe('static-value')
  })

  it('resolves constant variable', () => {
    const variable: IVariable = {
      type: VariableType.constant,
      name: 'key',
      label: 'Key',
      value: 'my-api-key',
    }
    expect(resolveVariable(variable, [])).toBe('my-api-key')
  })

  it('resolves environment variable', () => {
    process.env.TEST_VAR = 'env-value'
    const variable: IVariable = {
      type: VariableType.environment,
      name: 'env',
      label: 'Env',
      value: 'TEST_VAR',
    }
    expect(resolveVariable(variable, [])).toBe('env-value')
    delete process.env.TEST_VAR
  })

  it('resolves text variable from value', () => {
    const variable: IVariable = {
      type: VariableType.text,
      name: 'msg',
      label: 'Message',
      value: 'hello world',
    }
    expect(resolveVariable(variable, [])).toBe('hello world')
  })

  it('applies transform to output variable', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'firstItem',
      label: 'First Item',
      outputIndex: 0,
      outputPath: 'user.items',
      transform: { operation: 'first' },
    }
    expect(resolveVariable(variable, taskOutputs)).toBe('a')
  })

  it('handles null task output gracefully', () => {
    const variable: IVariable = {
      type: VariableType.output,
      name: 'data',
      label: 'Data',
      outputIndex: 0,
      outputPath: 'value',
    }
    expect(resolveVariable(variable, [null as never])).toBeUndefined()
  })
})

describe('resolveTaskInputs', () => {
  const taskOutputs = [{ email: 'alice@example.com', name: 'Alice' }]

  it('resolves service fields from input data', () => {
    const serviceFields: IVariable[] = [
      { type: VariableType.text, name: 'to', label: 'To', required: true },
    ]
    const inputData: IVariable[] = [
      {
        type: VariableType.output,
        name: 'to',
        label: 'To',
        outputIndex: 0,
        outputPath: 'email',
      },
    ]

    const result = resolveTaskInputs(serviceFields, inputData, taskOutputs)
    expect(result).toEqual({ to: 'alice@example.com' })
  })

  it('resolves constant service fields directly', () => {
    const serviceFields: IVariable[] = [
      {
        type: VariableType.constant,
        name: 'apiKey',
        label: 'API Key',
        value: 'key-123',
      },
    ]

    const result = resolveTaskInputs(serviceFields, [], taskOutputs)
    expect(result).toEqual({ apiKey: 'key-123' })
  })

  it('throws for missing required field', () => {
    const serviceFields: IVariable[] = [
      {
        type: VariableType.text,
        name: 'to',
        label: 'Recipient',
        required: true,
      },
    ]

    expect(() => resolveTaskInputs(serviceFields, [], taskOutputs)).toThrow(
      "Required input field 'Recipient' is missing"
    )
  })

  it('skips optional fields when not provided', () => {
    const serviceFields: IVariable[] = [
      { type: VariableType.text, name: 'cc', label: 'CC' },
    ]

    const result = resolveTaskInputs(serviceFields, [], taskOutputs)
    expect(result).toEqual({})
  })

  it('includes custom fields from inputData', () => {
    const serviceFields: IVariable[] = []
    const inputData: IVariable[] = [
      {
        type: VariableType.text,
        name: 'customHeader',
        label: 'Custom Header',
        value: 'X-Custom',
        customFieldId: 1,
      },
    ]

    const result = resolveTaskInputs(serviceFields, inputData, taskOutputs)
    expect(result).toEqual({ customHeader: 'X-Custom' })
  })
})
