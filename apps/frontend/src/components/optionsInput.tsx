import {
  Autocomplete,
  AutocompleteRenderGroupParams,
  Chip,
  TextField,
} from '@mui/material'
import { FC, ReactNode, useEffect, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'

import { ComponentProps } from '.'

const OptionsInput: FC<
  {
    value: string
    onChange: (value: any) => void
    onBlur?: () => void
    label?: string
    placeholder?: string
    size?: 'small' | 'medium'
    options?: any[]
    chip?: boolean
    optionLabelPath?: string | string[]
    groupLabelPath?: string | string[]
    renderOption?: (
      props: React.HTMLAttributes<HTMLLIElement>,
      option: any
    ) => ReactNode
    renderGroup?: (params: AutocompleteRenderGroupParams) => ReactNode
    getOptionDisabled?: (option: any) => boolean
    onSearchChange?: (value: string) => void
  } & ComponentProps
> = ({
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
}) => {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const getPropertyByPath = (path: string | string[], obj: any): string => {
    const properties = Array.isArray(path) ? path : path.split('.')
    return properties.reduce((prev, curr) => prev?.[curr], obj) || ''
  }

  const getOptionLabel = (option: any): string => {
    if (typeof option === 'string') return option
    return optionLabelPath
      ? getPropertyByPath(optionLabelPath, option)
      : String(option)
  }

  const getDefaultRenderOption = () => {
    if (customRenderOption) return customRenderOption
    if (chip) {
      return (props: React.HTMLAttributes<HTMLLIElement>, option: any) => (
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
          options={options}
          inputValue={inputValue}
          noOptionsText={labels.noOptions}
          onBlur={onBlur}
          onOpen={() => setInputValue('')}
          onChange={(_, selected) => onChange(selected)}
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
              ? (option) => getPropertyByPath(groupLabelPath, option)
              : undefined
          }
          getOptionLabel={getOptionLabel}
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
