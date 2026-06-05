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

export const fetchBots = (userId: string) =>
  getApiResponse<IBot[]>('post', `user/${userId}/resource/bot/list`)

export const fetchBot = (userId: string, botId: string) =>
  getApiResponse<IBot>('post', `user/${userId}/resource/bot/read/${botId}`)

export const fetchBotModels = () =>
  getApiResponse<IBotModel[]>('post', 'user/baita/resource/model/list')

export const fetchLogs = (userId: string, botId: string) =>
  getApiResponse<IBotLog[]>('get', `user/${userId}/bot/${botId}/logs`)

export const fetchTodo = (userId: string) =>
  getApiResponse<ITodo>('post', `user/${userId}/resource/todo/read`)

export const fetchContent = (userId: string) =>
  getApiResponse<IContent[]>('get', `user/${userId}/content`)

export const fetchConnections = (userId: string) =>
  getApiResponse<IAppConnection[]>(
    'post',
    `user/${userId}/resource/connection/list`
  )

export const fetchConnectionDetails = (userId: string, connectionId: string) =>
  getApiResponse<{
    connection: Record<string, unknown>
    linkedBots: { botId: string; name: string }[]
  }>('post', `user/${userId}/connection/${connectionId}/details`)

export const fetchConnectionHealth = (userId: string, connectionId: string) =>
  getApiResponse<{ status: string; message?: string }>(
    'post',
    `user/${userId}/connection/${connectionId}/health`
  )

export const fetchNotes = (userId: string) =>
  getApiResponse<INote[]>('post', `user/${userId}/resource/note/list`)

export const fetchPlaces = (userId: string) =>
  getApiResponse<IPlace[]>('post', `user/${userId}/resource/place/list`)

export const fetchImageUploadUrl = (userId: string, imageId: string) =>
  getApiResponse<string>(
    'post',
    `user/${userId}/resource/image/upload/${imageId}`
  )
