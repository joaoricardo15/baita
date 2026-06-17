import {
  IBot,
  IBotTemplate,
  IContent,
  IFeeling,
  IPlace,
  ITask,
  ITaskExecutionResult,
  ITodoTask,
} from '@baita/shared'

import { getApiResponse } from './client'

export const createBot = () => getApiResponse<IBot>('post', 'bots')

export const updateBot = (botId: string, bot: Partial<IBot>) =>
  getApiResponse<IBot>('patch', `bots/${botId}`, bot)

export const deleteBot = (botId: string) =>
  getApiResponse<void>('delete', `bots/${botId}`)

export const deployBot = (botId: string, bot: Partial<IBot>) =>
  getApiResponse<IBot>('post', `bots/${botId}/deploy`, bot)

export const deployBotTemplate = (template: IBotTemplate) =>
  getApiResponse<IBot>(
    'post',
    `bot-templates/${template.templateId}/deploy`,
    template
  )

export const testBotTask = (botId: string, task: ITask, taskIndex: number) =>
  getApiResponse<ITaskExecutionResult>('post', `bots/${botId}/test`, {
    task,
    taskIndex,
  })

export const updateTodo = (tasks: ITodoTask[]) =>
  getApiResponse<ITodoTask[]>('put', 'data/todo', {
    tasks,
  })

export const reactToContent = (content: IContent, reaction: string) =>
  getApiResponse<void>('patch', `content/${content.contentId}`, {
    reaction,
  })

export const createConnection = (connectorId: string, apiKey: string) =>
  getApiResponse<void>('post', 'connections', {
    connectorId,
    apiKey,
  })

export const deleteConnection = (connectionId: string) =>
  getApiResponse<void>('delete', `connections/${connectionId}`)

export const createFeeling = (feelingId: string, feeling: IFeeling) =>
  getApiResponse<IFeeling>('put', `data/feeling/${feelingId}`, feeling)

export const deleteFeeling = (feelingId: string) =>
  getApiResponse<IFeeling>('delete', `data/feeling/${feelingId}`)

export const createPlace = (placeId: string, place: IPlace) =>
  getApiResponse<IPlace>('put', `data/place/${placeId}`, place)

export const updatePlace = (placeId: string, place: IPlace) =>
  getApiResponse<IPlace>('put', `data/place/${placeId}`, place)

export const deletePlace = (placeId: string) =>
  getApiResponse<IPlace>('delete', `data/place/${placeId}`)

export const removeImage = (imageId: string) =>
  getApiResponse<void>(
    'delete',
    `data/image/files/${encodeURIComponent(imageId)}`
  )

export const publishBotTemplate = (template: IBotTemplate) =>
  getApiResponse<IBotTemplate>(
    'put',
    `bot-templates/${template.templateId}`,
    template
  )

export const deleteBotTemplate = (templateId: string) =>
  getApiResponse<void>('delete', `bot-templates/${templateId}`)

export const deleteUser = () => getApiResponse<void>('delete', 'user')
