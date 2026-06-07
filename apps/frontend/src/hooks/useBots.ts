import { useContext } from 'react'

import {
  IBot,
  IBotModel,
  ITask,
  IVariable,
  ServiceType,
  VariableType,
} from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'
import { getExistingSubscription } from '@/utils/push'

export function useBots() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['bots'],
    queryFn: () => queries.fetchBots(),
    enabled: !!user,
  })
}

export function useBot(botId: string | undefined) {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['bot', botId],
    queryFn: () => queries.fetchBot(botId!),
    enabled: !!user && !!botId,
  })
}

export function useBotModels() {
  return useQuery({
    queryKey: ['botModels', 'baita'],
    queryFn: queries.fetchBotModels,
  })
}

export function useCreateBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => mutations.createBot(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

export function useUpdateBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ botId, bot }: { botId: string; bot: Partial<IBot> }) =>
      mutations.updateBot(botId, bot),
    onSuccess: (data, { botId }) => {
      queryClient.setQueryData(['bot', botId], data)
    },
  })
}

export function useDeleteBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ botId }: { botId: string }) => mutations.deleteBot(botId),
    onMutate: async ({ botId }) => {
      await queryClient.cancelQueries({ queryKey: ['bots'] })
      const previous = queryClient.getQueryData<IBot[]>(['bots'])
      queryClient.setQueryData<IBot[]>(['bots'], (old) =>
        old?.filter((b) => b.botId !== botId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['bots'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

export function useDeployBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bot: IBot) => {
      const tasks = await parseUserInputs(bot.tasks)
      return mutations.deployBot(bot.botId, { ...bot, tasks })
    },
    onSuccess: (data, bot) => {
      queryClient.setQueryData(['bot', bot.botId], data)
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

export function useDeployBotModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ model }: { model: IBotModel }) => {
      const tasks = await parseUserInputs(model.tasks)
      return mutations.deployBotModel({
        ...model,
        tasks,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

export function useTestBotTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      bot,
      taskIndex,
    }: {
      bot: IBot
      taskIndex: number
    }) => {
      const tasks = await parseUserInputs(bot.tasks)
      const updatedBot = { ...bot, tasks }
      await mutations.updateBot(updatedBot.botId, updatedBot)
      await mutations.testBotTask(updatedBot.botId, tasks[taskIndex], taskIndex)
      return queries.fetchBot(updatedBot.botId)
    },
    onSuccess: (data, { bot }) => {
      queryClient.setQueryData(['bot', bot.botId], data)
    },
  })
}

export function usePublishBotModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (model: IBotModel) => mutations.publishBotModel(model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botModels'] })
    },
  })
}

export function useDeleteBotModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (modelId: string) => mutations.deleteBotModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botModels'] })
    },
  })
}

export function getBotInputs(tasks: ITask[]) {
  const inputs: IVariable[] = []

  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].sampleResult && tasks[i].sampleResult?.outputData) {
      const taskIndex = i
      const serviceLabel = tasks[i].service?.label
      const groupName =
        taskIndex === 0
          ? serviceLabel
            ? `Trigger: ${serviceLabel}`
            : ServiceType.trigger
          : serviceLabel
            ? `${taskIndex}. ${serviceLabel}`
            : `task ${taskIndex}`
      const outputData = tasks[taskIndex].sampleResult?.outputData

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function parseUserInputs(tasks: ITask[]) {
  const serviceTasks = tasks.map((task) => ({
    taskId: task.taskId,
    fields: task.service?.config?.inputFields || [],
  }))

  let updatedTokenField: { taskId: number; field: IVariable } | undefined
  let updatedTimeZoneField: { taskId: number; field: IVariable } | undefined
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
