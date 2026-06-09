import {
  ITransform,
  ITransformOperation,
  TransformOperationSchema,
} from '@baita/shared'
import { Close as CloseIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { FC, useEffect, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'

const TransformPanel: FC<{
  open: boolean
  anchorEl: HTMLElement | null
  transform?: ITransform
  sampleKeys: string[]
  onApply: (transform: ITransform) => void
  onClear: () => void
  onClose: () => void
}> = ({ open, anchorEl, transform, sampleKeys, onApply, onClear, onClose }) => {
  const operations = TransformOperationSchema.options
  const [operation, setOperation] = useState<ITransformOperation>(
    transform?.operation || 'first'
  )
  const [property, setProperty] = useState(transform?.property || '')
  const [operator, setOperator] = useState(transform?.operator || 'equals')
  const [value, setValue] = useState(transform?.value || '')
  const [index, setIndex] = useState(transform?.index ?? 0)
  const [direction, setDirection] = useState(transform?.direction || 'asc')

  useEffect(() => {
    if (transform) {
      setOperation(transform.operation)
      setProperty(transform.property || '')
      setOperator(transform.operator || 'equals')
      setValue(transform.value || '')
      setIndex(transform.index ?? 0)
      setDirection(transform.direction || 'asc')
    }
  }, [transform])

  const needsProperty =
    operation === 'pluck' || operation === 'filter' || operation === 'sort'

  const handleApply = () => {
    const t: ITransform = { operation }
    if (operation === 'at') t.index = index
    if (needsProperty) t.property = property
    if (operation === 'filter') {
      t.operator = operator
      t.value = value
    }
    if (operation === 'join') t.value = value
    if (operation === 'sort') t.direction = direction
    onApply(t)
    onClose()
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <Box sx={{ p: 2, width: 280 }}>
        <Box className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
            {labels.title}
          </span>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <FormControl fullWidth size="small" className="mb-2">
          <InputLabel>{labels.operation}</InputLabel>
          <Select
            value={operation}
            label={labels.operation}
            onChange={(e) =>
              setOperation(e.target.value as ITransformOperation)
            }
          >
            {operations.map((op) => (
              <MenuItem key={op} value={op}>
                {labels[op] || op}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {needsProperty && (
          <FormControl fullWidth size="small" className="mb-2">
            <InputLabel>{labels.property}</InputLabel>
            <Select
              value={property}
              label={labels.property}
              onChange={(e) => setProperty(e.target.value)}
            >
              {sampleKeys.map((key) => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {operation === 'filter' && (
          <>
            <FormControl fullWidth size="small" className="mb-2">
              <InputLabel>{labels.operator}</InputLabel>
              <Select
                value={operator}
                label={labels.operator}
                onChange={(e) =>
                  setOperator(
                    e.target.value as NonNullable<ITransform['operator']>
                  )
                }
              >
                <MenuItem value="equals">{labels.equals}</MenuItem>
                <MenuItem value="notEquals">{labels.notEquals}</MenuItem>
                <MenuItem value="contains">{labels.contains}</MenuItem>
                <MenuItem value="exists">{labels.exists}</MenuItem>
                <MenuItem value="notExists">{labels.notExists}</MenuItem>
                <MenuItem value="greaterThan">{labels.greaterThan}</MenuItem>
                <MenuItem value="lessThan">{labels.lessThan}</MenuItem>
              </Select>
            </FormControl>
            {operator !== 'exists' && operator !== 'notExists' && (
              <TextField
                fullWidth
                size="small"
                label={labels.value}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mb-2"
              />
            )}
          </>
        )}

        {operation === 'at' && (
          <TextField
            fullWidth
            size="small"
            type="number"
            label={labels.index}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="mb-2"
          />
        )}

        {operation === 'join' && (
          <TextField
            fullWidth
            size="small"
            label={labels.separator}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder=", "
            className="mb-2"
          />
        )}

        {operation === 'sort' && (
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={direction}
            onChange={(_, val) => val && setDirection(val)}
            className="mb-2"
          >
            <ToggleButton value="asc">{labels.ascending}</ToggleButton>
            <ToggleButton value="desc">{labels.descending}</ToggleButton>
          </ToggleButtonGroup>
        )}

        <Box className="d-flex justify-content-between mt-2">
          {transform && (
            <Button
              size="small"
              color="error"
              onClick={() => {
                onClear()
                onClose()
              }}
            >
              {labels.clear}
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            onClick={handleApply}
            sx={{ ml: 'auto' }}
          >
            {labels.apply}
          </Button>
        </Box>
      </Box>
    </Popover>
  )
}

export default TransformPanel

const LABELS: Labels = {
  en: {
    title: 'Transform',
    operation: 'Operation',
    property: 'Property',
    operator: 'Condition',
    value: 'Value',
    index: 'Index',
    separator: 'Separator',
    ascending: 'A → Z',
    descending: 'Z → A',
    apply: 'Apply',
    clear: 'Remove',
    first: 'First item',
    last: 'Last item',
    at: 'Item at index',
    count: 'Count',
    pluck: 'Extract property',
    filter: 'Filter',
    join: 'Join to text',
    sort: 'Sort',
    equals: 'Equals',
    notEquals: 'Not equals',
    contains: 'Contains',
    exists: 'Exists',
    notExists: "Doesn't exist",
    greaterThan: 'Greater than',
    lessThan: 'Less than',
  },
  pt: {
    title: 'Transformar',
    operation: 'Operação',
    property: 'Propriedade',
    operator: 'Condição',
    value: 'Valor',
    index: 'Índice',
    separator: 'Separador',
    ascending: 'A → Z',
    descending: 'Z → A',
    apply: 'Aplicar',
    clear: 'Remover',
    first: 'Primeiro item',
    last: 'Último item',
    at: 'Item no índice',
    count: 'Contar',
    pluck: 'Extrair propriedade',
    filter: 'Filtrar',
    join: 'Juntar em texto',
    sort: 'Ordenar',
    equals: 'Igual a',
    notEquals: 'Diferente de',
    contains: 'Contém',
    exists: 'Existe',
    notExists: 'Não existe',
    greaterThan: 'Maior que',
    lessThan: 'Menor que',
  },
}

const labels = getLabels(LABELS)
