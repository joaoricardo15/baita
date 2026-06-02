import { Autocomplete, Chip, TextField } from '@mui/material'
import { FC, useEffect, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'

import { ComponentProps } from '.'

export const OptionsInput: FC<
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
  className,
  style,
}) => {
  const [localInputValue, setLocalInputValue] = useState(value)

  useEffect(() => {
    setLocalInputValue(value)
  }, [value])

  const getPropertyByPath = (path: string | string[], obj: any): string => {
    const properties = Array.isArray(path) ? path : path.split('.')
    return properties.reduce((prev, curr) => prev[curr], obj)
  }

  return (
    <div className={`w-100 mt-1 ${className}`} style={style}>
      {options && (
        <Autocomplete
          openOnFocus
          autoHighlight
          blurOnSelect
          options={options}
          inputValue={localInputValue}
          noOptionsText={labels.noOptions}
          onBlur={onBlur}
          onChange={(_, value) => onChange(value)}
          onInputChange={(_, newValue) => setLocalInputValue(newValue)}
          groupBy={
            groupLabelPath
              ? (option) => getPropertyByPath(groupLabelPath, option)
              : undefined
          }
          getOptionLabel={(option) =>
            getPropertyByPath(`${optionLabelPath}`, option)
          }
          isOptionEqualToValue={() => true}
          renderOption={
            chip
              ? (props, option) => (
                  <li {...props}>
                    <Chip
                      variant="outlined"
                      label={getPropertyByPath(`${optionLabelPath}`, option)}
                    />
                  </li>
                )
              : undefined
          }
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
