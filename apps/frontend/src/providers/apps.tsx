import { createContext, FC, ReactNode, useEffect, useState } from 'react'

import { IApp } from '../models/app'
import { IServiceApp } from '../models/service'
import ApiRequest from '../utils/requests'

export const AppsContext = createContext<{
  apps: IApp[]
  services: IServiceApp[]
}>({
  apps: [],
  services: [],
})

const AppsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const apiRequest = ApiRequest()
  const [apps, setApps] = useState<IApp[]>([])
  const [services, setServices] = useState<IServiceApp[]>([])

  useEffect(() => {
    apiRequest.getApps().then((apps) => {
      setApps(apps)

      const services = []

      for (let i = 0; i < apps.length; i++) {
        for (let j = 0; j < apps[i].services.length; j++) {
          services.push({
            app: {
              name: apps[i].name,
              appId: apps[i].appId,
              config: apps[i].config,
            },
            service: apps[i].services[j],
          })
        }
      }

      setServices(services)
    })
  }, [])

  return (
    <AppsContext.Provider value={{ apps, services }}>
      {children}
    </AppsContext.Provider>
  )
}

export default AppsProvider
