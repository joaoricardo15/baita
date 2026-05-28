import Axios from 'axios'
import Resource from 'src/controllers/resource'
import { ITaskExecutionInput } from 'src/models/bot/interface'
import { DataType } from 'src/models/service/interface'
import { getDataFromPath, getMappedData } from 'src/utils/bot'

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
  try {
    const { appConfig, serviceConfig, inputData } = taskInput

    const axiosInput = {
      url: appConfig.apiUrl + (inputData.path ? `/${inputData.path}` : ''),
      method: inputData.method,
      headers: inputData.headers,
      data: inputData.bodyParams,
      params: inputData.queryParams,
    }

    const response = await Axios(axiosInput)

    const initialData = getDataFromPath(response.data, serviceConfig.outputPath)

    const mappedData = getMappedData(
      initialData || response.data,
      serviceConfig.outputMapping
    )

    return mappedData
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err))
  }
}

export const oauth2Request = async (
  taskInput: ITaskExecutionInput<IHttpRequest>
) => {
  try {
    const { userId, appConfig, serviceConfig, inputData, connectionId } =
      taskInput

    if (!connectionId) {
      throw new Error('No connectionId')
    }

    if (!appConfig.auth) {
      throw new Error('No appConfig.auth')
    }

    const resource = new Resource(userId, 'connection')

    const credentialsResponse = await resource.read(connectionId as string)

    if (!credentialsResponse?.credentials?.refresh_token) {
      throw new Error('No refresh token')
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

    const mappedData = getMappedData(
      initialData || response.data,
      serviceConfig.outputMapping
    )

    return mappedData
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err))
  }
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
