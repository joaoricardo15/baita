import { Checkbox } from '@mui/material'
import { FC } from 'react'

import { ComponentProps, Text } from '.'

const CheckBox: FC<
  {
    checked?: boolean
    label?: string
    disabled?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
  } & ComponentProps
> = ({
  checked,
  label,
  disabled = false,
  onChange = () => undefined,
  onBlur,
  className,
  style,
}) => {
  return (
    <div className={className} style={style}>
      <div className="d-flex align-items-center h-100">
        <Checkbox
          checked={checked}
          disabled={disabled}
          className="text-primary"
          onBlur={onBlur}
          onChange={(_, checked) => onChange(checked)}
        />
        {label && (
          <Text
            className="text-primary fw-bold"
            style={{
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {label}
          </Text>
        )}
      </div>
    </div>
  )
}

export default CheckBox
