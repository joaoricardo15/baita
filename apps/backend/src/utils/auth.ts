import { APIGatewayProxyEvent } from 'aws-lambda'

export function getAuthenticatedUserId(event: APIGatewayProxyEvent): string {
  const rawAuthUserId = event.requestContext.authorizer?.userId as
    | string
    | undefined

  if (!rawAuthUserId) {
    throw new Error('Unauthorized: missing authentication context')
  }

  return rawAuthUserId.includes('|')
    ? rawAuthUserId.split('|')[1]
    : rawAuthUserId
}
