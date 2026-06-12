import { DataType, ITransform, IVariable, VariableType } from '@baita/shared'

import {
  applyTransformToValue,
  getDataFromPath,
  setObjectDataFromPath,
} from './data'

export function resolveVariable(
  variable: IVariable,
  taskOutputs: (DataType | null)[]
): DataType | undefined {
  const { type, value, outputIndex, outputPath, transform } = variable

  if (type === VariableType.output) {
    if (outputIndex === undefined || outputPath === undefined) {
      return variable.sampleValue ?? value
    }

    const stepOutput = taskOutputs[outputIndex]
    if (stepOutput === undefined || stepOutput === null) {
      return undefined
    }

    const resolved = getDataFromPath(stepOutput, outputPath)
    if (resolved === undefined) return undefined

    return transform
      ? applyTransformToValue(resolved, transform as ITransform)
      : resolved
  }

  if (type === VariableType.constant) {
    return value
  }

  if (type === VariableType.environment) {
    return process.env[value as string]
  }

  return value
}

export function resolveTaskInputs(
  serviceFields: IVariable[],
  inputData: IVariable[],
  taskOutputs: (DataType | null)[]
): DataType {
  let data: object = {}

  for (const serviceField of serviceFields) {
    const { type, name, required } = serviceField

    if (type === VariableType.constant) {
      if (serviceField.value !== undefined) {
        data = setObjectDataFromPath(data, serviceField.value, name)
      }
      continue
    }

    if (type === VariableType.environment) {
      const envValue = process.env[serviceField.value as string]
      if (envValue !== undefined) {
        data = setObjectDataFromPath(data, envValue, name)
      }
      continue
    }

    let inputVariable = inputData.find((x) => x.name === name)
    if (inputVariable === undefined && name === 'token') {
      inputVariable = inputData.find((x) => x.name === 'pushSubscription')
    }

    if (inputVariable === undefined) {
      if (required) {
        throw new Error(
          `Required input field '${serviceField.label}' is missing`
        )
      }
      continue
    }

    const resolved = resolveVariable(inputVariable, taskOutputs)
    if (resolved === undefined) {
      if (required) {
        throw new Error(
          `Required input field '${serviceField.label}' has no value`
        )
      }
      continue
    }

    data = setObjectDataFromPath(data, resolved, name)
  }

  for (const field of inputData) {
    if (field.customFieldId) {
      const resolved = resolveVariable(field, taskOutputs)
      if (resolved !== undefined) {
        data = setObjectDataFromPath(data, resolved, field.name)
      }
    }
  }

  return data
}
