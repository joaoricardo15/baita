process.env.CORE_TABLE = 'test-table'
process.env.BOTS_BUCKET = 'test-bots-bucket'
process.env.BOTS_PERMISSION = 'arn:aws:iam::123:role/test-role'
process.env.SERVICE_PREFIX = 'baita-help-prod'

import { ApiGatewayV2, CreateApiCommand } from '@aws-sdk/client-apigatewayv2'
import { CreateFunctionCommand, Lambda } from '@aws-sdk/client-lambda'
import { PutObjectCommand, S3 } from '@aws-sdk/client-s3'
import { CreateScheduleCommand, Scheduler } from '@aws-sdk/client-scheduler'
import { DynamoDBDocument, PutCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'

import { invokeHandler } from '@/utils/tests/helpers/event'

const ddbMock = mockClient(DynamoDBDocument)
const s3Mock = mockClient(S3)
const lambdaMock = mockClient(Lambda)
const schedulerMock = mockClient(Scheduler)
const apiGwMock = mockClient(ApiGatewayV2)

jest.mock('uuid', () => ({ v4: () => 'mock-bot-id' }))
jest.mock('@/utils/code', () => ({
  getCodeFile: jest.fn().mockResolvedValue(Buffer.from('zip')),
  getBotSampleCode: jest.fn().mockReturnValue('code'),
  getCompleteBotCode: jest.fn().mockReturnValue('code'),
}))

const { handler } = require('../index')

beforeEach(() => {
  ddbMock.reset()
  s3Mock.reset()
  lambdaMock.reset()
  schedulerMock.reset()
  apiGwMock.reset()

  s3Mock.on(PutObjectCommand).resolves({})
  lambdaMock.on(CreateFunctionCommand).resolves({
    FunctionArn: 'arn:aws:lambda:us-east-1:123:function:test-fn',
  })
  apiGwMock.on(CreateApiCommand).resolves({
    ApiId: 'api-123',
    ApiEndpoint: 'https://api-123.execute-api.us-east-1.amazonaws.com',
  })
  schedulerMock.on(CreateScheduleCommand).resolves({})
  ddbMock.on(PutCommand).resolves({})
})

describe('Bot Create Endpoint', () => {
  it('creates a bot and returns success with bot data', async () => {
    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.botId).toBe('mock-bot-id')
    expect(result.body.data.userId).toBe('user-1')
    expect(result.body.data.apiId).toBe('api-123')
    expect(result.body.data.active).toBe(false)
  })

  it('returns error when unauthenticated', async () => {
    const result = await invokeHandler(handler, {
      pathParameters: {},
      requestContext: {
        accountId: '123456789',
        apiId: 'test-api',
        authorizer: {},
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
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain('Unauthorized')
  })

  it('returns error when Lambda creation fails', async () => {
    lambdaMock
      .on(CreateFunctionCommand)
      .rejects(new Error('Lambda limit exceeded'))

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1' },
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain('Lambda limit exceeded')
  })

  it('stores bot with correct sortKey in DynamoDB', async () => {
    await invokeHandler(handler, {
      pathParameters: { userId: 'user-1' },
    })

    const putCalls = ddbMock.commandCalls(PutCommand)
    expect(putCalls).toHaveLength(1)
    expect(putCalls[0].args[0].input.Item!.sortKey).toBe('#BOT#mock-bot-id')
  })

  it('returns statusCode 200 even on error (API Gateway pattern)', async () => {
    lambdaMock.on(CreateFunctionCommand).rejects(new Error('fail'))

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1' },
    })

    expect(result.statusCode).toBe(200)
    expect(result.body.success).toBe(false)
  })
})
