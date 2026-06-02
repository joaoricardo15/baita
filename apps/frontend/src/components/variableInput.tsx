import { IVariable, VariableType } from '@baita/shared'
import {
  AccountTree as AccountTreeIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { FC, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'

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
  const hasOutputOptions = !!outputFields?.length
  const [isManualMode, setIsManualMode] = useState(
    hasOutputOptions &&
      variable.type === VariableType.output &&
      variable.outputIndex === undefined &&
      !!variable.value
  )

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

  const switchToManualMode = () => {
    setIsManualMode(true)
    onChange({
      ...variable,
      outputIndex: undefined,
      outputPath: undefined,
      value: '',
      label: '',
      sampleValue: '',
    })
  }

  const switchToReferenceMode = () => {
    setIsManualMode(false)
    onChange({
      ...variable,
      outputIndex: undefined,
      outputPath: undefined,
      value: '',
      label: '',
      sampleValue: '',
    })
  }

  const getLabel = (label: string) => (variable.required ? `${label} *` : label)

  const renderToggleButton = () => (
    <Tooltip
      title={isManualMode ? labels.useTaskOutput : labels.useCustomValue}
    >
      <IconButton
        size="small"
        onClick={isManualMode ? switchToReferenceMode : switchToManualMode}
        sx={{ ml: 0.5 }}
      >
        {isManualMode ? (
          <AccountTreeIcon fontSize="small" />
        ) : (
          <EditIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  )

  const renderOutputOption = (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: IVariable
  ) => {
    const sampleText =
      typeof option.value === 'string' || typeof option.value === 'number'
        ? String(option.value).slice(0, 50)
        : ''

    return (
      <li {...props}>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="body2" noWrap>
            {option.name || option.outputPath}
          </Typography>
          {sampleText && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {sampleText}
            </Typography>
          )}
        </Box>
      </li>
    )
  }

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
      {variable.type === VariableType.output &&
      outputFields &&
      !isManualMode ? (
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <OptionsInput
              value={value}
              label={getLabel(variable.label)}
              optionLabelPath="label"
              groupLabelPath="groupName"
              onChange={(result) => onOutputChange(variable, result)}
              onBlur={onBlur}
              options={outputFields}
              renderOption={renderOutputOption}
            />
          </div>
          {hasOutputOptions && renderToggleButton()}
        </div>
      ) : variable.type === VariableType.output && isManualMode ? (
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <TextInput
              value={value}
              variant="outlined"
              onBlur={onBlur}
              label={getLabel(variable.label)}
              onChange={(result) => onTextChange(variable, result)}
            />
          </div>
          {renderToggleButton()}
        </div>
      ) : variable.type === VariableType.output ? (
        <TextInput
          value={value}
          variant="outlined"
          onBlur={onBlur}
          label={getLabel(variable.label)}
          onChange={(result) => onTextChange(variable, result)}
        />
      ) : variable.type === VariableType.options ? (
        <OptionsInput
          label={getLabel(variable.label)}
          optionLabelPath="label"
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

const LABELS: Labels = {
  en: {
    useCustomValue: 'Type a custom value',
    useTaskOutput: 'Select from task outputs',
  },
  pt: {
    useCustomValue: 'Digitar um valor',
    useTaskOutput: 'Selecionar saída de tarefa',
  },
}

const labels = getLabels(LABELS)
