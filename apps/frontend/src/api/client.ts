import Axios from 'axios'

import appConfig from '@/utils/config'

const apiClient = Axios.create({
  baseURL: appConfig.apiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

let tokenGetter: (() => Promise<string>) | null = null

apiClient.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function setupAuthInterceptor(getToken: () => Promise<string>) {
  tokenGetter = getToken
}

export function getApiResponse<T>(method: string, url: string, data?: unknown) {
  return new Promise<T>((resolve, reject) => {
    apiClient
      .request({ url, method, data })
      .then((response) => {
        if (!response.data) reject(response)
        if (!response.data.success)
          reject({
            message: response.data.message,
            stack: 'api.client',
            cause: response,
          })
        resolve(response.data.data)
      })
      .catch(reject)
  })
}
