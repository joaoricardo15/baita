import { FC, ReactNode } from 'react'

const ListItem: FC<{
  index: number
  children: ReactNode
}> = ({ index, children }) => {
  return (
    <div
      className="mb-2 list-item-enter"
      style={{ '--cascade-delay': `${index * 50}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

export default ListItem
