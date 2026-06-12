import { Lambda } from '@aws-sdk/client-lambda'
import {
  DataType,
  decodeTriggerToken,
  IBot,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from '@baita/shared'
import { APIGatewayProxyEvent, Callback } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'

const BOT_ENGINE_ARN = process.env.BOT_ENGINE_ARN || ''
const lambda = new Lambda({})

export async function handleRun(
  event: APIGatewayProxyEvent,
  api: Api,
  callback: Callback
): Promise<void> {
  try {
    const botId = event.pathParameters?.botId
    const token = event.pathParameters?.token

    if (!botId || !token) {
      throw new Error('Missing botId or token')
    }

    const userId = decodeTriggerToken(token)
    const data = new Data(userId, 'bot')
    const bot = (await data.read(botId)) as IBot | undefined

    if (!bot) {
      throw new Error('Bot not found')
    }

    if (!bot.active) {
      const payload = parseBody(event)
      const sample: ITaskExecutionResult = {
        status: TaskExecutionStatus.success,
        inputData: payload,
        outputData: payload,
        timestamp: Date.now(),
      }
      const botController = new Bot()
      await botController.addTriggerSample(userId, botId, sample)
      api.httpResponse(callback, ApiRequestStatus.success, undefined, {
        message: 'Trigger sample stored',
      })
      return
    }

    await lambda.invoke({
      FunctionName: BOT_ENGINE_ARN,
      InvocationType: 'Event',
      Payload: JSON.stringify({
        botId,
        userId,
        payload: parseBody(event),
      }),
    })

    api.httpResponse(callback, ApiRequestStatus.success, undefined, {
      message: 'Bot execution triggered',
    })
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}

function parseBody(event: APIGatewayProxyEvent): DataType {
  if (!event.body) return {}

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString()
    : event.body

  try {
    return JSON.parse(raw) as DataType
  } catch {
    return raw as DataType
  }
}
