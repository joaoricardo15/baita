import { TextField } from '@mui/material'
import { FC } from 'react'

import { ComponentProps } from '.'

export const CodeInput: FC<
  {
    value: string
    label?: string
    placeholder?: string
    variant?: 'standard' | 'filled' | 'outlined'
    size?: 'small' | 'medium'
    onChange: (value: any) => void
    onBlur?: () => void
  } & ComponentProps
> = ({
  label,
  value = '',
  placeholder,
  size = 'medium',
  variant = 'outlined',
  onChange,
  onBlur,
  className,
  style,
}) => {
  return (
    <div className={`w-100 mt-1 ${className}`} style={style}>
      <TextField
        fullWidth
        multiline
        size={size}
        minRows={10}
        maxRows={20}
        value={value}
        label={label}
        placeholder={placeholder}
        variant={variant}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        inputProps={{ style: { textOverflow: 'ellipsis' } }}
      />
    </div>
  )
}

export default CodeInput
