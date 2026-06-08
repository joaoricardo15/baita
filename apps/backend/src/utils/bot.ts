import { DataType, ITransform, IVariable, VariableType } from '@baita/shared'

export const OUTPUT_CODE = '###baita.help###'

export function getDataFromPath(
  data: DataType,
  outputPath?: string
): DataType | undefined {
  if (!outputPath) {
    return data
  }

  const paths = outputPath.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = data

  for (let i = 0; i < paths.length; i++) {
    const key = isNaN(Number(paths[i])) ? paths[i] : Number(paths[i])

    if (
      !current ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, key)
    ) {
      return undefined
    }

    current = current[key]
  }

  return current
}

export function getDataFromMapping(
  data: DataType,
  outputMapping: Record<string, string>
): Record<string, DataType> {
  let mappedData: Record<string, DataType> = {}
  const outputKeys = Object.keys(outputMapping)

  for (let i = 0; i < outputKeys.length; i++) {
    const outputKey = outputKeys[i]
    const mappingValue = outputMapping[outputKey]
    const outputValue = mappingValue.startsWith('###')
      ? mappingValue.slice(3)
      : getDataFromPath(data, mappingValue)
    if (outputValue !== undefined) {
      mappedData = setObjectDataFromPath(
        mappedData,
        outputValue,
        outputKey
      ) as Record<string, DataType>
    }
  }

  return mappedData
}

export function getMappedData(
  data: DataType,
  outputMapping?: Record<string, string>
): DataType {
  if (!outputMapping) return data

  return Array.isArray(data)
    ? data
        .map((item) => getDataFromMapping(item, outputMapping))
        .filter((item) => item)
    : getDataFromMapping(data, outputMapping)
}

