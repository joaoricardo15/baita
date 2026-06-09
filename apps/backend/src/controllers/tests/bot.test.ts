process.env.CORE_TABLE = 'test-table'
process.env.BOTS_BUCKET = 'test-bots-bucket'
process.env.BOTS_PERMISSION = 'arn:aws:iam::123:role/test-role'
process.env.SERVICE_PREFIX = 'baita-prod'

import {
  ApiGatewayV2,
  CreateApiCommand,
  DeleteApiCommand,
} from '@aws-sdk/client-apigatewayv2'
import {
  CloudWatchLogs,
  DeleteLogGroupCommand,
  GetQueryResultsCommand,
  StartQueryCommand,
} from '@aws-sdk/client-cloudwatch-logs'
import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  Lambda,
  UpdateFunctionCodeCommand,
} from '@aws-sdk/client-lambda'
import { DeleteObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3'
import {
  CreateScheduleCommand,
  CreateScheduleGroupCommand,
  DeleteScheduleGroupCommand,
  Scheduler,
  UpdateScheduleCommand,
} from '@aws-sdk/client-scheduler'
import {
  DeleteCommand,
  DynamoDBDocument,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'

const ddbMock = mockClient(DynamoDBDocument)
const s3Mock = mockClient(S3)
const lambdaMock = mockClient(Lambda)
const schedulerMock = mockClient(Scheduler)
const apiGwMock = mockClient(ApiGatewayV2)
const cwlMock = mockClient(CloudWatchLogs)

jest.mock('@/utils/code', () => ({
  getCodeFile: jest.fn().mockResolvedValue(Buffer.from('zip-content')),
  getBotSampleCode: jest.fn().mockReturnValue('sample-code'),
  getCompleteBotCode: jest.fn().mockReturnValue('complete-code'),
}))

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import Bot from '../bot'

beforeEach(() => {
  ddbMock.reset()
  s3Mock.reset()
  lambdaMock.reset()
  schedulerMock.reset()
  apiGwMock.reset()
  cwlMock.reset()
})

// Journey: Bot Automation — create, deploy, test, log, and delete bots
describe('Bot', () => {
  describe('createBot', () => {
    beforeEach(() => {
      s3Mock.on(PutObjectCommand).resolves({})
      lambdaMock.on(CreateFunctionCommand).resolves({
        FunctionArn: 'arn:aws:lambda:us-east-1:123:function:test-fn',
      })
      apiGwMock.on(CreateApiCommand).resolves({
        ApiId: 'api-123',
        ApiEndpoint: 'https://api-123.execute-api.us-east-1.amazonaws.com',
      })
      schedulerMock.on(CreateScheduleGroupCommand).resolves({})
      schedulerMock.on(CreateScheduleCommand).resolves({})
      ddbMock.on(PutCommand).resolves({})
    })

    it('creates S3 code file, Lambda, API Gateway, Scheduler, and DynamoDB entry', async () => {
      const bot = new Bot()
      const result = await bot.createBot('user-1')

      expect(result.botId).toBe('mock-uuid-1234')
      expect(result.apiId).toBe('api-123')
      expect(result.triggerUrl).toBe(
        'https://api-123.execute-api.us-east-1.amazonaws.com/bot'
      )
      expect(result.active).toBe(false)
      expect(result.tasks).toHaveLength(1)
    })

    it('uploads zip to correct S3 location', async () => {
      const bot = new Bot()
      await bot.createBot('user-1')

      const s3Calls = s3Mock.commandCalls(PutObjectCommand)
      expect(s3Calls).toHaveLength(1)
      expect(s3Calls[0].args[0].input).toEqual({
        Bucket: 'test-bots-bucket',
        Key: 'mock-uuid-1234.zip',
        Body: Buffer.from('zip-content'),
      })
    })

    it('creates Lambda with correct configuration', async () => {
      const bot = new Bot()
      await bot.createBot('user-1')

      const lambdaCalls = lambdaMock.commandCalls(CreateFunctionCommand)
      expect(lambdaCalls).toHaveLength(1)
      expect(lambdaCalls[0].args[0].input.FunctionName).toBe(
        'baita-prod-bot-mock-uuid-1234'
      )
      expect(lambdaCalls[0].args[0].input.Runtime).toBe('nodejs20.x')
      expect(lambdaCalls[0].args[0].input.Role).toBe(
        'arn:aws:iam::123:role/test-role'
      )
    })

    it('creates disabled scheduler', async () => {
      const bot = new Bot()
      await bot.createBot('user-1')

      const schedCalls = schedulerMock.commandCalls(CreateScheduleCommand)
      expect(schedCalls).toHaveLength(1)
      expect(schedCalls[0].args[0].input.State).toBe('DISABLED')
    })

    it('stores bot in DynamoDB with #BOT# sortKey', async () => {
      const bot = new Bot()
      await bot.createBot('user-1')

      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
      expect(putCalls[0].args[0].input.Item!.sortKey).toBe(
        '#BOT#mock-uuid-1234'
      )
      expect(putCalls[0].args[0].input.Item!.userId).toBe('user-1')
    })
  })

  describe('updateBot', () => {
    it('updates bot fields in DynamoDB', async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          botId: 'bot-1',
          name: 'Updated Bot',
          active: true,
        },
      })

      const bot = new Bot()
      const result = await bot.updateBot(
        'user-1',
        'bot-1',
        'Updated Bot',
        'image.png',
        'A description',
        true,
        [{ taskId: 1, inputData: [] }] as any
      )

      expect(result).toEqual({
        botId: 'bot-1',
        name: 'Updated Bot',
        active: true,
      })

      const updateCalls = ddbMock.commandCalls(UpdateCommand)
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0].args[0].input.Key).toEqual({
        userId: 'user-1',
        sortKey: '#BOT#bot-1',
      })
    })
  })

  describe('deleteBot', () => {
    beforeEach(() => {
      ddbMock.on(DeleteCommand).resolves({})
      apiGwMock.on(DeleteApiCommand).resolves({})
      schedulerMock.on(DeleteScheduleGroupCommand).resolves({})
      lambdaMock.on(DeleteFunctionCommand).resolves({})
      cwlMock.on(DeleteLogGroupCommand).resolves({})
      s3Mock.on(DeleteObjectCommand).resolves({})
    })

    it('deletes all bot resources', async () => {
      const bot = new Bot()
      await bot.deleteBot('user-1', 'bot-1', 'api-1')

      expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1)
      expect(apiGwMock.commandCalls(DeleteApiCommand)).toHaveLength(1)
      expect(lambdaMock.commandCalls(DeleteFunctionCommand)).toHaveLength(1)
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1)
      expect(
        schedulerMock.commandCalls(DeleteScheduleGroupCommand)
      ).toHaveLength(1)
    })

    it('deletes DynamoDB entry with correct key', async () => {
      const bot = new Bot()
      await bot.deleteBot('user-1', 'bot-1', 'api-1')

      const deleteCalls = ddbMock.commandCalls(DeleteCommand)
      expect(deleteCalls[0].args[0].input.Key).toEqual({
        userId: 'user-1',
        sortKey: '#BOT#bot-1',
      })
    })

    it('deletes API Gateway with correct ApiId', async () => {
      const bot = new Bot()
      await bot.deleteBot('user-1', 'bot-1', 'api-xyz')

      const apiCalls = apiGwMock.commandCalls(DeleteApiCommand)
      expect(apiCalls[0].args[0].input.ApiId).toBe('api-xyz')
    })

    it('continues if schedule group delete fails', async () => {
      schedulerMock
        .on(DeleteScheduleGroupCommand)
        .rejects(new Error('Not found'))

      const bot = new Bot()
      await expect(
        bot.deleteBot('user-1', 'bot-1', 'api-1')
      ).resolves.toBeUndefined()
    })

    it('continues if log group delete fails', async () => {
      cwlMock
        .on(DeleteLogGroupCommand)
        .rejects(new Error('Log group not found'))

      const bot = new Bot()
      await expect(
        bot.deleteBot('user-1', 'bot-1', 'api-1')
      ).resolves.toBeUndefined()
    })
  })

  describe('deployBot', () => {
    beforeEach(() => {
      s3Mock.on(PutObjectCommand).resolves({})
      lambdaMock.on(UpdateFunctionCodeCommand).resolves({
        FunctionArn: 'arn:aws:lambda:us-east-1:123:function:test-fn',
      })
      schedulerMock.on(UpdateScheduleCommand).resolves({})
      ddbMock.on(UpdateCommand).resolves({
        Attributes: { botId: 'bot-1', active: true },
      })
    })

    it('uploads new code and updates Lambda', async () => {
      const bot = new Bot()
      await bot.deployBot('user-1', 'bot-1', 'My Bot', true, [
        { taskId: 1, inputData: [] },
      ] as any)

      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1)
      expect(lambdaMock.commandCalls(UpdateFunctionCodeCommand)).toHaveLength(1)
    })

    it('enables scheduler when first task is schedule service', async () => {
      const bot = new Bot()
      await bot.deployBot('user-1', 'bot-1', 'My Bot', true, [
        {
          taskId: 1,
          inputData: [
            { name: 'expression', value: 'rate(1 hour)' },
            { name: 'timeZone', value: 'America/Sao_Paulo' },
          ],
          service: { name: 'schedule', config: {} },
        },
      ] as any)

      const schedCalls = schedulerMock.commandCalls(UpdateScheduleCommand)
      expect(schedCalls).toHaveLength(1)
      expect(schedCalls[0].args[0].input.State).toBe('ENABLED')
      expect(schedCalls[0].args[0].input.ScheduleExpression).toBe(
        'rate(1 hour)'
      )
    })

    it('disables scheduler when bot is inactive', async () => {
      const bot = new Bot()
      await bot.deployBot('user-1', 'bot-1', 'My Bot', false, [
        { taskId: 1, inputData: [] },
      ] as any)

      const schedCalls = schedulerMock.commandCalls(UpdateScheduleCommand)
      expect(schedCalls[0].args[0].input.State).toBe('DISABLED')
    })

    it('updates DynamoDB with new bot state', async () => {
      const bot = new Bot()
      await bot.deployBot('user-1', 'bot-1', 'My Bot', true, [
        { taskId: 1, inputData: [] },
      ] as any)

      const updateCalls = ddbMock.commandCalls(UpdateCommand)
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual(
        expect.objectContaining({
          ':value0': 'My Bot',
          ':value1': [{ taskId: 1, inputData: [] }],
          ':value2': true,
        })
      )
    })
  })

  describe('getBotLogs', () => {
    it('queries CloudWatch logs and parses results', async () => {
      cwlMock.on(StartQueryCommand).resolves({ queryId: 'q-123' })
      cwlMock.on(GetQueryResultsCommand).resolves({
        status: 'Complete',
        results: [
          [
            {
              field: '@message',
              value:
                '2024-01-01T00:00:00Z\tINFO\t{"message":"hello","status":"ok"}',
            },
          ],
        ],
      })

      const bot = new Bot()
      const result = await bot.getBotLogs('bot-1', undefined)

      expect(result).toEqual([{ message: 'hello', status: 'ok' }])
    })

    it('returns empty array when log group does not exist', async () => {
      cwlMock
        .on(StartQueryCommand)
        .rejects(new Error('ResourceNotFoundException'))

      const bot = new Bot()
      const result = await bot.getBotLogs('bot-1', undefined)

      expect(result).toEqual([])
    })
  })

  describe('addTriggerSample', () => {
    it('appends sample to triggerSamples list', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      const bot = new Bot()
      await bot.addTriggerSample('user-1', 'bot-1', {
        inputData: [],
        outputData: { result: 'ok' },
        status: 'success' as any,
        timestamp: 1000,
      })

      const updateCalls = ddbMock.commandCalls(UpdateCommand)
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0].args[0].input.UpdateExpression).toContain(
        'list_append'
      )
    })
  })

  describe('addConnection', () => {
    it('sets connectionId on specific task index', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      const bot = new Bot()
      await bot.addConnection('user-1', 'bot-1', 'conn-abc', 2)

      const updateCalls = ddbMock.commandCalls(UpdateCommand)
      expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
        'SET tasks[2].connectionId = :connectionId'
      )
      expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
        ':connectionId': 'conn-abc',
      })
    })
  })
})
