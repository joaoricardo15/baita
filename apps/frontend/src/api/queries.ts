import {
  IBot,
  IBotLog,
  IBotTemplate,
  IConnection,
  IContent,
  IFeeling,
  IGuide,
  IPlace,
  ITodo,
} from '@baita/shared'

import { getApiResponse } from './client'

export const fetchBots = () => getApiResponse<IBot[]>('get', 'bots')

export const fetchBot = (botId: string) =>
  getApiResponse<IBot>('get', `bots/${botId}`)

export const fetchBotTemplates = () =>
  getApiResponse<IBotTemplate[]>('get', 'bot-templates')

export const fetchLogs = (botId: string) =>
  getApiResponse<IBotLog[]>('get', `bots/${botId}/logs`)

export const fetchTodo = () => getApiResponse<ITodo>('get', 'data/todo')

export const fetchContent = () => getApiResponse<IContent[]>('get', 'content')

export const fetchConnections = () =>
  getApiResponse<IConnection[]>('get', 'connections')

export const fetchConnectionHealth = (connectionId: string) =>
  getApiResponse<{ status: string; message?: string }>(
    'post',
    `connections/${connectionId}/health`
  )

export const fetchFeelings = () =>
  getApiResponse<IFeeling[]>('get', 'data/feeling')

export const fetchPlaces = () => getApiResponse<IPlace[]>('get', 'data/place')

export const fetchGuides = () => getApiResponse<IGuide[]>('get', 'data/guide')

export const fetchImageUploadUrl = (imageId: string) =>
  getApiResponse<string>('post', `data/image/${imageId}/upload`)
