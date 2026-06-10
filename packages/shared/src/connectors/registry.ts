import { IAppService } from '../schemas/app'
import {
  IService,
  IVariable,
  MethodName,
  ServiceName,
  ServiceType,
  VariableType,
} from '../schemas/service'

import { IConnectorManifest, IConnectorOperation } from './index'
import { baitaConnector } from './baita'
import { googleConnector } from './google'
import { newsapiConnector } from './newsapi'
import { openaiConnector } from './openai'
import { pipedriveConnector } from './pipedrive'

const connectors: IConnectorManifest[] = [
  baitaConnector,
  pipedriveConnector,
  googleConnector,
  openaiConnector,
  newsapiConnector,
]

export function getAllConnectors(): IConnectorManifest[] {
  return connectors
}

export function getConnectorById(id: string): IConnectorManifest | undefined {
  return connectors.find((c) => c.id === id)
}

export function getConnectorByAppId(
  appId: string
): IConnectorManifest | undefined {
  return connectors.find((c) => c.appId === appId)
}

export function connectorToAppService(
  connector: IConnectorManifest
): IAppService {
  const services = connector.services
    ? connector.services
    : connector.operations
        .filter((op) => op.inputFields.length > 0 || op.outputPath)
        .map((op) => operationToService(connector, op))

  return {
    name: connector.name,
    appId: connector.appId,
    icon: connector.icon,
    config: {
      apiUrl: connector.base.url || undefined,
      authorizeUrl:
        connector.auth.type === 'oauth2'
          ? connector.auth.authorizationUrl
          : undefined,
      auth:
        connector.auth.type === 'oauth2'
          ? {
              type: connector.auth.tokenAuthMethod || 'body',
              method: 'post',
              url: connector.auth.tokenUrl,
              headers: { 'Content-type': 'application/x-www-form-urlencoded' },
              fields: {
                username: connector.auth.clientIdEnvVar,
                password: connector.auth.clientSecretEnvVar,
              },
            }
          : connector.auth.type === 'userApiKey'
            ? { type: 'userApiKey', method: 'none', url: 'userApiKey' }
            : undefined,
    },
    services,
  }
}

function operationToService(
  connector: IConnectorManifest,
  op: IConnectorOperation
): IService {
  const methodName =
    connector.auth.type === 'apiKey' || connector.auth.type === 'userApiKey'
      ? MethodName.httpRequest
      : MethodName.oauth2Request

  const inputFields: IVariable[] = [
    {
      name: 'method',
      label: 'Method',
      type: VariableType.constant,
      value: op.method.toLowerCase(),
    },
    {
      name: 'path',
      label: 'Path',
      type: VariableType.constant,
      value: op.path.startsWith('/') ? op.path.slice(1) : op.path,
    },
  ]

  if (connector.auth.type === 'apiKey') {
    inputFields.push({
      name: `headers.${connector.auth.headerName}`,
      label: connector.auth.headerName,
      type: VariableType.environment,
      required: true,
      value: connector.auth.envVar,
    })
  }

  inputFields.push(
    ...op.inputFields.map((field) => ({
      ...field,
      name: prefixFieldName(field.name, op.method),
    }))
  )

  return {
    type: op.type === 'trigger' ? ServiceType.trigger : ServiceType.invoke,
    name: ServiceName.method,
    label: op.name,
    description: op.description,
    config: {
      methodName,
      inputFields,
      outputPath: op.outputPath,
      outputMapping: op.outputMapping,
      bodyEncoding: op.bodyEncoding,
    },
  }
}

function prefixFieldName(name: string, method: string): string {
  if (
    name.startsWith('queryParams.') ||
    name.startsWith('bodyParams.') ||
    name.startsWith('headers.')
  ) {
    return name
  }
  return method === 'GET' || method === 'DELETE'
    ? `queryParams.${name}`
    : `bodyParams.${name}`
}
