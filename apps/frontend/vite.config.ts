/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      const mocksDir = path.resolve(__dirname, 'mocks')
      const load = (file: string) =>
        JSON.parse(fs.readFileSync(path.join(mocksDir, file), 'utf-8'))

      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        const method = req.method || 'GET'

        if (url.match(/\/bots\/[^/]+$/) && method === 'GET') {
          const bots = load('bots.json')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(bots.data[0]))
        } else if (url.match(/\/bots$/) && method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(path.join(mocksDir, 'bots.json'), 'utf-8'))
        } else if (url.match(/\/bots$/) && method === 'POST') {
          res.statusCode = 200
          res.end()
        } else if (url.match(/\/models$/) && method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(path.join(mocksDir, 'models.json'), 'utf-8'))
        } else if (url.match(/\/models\/[^/]+$/) && method === 'DELETE') {
          res.statusCode = 200
          res.end()
        } else if (url.match(/\/content$/) && method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(path.join(mocksDir, 'content.json'), 'utf-8'))
        } else if (url.match(/\/data\/todos$/) && method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(path.join(mocksDir, 'todo.json'), 'utf-8'))
        } else if (url.match(/\/data\/todos$/) && method === 'PATCH') {
          res.statusCode = 200
          res.end()
        } else if (url.match(/\/connections$/) && method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            fs.readFileSync(path.join(mocksDir, 'connections.json'), 'utf-8')
          )
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    mockApiPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      manifest: {
        name: 'Baita',
        short_name: 'Baita',
        description: 'The app that helps you to automate your life.',
        icons: [
          {
            src: 'logo.png',
            sizes: '64x64 32x32 24x24 16x16 256x256 512x512',
            type: 'image/png',
          },
        ],
        start_url: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#414451',
        background_color: '#ffffff',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
})
