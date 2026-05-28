import { FC } from 'react'

import logoSrc from '../assets/logo.png'
import { ComponentProps } from '.'

const Logo: FC<{ size?: number } & ComponentProps> = ({
  size = 48,
  className,
  style,
}) => {
  return (
    <div className={`d-flex ${className}`} style={style}>
      <img
        width={size}
        alt="Baita logo"
        style={{ margin: -size / 6 }}
        src={logoSrc}
      />
    </div>
  )
}

export default Logo
