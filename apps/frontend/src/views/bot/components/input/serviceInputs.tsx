import { FC } from 'react'

import { VariableInput } from '@/components'
import { IVariable } from '@baita/shared'

const ServiceInputs: FC<{
  inputData: IVariable[]
  serviceInputFields: IVariable[]
  outputFields: IVariable[]
  onInputFieldChange: (inputField: IVariable) => void
}> = ({ inputData, serviceInputFields, outputFields, onInputFieldChange }) => {
  const getInputDataLabel = (fieldName: string) => {
    return inputData?.find((x: IVariable) => x.name === fieldName)?.label || ''
  }

  const getInputDataValue = (fieldName: string) => {
    const field = inputData?.find((x: IVariable) => x.name === fieldName)
    if (!field?.value) return ''
    if (typeof field.value === 'object') return field.label || ''
    return field.value.toString()
  }

  const getVariable = (serviceField: IVariable): IVariable => {
    const stored = inputData?.find(
      (x: IVariable) => x.name === serviceField.name
    )
    if (!stored) return serviceField
    return {
      ...serviceField,
      value: stored.value,
      sampleValue: stored.sampleValue,
      label: stored.label || serviceField.label,
      outputIndex: stored.outputIndex,
      outputPath: stored.outputPath,
      transform: stored.transform,
    }
  }

  return (
    <>
      {serviceInputFields.map((variable: IVariable) => (
        <VariableInput
          className="mb-3"
          key={variable.name}
          variable={getVariable(variable)}
          label={getInputDataLabel(variable.name)}
          value={getInputDataValue(variable.name)}
          onChange={onInputFieldChange}
          outputFields={outputFields}
        />
      ))}
    </>
  )
}

export default ServiceInputs
