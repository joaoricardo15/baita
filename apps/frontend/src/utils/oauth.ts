import { ConnectorManifest } from '@baita/shared'

import { PRODUCTION_API_URL } from './config'

export function buildOAuthUrl(
  connector: ConnectorManifest,
  state: string
): string {
  if (connector.auth.type !== 'oauth2') return ''

  const { auth } = connector
  const params = new URLSearchParams({
    client_id: auth.clientId,
    redirect_uri: `${PRODUCTION_API_URL}/connectors/oauth`,
    response_type: 'code',
    scope: auth.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `${auth.authorizationUrl}?${params.toString()}`
}
