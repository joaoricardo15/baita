import { FC } from 'react'

import { ComponentProps, Text } from '@/components'

const Avatar: FC<
  { name: string; email: string; picture: string } & ComponentProps
> = ({ name, email, picture }) => {
  return (
    <div className="d-flex" style={{ height: 60 }}>
      <img
        src={picture}
        alt="Profile picture"
        className="rounded-circle img-fluid"
      />
      <div className="mx-3">
        <Text className="fw-bold">{name}</Text>
        <Text className="lead text-muted">{email}</Text>
      </div>
    </div>
  )
}

export default Avatar
