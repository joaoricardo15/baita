import { FC, ReactNode } from 'react'

import { ComponentProps, Text } from '.'

const EmptyState: FC<
  {
    icon: ReactNode
    title: string
    description?: string
  } & ComponentProps
> = ({ icon, title, description, className, style }) => {
  return (
    <div
      className={`d-flex flex-column align-items-center justify-content-center mt-5 p-4 ${className || ''}`}
      style={style}
    >
      <div className="text-secondary mb-3">{icon}</div>
      <Text className="fw-bold text-center mb-1">{title}</Text>
      {description && (
        <Text color="textSecondary" className="text-center">
          {description}
        </Text>
      )}
    </div>
  )
}

export default EmptyState
