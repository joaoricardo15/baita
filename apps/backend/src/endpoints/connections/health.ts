import { APIGatewayProxyEvent } from 'aws-lambda'

import Connection from '@/controllers/connection'

export async function handleHealth(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<unknown> {
  const connectionId = event.pathParameters?.connectionId
  if (!connectionId) throw new Error('Missing connectionId')

  const connection = new Connection()
  return await connection.checkHealth(userId, connectionId)
}
