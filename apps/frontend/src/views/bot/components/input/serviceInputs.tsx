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
    return (
      inputData
        ?.find((x: IVariable) => x.name === fieldName)
        ?.value?.toString() || ''
    )
  }

  return (
    <>
      {serviceInputFields.map((variable: IVariable) => (
        <VariableInput
          className="mb-3"
          key={variable.name}
          variable={variable}
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
