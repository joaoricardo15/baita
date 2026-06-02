import { createContext, FC, ReactNode, useState } from 'react'

import { IBot, IBotModel, ITask } from '@baita/shared'
import { IVariable, ServiceType, VariableType } from '@baita/shared'
import { getExistingSubscription } from '@/utils/push'
import ApiRequest from '@/utils/requests'

export const BotContext = createContext<{
  bots: IBot[] | undefined
  getBots: () => Promise<void>
  bot: IBot | undefined
  setBot: (bot?: IBot) => void
  getBot: (botId: string) => Promise<void>
  createBot: () => Promise<string>
  deleteBot: (botId: string, apiId: string) => Promise<void>
  getBotInputs: (tasks: ITask[]) => IVariable[]
  updateBot: (bot: IBot) => Promise<void>
  deployBot: (bot: IBot) => Promise<IBot>
  testBotTask: (bot: IBot, taskIndex: number) => Promise<void>
  updateBotTask: (
    botId: string,
    taskIndex: number,
    task: ITask,
    save?: boolean
  ) => Promise<void>
  botModels: IBotModel[] | undefined
  getBotModels: () => Promise<void>
  deleteBotModel: (modelId: string) => Promise<void>
  deployBotModel: (botId: string, model: IBotModel) => Promise<IBot>
  publishBotModel: (model: IBotModel) => Promise<IBotModel>
}>({
  bots: undefined,
  getBots: () => Promise.resolve(),
  bot: undefined,
  setBot: () => undefined,
  getBot: () => Promise.resolve(),
  createBot: () => Promise.resolve(''),
  deleteBot: () => Promise.resolve(),
  getBotInputs: () => [],
  updateBot: () => Promise.resolve(),
  deployBot: () => Promise.resolve({} as IBot),
  testBotTask: () => Promise.resolve(),
  updateBotTask: () => Promise.resolve(),
  botModels: undefined,
  getBotModels: () => Promise.resolve(),
  deleteBotModel: () => Promise.resolve(),
  deployBotModel: () => Promise.resolve({} as IBot),
  publishBotModel: () => Promise.resolve({} as IBotModel),
})

const BotProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const apiRequest = ApiRequest()
  const [bot, setBot] = useState<IBot>()
  const [bots, setBots] = useState<IBot[]>()
  const [botModels, setBotModels] = useState<IBotModel[]>()

  const createBot = () => {
    return apiRequest.createBot().then((bot) => {
      setBot(bot)
      return bot.botId
    })
  }

  const deleteBot = (botId: string, apiId: string) => {
    setBots(bots?.filter((bot) => bot.botId !== botId))
    return apiRequest.deleteBot(botId, apiId).then(() => {
      return
    })
  }

  const getBot = (botId: string) => {
    return apiRequest.getBot(botId).then((bot) => {
      setBot(bot)
      return
    })
  }

  const getBots = () => {
    return apiRequest.getBots().then((bots) => {
      setBots(bots)
      return
    })
  }

  const updateBot = (bot: IBot) => {
    setBot(bot)
    return apiRequest.updateBot(bot.botId, bot).then(() => {
      return
    })
  }

  const deployBot = (bot: IBot) => {
    return parseUserInputs(bot.tasks).then((tasks) =>
      apiRequest.deployBot(bot.botId, { ...bot, tasks }).then((bot) => {
        setBot(bot)
        getBots()
        return bot
      })
    )
  }

  const testBotTask = (bot: IBot, taskIndex: number) => {
    return parseUserInputs(bot.tasks).then((tasks) => {
      const updatedBot = { ...bot, tasks }
      return apiRequest.updateBot(updatedBot.botId, updatedBot).then(() =>
        apiRequest
          .testBot(updatedBot.botId, tasks[taskIndex], taskIndex)
          .then(() =>
            apiRequest.getBot(updatedBot.botId).then((bot) => {
              setBot(bot)
              return
            })
          )
      )
    })
  }

  const updateBotTask = (
    botId: string,
    taskIndex: number,
    task: ITask,
    save: boolean = true
  ) => {
    const updatedBot = {
      ...bot,
      tasks: bot?.tasks.map((t, i) => (i !== taskIndex ? t : task)),
    } as IBot
    setBot(updatedBot)
    return !save
      ? Promise.resolve()
      : apiRequest.updateBot(botId, updatedBot).then(() => {
          return
        })
  }

  const getBotInputs = (tasks: ITask[]) => {
    const inputs: IVariable[] = []

    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].sampleResult && tasks[i].sampleResult?.outputData) {
        const taskIndex = i
        const groupName =
          taskIndex === 0 ? ServiceType.trigger : `task ${taskIndex}`
        const outputData = tasks[taskIndex].sampleResult?.outputData

        const getFromVariable = (name: string, value: any) => {
          inputs.push({
            name,
            value,
            type: VariableType.output,
            label: `${name}: ${value}`,
            groupName: groupName,
            outputIndex: taskIndex,
            outputPath: name,
          })
        }

        const getFromArray = (name: string, array: any) => {
          inputs.push({
            name: name,
            value: array,
            type: VariableType.output,
            label: `${name ? `${groupName}.${name}` : groupName}: [ ... ]`,
            groupName: groupName,
            outputIndex: taskIndex,
            outputPath: name,
          })
          for (let i = 0; i < array.length; i++) {
            const updatedName = name ? `${name}.${i}` : i.toString()
            const value = array[i]
            getInput(updatedName, value)
          }
        }

        const getFromObject = (name: string, object: any) => {
          const array = Object.keys(object)
          inputs.push({
            name: name,
            value: object,
            type: VariableType.output,
            label: `${name ? `${groupName}.${name}` : groupName}: { ... }`,
            groupName: groupName,
            outputIndex: taskIndex,
            outputPath: name,
          })
          for (let i = 0; i < array.length; i++) {
            const key = array[i]
            const updatedName = name ? `${name}.${key}` : key
            const value = object[key]
            getInput(updatedName, value)
          }
        }

        const getInput = (name: string, value: any) => {
          if (!value) return
          if (typeof value === 'string' || typeof value === 'number')
            getFromVariable(name, value)
          else if (Array.isArray(value)) getFromArray(name, value)
          else if (typeof value === 'object') getFromObject(name, value)
        }

        getInput('', outputData)
      }
    }

    return inputs
  }

  const getBotModels = () => {
    return apiRequest.getBotModels().then((botModels) => {
      setBotModels(botModels)
      return
    })
  }

  const deployBotModel = (botId: string, model: IBotModel) => {
    return parseUserInputs(model.tasks).then((tasks) =>
      apiRequest.deployBotModel(botId, { ...model, tasks }).then((botModel) => {
        getBots()
        return botModel
      })
    )
  }

  const deleteBotModel = (modelId: string) => {
    return apiRequest.deleteBotModel(modelId).then((botModel) => {
      getBotModels()
      return botModel
    })
  }

  const publishBotModel = (botModel: IBotModel) => {
    return apiRequest.publishBotModel(botModel).then((botModel) => {
      getBotModels()
      return botModel
    })
  }

  return (
    <BotContext.Provider
      value={{
        bots,
        getBots,
        bot,
        getBot,
        createBot,
        deleteBot,
        updateBot,
        deployBot,
        testBotTask,
        updateBotTask,
        getBotInputs,
        setBot,
        botModels,
        getBotModels,
        deployBotModel,
        deleteBotModel,
        publishBotModel,
      }}
    >
      {children}
    </BotContext.Provider>
  )
}

export default BotProvider

const parseUserInputs = async (tasks: ITask[]) => {
  const serviceTasks = tasks.map((task) => ({
    taskId: task.taskId,
    fields: task.service?.config?.inputFields || [],
  }))

  let updatedTokenField: { taskId: number; field: IVariable }
  let updatedTimeZoneField: { taskId: number; field: IVariable }
  for (const task of serviceTasks) {
    for (const field of task.fields) {
      if (field.label === 'Token') {
        const subscription = await getExistingSubscription()
        const token = subscription ? JSON.stringify(subscription.toJSON()) : ''
        updatedTokenField = {
          taskId: task.taskId,
          field: { ...field, value: token, sampleValue: token },
        }
      } else if (field.label === 'Time Zone') {
        const { timeZone } = Intl.DateTimeFormat().resolvedOptions()
        updatedTimeZoneField = {
          taskId: task.taskId,
          field: { ...field, value: timeZone, sampleValue: timeZone },
        }
      }
    }
  }

  return tasks.map((task) => ({
    ...task,
    inputData: [
      ...task.inputData.map((field) => {
        if (updatedTokenField && field.label === 'Token') {
          return updatedTokenField.field
        } else if (updatedTimeZoneField && field.label === 'Time Zone') {
          return updatedTimeZoneField.field
        }

        return field
      }),
      ...(updatedTokenField &&
      task.taskId === updatedTokenField.taskId &&
      !task.inputData.some((field) => field.label === 'Token')
        ? [updatedTokenField.field]
        : []),
      ...(updatedTimeZoneField &&
      task.taskId === updatedTimeZoneField.taskId &&
      !task.inputData.some((field) => field.label === 'Time Zone')
        ? [updatedTimeZoneField.field]
        : []),
    ],
  }))
}
