import {
  IBot,
  IBotModel,
  IContent,
  INote,
  IPlace,
  ITask,
  ITaskExecutionResult,
  ITodoTask,
} from '@baita/shared'

import { getApiResponse } from './client'

export const createBot = () => getApiResponse<IBot>('post', 'bot/create')

export const updateBot = (botId: string, bot: Partial<IBot>) =>
  getApiResponse<IBot>('post', `bot/update/${botId}`, bot)

export const deleteBot = (botId: string) =>
  getApiResponse<void>('post', `bot/delete/${botId}`)

export const deployBot = (botId: string, bot: Partial<IBot>) =>
  getApiResponse<IBot>('post', `bot/deploy/${botId}`, bot)

export const deployBotModel = (model: IBotModel) =>
  getApiResponse<IBot>('post', 'bot/model', model)

export const testBotTask = (botId: string, task: ITask, taskIndex: number) =>
  getApiResponse<ITaskExecutionResult>('post', `bot/test/${botId}`, {
    task,
    taskIndex,
  })

export const updateTodo = (tasks: ITodoTask[]) =>
  getApiResponse<ITodoTask[]>('post', 'resource/todo/update', {
    tasks,
  })

export const reactToContent = (content: IContent, reaction: string) =>
  getApiResponse<void>('post', `resource/content/create/${content.contentId}`, {
    ...content,
    reaction,
  })

export const createConnection = (connectorId: string, apiKey: string) =>
  getApiResponse<void>('post', 'connection/create', {
    connectorId,
    apiKey,
  })

export const deleteConnection = (connectionId: string) =>
  getApiResponse<void>('post', `resource/connection/delete/${connectionId}`)

export const createNote = (noteId: string, note: INote) =>
  getApiResponse<INote>('post', `resource/note/create/${noteId}`, note)

export const updateNote = (noteId: string, note: INote) =>
  getApiResponse<INote>('post', `resource/note/update/${noteId}`, note)

export const deleteNote = (noteId: string) =>
  getApiResponse<INote>('post', `resource/note/delete/${noteId}`)

export const createPlace = (placeId: string, place: IPlace) =>
  getApiResponse<IPlace>('post', `resource/place/create/${placeId}`, place)

export const updatePlace = (placeId: string, place: IPlace) =>
  getApiResponse<IPlace>('post', `resource/place/update/${placeId}`, place)

export const deletePlace = (placeId: string) =>
  getApiResponse<IPlace>('post', `resource/place/delete/${placeId}`)

export const removeImage = (imageId: string) =>
  getApiResponse<void>('post', encodeURI(`resource/image/remove/${imageId}`))

export const publishBotModel = (model: IBotModel) =>
  getApiResponse<IBotModel>('post', `model/create/${model.modelId}`, model)

export const deleteBotModel = (modelId: string) =>
  getApiResponse<void>('post', `model/delete/${modelId}`)

export const deleteUser = () => getApiResponse<void>('delete', 'user')
