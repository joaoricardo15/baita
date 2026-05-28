import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda'

const mockDecode = jest.fn()
const mockVerify = jest.fn()

jest.mock('jsonwebtoken', () => ({
  decode: (...args: unknown[]) => mockDecode(...args),
  verify: (...args: unknown[]) => mockVerify(...args),
}))

jest.mock('jwks-rsa', () => {
  return () => ({
    getSigningKey: (
      _kid: string,
      cb: (err: Error | null, key?: { getPublicKey: () => string }) => void
    ) => cb(null, { getPublicKey: () => 'mock-signing-key' }),
  })
})

import { handler } from '../index'

const mockEvent: APIGatewayTokenAuthorizerEvent = {
  type: 'TOKEN',
  authorizationToken: 'Bearer valid-token',
  methodArn:
    'arn:aws:execute-api:us-east-1:123456789:api-id/prod/POST/user/123/bots',
}

describe('Authorizer', () => {
  beforeEach(() => {
    mockDecode.mockReturnValue({
      header: { kid: 'test-kid', alg: 'RS256' },
      payload: { sub: 'auth0|user123' },
    })
    mockVerify.mockReturnValue({
      sub: 'auth0|user123',
      aud: 'https://dev-yc4pbydg.us.auth0.com/api/v2/',
      iss: 'https://dev-yc4pbydg.us.auth0.com/',
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should return Allow policy for valid token', async () => {
    const result = await handler(mockEvent)

    expect(result.principalId).toBe('auth0|user123')
    const statement = result.policyDocument.Statement[0] as {
      Effect: string
      Action: string
      Resource: string
    }
    expect(statement.Effect).toBe('Allow')
    expect(statement.Action).toBe('execute-api:Invoke')
    expect(result.context).toEqual({ userId: 'auth0|user123' })
  })

  test('should throw Unauthorized when no token is provided', async () => {
    const event = { ...mockEvent, authorizationToken: '' }

    await expect(handler(event)).rejects.toThrow('Unauthorized')
  })

  test('should throw Unauthorized when token is only Bearer prefix', async () => {
    const event = { ...mockEvent, authorizationToken: 'Bearer ' }
    mockDecode.mockReturnValue(null)

    await expect(handler(event)).rejects.toThrow('Unauthorized')
  })

  test('should throw Unauthorized when token cannot be decoded', async () => {
    mockDecode.mockReturnValue(null)

    await expect(handler(mockEvent)).rejects.toThrow('Unauthorized')
  })

  test('should throw Unauthorized when token has no kid header', async () => {
    mockDecode.mockReturnValue({
      header: { alg: 'RS256' },
      payload: {},
    })

    await expect(handler(mockEvent)).rejects.toThrow('Unauthorized')
  })

  test('should throw when token verification fails', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('jwt expired')
    })

    await expect(handler(mockEvent)).rejects.toThrow('jwt expired')
  })

  test('should generate wildcard resource ARN from methodArn', async () => {
    const result = await handler(mockEvent)

    const statement = result.policyDocument.Statement[0] as {
      Resource: string
    }
    expect(statement.Resource).toBe(
      'arn:aws:execute-api:us-east-1:123456789:api-id/prod/*/*'
    )
  })

  test('should use "user" as default principalId when sub is missing', async () => {
    mockVerify.mockReturnValue({
      aud: 'https://dev-yc4pbydg.us.auth0.com/api/v2/',
      iss: 'https://dev-yc4pbydg.us.auth0.com/',
    })

    const result = await handler(mockEvent)

    expect(result.principalId).toBe('user')
  })
})
