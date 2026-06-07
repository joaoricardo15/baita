import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const API_BASE = 'http://localhost:5000/prod'

export const handlers = [
  http.post(`${API_BASE}/resource/bot/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/model/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/resource/todo/read`, () => {
    return HttpResponse.json({ success: true, data: { tasks: [] } })
  }),

  http.post(`${API_BASE}/resource/todo/update`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/content`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/resource/connection/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/resource/connection/delete/:connectionId`, () => {
    return HttpResponse.json({ success: true, data: null })
  }),

  http.post(`${API_BASE}/connection/health/:connectionId`, () => {
    return HttpResponse.json({
      success: true,
      data: { status: 'healthy' },
    })
  }),

  http.post(`${API_BASE}/connection/details/:connectionId`, () => {
    return HttpResponse.json({
      success: true,
      data: { connection: {}, linkedBots: [] },
    })
  }),

  http.post(`${API_BASE}/resource/note/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/resource/place/list`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/bot/create`, () => {
    return HttpResponse.json({
      success: true,
      data: { botId: 'new-bot-id', userId: 'test', tasks: [], active: false },
    })
  }),

  http.post(`${API_BASE}/bot/model`, () => {
    return HttpResponse.json({
      success: true,
      data: { botId: 'model-bot-id', userId: 'test', tasks: [], active: false },
    })
  }),

  http.post(`${API_BASE}/resource/bot/read/:botId`, () => {
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

  http.post(`${API_BASE}/bot/logs/:botId`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),
]

export const server = setupServer(...handlers)
