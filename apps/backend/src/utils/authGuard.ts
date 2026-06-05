import { APIGatewayProxyEvent } from 'aws-lambda'

export function getAuthenticatedUserId(event: APIGatewayProxyEvent): string {
  const rawAuthUserId = event.requestContext.authorizer?.userId as
    | string
    | undefined
  const pathUserId = event.pathParameters?.userId

  if (!rawAuthUserId) {
    throw new Error('Unauthorized: missing authentication context')
  }

  const authUserId = rawAuthUserId.includes('|')
    ? rawAuthUserId.split('|')[1]
    : rawAuthUserId

  if (pathUserId && pathUserId !== authUserId) {
    throw new Error('Forbidden: user mismatch')
  }

  return authUserId
}
