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

export const createBot = (userId: string) =>
  getApiResponse<IBot>('post', `user/${userId}/bot/create`)

export const updateBot = (userId: string, botId: string, bot: Partial<IBot>) =>
  getApiResponse<IBot>('post', `user/${userId}/bot/update/${botId}`, bot)

export const deleteBot = (userId: string, botId: string) =>
  getApiResponse<void>('post', `user/${userId}/bot/delete/${botId}`)

export const deployBot = (userId: string, botId: string, bot: Partial<IBot>) =>
  getApiResponse<IBot>('post', `user/${userId}/bot/deploy/${botId}`, bot)

export const deployBotModel = (
  userId: string,
  _modelId: string,
  model: IBotModel
) => getApiResponse<IBot>('post', `user/${userId}/bot/model`, model)

export const testBotTask = (
  userId: string,
  botId: string,
  task: ITask,
  taskIndex: number
) =>
  getApiResponse<ITaskExecutionResult>(
    'post',
    `user/${userId}/bot/test/${botId}`,
    { task, taskIndex }
  )

export const updateTodo = (userId: string, tasks: ITodoTask[]) =>
  getApiResponse<ITodoTask[]>('post', `user/${userId}/resource/todo/update`, {
    tasks,
  })

export const reactToContent = (
  userId: string,
  content: IContent,
  reaction: string
) =>
  getApiResponse<void>(
    'post',
    `user/${userId}/resource/content/create/${content.contentId}`,
    { ...content, reaction }
  )

export const createConnection = (
  userId: string,
  connectorId: string,
  apiKey: string
) =>
  getApiResponse<void>('post', `user/${userId}/connection/create`, {
    connectorId,
    apiKey,
  })

export const deleteConnection = (userId: string, connectionId: string) =>
  getApiResponse<void>(
    'post',
    `user/${userId}/resource/connection/delete/${connectionId}`
  )

export const createNote = (userId: string, noteId: string, note: INote) =>
  getApiResponse<INote>(
    'post',
    `user/${userId}/resource/note/create/${noteId}`,
    note
  )

export const updateNote = (userId: string, noteId: string, note: INote) =>
  getApiResponse<INote>(
    'post',
    `user/${userId}/resource/note/update/${noteId}`,
    note
  )

export const deleteNote = (userId: string, noteId: string) =>
  getApiResponse<INote>('post', `user/${userId}/resource/note/delete/${noteId}`)

export const createPlace = (userId: string, placeId: string, place: IPlace) =>
  getApiResponse<IPlace>(
    'post',
    `user/${userId}/resource/place/create/${placeId}`,
    place
  )

export const updatePlace = (userId: string, placeId: string, place: IPlace) =>
  getApiResponse<IPlace>(
    'post',
    `user/${userId}/resource/place/update/${placeId}`,
    place
  )

export const deletePlace = (userId: string, placeId: string) =>
  getApiResponse<IPlace>(
    'post',
    `user/${userId}/resource/place/delete/${placeId}`
  )

export const removeImage = (userId: string, imageId: string) =>
  getApiResponse<void>(
    'post',
    encodeURI(`user/${userId}/resource/image/remove/${imageId}`)
  )

export const publishBotModel = (model: IBotModel) =>
  getApiResponse<IBotModel>(
    'post',
    `user/baita/resource/model/create/${model.modelId}`,
    model
  )

export const deleteBotModel = (modelId: string) =>
  getApiResponse<void>('post', `user/baita/resource/model/delete/${modelId}`)

export const deleteUser = (userId: string) =>
  getApiResponse<void>('delete', `user/${userId}`)
