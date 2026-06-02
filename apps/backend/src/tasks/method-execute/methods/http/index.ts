import { getConnectorById, ITaskExecutionInput } from '@baita/shared'
import { DataType } from '@baita/shared'
import Axios from 'axios'

import Resource from '@/controllers/resource'
import { getDataFromPath, getMappedData } from '@/utils/bot'

interface IHttpRequest {
  path: string
  method: string
  headers: { [key: string]: string }
  bodyParams: { [key: string]: string }
  queryParams: { [key: string]: string }
}

export const httpRequest = async (
  taskInput: ITaskExecutionInput<IHttpRequest>
) => {
  const { appConfig, serviceConfig, inputData, connectionId, userId } =
    taskInput

  const headers = { ...inputData.headers }

  if (connectionId && userId) {
    const resource = new Resource(userId, 'connection')
    const connection = await resource.read(connectionId as string)
    if (connection?.credentials?.apiKey && connection.connectorId) {
      const connector = getConnectorById(connection.connectorId as string)
      if (connector?.auth.type === 'userApiKey') {
        const prefix = connector.auth.prefix || ''
        headers[connector.auth.headerName] =
          `${prefix}${connection.credentials.apiKey}`
      }
    }
  }

  const axiosInput = {
    url: appConfig.apiUrl + (inputData.path ? `/${inputData.path}` : ''),
    method: inputData.method,
    headers,
    data: inputData.bodyParams,
    params: inputData.queryParams,
  }

  const response = await Axios(axiosInput)

  const initialData = getDataFromPath(response.data, serviceConfig.outputPath)

  return getMappedData(
    initialData || response.data,
    serviceConfig.outputMapping
  )
}

export const oauth2Request = async (
  taskInput: ITaskExecutionInput<IHttpRequest>
) => {
  const { userId, appConfig, serviceConfig, inputData, connectionId } =
    taskInput

  if (!connectionId) {
    throw new Error('No connection selected — connect an account first')
  }

  if (!appConfig.auth) {
    throw new Error('App auth configuration missing')
  }

  const resource = new Resource(userId, 'connection')
  const credentialsResponse = await resource.read(connectionId as string)

  if (!credentialsResponse?.credentials?.refresh_token) {
    throw new Error('Connection has no refresh token — reconnect the account')
  }

  const axiosAuthInput = {
    url: appConfig.auth.url,
    method: appConfig.auth.method,
    headers: appConfig.auth.headers,
    auth: getAuthParamsFromApp(appConfig.auth.type, appConfig.auth.fields),
    data: getAuthDataFromApp(
      appConfig.auth.type,
      appConfig.auth.fields,
      appConfig.auth.headers as Record<string, string> | undefined,
      credentialsResponse.credentials.refresh_token
    ),
  }

  const authResponse = await Axios(axiosAuthInput)

  const updatedCredentials = {
    ...credentialsResponse.credentials,
    access_token: authResponse.data.access_token,
    ...(authResponse.data.refresh_token && {
      refresh_token: authResponse.data.refresh_token,
    }),
  }
  const { userId: _u, sortKey: _s, ...connectionData } = credentialsResponse
  await resource.update(connectionId as string, {
    ...connectionData,
    credentials: updatedCredentials,
  })

  const axiosInput = {
    url: appConfig.apiUrl + (inputData.path ? `/${inputData.path}` : ''),
    method: inputData.method,
    headers: {
      ...inputData.headers,
      Authorization: `Bearer ${authResponse.data.access_token}`,
    },
    data: inputData.bodyParams,
    params: inputData.queryParams,
  }

  const response = await Axios(axiosInput)

  const initialData = getDataFromPath(response.data, serviceConfig.outputPath)

  return getMappedData(
    initialData || response.data,
    serviceConfig.outputMapping
  )
}

interface IAuthFields {
  username: string
  password: string
}

const getAuthParamsFromApp = (authType: string, authFields?: IAuthFields) => {
  if (authType === 'basic' && authFields) {
    return {
      username: process.env[authFields.username] || '',
      password: process.env[authFields.password] || '',
    }
  }
  return undefined
}

const getAuthDataFromApp = (
  authType: string,
  authFields: IAuthFields | undefined,
  authHeaders: Record<string, string> | undefined,
  refreshToken: string
): DataType => {
  if (
    authHeaders &&
    authHeaders['Content-type'] &&
    authHeaders['Content-type'] === 'application/x-www-form-urlencoded'
  ) {
    const rawData: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }

    if (authType === 'body' && authFields) {
      rawData.client_id = process.env[authFields.username] || ''
      rawData.client_secret = process.env[authFields.password] || ''
    }

    return new URLSearchParams(rawData).toString()
  }

  const data: Record<string, string | undefined> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }

  if (authType === 'body' && authFields) {
    data.client_id = process.env[authFields.username]
    data.client_secret = process.env[authFields.password]
  }

  return data
}
