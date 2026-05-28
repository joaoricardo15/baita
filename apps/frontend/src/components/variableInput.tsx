import { FC } from 'react'

import { IVariable, VariableType } from '../models/service'
import { CheckBox, CodeInput, OptionsInput, Text, TextInput } from '.'
import { ComponentProps } from '.'

const VariableInput: FC<
  {
    label: string
    value: string
    variable: IVariable
    onChange: (variable: IVariable) => void
    onBlur?: () => void
    outputFields?: IVariable[]
  } & ComponentProps
> = ({
  label,
  value,
  variable,
  onChange,
  onBlur,
  outputFields,
  className,
  style,
}) => {
  const onOutputChange = (field: IVariable, result?: IVariable) => {
    onChange({
      ...field,
      value: result?.value || '',
      label: result?.label || '',
      sampleValue: result?.value || '',
      outputIndex: result?.outputIndex,
      outputPath: result?.outputPath,
    })
  }

  const onOptionChange = (
    field: IVariable,
    result?: {
      label: string
      value: string
    }
  ) => {
    onChange({
      ...field,
      options: undefined,
      value: result?.value || '',
      label: result?.label || '',
      sampleValue: result?.value || '',
    })
  }

  const onTextChange = (field: IVariable, result: string) => {
    onChange({
      ...field,
      value: result,
      sampleValue: result,
    })
  }

  const onCodeChange = (field: IVariable, result: string) => {
    onChange({
      ...field,
      value: result,
      sampleValue: result,
    })
  }

  const onBooleanChange = (field: IVariable, result: boolean) => {
    onChange({
      ...field,
      value: result,
      sampleValue: result,
    })
  }

  const getLabel = (label: string) => (variable.required ? `${label} *` : label)

  return (
    <div className={className} style={style}>
      {variable.description && (
        <Text
          className="mb-4"
          color="secondary"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {variable.description}
        </Text>
      )}
      {variable.type === VariableType.output && outputFields ? (
        <OptionsInput
          value={value}
          label={getLabel(variable.label)}
          optionLabelPath="label"
          groupLabelPath="groupName"
          onChange={(result) => onOutputChange(variable, result)}
          onBlur={onBlur}
          options={outputFields}
        />
      ) : variable.type === VariableType.options ? (
        <OptionsInput
          label={getLabel(variable.label)}
          optionLabelPath="label"
          groupLabelPath="groupName"
          value={label}
          onChange={(result) => onOptionChange(variable, result)}
          onBlur={onBlur}
          options={variable.options}
        />
      ) : variable.type === VariableType.text ? (
        <TextInput
          value={value}
          variant="outlined"
          onBlur={onBlur}
          label={getLabel(variable.label)}
          onChange={(result) => onTextChange(variable, result)}
        />
      ) : variable.type === VariableType.code ? (
        <CodeInput
          label={getLabel(variable.label)}
          value={(value || variable.value || '') as string}
          onChange={(result) => onCodeChange(variable, result)}
          onBlur={onBlur}
        />
      ) : variable.type === VariableType.boolean ? (
        <CheckBox
          label={getLabel(variable.label)}
          checked={value === 'true'}
          onChange={(checked) => onBooleanChange(variable, checked)}
          onBlur={onBlur}
        />
      ) : (
        <></>
      )}
    </div>
  )
}

export default VariableInput
