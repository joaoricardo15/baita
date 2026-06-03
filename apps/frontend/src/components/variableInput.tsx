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

  const getTypeIndicator = (val: unknown): string => {
    if (Array.isArray(val)) return '[]'
    if (typeof val === 'object' && val !== null) return '{}'
    if (typeof val === 'number') return '#'
    if (typeof val === 'boolean') return '◉'
    return 'Aa'
  }

  const isContainerValue = (val: unknown): boolean =>
    Array.isArray(val) || (typeof val === 'object' && val !== null)

  const renderOutputOption = (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: IVariable
  ) => {
    const path = option.outputPath || option.name || ''
    const parts = path.split('.').filter(Boolean)
    const depth = parts.length
    const leafName = parts[parts.length - 1] || path
    const parentPath = parts.slice(0, -1).join('.')
    const isContainer = isContainerValue(option.value)
    const typeLabel = getTypeIndicator(option.value)

    if (isContainer) {
      return (
        <li
          {...props}
          style={{ ...props.style, pointerEvents: 'none', opacity: 0.6 }}
        >
          <Box
            sx={{
              pl: Math.max(0, depth - 1) * 2,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                color: 'text.disabled',
                minWidth: 16,
              }}
            >
              {typeLabel}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color: 'text.secondary',
                fontWeight: 600,
              }}
            >
              {leafName}
            </Typography>
          </Box>
        </li>
      )
    }

    const sampleText =
      typeof option.value === 'string' || typeof option.value === 'number'
        ? String(option.value).slice(0, 40)
        : ''

    return (
      <li {...props}>
        <Box
          sx={{
            pl: Math.max(0, depth - 1) * 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'text.disabled',
              minWidth: 16,
            }}
          >
            {typeLabel}
          </Typography>
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
              {parentPath && (
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                  }}
                  noWrap
                >
                  {parentPath}.
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                noWrap
              >
                {leafName}
              </Typography>
            </Box>
            {sampleText && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontStyle: 'italic' }}
                noWrap
              >
                {sampleText}
              </Typography>
            )}
          </Box>
        </Box>
      </li>
    )
  }

  const isOutputOptionDisabled = (option: IVariable): boolean =>
    isContainerValue(option.value)

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
      hasOutputOptions &&
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
              getOptionDisabled={isOutputOptionDisabled}
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
