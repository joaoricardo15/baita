import { Backdrop, CircularProgress } from '@mui/material'
import { FC } from 'react'

import { ComponentProps } from '.'

const Loading: FC<ComponentProps> = ({ className, style }) => {
  return (
    <div className={className} style={style}>
      <Backdrop
        style={{
          zIndex: 99,
          backgroundColor: '#ffffffd0',
        }}
        open={true}
      >
        <CircularProgress />
      </Backdrop>
    </div>
  )
}

export default Loading
