import { ITransform, IVariable, VariableType } from '@baita/shared'
import {
  AccountTree as AccountTreeIcon,
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
} from '@mui/icons-material'
import {
  AutocompleteRenderGroupParams,
  Chip,
  Collapse,
  IconButton,
  ListSubheader,
  Tooltip,
  Typography,
} from '@mui/material'
import { FC, useRef, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'

import { CheckBox, CodeInput, OptionsInput, Text, TextInput } from '.'
import { ComponentProps } from '.'
import TransformPanel from './transformPanel'

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  )
  const [searchInput, setSearchInput] = useState('')
  const [transformOpen, setTransformOpen] = useState(false)
  const transformAnchorRef = useRef<HTMLDivElement>(null)

  const getSampleKeys = (): string[] => {
    if (!variable.sampleValue || typeof variable.sampleValue !== 'object')
      return []
    const sample = Array.isArray(variable.sampleValue)
      ? variable.sampleValue[0]
      : variable.sampleValue
    if (!sample || typeof sample !== 'object') return []
    return Object.keys(sample as object)
  }

  const onTransformApply = (transform: ITransform) => {
    onChange({ ...variable, transform })
  }

  const onTransformClear = () => {
    onChange({ ...variable, transform: undefined })
  }

  const getTransformLabel = (): string => {
    if (!variable.transform) return ''
    const { operation, property, operator, value } = variable.transform
    switch (operation) {
      case 'first':
        return labels.transformFirst
      case 'last':
        return labels.transformLast
      case 'count':
        return labels.transformCount
      case 'at':
        return `[${variable.transform.index}]`
      case 'pluck':
        return `${labels.transformPluck}: ${property}`
      case 'filter':
        return `${labels.transformFilter}: ${property} ${operator} ${value}`
      case 'join':
        return labels.transformJoin
      case 'sort':
        return `${labels.transformSort}: ${property}`
      default:
        return operation
    }
  }

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
    const isContainer = isContainerValue(option.value)

    const sampleText =
      typeof option.value === 'string' || typeof option.value === 'number'
        ? String(option.value).slice(0, 50)
        : Array.isArray(option.value)
          ? `[${option.value.length} items]`
          : ''

    return (
      <li
        {...props}
        style={{
          ...props.style,
          padding: `6px 16px 6px ${16 + Math.max(0, depth - 1) * 16}px`,
          opacity: isContainer ? 0.7 : 1,
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              fontWeight: isContainer ? 600 : 400,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {leafName}
          </div>
          {sampleText && !isContainer && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#999',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {sampleText}
            </div>
          )}
        </div>
      </li>
    )
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const renderCollapsibleGroup = (params: AutocompleteRenderGroupParams) => {
    const isSearching = searchInput.length > 0
    const isExpanded = isSearching || !!expandedGroups[params.group]

    return (
      <li key={params.key}>
        <ListSubheader
          component="div"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isSearching) toggleGroup(params.group)
          }}
          sx={{
            cursor: isSearching ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontWeight: 700,
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: isSearching ? undefined : 'action.hover' },
          }}
        >
          {isExpanded ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
          {params.group}
        </ListSubheader>
        <Collapse in={isExpanded} timeout={150}>
          <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
        </Collapse>
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
      hasOutputOptions &&
      !isManualMode ? (
        <>
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
                renderGroup={renderCollapsibleGroup}
                onSearchChange={setSearchInput}
              />
            </div>
            {hasOutputOptions && renderToggleButton()}
          </div>
          {variable.outputIndex !== undefined && (
            <div className="mt-1" ref={transformAnchorRef}>
              {variable.transform ? (
                <Chip
                  size="small"
                  icon={<TuneIcon />}
                  label={getTransformLabel()}
                  onClick={() => setTransformOpen(true)}
                  onDelete={onTransformClear}
                  variant="outlined"
                  color="primary"
                />
              ) : (
                <Chip
                  size="small"
                  icon={<TuneIcon />}
                  label={labels.addTransform}
                  onClick={() => setTransformOpen(true)}
                  variant="outlined"
                  sx={{ opacity: 0.6 }}
                />
              )}
              <TransformPanel
                open={transformOpen}
                anchorEl={transformAnchorRef.current}
                transform={variable.transform}
                sampleKeys={getSampleKeys()}
                onApply={onTransformApply}
                onClear={onTransformClear}
                onClose={() => setTransformOpen(false)}
              />
            </div>
          )}
        </>
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
        <div>
          <TextInput
            value={value}
            variant="outlined"
            onBlur={onBlur}
            label={getLabel(variable.label)}
            onChange={(result) => onTextChange(variable, result)}
          />
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {labels.noOutputsAvailable}
          </Typography>
        </div>
      ) : variable.type === VariableType.options ? (
        <OptionsInput
          label={getLabel(variable.label)}
          optionLabelPath="label"
          value={
            label ||
            variable.options?.find((o) => o.value === value)?.label ||
            ''
          }
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
    addTransform: 'Transform',
    noOutputsAvailable: 'No previous task outputs available',
    transformFirst: 'First item',
    transformLast: 'Last item',
    transformCount: 'Count',
    transformPluck: 'Extract',
    transformFilter: 'Filter',
    transformJoin: 'Join',
    transformSort: 'Sort',
  },
  pt: {
    useCustomValue: 'Digitar um valor',
    useTaskOutput: 'Selecionar saída de tarefa',
    addTransform: 'Transformar',
    noOutputsAvailable: 'Nenhuma saída de tarefa anterior disponível',
    transformFirst: 'Primeiro item',
    transformLast: 'Último item',
    transformCount: 'Contar',
    transformPluck: 'Extrair',
    transformFilter: 'Filtrar',
    transformJoin: 'Juntar',
    transformSort: 'Ordenar',
  },
}

const labels = getLabels(LABELS)
