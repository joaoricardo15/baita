import { ConnectorManifest } from './index'
import { googleConnector } from './google'
import { pipedriveConnector } from './pipedrive'

const connectors: ConnectorManifest[] = [pipedriveConnector, googleConnector]

export function getAllConnectors(): ConnectorManifest[] {
  return connectors
}

export function getConnectorById(id: string): ConnectorManifest | undefined {
  return connectors.find((c) => c.id === id)
}

export function getConnectorByAppId(
  appId: string
): ConnectorManifest | undefined {
  return connectors.find((c) => c.appId === appId)
}
