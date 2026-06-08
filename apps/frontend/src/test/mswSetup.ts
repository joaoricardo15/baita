import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const API_BASE = 'http://localhost:5000/prod'

export const handlers = [
  http.get(`${API_BASE}/bots`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/models`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/data/todos`, () => {
    return HttpResponse.json({ success: true, data: { tasks: [] } })
  }),

  http.patch(`${API_BASE}/data/todos`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/content`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/connections`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.delete(`${API_BASE}/connections/:connectionId`, () => {
    return HttpResponse.json({ success: true, data: null })
  }),

  http.post(`${API_BASE}/connections/:connectionId/health`, () => {
    return HttpResponse.json({
      success: true,
      data: { status: 'healthy' },
    })
  }),

  http.get(`${API_BASE}/connections/:connectionId`, () => {
    return HttpResponse.json({
      success: true,
      data: { connection: {}, linkedBots: [] },
    })
  }),

  http.get(`${API_BASE}/data/notes`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.get(`${API_BASE}/data/places`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),

  http.post(`${API_BASE}/bots`, () => {
    return HttpResponse.json({
      success: true,
      data: { botId: 'new-bot-id', userId: 'test', tasks: [], active: false },
    })
  }),

  http.post(`${API_BASE}/models/:modelId/deploy`, () => {
    return HttpResponse.json({
      success: true,
      data: { botId: 'model-bot-id', userId: 'test', tasks: [], active: false },
    })
  }),

  http.get(`${API_BASE}/bots/:botId`, () => {
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

  http.get(`${API_BASE}/bots/:botId/logs`, () => {
    return HttpResponse.json({ success: true, data: [] })
  }),
]

export const server = setupServer(...handlers)
