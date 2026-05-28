import { IService } from '../service/interface'

export interface IAppConfig {
  apiUrl?: string
  loginUrl?: string
  authorizeUrl?: string
  auth?: {
    type: string
    method: string
    url: string
    headers?: object
    fields?: {
      username: string
      password: string
    }
  }
}

export interface IApp {
  name: string
  appId: string
  config: IAppConfig
}

export interface IAppService extends IApp {
  services: IService[]
}

export interface ICredential {
  refresh_token?: string
  access_token?: string
}

export interface IAppConnection {
  appId: string
  userId: string
  email: string
  name: string
  credentials: ICredential
  connectionId: string | number
}
