import { FC, useEffect } from 'react'

import { checkSubscriptionHealth } from '../utils/push'

const PushHealthCheck: FC = () => {
  useEffect(() => {
    checkSubscriptionHealth()
  }, [])

  return null
}

export default PushHealthCheck
