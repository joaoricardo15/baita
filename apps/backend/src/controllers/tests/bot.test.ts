process.env.CORE_TABLE = 'test-table'
process.env.SERVICE_PREFIX = 'baita-backend-prod'
process.env.BOT_ENGINE_ARN = 'arn:aws:lambda:us-east-1:123:function:bot-engine'
process.env.BOT_SCHEDULER_ROLE = 'arn:aws:iam::123:role/scheduler'
process.env.BOT_EXECUTION_LOG_GROUP =
  '/aws/lambda/baita-backend-prod-bot-engine'

import {
  CreateScheduleCommand,
  CreateScheduleGroupCommand,
  DeleteScheduleGroupCommand,
  Scheduler,
} from '@aws-sdk/client-scheduler'
import {
  DeleteCommand,
  DynamoDBDocument,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'

const ddbMock = mockClient(DynamoDBDocument)
const schedulerMock = mockClient(Scheduler)

import Bot from '../bot'

beforeEach(() => {
  ddbMock.reset()
  schedulerMock.reset()
})

describe('Bot.deleteBot', () => {
  it('deletes scheduler group BEFORE DynamoDB record', async () => {
    const callOrder: string[] = []

    ddbMock.on(GetCommand).resolves({ Item: { botId: 'bot1' } })

    schedulerMock.on(DeleteScheduleGroupCommand).callsFake(() => {
      callOrder.push('scheduler')
      return {}
    })

    ddbMock.on(DeleteCommand).callsFake(() => {
      callOrder.push('dynamodb')
      return {}
    })

    const bot = new Bot()
    await bot.deleteBot('user1', 'bot1')

    expect(callOrder).toEqual(['scheduler', 'dynamodb'])
  })

  it('does NOT delete DynamoDB record if scheduler deletion fails', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { botId: 'bot1' } })

    schedulerMock
      .on(DeleteScheduleGroupCommand)
      .rejects(new Error('Scheduler unavailable'))

    ddbMock.on(DeleteCommand).resolves({})

    const bot = new Bot()
    await expect(bot.deleteBot('user1', 'bot1')).rejects.toThrow(
      'Scheduler unavailable'
    )

    const deleteCalls = ddbMock.commandCalls(DeleteCommand)
    expect(deleteCalls).toHaveLength(0)
  })

  it('uses correct schedule group name', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { botId: 'my-bot-id' } })
    schedulerMock.on(DeleteScheduleGroupCommand).resolves({})
    ddbMock.on(DeleteCommand).resolves({})

    const bot = new Bot()
    await bot.deleteBot('user1', 'my-bot-id')

    const calls = schedulerMock.commandCalls(DeleteScheduleGroupCommand)
    expect(calls[0].args[0].input.Name).toBe('baita-backend-prod-bot-my-bot-id')
  })

  it('throws if bot does not exist', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const bot = new Bot()
    await expect(bot.deleteBot('user1', 'nonexistent')).rejects.toThrow(
      'Bot not found'
    )

    const schedulerCalls = schedulerMock.commandCalls(
      DeleteScheduleGroupCommand
    )
    expect(schedulerCalls).toHaveLength(0)
  })
})

describe('Bot.createBot', () => {
  it('creates scheduler group and schedule before DynamoDB record', async () => {
    const callOrder: string[] = []

    schedulerMock.on(CreateScheduleGroupCommand).callsFake(() => {
      callOrder.push('createGroup')
      return {}
    })
    schedulerMock.on(CreateScheduleCommand).callsFake(() => {
      callOrder.push('createSchedule')
      return {}
    })
    ddbMock.on(PutCommand).callsFake(() => {
      callOrder.push('dynamodb')
      return {}
    })

    const bot = new Bot()
    await bot.createBot('user1')

    expect(callOrder).toEqual(['createGroup', 'createSchedule', 'dynamodb'])
  })

  it('returns a bot with generated botId', async () => {
    schedulerMock.on(CreateScheduleGroupCommand).resolves({})
    schedulerMock.on(CreateScheduleCommand).resolves({})
    ddbMock.on(PutCommand).resolves({})

    const bot = new Bot()
    const result = await bot.createBot('user1')

    expect(result.botId).toBeDefined()
    expect(result.botId.length).toBeGreaterThan(0)
    expect(result.active).toBe(false)
    expect(result.triggerSamples).toEqual([])
  })
})

describe('Bot.addTriggerSample', () => {
  it('caps triggerSamples at MAX_TRIGGER_SAMPLES (10)', async () => {
    const existingSamples = Array.from({ length: 10 }, (_, i) => ({
      status: 'success',
      inputData: null,
      outputData: { index: i },
      timestamp: i,
    }))

    ddbMock.on(GetCommand).resolves({
      Item: { botId: 'bot1', triggerSamples: existingSamples },
    })
    ddbMock.on(UpdateCommand).resolves({ Attributes: {} })

    const bot = new Bot()
    await bot.addTriggerSample('user1', 'bot1', {
      status: 'success' as any,
      inputData: {},
      outputData: { index: 'new' },
      timestamp: 999,
    })

    const updateCalls = ddbMock.commandCalls(UpdateCommand)
    expect(updateCalls).toHaveLength(1)
    const values = updateCalls[0].args[0].input.ExpressionAttributeValues
    const samplesValue = values?.[':value0'] as any[]
    expect(samplesValue).toHaveLength(10)
    expect(samplesValue[9].outputData.index).toBe('new')
    expect(samplesValue[0].outputData.index).toBe(1)
  })

  it('appends when under the limit', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { botId: 'bot1', triggerSamples: [{ status: 'success' }] },
    })
    ddbMock.on(UpdateCommand).resolves({ Attributes: {} })

    const bot = new Bot()
    await bot.addTriggerSample('user1', 'bot1', {
      status: 'success' as any,
      inputData: {},
      outputData: { new: true },
      timestamp: 1,
    })

    const updateCalls = ddbMock.commandCalls(UpdateCommand)
    const values = updateCalls[0].args[0].input.ExpressionAttributeValues
    const samplesValue = values?.[':value0'] as any[]
    expect(samplesValue).toHaveLength(2)
  })

  it('handles bot with no existing triggerSamples', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { botId: 'bot1' },
    })
    ddbMock.on(UpdateCommand).resolves({ Attributes: {} })

    const bot = new Bot()
    await bot.addTriggerSample('user1', 'bot1', {
      status: 'success' as any,
      inputData: {},
      outputData: null,
      timestamp: 1,
    })

    const updateCalls = ddbMock.commandCalls(UpdateCommand)
    const values = updateCalls[0].args[0].input.ExpressionAttributeValues
    const samplesValue = values?.[':value0'] as any[]
    expect(samplesValue).toHaveLength(1)
  })
})
