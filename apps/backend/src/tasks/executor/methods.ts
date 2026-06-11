import {
  DataType,
  getConnectorById,
  IContent,
  ITaskExecutionInput,
  MethodName,
  validateContent,
} from '@baita/shared'
import Axios from 'axios'
import webpush from 'web-push'

import Data from '@/controllers/data'
import User from '@/controllers/user'
import { getDataFromPath, getMappedData } from '@/utils/bot'

import {
  applyBodyEncoding,
  interpolatePathParams,
  resolveBodyEncoding,
  resolveOutputMapping,
} from './utils'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const SERVICE_SITE_URL = process.env.SERVICE_SITE_URL || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@baita.help',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

const METHODS: Record<
  MethodName,
  (input: ITaskExecutionInput<DataType>) => Promise<DataType | undefined>
> = {
  getTodo,
  publishToFeed,
  sendNotification,
  httpRequest,
  oauth2Request,
}

export async function executeMethod(
  input: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { serviceConfig } = input
  const methodName = serviceConfig.methodName as MethodName
  const method = METHODS[methodName]

  if (!method) {
    throw new Error(`Unknown method: ${methodName}`)
  }

  return method(input)
}

async function getTodo(
  taskInput: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { userId } = taskInput
  const resource = new Data(userId, 'todo')
  return resource.read()
}

async function publishToFeed(
  taskInput: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { userId, inputData } = taskInput
  const content = (inputData as { content: IContent | IContent[] }).content

  const contentList: IContent[] = Array.isArray(content) ? content : [content]

  validateContent(contentList)

  const user = new User()

  const { published, total } = await user.publishContent(userId, contentList)

  if (published === 0) {
    throw new Error(`No new content to publish (${total} items already seen).`)
  }

  return { message: `Published ${published} of ${total} items to feed.` }
}

interface ISendNotification {
  token: string
  url?: string
  notification: {
    title: string
    body: string
    timestamp?: number
    image?: string
    icon?: string
    actions?: { action: string; title: string }[]
  }
  data?: Record<string, string>
}

async function sendNotification(
  taskInput: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { botId, inputData } = taskInput
  const { token, url, notification, data } = inputData as ISendNotification
  const subscription = JSON.parse(token) as webpush.PushSubscription

  const payload = JSON.stringify({
    notification: {
      title: notification.title,
      body: notification.body,
      icon:
        notification.icon ||
        notification.image ||
        `${SERVICE_SITE_URL}/logo.png`,
      badge: `${SERVICE_SITE_URL}/badge.png`,
      image: notification.image,
      tag: botId,
      renotify: false,
      requireInteraction: true,
      timestamp: notification.timestamp,
      actions: notification.actions,
      data: { url: url || SERVICE_SITE_URL, ...data },
      fcmOptions: { link: url || SERVICE_SITE_URL },
    },
  })

  const result = await webpush.sendNotification(subscription, payload, {
    topic: botId.replace(/-/g, ''),
    urgency: 'high',
  })

  return { statusCode: result.statusCode, body: result.body }
}

interface IHttpRequest {
  path: string
  method: string
  headers: { [key: string]: string }
  bodyParams: { [key: string]: string }
  queryParams: { [key: string]: string }
}

async function httpRequest(
  taskInput: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { appConfig, serviceConfig, inputData, connectionId, userId } =
    taskInput
  const {
    path,
    method,
    headers: inputHeaders,
    bodyParams,
    queryParams,
  } = inputData as IHttpRequest

  const {
    path: resolvedPath,
    queryParams: resolvedQueryParams,
    bodyParams: resolvedBodyParams,
  } = interpolatePathParams(path, queryParams, bodyParams)

  const headers = { ...inputHeaders }

  if (connectionId && userId) {
    const resource = new Data(userId, 'connection')
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

  const requestBody = applyBodyEncoding(
    resolvedBodyParams,
    resolveBodyEncoding(serviceConfig.bodyEncoding, path)
  )

  const axiosInput = {
    url: appConfig.apiUrl + (resolvedPath ? `/${resolvedPath}` : ''),
    method,
    headers,
    data: requestBody,
    params: resolvedQueryParams,
  }

  const response = await Axios(axiosInput)

  const initialData = getDataFromPath(response.data, serviceConfig.outputPath)

  return getMappedData(
    initialData || response.data,
    resolveOutputMapping(serviceConfig.outputMapping, path)
  )
}

async function oauth2Request(
  taskInput: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { userId, appConfig, serviceConfig, inputData, connectionId } =
    taskInput
  const {
    path,
    method,
    headers: inputHeaders,
    bodyParams,
    queryParams,
  } = inputData as IHttpRequest

  if (!connectionId) {
    throw new Error('No connection selected — connect an account first')
  }

  if (!appConfig.auth) {
    throw new Error('App auth configuration missing')
  }

  const resource = new Data(userId, 'connection')
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

  const {
    path: resolvedPath,
    queryParams: resolvedQueryParams,
    bodyParams: resolvedBodyParams,
  } = interpolatePathParams(path, queryParams, bodyParams)

  const requestBody = applyBodyEncoding(
    resolvedBodyParams,
    resolveBodyEncoding(serviceConfig.bodyEncoding, path)
  )

  const axiosInput = {
    url: appConfig.apiUrl + (resolvedPath ? `/${resolvedPath}` : ''),
    method,
    headers: {
      ...inputHeaders,
      Authorization: `Bearer ${authResponse.data.access_token}`,
    },
    data: requestBody,
    params: resolvedQueryParams,
  }

  const response = await Axios(axiosInput)

  const initialData = getDataFromPath(response.data, serviceConfig.outputPath)

  return getMappedData(
    initialData || response.data,
    resolveOutputMapping(serviceConfig.outputMapping, path)
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
