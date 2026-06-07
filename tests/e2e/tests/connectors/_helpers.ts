/**
 * Connector E2E Test Helpers
 *
 * Shared utilities for testing connector services via the standalone
 * POST /task/execute endpoint.
 *
 * Each helper builds a valid ITask payload matching the exact shape
 * that connectorToAppService() + the frontend would produce.
 */
import { APIRequestContext } from '@playwright/test'

import { API_URL, authHeaders } from '../helpers'

export interface ITaskExecutionResult {
  status: 'success' | 'fail' | 'filtered'
  inputData: unknown
  outputData: unknown
  timestamp: number
}

export interface IExecuteResponse {
  success: boolean
  message?: string
  data: ITaskExecutionResult
}

export async function executeTask(
  request: APIRequestContext,
  token: string,
  task: object
): Promise<IExecuteResponse> {
  const res = await request.post(`${API_URL}/task/execute`, {
    headers: authHeaders(token),
    data: task,
  })
  return res.json()
}

export async function findConnection(
  request: APIRequestContext,
  token: string,
  appId: string
): Promise<{ connectionId: string } | null> {
  const res = await request.post(`${API_URL}/resource/connection/list`, {
    headers: authHeaders(token),
    data: {},
  })
  const body = await res.json()
  if (!body.success || !Array.isArray(body.data)) return null
  const conn = body.data.find((c: { appId: string }) => c.appId === appId)
  return conn ? { connectionId: conn.connectionId } : null
}

// --- Baita Connector ---

export function buildBaitaCodeTask(
  code: string,
  customFields?: Record<string, unknown>
) {
  const inputData = [{ name: 'code', type: 'code', label: 'Code', value: code }]

  if (customFields) {
    for (const [name, value] of Object.entries(customFields)) {
      inputData.push({
        name,
        type: 'text',
        label: name,
        value: value as string,
      })
    }
  }

  return {
    taskId: 0,
    service: {
      type: 'invoke',
      name: 'code-execute',
      label: 'Run Javascript',
      config: {
        customFields: !!customFields,
        inputFields: [
          { type: 'code', name: 'code', label: 'Code', required: true },
          ...(customFields
            ? Object.keys(customFields).map((name) => ({
                type: 'text',
                name,
                label: name,
              }))
            : []),
        ],
      },
    },
    inputData,
  }
}

export function buildBaitaMethodTask(
  methodName: string,
  inputFields: object[] = [],
  inputData: object[] = []
) {
  return {
    taskId: 0,
    app: {
      name: 'Baita',
      appId: '2d12accb-4b7c-4d22-bdbc-4875a404b929',
      icon: '/icons/baita.png',
      config: {},
    },
    service: {
      type: 'invoke',
      name: 'method-execute',
      label: methodName,
      config: { methodName, inputFields },
    },
    inputData,
  }
}

// --- Google Connector ---

const GOOGLE_APP_CONFIG = {
  apiUrl: 'https://www.googleapis.com',
  auth: {
    type: 'body',
    method: 'post',
    url: 'https://accounts.google.com/o/oauth2/token',
    headers: { 'Content-type': 'application/x-www-form-urlencoded' },
    fields: { username: 'GOOGLE_CLIENT_ID', password: 'GOOGLE_CLIENT_SECRET' },
  },
}

export function buildGoogleTask(
  connectionId: string,
  operation: {
    label: string
    path: string
    method: string
    outputPath?: string
    extraInputFields?: object[]
    extraInputData?: object[]
  }
) {
  const inputFields = [
    {
      name: 'method',
      label: 'Method',
      type: 'constant',
      value: operation.method,
    },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    ...(operation.extraInputFields || []),
  ]

  const inputData = [
    {
      name: 'method',
      label: 'Method',
      type: 'constant',
      value: operation.method,
    },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    ...(operation.extraInputData || []),
  ]

  return {
    taskId: 0,
    connectionId,
    app: {
      name: 'Google',
      appId: '5c16e311-a65a-449c-ad82-1f23a41cf89c',
      icon: '/icons/google.png',
      config: GOOGLE_APP_CONFIG,
    },
    service: {
      type: 'invoke',
      name: 'method-execute',
      label: operation.label,
      config: {
        methodName: 'oauth2Request',
        inputFields,
        outputPath: operation.outputPath || '',
      },
    },
    inputData,
  }
}

// --- NewsAPI Connector ---

