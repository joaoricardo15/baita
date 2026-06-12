import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      devOptions: { enabled: false },
    }),
    {
      name: 'mock-api',
      configureServer(server) {
        const mockData = async () => {
          const shared = await server.ssrLoadModule('@baita/shared')
          return shared
        }

        server.middlewares.use(async (req, res, next) => {
          const url = req.url || ''
          const method = req.method || 'GET'
          const accept = req.headers.accept || ''

          if (!accept.includes('application/json')) return next()

          const data = await mockData()
          const respond = (payload: unknown) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, data: payload }))
          }

          if (url.match(/\/bots\/[^/]+\/logs$/) && method === 'GET') {
            respond(data.exampleBotLogs)
          } else if (url.match(/\/bots\/[^/]+$/) && method === 'GET') {
            respond(data.exampleBot)
          } else if (url.match(/\/bots$/) && method === 'GET') {
            respond(data.exampleBotList)
          } else if (url.match(/\/bots$/) && method === 'POST') {
            respond(null)
          } else if (url.match(/\/bot-templates$/) && method === 'GET') {
            respond(data.exampleBotTemplateList)
          } else if (
            url.match(/\/bot-templates\/[^/]+$/) &&
            method === 'DELETE'
          ) {
            respond(null)
          } else if (url.match(/\/content$/) && method === 'GET') {
            respond(data.exampleContentItems)
          } else if (url.match(/\/data\/todos$/) && method === 'GET') {
            respond({ tasks: data.exampleTodo })
          } else if (url.match(/\/data\/todos$/) && method === 'PATCH') {
            respond(null)
          } else if (url.match(/\/data\/note$/) && method === 'GET') {
            respond(data.exampleNoteList)
          } else if (url.match(/\/data\/place$/) && method === 'GET') {
            respond(data.examplePlaceList)
          } else if (url.match(/\/connections$/) && method === 'GET') {
            respond(data.exampleConnectionList)
          } else {
            next()
          }
        })
      },
    },
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  server: { port: 3000 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
