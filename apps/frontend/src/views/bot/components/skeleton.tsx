import { FC } from 'react'

import { Skeleton } from '../../../components'

const BotSkeleton: FC = () => {
  return (
    <>
      <div className="d-flex align-items-center justify-content-between">
        <Skeleton className="w-75" height={40} />
        <div className="d-flex ">
          <Skeleton shape="circular" width={30} height={30} />
          <Skeleton shape="circular" width={30} height={30} className="mx-1" />
        </div>
      </div>
      {Array.from({ length: 1 }, (_, i) => (
        <div key={`skeleton${i}`} className="mt-4">
          <Skeleton width={100} height={30} className="mx-2" />
          <Skeleton height={50} />
          <div className="d-flex justify-content-center">
            <Skeleton width={80} height={36} className="mx-2" />
          </div>
        </div>
      ))}
    </>
  )
}

export default BotSkeleton
