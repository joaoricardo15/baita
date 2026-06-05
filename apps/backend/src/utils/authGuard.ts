import { APIGatewayProxyEvent } from 'aws-lambda'

export function getAuthenticatedUserId(event: APIGatewayProxyEvent): string {
  const authUserId = event.requestContext.authorizer?.userId as
    | string
    | undefined
  const pathUserId = event.pathParameters?.userId

  if (!authUserId) {
    throw new Error('Unauthorized: missing authentication context')
  }

  if (pathUserId && pathUserId !== authUserId) {
    throw new Error('Forbidden: user mismatch')
  }

  return authUserId
}
