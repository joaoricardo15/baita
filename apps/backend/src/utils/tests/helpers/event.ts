import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

export const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent => ({
  httpMethod: 'POST',
  path: '/',
  pathParameters: null,
  queryStringParameters: null,
  headers: { 'Content-Type': 'application/json' },
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  body: null,
  isBase64Encoded: false,
  stageVariables: null,
  requestContext: {
    accountId: '123456789',
    apiId: 'test-api',
    authorizer: { userId: 'test-user' },
    protocol: 'HTTP/1.1',
    httpMethod: 'POST',
    identity: {} as any,
    path: '/',
    stage: 'dev',
    requestId: 'req-123',
    requestTimeEpoch: Date.now(),
    resourceId: 'resource-1',
    resourcePath: '/',
  },
  resource: '/',
  ...overrides,
})

export const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123:function:test',
  memoryLimitInMB: '512',
  awsRequestId: 'req-123',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2024/01/01/[$LATEST]abc',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
})

export const invokeHandler = (
  handler: (
    event: APIGatewayProxyEvent,
    context: Context,
    callback: Callback
  ) => Promise<void>,
  event: Partial<APIGatewayProxyEvent> = {}
): Promise<{ statusCode: number; body: any; headers: any }> => {
  return new Promise((resolve) => {
    const mockEvent = createMockEvent(event)
    const mockContext = createMockContext()

    const callback: Callback = (_err, result) => {
      resolve({
        statusCode: result.statusCode,
        headers: result.headers,
        body: JSON.parse(result.body),
      })
    }

    handler(mockEvent, mockContext, callback)
  })
}
