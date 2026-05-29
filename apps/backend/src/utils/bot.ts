import { DataType, IVariable, VariableType } from 'src/models/service/interface'

export const OUTPUT_CODE = '###baita.help###'

export const getDataFromPath = (
  data: DataType,
  outputPath?: string
): DataType | undefined => {
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

export const getDataFromMapping = (
  data: DataType,
  outputMapping: Record<string, string>
): Record<string, DataType> => {
  let mappedData: Record<string, DataType> = {}
  const outputKeys = Object.keys(outputMapping)

  for (let i = 0; i < outputKeys.length; i++) {
    const outputKey = outputKeys[i]
    const outputValue = getDataFromPath(data, outputMapping[outputKey])
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

export const getMappedData = (
  data: DataType,
  outputMapping?: Record<string, string>
): DataType => {
  if (!outputMapping) return data

  return Array.isArray(data)
    ? data
        .map((item) => getDataFromMapping(item, outputMapping))
        .filter((item) => item)
    : getDataFromMapping(data, outputMapping)
}

export const setObjectDataFromPath = (
  data: object,
  value: DataType,
  inputPath?: string
): object => {
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

export const getOutputVariableString = (
  index: number,
  path: string
): string => {
  return `task${index}_outputData${path
    .split('.')
    .map((x) => x && (!isNaN(Number(x)) ? `[${x}]` : `['${x}']`))
    .join('')}`
}

export const getOutputVariableStringById = (
  taskId: number,
  path: string,
  tasks: { taskId: number }[]
): string => {
  const index = tasks.findIndex((t) => t.taskId === taskId)
  if (index === -1) return `undefined`
  return getOutputVariableString(index, path)
}

export const getValueFromInputVariable = (
  variable: IVariable,
  testData?: boolean
): DataType | undefined => {
  const { label, value, sampleValue, type, outputIndex, outputPath } = variable

  if (testData) {
    if (sampleValue === undefined) {
      throw Error(`Variable '${label}' has no sample value`)
    }

    return sampleValue
  }

  if (type === VariableType.output) {
    if (outputIndex === undefined || outputPath === undefined) {
      throw Error(`Variable '${label}' has no outputIndex or outputPath`)
    }

    return (
      OUTPUT_CODE +
      getOutputVariableString(outputIndex, outputPath) +
      OUTPUT_CODE
    )
  }

  return value
}

export const getValueFromServiceVariable = (
  variable: IVariable
): DataType | undefined => {
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

export const getDataFromService = (
  serviceFields: IVariable[],
  inputData: IVariable[],
  testData?: boolean
): DataType => {
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
