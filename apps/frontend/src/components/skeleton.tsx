import { Skeleton as MuiSkeleton } from '@mui/material'
import { FC } from 'react'

import { ComponentProps } from '.'

const Skeleton: FC<
  {
    elements?: number
    shape?: 'text' | 'rectangular' | 'rounded' | 'circular'
    width?: string | number
    height?: string | number
  } & ComponentProps
> = ({
  elements = 1,
  shape = 'text',
  height = 75,
  width,
  style,
  className,
}) => {
  return (
    <div className={className} style={style}>
      {Array.from({ length: elements }, (_, i) => (
        <MuiSkeleton
          key={i}
          width={width}
          height={height}
          variant={shape}
          style={{ transform: 'inherit' }}
          className={`mb-2 mt-0 ${className}`}
          animation="wave"
        />
      ))}
    </div>
  )
}

export default Skeleton
