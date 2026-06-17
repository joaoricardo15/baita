import {
  connectorToAppService,
  getAllConnectors,
  IApp,
  IServiceApp,
  ServiceName,
} from '@baita/shared'
import { createContext, FC, ReactNode, useState } from 'react'

import { isIOSDevice } from '@/utils/device'

const IOS_ONLY_SERVICES: string[] = [ServiceName.phoneEvent]

export const AppsContext = createContext<{
  apps: IApp[]
  services: IServiceApp[]
}>({
  apps: [],
  services: [],
})

const AppsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const allApps = getAllConnectors().map(connectorToAppService)

  const [apps] = useState<IApp[]>(allApps)
  const [services] = useState<IServiceApp[]>(() => {
    const result: IServiceApp[] = []
    const isiOS = isIOSDevice()

    for (const app of allApps) {
      for (const service of app.services) {
        if (IOS_ONLY_SERVICES.includes(service.name) && !isiOS) continue
        result.push({
          app: {
            name: app.name,
            appId: app.appId,
            icon: app.icon,
            config: app.config,
          },
          service,
        })
      }
    }
    return result
  })

  return (
    <AppsContext.Provider value={{ apps, services }}>
      {children}
    </AppsContext.Provider>
  )
}

export default AppsProvider
