import {
  IAppConnection,
  IBot,
  IBotLog,
  IBotModel,
  IContent,
  INote,
  IPlace,
  ITodo,
} from '@baita/shared'

import { getApiResponse } from './client'

export const fetchBots = () =>
  getApiResponse<IBot[]>('post', 'resource/bot/list')

export const fetchBot = (botId: string) =>
  getApiResponse<IBot>('post', `resource/bot/read/${botId}`)

export const fetchBotModels = () =>
  getApiResponse<IBotModel[]>('post', 'model/list')

export const fetchLogs = (botId: string) =>
  getApiResponse<IBotLog[]>('post', `bot/logs/${botId}`)

export const fetchTodo = () =>
  getApiResponse<ITodo>('post', 'resource/todo/read')

export const fetchContent = () => getApiResponse<IContent[]>('get', 'content')

export const fetchConnections = () =>
  getApiResponse<IAppConnection[]>('post', 'resource/connection/list')

export const fetchConnectionHealth = (connectionId: string) =>
  getApiResponse<{ status: string; message?: string }>(
    'post',
    `connection/health/${connectionId}`
  )

export const fetchNotes = () =>
  getApiResponse<INote[]>('post', 'resource/note/list')

export const fetchPlaces = () =>
  getApiResponse<IPlace[]>('post', 'resource/place/list')

export const fetchImageUploadUrl = (imageId: string) =>
  getApiResponse<string>('post', `resource/image/upload/${imageId}`)
