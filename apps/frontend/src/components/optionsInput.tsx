import {
  Autocomplete,
  AutocompleteRenderGroupParams,
  Chip,
  TextField,
} from '@mui/material'
import { ReactNode, useEffect, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'

import { ComponentProps } from '.'

interface OptionsInputProps<T> extends ComponentProps {
  value: string
  onChange: (value: T | null) => void
  onBlur?: () => void
  label?: string
  placeholder?: string
  size?: 'small' | 'medium'
  options?: T[]
  chip?: boolean
  optionLabelPath?: string | string[]
  groupLabelPath?: string | string[]
  renderOption?: (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: T
  ) => ReactNode
  renderGroup?: (params: AutocompleteRenderGroupParams) => ReactNode
  getOptionDisabled?: (option: T) => boolean
  onSearchChange?: (value: string) => void
}

function OptionsInput<T>({
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  size = 'medium',
  options,
  chip = false,
  optionLabelPath,
  groupLabelPath,
  renderOption: customRenderOption,
  renderGroup: customRenderGroup,
  getOptionDisabled,
  onSearchChange,
  className,
  style,
}: OptionsInputProps<T>) {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const getPropertyByPath = (
    path: string | string[],
    obj: Record<string, unknown>
  ): string => {
    const properties = Array.isArray(path) ? path : path.split('.')
    return (
      (properties.reduce(
        (prev: unknown, curr) =>
          prev && typeof prev === 'object'
            ? (prev as Record<string, unknown>)[curr]
            : undefined,
        obj as unknown
      ) as string) || ''
    )
  }

  const getOptionLabel = (option: T | string): string => {
    if (typeof option === 'string') return option
    return optionLabelPath
      ? getPropertyByPath(optionLabelPath, option as Record<string, unknown>)
      : String(option)
  }

  const getDefaultRenderOption = () => {
    if (customRenderOption) return customRenderOption
    if (chip) {
      return (props: React.HTMLAttributes<HTMLLIElement>, option: T) => (
        <li {...props}>
          <Chip variant="outlined" label={getOptionLabel(option)} />
        </li>
      )
    }
    return undefined
  }

  return (
    <div className={`w-100 mt-1 ${className}`} style={style}>
      {options && (
        <Autocomplete
          openOnFocus
          autoHighlight
          blurOnSelect
          freeSolo
          options={options as (T & (string | object))[]}
          inputValue={inputValue}
          noOptionsText={labels.noOptions}
          onBlur={onBlur}
          onOpen={() => setInputValue('')}
          onChange={(_, selected) => onChange(selected as T | null)}
          sx={{
            '& .MuiAutocomplete-clearIndicator': {
              visibility: value ? 'visible' : 'hidden',
            },
          }}
          onInputChange={(_, newValue, reason) => {
            if (reason === 'input') {
              setInputValue(newValue)
              onSearchChange?.(newValue)
            } else if (reason === 'clear') {
              setInputValue('')
              onChange(null)
              onSearchChange?.('')
            }
          }}
          onClose={() => setInputValue(value)}
          groupBy={
            groupLabelPath
              ? (option) =>
                  getPropertyByPath(
                    groupLabelPath,
                    option as Record<string, unknown>
                  )
              : undefined
          }
          getOptionLabel={(option) => getOptionLabel(option as T | string)}
          isOptionEqualToValue={() => true}
          renderOption={getDefaultRenderOption()}
          renderGroup={customRenderGroup}
          getOptionDisabled={getOptionDisabled}
          renderInput={(params) => (
            <TextField
              {...params}
              size={size}
              label={label}
              variant="outlined"
              placeholder={placeholder}
            />
          )}
        />
      )}
    </div>
  )
}

export default OptionsInput

const LABELS: Labels = {
  en: {
    noOptions: 'No options available :(',
  },
  pt: {
    noOptions: 'Nenhuma opção disponível :(',
  },
}

const labels = getLabels(LABELS)
