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

export const fetchBots = () => getApiResponse<IBot[]>('get', 'bots')

export const fetchBot = (botId: string) =>
  getApiResponse<IBot>('get', `bots/${botId}`)

export const fetchBotModels = () => getApiResponse<IBotModel[]>('get', 'models')

export const fetchLogs = (botId: string) =>
  getApiResponse<IBotLog[]>('get', `bots/${botId}/logs`)

export const fetchTodo = () => getApiResponse<ITodo>('get', 'data/todos')

export const fetchContent = () => getApiResponse<IContent[]>('get', 'content')

export const fetchConnections = () =>
  getApiResponse<IAppConnection[]>('get', 'connections')

export const fetchConnectionHealth = (connectionId: string) =>
  getApiResponse<{ status: string; message?: string }>(
    'post',
    `connections/${connectionId}/health`
  )

export const fetchNotes = () => getApiResponse<INote[]>('get', 'data/notes')

export const fetchPlaces = () => getApiResponse<IPlace[]>('get', 'data/places')

export const fetchImageUploadUrl = (imageId: string) =>
  getApiResponse<string>('post', `data/image/${imageId}/upload`)
