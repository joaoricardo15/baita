import Axios from 'axios'
import { useContext } from 'react'

import { IAppConnection } from '../models/app'
import {
  IBot,
  IBotLog,
  IBotModel,
  ITask,
  ITaskExecutionResult,
} from '../models/bot'
import { IContent, ITodo, ITodoTask } from '../models/user'
import { AuthContext } from '../providers/auth'
import { INote } from '../views/notes'
import { IPlace } from '../views/places'
import appConfig from './config'

const ApiRequest = () => {
  const { user, getToken } = useContext(AuthContext)

  const apiClient = Axios.create({
    baseURL: appConfig.apiUrl,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  apiClient.interceptors.request.use(async (config) => {
    const token = await getToken()
    config.headers.Authorization = `Bearer ${token}`
    return config
  })

  const getApiResponse = <T>(
    method: string,
    url: string,
    data?: any,
    userId = user?.userId
  ) => {
    return new Promise<T>((resolve, reject) => {
      apiClient
        .request({ url: `user/${userId}/${url}`, method, data })
        .then((response) => {
          if (!response.data) reject(response)
          if (!response.data.success)
            reject({
              message: response.data.message,
              stack: 'utils.requests',
              cause: response,
            })
          resolve(response.data.data)
        })
        .catch(reject)
    })
  }

  const getContent = () => {
    return getApiResponse<IContent[]>('get', 'content')
  }

  const reactToContent = (content: IContent, reaction: string) => {
    return getApiResponse<void>(
      'post',
      `resource/content/create/${content.contentId}`,
      { ...content, reaction }
    )
  }

  const getTodo = () => {
    return getApiResponse<ITodo>('post', 'resource/todo/read')
  }

  const updateTodo = (tasks: ITodoTask[]) => {
    return getApiResponse<ITodoTask[]>('post', 'resource/todo/update', {
      tasks,
    })
  }

  const getAppConnections = () => {
    return getApiResponse<IAppConnection[]>('post', `resource/connection/list`)
  }

  const deleteConnection = (connectionId: string) => {
    return getApiResponse<void>(
      'post',
      `resource/connection/delete/${connectionId}`
    )
  }

  const healthCheckConnection = (connectionId: string) => {
    return getApiResponse<{ status: string; message?: string }>(
      'post',
      `connection/${connectionId}/health`
    )
  }

  const getConnectionDetails = (connectionId: string) => {
    return getApiResponse<{
      connection: Record<string, unknown>
      linkedBots: { botId: string; name: string }[]
    }>('post', `connection/${connectionId}/details`)
  }

  const getBots = () => {
    return getApiResponse<IBot[]>('post', 'resource/bot/list')
  }

  const getBot = (botId: string) => {
    return getApiResponse<IBot>('post', `resource/bot/read/${botId}`)
  }

  const getImageUploadUrl = (imageId: string) => {
    return getApiResponse<string>('post', `resource/image/upload/${imageId}`)
  }

  const removeImage = (imageId: string) => {
    return getApiResponse<void>(
      'post',
      encodeURI(`resource/image/remove/${imageId}`)
    )
  }

  const addPlace = (placeId: string, place: IPlace) => {
    return getApiResponse<IPlace>(
      'post',
      `resource/place/create/${placeId}`,
      place
    )
  }

  const updatePlace = (placeId: string, place: IPlace) => {
    return getApiResponse<IPlace>(
      'post',
      `resource/place/update/${placeId}`,
      place
    )
  }

  const deletePlace = (placeId: string) => {
    return getApiResponse<IPlace>('post', `resource/place/delete/${placeId}`)
  }

  const listPlaces = () => {
    return getApiResponse<IPlace>('post', `resource/place/list`)
  }

  const getNotes = () => {
    return getApiResponse<INote[]>('post', `resource/note/list`)
  }

  const addNote = (noteId: string, note: INote) => {
    return getApiResponse<INote>('post', `resource/note/create/${noteId}`, note)
  }

  const updateNote = (noteId: string, note: any) => {
    return getApiResponse<INote>('post', `resource/note/update/${noteId}`, note)
  }

  const deleteNote = (noteId: string) => {
    return getApiResponse<INote>('post', `resource/note/delete/${noteId}`)
  }

  const createBot = () => {
    return getApiResponse<IBot>('post', 'bot')
  }

  const updateBot = (botId: string, bot: Partial<IBot>) => {
    return getApiResponse<IBot>('put', `bot/${botId}`, bot)
  }

  const deleteBot = (botId: string, apiId: string) => {
    return getApiResponse<void>('delete', `bot/${botId}/api/${apiId}`)
  }

  const deployBot = (botId: string, bot: Partial<IBot>) => {
    return getApiResponse<IBot>('post', `bot/${botId}/deploy`, bot)
  }

  const deployBotModel = (modelId: string, model: IBotModel) => {
    return getApiResponse<IBot>('post', `bot/${modelId}/bud`, model)
  }

  const getLogs = (botId: string) => {
    return getApiResponse<IBotLog[]>('get', `bot/${botId}/logs`)
  }

  const testBot = (botId: string, task: ITask, taskIndex: number) => {
    return getApiResponse<ITaskExecutionResult>(
      'post',
      `bot/${botId}/test/${taskIndex}`,
      task
    )
  }

  const getBotModels = () => {
    return getApiResponse<IBotModel[]>(
      'post',
      `resource/model/list`,
      undefined,
      'baita'
    )
  }

  const deleteBotModel = (modelId: string) => {
    return getApiResponse<void>(
      'post',
      `resource/model/delete/${modelId}`,
      undefined,
      'baita'
    )
  }

  const publishBotModel = (model: IBotModel) => {
    return getApiResponse<IBotModel>(
      'post',
      `resource/model/create/${model.modelId}`,
      model,
      'baita'
    )
  }

  return {
    getBot,
    getBots,
    getLogs,
    testBot,
    getTodo,
    getNotes,
    addNote,
    updateNote,
    deleteNote,
    addPlace,
    createBot,
    deployBot,
    deleteBot,
    updateBot,
    listPlaces,
    updateTodo,
    getContent,
    deletePlace,
    updatePlace,
    removeImage,
    getBotModels,
    reactToContent,
    deployBotModel,
    deleteBotModel,
    publishBotModel,
    getAppConnections,
    deleteConnection,
    healthCheckConnection,
    getConnectionDetails,
    getImageUploadUrl,
  }
}

export default ApiRequest
