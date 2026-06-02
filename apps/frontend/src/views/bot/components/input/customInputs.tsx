import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { FC } from 'react'

import { Button, TextInput, VariableInput } from '@/components'
import { IVariable, VariableType } from '@baita/shared'
import { getLabels, Labels } from '@/utils/labels'

const CustomInputs: FC<{
  customInputFields: IVariable[]
  outputFields: IVariable[]
  onInputFieldChange: (customFieldId: number, inputField: IVariable) => void
  onDeleteInputField: (customFieldId: number) => void
  onAddInputField: (inputField: IVariable) => void
}> = ({
  customInputFields,
  outputFields,
  onInputFieldChange,
  onDeleteInputField,
  onAddInputField,
}) => {
  const addCustomVariable = () =>
    onAddInputField({
      name: '',
      value: '',
      label: 'Value',
      sampleValue: '',
      type: VariableType.output,
      customFieldId: Date.now(),
    })

  const deleteCustomVariable = (customFieldId: number) =>
    onDeleteInputField(customFieldId)

  const onInputFieldNameChange = (field: IVariable, result: string) =>
    onInputFieldChange(field.customFieldId as number, {
      ...field,
      name: result || '',
    })

  return (
    <>
      <Button
        color={'primary'}
        icon={<AddIcon />}
        onClick={() => addCustomVariable()}
      >
        {labels.addVariable}
      </Button>
      {customInputFields
        .map((variable: IVariable, fieldIndex: number) => (
          <div key={fieldIndex} className="d-flex my-3">
            <Button
              iconButton
              icon={<DeleteIcon />}
              onClick={() =>
                deleteCustomVariable(variable.customFieldId as number)
              }
            />
            <TextInput
              className="mx-2"
              variant="standard"
              value={variable.name}
              label={labels.fieldName}
              onChange={(result) => onInputFieldNameChange(variable, result)}
            />
            <VariableInput
              className="flex-grow-1"
              variable={variable}
              label={labels.fieldValue}
              value={(variable.value || '') as string}
              onChange={(variable) => {
                onInputFieldChange(variable.customFieldId as number, variable)
              }}
              outputFields={outputFields}
            />
          </div>
        ))
        .reverse()}
    </>
  )
}

export default CustomInputs

const LABELS: Labels = {
  en: {
    addVariable: 'Add variable',
    fieldName: 'Name',
    fieldValue: 'Value',
  },
  pt: {
    addVariable: 'Adicionar variável',
    fieldName: 'Nome',
    fieldValue: 'Valor',
  },
}

const labels = getLabels(LABELS)
