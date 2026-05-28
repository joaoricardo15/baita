import { Button as MaterialButton, IconButton, Tooltip } from '@mui/material'
import { FC, ReactNode } from 'react'

import { ComponentProps } from '.'

const Button: FC<
  {
    children?: ReactNode
    onClick?: () => void
    color?:
      | 'inherit'
      | 'primary'
      | 'secondary'
      | 'success'
      | 'error'
      | 'info'
      | 'warning'
    size?: 'small' | 'medium' | 'large'
    type?: 'text' | 'outlined' | 'contained'
    disabled?: boolean
    icon?: ReactNode
    iconButton?: boolean
    tooltip?: string
  } & ComponentProps
> = ({
  children,
  onClick,
  color = 'primary',
  size = 'medium',
  type = 'outlined',
  disabled = false,
  icon,
  iconButton,
  tooltip,
  style,
  className,
}) => {
  const ContainerTag = tooltip ? Tooltip : 'div'

  const ButtonTag = (
    iconButton ? IconButton : MaterialButton
  ) as typeof MaterialButton

  return (
    <ContainerTag
      title={tooltip}
      style={{ height: 'fit-content', alignSelf: 'center', ...style }}
      className={className}
    >
      <ButtonTag
        size={size}
        variant={type}
        color={color}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
        {children && <div className="mx-2">{children}</div>}
      </ButtonTag>
    </ContainerTag>
  )
}

export default Button
