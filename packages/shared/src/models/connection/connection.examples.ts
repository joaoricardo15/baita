import { IConnection } from './connection.schema'

export const exampleConnectionGoogle: IConnection = {
  connectionId: 'conn-google-110944657139284874166',
  appId: 'google-gmail',
  connectorId: 'google',
  name: 'Gmail',
  email: 'user@gmail.com',
  credentials: {
    access_token: 'ya29.REDACTED_ACCESS_TOKEN',
    refresh_token: '1//REDACTED_REFRESH_TOKEN',
    token_type: 'Bearer',
    expires_in: 3599,
    scope: 'https://mail.google.com/ openid',
  },
  createdAt: 1718000000000,
}

export const exampleConnectionNewsapi: IConnection = {
  connectionId: 'conn-newsapi-abc123',
  appId: 'newsapi',
  connectorId: 'newsapi',
  name: 'NewsAPI',
  email: 'user@example.com',
  credentials: {
    apiKey: 'abc123def456ghi789',
  },
  createdAt: 1717900000000,
}

export const exampleConnectionPipedrive: IConnection = {
  connectionId: 'conn-pipedrive-11696187',
  appId: 'pipedrive',
  connectorId: 'pipedrive',
  name: 'Pipedrive',
  email: 'sales@company.com',
  credentials: {
    access_token: 'REDACTED_PIPEDRIVE_TOKEN',
    refresh_token: 'REDACTED_REFRESH_TOKEN',
    api_domain: 'https://company.pipedrive.com',
    token_type: 'Bearer',
    expires_in: 3599,
  },
  createdAt: 1717800000000,
}

export const exampleConnectionList: IConnection[] = [
  exampleConnectionGoogle,
  exampleConnectionNewsapi,
  exampleConnectionPipedrive,
]
