// Journey: OAuth Connections — token refresh for expired OAuth2 connections
import { IConnectorManifest } from '@baita/shared'
import axios from 'axios'

import { refreshOAuth2Token } from '@/utils/tokenRefresh'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

const mockConnector: IConnectorManifest = {
  id: 'test-connector',
  name: 'Test',
  category: 'Test',
  appId: 'test-app-id',
  auth: {
    type: 'oauth2',
    authorizationUrl: 'https://auth.test.com/authorize',
    tokenUrl: 'https://auth.test.com/token',
    refreshUrl: 'https://auth.test.com/token',
    scopes: ['read'],
    userInfoUrl: 'https://api.test.com/me',
    userIdField: 'id',
    clientId: 'test-public-client-id',
    clientIdEnvVar: 'TEST_CLIENT_ID',
    clientSecretEnvVar: 'TEST_CLIENT_SECRET',
    tokenAuthMethod: 'body',
  },
  base: { url: 'https://api.test.com' },
  operations: [],
}

const mockBasicConnector: IConnectorManifest = {
  ...mockConnector,
  id: 'test-basic',
  auth: {
    type: 'oauth2' as const,
    tokenAuthMethod: 'basic',
    authorizationUrl: 'https://auth.test.com/authorize',
    tokenUrl: 'https://auth.test.com/token',
    refreshUrl: 'https://auth.test.com/token',
    scopes: ['read'],
    userInfoUrl: 'https://api.test.com/me',
    userIdField: 'id',
    clientId: 'test-public-client-id',
    clientIdEnvVar: 'TEST_CLIENT_ID',
    clientSecretEnvVar: 'TEST_CLIENT_SECRET',
  },
}

describe('refreshOAuth2Token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.TEST_CLIENT_ID = 'test-client-id'
    process.env.TEST_CLIENT_SECRET = 'test-client-secret'
  })

  it('refreshes tokens with body auth method', async () => {
    mockAxios.post.mockResolvedValue({
      data: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      },
    })

    const result = await refreshOAuth2Token(
      mockConnector,
      { access_token: 'old-token', refresh_token: 'old-refresh' },
      'https://api.test.com/oauth/callback'
    )

    expect(result.access_token).toBe('new-access-token')
    expect(result.refresh_token).toBe('new-refresh-token')
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://auth.test.com/token',
      expect.stringContaining('grant_type=refresh_token'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )
  })

  it('refreshes tokens with basic auth method', async () => {
    mockAxios.post.mockResolvedValue({
      data: { access_token: 'new-token' },
    })

    const result = await refreshOAuth2Token(
      mockBasicConnector,
      { access_token: 'old', refresh_token: 'refresh' },
      'https://api.test.com/oauth/callback'
    )

    expect(result.access_token).toBe('new-token')
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://auth.test.com/token',
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Basic'),
        }),
      })
    )
  })

  it('throws when no refresh token available', async () => {
    await expect(
      refreshOAuth2Token(
        mockConnector,
        { access_token: 'token' },
        'https://api.test.com/oauth/callback'
      )
    ).rejects.toThrow('No refresh token available')
  })

  it('throws when connector is not OAuth2', async () => {
    const apiKeyConnector = {
      ...mockConnector,
      auth: { type: 'apiKey' as const, headerName: 'X-Key', envVar: 'KEY' },
    }

    await expect(
      refreshOAuth2Token(
        apiKeyConnector,
        { access_token: 'token', refresh_token: 'refresh' },
        'https://api.test.com/oauth/callback'
      )
    ).rejects.toThrow('Connector does not use OAuth2')
  })

  it('preserves existing credentials not in refresh response', async () => {
    mockAxios.post.mockResolvedValue({
      data: { access_token: 'new-token' },
    })

    const result = await refreshOAuth2Token(
      mockConnector,
      {
        access_token: 'old',
        refresh_token: 'keep-this',
        api_domain: 'https://company.pipedrive.com',
      },
      'https://api.test.com/oauth/callback'
    )

    expect(result.access_token).toBe('new-token')
    expect(result.refresh_token).toBe('keep-this')
    expect(result.api_domain).toBe('https://company.pipedrive.com')
  })

  it('throws when OAuth env vars are missing', async () => {
    delete process.env.TEST_CLIENT_ID

    await expect(
      refreshOAuth2Token(
        mockConnector,
        { access_token: 'token', refresh_token: 'refresh' },
        'https://api.test.com/oauth/callback'
      )
    ).rejects.toThrow('Missing OAuth credentials')
  })
})
