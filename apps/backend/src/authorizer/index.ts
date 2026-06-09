import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from 'aws-lambda'
import * as jwt from 'jsonwebtoken'
import jwksRsa from 'jwks-rsa'

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || ''
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || ''

const jwksClient = jwksRsa({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
})

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err) return reject(err)
      resolve(key!.getPublicKey())
    })
  })
}

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken?.replace('Bearer ', '')

  if (!token) {
    throw new Error('Unauthorized')
  }

  const decoded = jwt.decode(token, { complete: true })
  if (!decoded?.header?.kid) {
    throw new Error('Unauthorized')
  }

  const signingKey = await getSigningKey(decoded.header.kid)

  const verified = jwt.verify(token, signingKey, {
    audience: AUTH0_AUDIENCE,
    issuer: `https://${AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
  }) as jwt.JwtPayload

  return {
    principalId: verified.sub || 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: `${event.methodArn.split('/').slice(0, 2).join('/')}/*/*`,
        },
      ],
    },
    context: { userId: verified.sub },
  }
}
