import { ConditionOperator, ITaskCondition, VariableType } from '@baita/shared'

import { evaluateConditions } from '../conditions'

describe('evaluateConditions', () => {
  const taskOutputs = [{ status: 'active', count: 5, name: 'Alice' }]

  it('returns true when no conditions defined', () => {
    expect(evaluateConditions(undefined, taskOutputs)).toBe(true)
    expect(evaluateConditions([], taskOutputs)).toBe(true)
  })

  it('evaluates equals condition', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.equals,
          operand: {
            type: VariableType.output,
            name: 'status',
            label: 'Status',
            outputIndex: 0,
            outputPath: 'status',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'val',
            label: 'Value',
            value: 'active',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('evaluates notEquals condition', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.notEquals,
          operand: {
            type: VariableType.output,
            name: 'status',
            label: 'Status',
            outputIndex: 0,
            outputPath: 'status',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'val',
            label: 'Value',
            value: 'inactive',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('evaluates exists condition', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.exists,
          operand: {
            type: VariableType.output,
            name: 'name',
            label: 'Name',
            outputIndex: 0,
            outputPath: 'name',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('evaluates doesNotExist condition', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.doesNotExist,
          operand: {
            type: VariableType.output,
            name: 'missing',
            label: 'Missing',
            outputIndex: 0,
            outputPath: 'nonexistent',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('evaluates contains condition', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.contains,
          operand: {
            type: VariableType.output,
            name: 'name',
            label: 'Name',
            outputIndex: 0,
            outputPath: 'name',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'val',
            label: 'Value',
            value: 'lic',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('evaluates startsWith condition', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.startsWith,
          operand: {
            type: VariableType.output,
            name: 'name',
            label: 'Name',
            outputIndex: 0,
            outputPath: 'name',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'val',
            label: 'Value',
            value: 'Ali',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('handles OR groups (any group passing = true)', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.equals,
          operand: {
            type: VariableType.output,
            name: 's',
            label: 'S',
            outputIndex: 0,
            outputPath: 'status',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'v',
            label: 'V',
            value: 'wrong',
          },
        },
      ],
      [
        {
          operator: ConditionOperator.equals,
          operand: {
            type: VariableType.output,
            name: 's',
            label: 'S',
            outputIndex: 0,
            outputPath: 'status',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'v',
            label: 'V',
            value: 'active',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('handles AND within a group (all must pass)', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.equals,
          operand: {
            type: VariableType.output,
            name: 's',
            label: 'S',
            outputIndex: 0,
            outputPath: 'status',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'v',
            label: 'V',
            value: 'active',
          },
        },
        {
          operator: ConditionOperator.exists,
          operand: {
            type: VariableType.output,
            name: 'n',
            label: 'N',
            outputIndex: 0,
            outputPath: 'name',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(true)
  })

  it('returns false when no OR group passes', () => {
    const conditions: ITaskCondition[][] = [
      [
        {
          operator: ConditionOperator.equals,
          operand: {
            type: VariableType.output,
            name: 's',
            label: 'S',
            outputIndex: 0,
            outputPath: 'status',
          },
          comparisonOperand: {
            type: VariableType.text,
            name: 'v',
            label: 'V',
            value: 'wrong',
          },
        },
      ],
    ]

    expect(evaluateConditions(conditions, taskOutputs)).toBe(false)
  })
})
