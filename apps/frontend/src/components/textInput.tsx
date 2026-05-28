import { InputBase, TextField } from '@mui/material'
import { FC } from 'react'

import { ComponentProps } from '.'

export const TextInput: FC<
  {
    value?: string
    label?: string
    placeholder?: string
    variant?: 'standard' | 'filled' | 'outlined' | string
    size?: 'small' | 'medium'
    onChange: (value: string) => void
    onFocus?: () => void
    onBlur?: () => void
  } & ComponentProps
> = ({
  label,
  value = '',
  placeholder,
  size = 'medium',
  variant = 'unstyled',
  onChange,
  onFocus,
  onBlur,
  className,
  style,
}) => {
  return (
    <div className={className} style={style}>
      {variant !== 'standard' &&
      variant !== 'filled' &&
      variant !== 'outlined' ? (
        <InputBase
          fullWidth
          size={size}
          value={value}
          className={`text-primary ${variant}`}
          placeholder={placeholder}
          inputProps={{ style: { textOverflow: 'ellipsis' } }}
          onBlur={onBlur}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <TextField
          fullWidth
          size={size}
          value={value}
          label={label}
          variant={variant}
          placeholder={placeholder}
          inputProps={{ style: { textOverflow: 'ellipsis' } }}
          onBlur={onBlur}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}

export default TextInput