export function buildNewsApiTask(operation: {
  label: string
  path: string
  queryParams: Record<string, string>
  outputPath?: string
  outputMapping?: Record<string, string>
}) {
  const inputFields = [
    { name: 'method', label: 'Method', type: 'constant', value: 'get' },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    {
      name: 'headers.X-Api-Key',
      label: 'X-Api-Key',
      type: 'environment',
      value: 'NEWS_API_KEY',
      required: true,
    },
    ...Object.entries(operation.queryParams).map(([name, value]) => ({
      name: `queryParams.${name}`,
      label: name,
      type: 'text',
      value,
    })),
  ]

  const inputData = [
    { name: 'method', label: 'Method', type: 'constant', value: 'get' },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    {
      name: 'headers.X-Api-Key',
      label: 'X-Api-Key',
      type: 'environment',
      value: 'NEWS_API_KEY',
    },
    ...Object.entries(operation.queryParams).map(([name, value]) => ({
      name: `queryParams.${name}`,
      label: name,
      type: 'text',
      value,
    })),
  ]

  return {
    taskId: 0,
    app: {
      name: 'NewsAPI',
      appId: 'dcf88373-238e-4335-8ba1-81a81fa73874',
      icon: '/icons/newsapi.png',
      config: { apiUrl: 'https://newsapi.org/v2' },
    },
    service: {
      type: 'invoke',
      name: 'method-execute',
      label: operation.label,
      config: {
        methodName: 'httpRequest',
        inputFields,
        outputPath: operation.outputPath || '',
        outputMapping: operation.outputMapping,
      },
    },
    inputData,
  }
}

// --- OpenAI Connector ---

export function buildOpenAiTask(
  connectionId: string,
  operation: {
    label: string
    path: string
    bodyParams: Record<string, unknown>
    outputPath?: string
  }
) {
  const inputFields = [
    { name: 'method', label: 'Method', type: 'constant', value: 'post' },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    ...Object.entries(operation.bodyParams).map(([name, value]) => ({
      name: `bodyParams.${name}`,
      label: name,
      type: 'constant',
      value,
    })),
  ]

  const inputData = [
    { name: 'method', label: 'Method', type: 'constant', value: 'post' },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    ...Object.entries(operation.bodyParams).map(([name, value]) => ({
      name: `bodyParams.${name}`,
      label: name,
      type: 'constant',
      value,
    })),
  ]

  return {
    taskId: 0,
    connectionId,
    app: {
      name: 'ChatGPT',
      appId: '0f7bb503-b9b4-4fd5-80ab-9a97d52397bb',
      icon: '/icons/openai.png',
      config: {
        apiUrl: 'https://api.openai.com/v1',
        auth: { type: 'userApiKey', method: 'none', url: 'userApiKey' },
      },
    },
    service: {
      type: 'invoke',
      name: 'method-execute',
      label: operation.label,
      config: {
        methodName: 'httpRequest',
        inputFields,
        outputPath: operation.outputPath || '',
      },
    },
    inputData,
  }
}

// --- Pipedrive Connector ---

const PIPEDRIVE_APP_CONFIG = {
  apiUrl: 'https://api.pipedrive.com/v1',
  auth: {
    type: 'basic',
    method: 'post',
    url: 'https://oauth.pipedrive.com/oauth/token',
    headers: { 'Content-type': 'application/x-www-form-urlencoded' },
    fields: {
      username: 'PIPEDRIVE_CLIENT_ID',
      password: 'PIPEDRIVE_CLIENT_SECRET',
    },
  },
}

export function buildPipedriveTask(
  connectionId: string,
  operation: {
    label: string
    path: string
    queryParams: Record<string, string>
    outputPath?: string
  }
) {
  const inputFields = [
    { name: 'method', label: 'Method', type: 'constant', value: 'get' },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    ...Object.entries(operation.queryParams).map(([name, value]) => ({
      name: `queryParams.${name}`,
      label: name,
      type: 'text',
      value,
    })),
  ]

  const inputData = [
    { name: 'method', label: 'Method', type: 'constant', value: 'get' },
    { name: 'path', label: 'Path', type: 'constant', value: operation.path },
    ...Object.entries(operation.queryParams).map(([name, value]) => ({
      name: `queryParams.${name}`,
      label: name,
      type: 'text',
      value,
    })),
  ]

  return {
    taskId: 0,
    connectionId,
    app: {
      name: 'Pipedrive',
      appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
      icon: '/icons/pipedrive.png',
      config: PIPEDRIVE_APP_CONFIG,
    },
    service: {
      type: 'invoke',
      name: 'method-execute',
      label: operation.label,
      config: {
        methodName: 'oauth2Request',
        inputFields,
        outputPath: operation.outputPath || '',
      },
    },
    inputData,
  }
}
