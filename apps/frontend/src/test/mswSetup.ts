import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const API_BASE = 'http://localhost:5000/prod'

export const handlers = [
  http.post(`${API_BASE}/user/:userId/resource/bot/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/user/:userId/resource/model/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/user/:userId/resource/todo/read`, () => {
    return HttpResponse.json({ success: true, data: { tasks: [] } })
  }),

  http.post(`${API_BASE}/user/:userId/resource/todo/update`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/user/:userId/content`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/user/:userId/resource/connection/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(
    `${API_BASE}/user/:userId/resource/connection/delete/:connectionId`,
    () => {
      return HttpResponse.json({ success: true, data: null })
    }
  ),

  http.post(`${API_BASE}/user/:userId/connection/health/:connectionId`, () => {
    return HttpResponse.json({
      success: true,
      data: { status: 'healthy' },
    })
  }),

  http.post(`${API_BASE}/user/:userId/connection/details/:connectionId`, () => {
    return HttpResponse.json({
      success: true,
      data: { connection: {}, linkedBots: [] },
    })
  }),

  http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/user/:userId/resource/place/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/user/:userId/bot/create`, () => {
    return HttpResponse.json({
      success: true,
      data: { botId: 'new-bot-id', userId: 'test', tasks: [], active: false },
    })
  }),

  http.post(`${API_BASE}/user/:userId/bot/model`, () => {
    return HttpResponse.json({
      success: true,
      data: { botId: 'model-bot-id', userId: 'test', tasks: [], active: false },
    })
  }),

  http.post(`${API_BASE}/user/:userId/resource/bot/read/:botId`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        botId: 'bot-1',
        userId: 'test',
        name: 'Test Bot',
        tasks: [],
        active: true,
      },
    })
  }),

  http.post(`${API_BASE}/user/:userId/bot/logs/:botId`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),
]

export const server = setupServer(...handlers)
