import {
  ConnectorManifest,
  googleConnector,
  pipedriveConnector,
} from '@baita/shared'

const connectors: ConnectorManifest[] = [googleConnector, pipedriveConnector]

export function getConnectorById(id: string): ConnectorManifest | undefined {
  return connectors.find((c) => c.id === id)
}

export function getAllConnectors(): ConnectorManifest[] {
  return connectors
}
