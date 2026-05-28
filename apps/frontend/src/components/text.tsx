import { Typography } from '@mui/material'
import { FC, ReactNode } from 'react'

import { ComponentProps } from '.'

const Text: FC<
  {
    children: ReactNode
    type?:
      | 'h1'
      | 'h2'
      | 'h3'
      | 'h4'
      | 'h5'
      | 'h6'
      | 'subtitle1'
      | 'subtitle2'
      | 'caption'
      | 'button'
      | 'overline'
      | 'inherit'
      | 'body1'
      | 'body2'
    onClick?: () => void
    color?:
      | 'initial'
      | 'inherit'
      | 'primary'
      | 'secondary'
      | 'textPrimary'
      | 'textSecondary'
      | 'error'
    icon?: ReactNode
  } & ComponentProps
> = ({
  children,
  type,
  onClick,
  color = 'primary',
  icon,
  className,
  style,
}) => {
  return (
    <div className={className} style={style}>
      {icon && <div className={icon ? 'mx-1' : ''}>{icon}</div>}
      <Typography
        className={className}
        variant={type}
        color={color}
        style={style}
        onClick={onClick}
      >
        {children}
      </Typography>
    </div>
  )
}

export default Text
