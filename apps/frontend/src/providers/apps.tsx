import { createContext, FC, ReactNode, useState } from 'react'
import { connectorToAppService, getAllConnectors } from '@baita/shared'

import { IApp } from '../models/app'
import { IServiceApp } from '../models/service'

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
    for (const app of allApps) {
      for (const service of app.services) {
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
