import { InputBase, TextField, useTheme } from '@mui/material'
import { FC, useEffect, useRef, useState } from 'react'

import { ComponentProps } from '.'

const TextInput: FC<
  {
    value?: string
    label?: string
    placeholder?: string
    variant?: 'standard' | 'filled' | 'outlined' | string
    size?: 'small' | 'medium'
    fitContent?: boolean
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
  fitContent = false,
  onChange,
  onFocus,
  onBlur,
  className,
  style,
}) => {
  const theme = useTheme()
  const [contentWidth, setContentWidth] = useState<number | undefined>()
  const measureRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (fitContent && measureRef.current) {
      setContentWidth(measureRef.current.scrollWidth + 4)
    }
  }, [fitContent, value])

  const wrapperStyle = fitContent
    ? {
        ...style,
        width: contentWidth,
        position: 'relative' as const,
        fontFamily: theme.typography.fontFamily,
      }
    : style

  return (
    <div
      className={`${className || ''} ${fitContent ? 'overflow-hidden' : ''}`}
      style={wrapperStyle}
    >
      {variant !== 'standard' &&
      variant !== 'filled' &&
      variant !== 'outlined' ? (
        <InputBase
          fullWidth
          size={size}
          value={value}
          className={`text-primary ${variant}`}
          placeholder={placeholder}
          inputProps={{
            style: {
              textOverflow: 'ellipsis',
              ...(fitContent && { padding: 0 }),
            },
          }}
          sx={
            fitContent ? { height: 'auto', lineHeight: 'inherit' } : undefined
          }
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
      {fitContent && (
        <span
          ref={measureRef}
          className={variant}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: 'hidden',
            whiteSpace: 'pre',
            pointerEvents: 'none',
          }}
        >
          {value || placeholder}
        </span>
      )}
    </div>
  )
}

export default TextInput
