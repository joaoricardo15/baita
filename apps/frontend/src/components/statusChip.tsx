import { Chip } from '@mui/material'
import { FC } from 'react'

import { TaskExecutionStatus } from '../models/bot'
import { ComponentProps } from '.'

const statusStyles: Record<TaskExecutionStatus, string> = {
  [TaskExecutionStatus.success]: 'border border-success bg-white',
  [TaskExecutionStatus.fail]: 'text-white bg-danger',
  [TaskExecutionStatus.filtered]: 'text-white bg-secondary',
}

const StatusChip: FC<
  {
    status: TaskExecutionStatus
  } & ComponentProps
> = ({ status, style, className }) => {
  return (
    <div className={className} style={style}>
      <Chip label={status} className={statusStyles[status] || 'bg-secondary'} />
    </div>
  )
}

export default StatusChip
