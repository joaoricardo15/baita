import {
  ConditionOperator,
  DataType,
  ITaskCondition,
  IVariable,
} from '@baita/shared'

import { resolveVariable } from './resolver'

export function evaluateConditions(
  conditions: ITaskCondition[][] | undefined,
  taskOutputs: (DataType | null)[]
): boolean {
  if (!conditions || conditions.length === 0) return true

  return conditions.some((andGroup) =>
    andGroup.every((condition) => evaluateCondition(condition, taskOutputs))
  )
}

function evaluateCondition(
  condition: ITaskCondition,
  taskOutputs: (DataType | null)[]
): boolean {
  const operandValue = resolveVariable(
    condition.operand as IVariable,
    taskOutputs
  )

  const comparisonValue = condition.comparisonOperand
    ? resolveVariable(condition.comparisonOperand as IVariable, taskOutputs)
    : undefined

  const left = String(operandValue ?? '')
  const right = String(comparisonValue ?? '')

  switch (condition.operator) {
    case ConditionOperator.equals:
      return left === right
    case ConditionOperator.notEquals:
      return left !== right
    case ConditionOperator.exists:
      return operandValue !== undefined && operandValue !== null && left !== ''
    case ConditionOperator.doesNotExist:
      return operandValue === undefined || operandValue === null || left === ''
    case ConditionOperator.contains:
      return left.includes(right)
    case ConditionOperator.startsWith:
      return left.startsWith(right)
    case ConditionOperator.endsWith:
      return left.endsWith(right)
    default:
      return false
  }
}