export function setObjectDataFromPath(
  data: object,
  value: DataType,
  inputPath?: string
): object {
  if (!inputPath) {
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentData: any = data
  const paths = inputPath.split('.')

  for (let i = 0; i < paths.length; i++) {
    const key = paths[i]

    if (i === paths.length - 1) {
      currentData[key] = value
    } else if (!(key in currentData)) {
      const nextIntKey = Number(paths[i + 1])
      if (isNaN(nextIntKey)) {
        currentData[key] = {}
      } else {
        currentData[key] = []
      }
    }

    currentData = currentData[key]
  }

  return data
}

export function getOutputVariableString(index: number, path: string): string {
  return `task${index}_outputData${path
    .split('.')
    .map((x) => x && (!isNaN(Number(x)) ? `[${x}]` : `['${x}']`))
    .join('')}`
}

const escapeString = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const operatorToJs = (op?: string): string => {
  switch (op) {
    case 'equals':
      return '==='
    case 'notEquals':
      return '!=='
    case 'greaterThan':
      return '>'
    case 'lessThan':
      return '<'
    default:
      return '==='
  }
}

export function buildTransformExpression(transform: ITransform): string {
  const { operation, index, property, operator, value, direction } = transform
  const prop = property ? escapeString(property) : ''
  const val = value ? escapeString(value) : ''

  switch (operation) {
    case 'first':
      return '[0]'
    case 'last':
      return '.slice(-1)[0]'
    case 'at':
      return `[${index ?? 0}]`
    case 'count':
      return '.length'
    case 'pluck':
      return `.map(item => item['${prop}'])`
    case 'filter':
      if (operator === 'contains')
        return `.filter(item => String(item['${prop}']).includes('${val}'))`
      if (operator === 'exists')
        return `.filter(item => item['${prop}'] !== undefined && item['${prop}'] !== null)`
      if (operator === 'notExists')
        return `.filter(item => item['${prop}'] === undefined || item['${prop}'] === null)`
      return `.filter(item => item['${prop}'] ${operatorToJs(operator)} '${val}')`
    case 'join':
      return `.join('${val || ', '}')`
    case 'sort': {
      const dir = direction === 'desc' ? -1 : 1
      return `.sort((a, b) => a['${prop}'] > b['${prop}'] ? ${dir} : ${-dir})`
    }
    default:
      return ''
  }
}

export function applyTransformToValue(
  data: DataType,
  transform: ITransform
): DataType {
  if (!data || !transform) return data
  const { operation, index, property, operator, value, direction } = transform

  switch (operation) {
    case 'first':
      return Array.isArray(data) ? data[0] : data
    case 'last':
      return Array.isArray(data) ? data[data.length - 1] : data
    case 'at':
      return Array.isArray(data) ? data[index ?? 0] : data
    case 'count':
      return Array.isArray(data) ? data.length : 0
    case 'pluck':
      return Array.isArray(data)
        ? data.map((item: any) => item?.[property!])
        : data
    case 'filter':
      if (!Array.isArray(data)) return data
      return data.filter((item: any) => {
        const itemVal = item?.[property!]
        switch (operator) {
          case 'equals':
            return String(itemVal ?? '') === value
          case 'notEquals':
            return String(itemVal ?? '') !== value
          case 'contains':
            return String(itemVal ?? '').includes(value || '')
          case 'greaterThan':
            return String(itemVal ?? '') > (value || '')
          case 'lessThan':
            return String(itemVal ?? '') < (value || '')
          case 'exists':
            return itemVal !== undefined && itemVal !== null
          case 'notExists':
            return itemVal === undefined || itemVal === null
          default:
            return true
        }
      })
    case 'join':
      return Array.isArray(data) ? data.join(value || ', ') : data
    case 'sort': {
      if (!Array.isArray(data)) return data
      const dir = direction === 'desc' ? -1 : 1
      return [...data].sort((a: any, b: any) =>
        a?.[property!] > b?.[property!] ? dir : -dir
      )
    }
    default:
      return data
  }
}

export function getValueFromInputVariable(
  variable: IVariable,
  testData?: boolean
): DataType | undefined {
  const { label, value, sampleValue, type, outputIndex, outputPath } = variable

  if (testData) {
    const testValue = sampleValue ?? value
    if (testValue === undefined) {
      throw Error(`Variable '${label}' has no sample value`)
    }

    if (variable.transform)
      return applyTransformToValue(testValue, variable.transform)
    return testValue
  }

  if (type === VariableType.output) {
    if (outputIndex === undefined && outputPath === undefined) {
      return value
    }
    if (outputIndex === undefined || outputPath === undefined) {
      throw Error(`Variable '${label}' has incomplete output reference`)
    }

    let ref = getOutputVariableString(outputIndex, outputPath)
    if (variable.transform) {
      ref += buildTransformExpression(variable.transform)
    }
    return OUTPUT_CODE + ref + OUTPUT_CODE
  }

  return value
}

export function getValueFromServiceVariable(
  variable: IVariable
): DataType | undefined {
  const { label, value, type } = variable

  if (type === VariableType.constant) {
    if (value === undefined) {
      throw Error(`Constant variable '${label}' has no value`)
    }

    return value
  }

  if (type === VariableType.environment) {
    if (process.env[value as string] === undefined) {
      throw Error(`Environment variable '${label}' does not exist`)
    }

    return process.env[value as string]
  }

  return undefined
}

export function getDataFromService(
  serviceFields: IVariable[],
  inputData: IVariable[],
  testData?: boolean
): DataType {
  let data: object = {}

  for (let j = 0; j < serviceFields.length; j++) {
    const serviceVariable = serviceFields[j]
    const serviceVariableValue = getValueFromServiceVariable(serviceVariable)

    if (serviceVariableValue === undefined) {
      let inputVariable = inputData.find((x) => x.name === serviceVariable.name)

      if (inputVariable === undefined && serviceVariable.name === 'token') {
        inputVariable = inputData.find((x) => x.name === 'pushSubscription')
      }

      if (inputVariable === undefined) {
        if (serviceVariable.required) {
          throw Error(
            `Required input field '${serviceVariable.label}' is missing`
          )
        }
      } else {
        const inputVariableValue = getValueFromInputVariable(
          inputVariable,
          testData
        )

        if (inputVariableValue === undefined) {
          if (serviceVariable.required) {
            throw Error(
              `Required input field '${serviceVariable.label}' has no value`
            )
          }
        } else {
          data = setObjectDataFromPath(
            data,
            inputVariableValue,
            serviceVariable.name
          )
        }
      }
    } else {
      data = setObjectDataFromPath(
        data,
        serviceVariableValue,
        serviceVariable.name
      )
    }
  }

  for (let i = 0; i < inputData.length; i++) {
    const inputDataField = inputData[i]

    if (inputDataField.customFieldId) {
      const inputDataVariableValue = getValueFromInputVariable(
        inputDataField,
        testData
      )

      if (inputDataVariableValue !== undefined) {
        data = setObjectDataFromPath(
          data,
          inputDataVariableValue,
          inputDataField.name
        )
      }
    }
  }

  return data
}
