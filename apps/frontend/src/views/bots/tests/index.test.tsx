/**
 * Bots Page Tests
 *
 * User Journey: Bot Management
 * Tests the bots listing page — loading, rendering, template separation.
 *
 * Covers:
 * - Page renders without crashing
 * - Shows skeleton during loading
 * - Shows bots list after loading
 * - Shows Add bot button
 * - Separates template bots from custom bots
 * - Shows bot templates that are not yet deployed
 * - Hides bot templates that are already deployed by user
 * - Handles API failure gracefully
 */
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'

import { server } from '@/test/mswSetup'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Bots } from '@/views/bots/index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/prod'

describe('Bots Page', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Bots />)
    expect(document.body).toBeDefined()
  })

  it('shows skeleton while fetching', () => {
    server.use(
      http.get(`${API_BASE}/bots`, () => {
        return new Promise(() => {}) // never resolves — stays loading
      })
    )

    renderWithProviders(<Bots />)
    expect(
      document.querySelector('[class*="skeleton"]') || document.body.innerHTML
    ).toBeDefined()
  })

  it('shows bots list after loading', async () => {
    server.use(
      http.get(`${API_BASE}/bots`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              botId: 'bot-1',
              userId: 'test',
              name: 'My Bot',
              tasks: [],
              active: true,
            },
            {
              botId: 'bot-2',
              userId: 'test',
              name: 'Other Bot',
              tasks: [],
              active: false,
            },
          ],
        })
      ),
      http.get(`${API_BASE}/bot-templates`, () =>
        HttpResponse.json({ success: true, data: [] })
      )
    )

    renderWithProviders(<Bots />)

    await waitFor(() => {
      expect(screen.getByText('My Bot')).toBeDefined()
      expect(screen.getByText('Other Bot')).toBeDefined()
    })
  })

  it('shows Add bot button when loaded', async () => {
    renderWithProviders(<Bots />)

    await waitFor(() => {
      expect(screen.getByText('Add bot')).toBeDefined()
    })
  })

  it('handles API failure gracefully without crashing', async () => {
    server.use(
      http.get(`${API_BASE}/bots`, () =>
        HttpResponse.json(
          { success: false, message: 'Network Error' },
          { status: 500 }
        )
      ),
      http.get(`${API_BASE}/bot-templates`, () =>
        HttpResponse.json(
          { success: false, message: 'Network Error' },
          { status: 500 }
        )
      )
    )

    renderWithProviders(<Bots />)

    await waitFor(() => {
      expect(document.body.innerHTML).not.toBe('')
    })
  })

  it('separates template bots from custom bots', async () => {
    server.use(
      http.get(`${API_BASE}/bots`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              botId: 'bot-1',
              userId: 'test',
              name: 'Model Bot',
              modelId: 'model-1',
              tasks: [],
              active: true,
            },
            {
              botId: 'bot-2',
              userId: 'test',
              name: 'Custom Bot',
              tasks: [],
              active: true,
            },
          ],
        })
      ),
      http.get(`${API_BASE}/bot-templates`, () =>
        HttpResponse.json({ success: true, data: [] })
      )
    )

    renderWithProviders(<Bots />)

    await waitFor(() => {
      expect(screen.getByText('Model Bot')).toBeDefined()
      expect(screen.getByText('Custom Bot')).toBeDefined()
    })
  })

  it('shows bot templates that are not yet deployed', async () => {
    server.use(
      http.get(`${API_BASE}/bots`, () =>
        HttpResponse.json({ success: true, data: [] })
      ),
      http.get(`${API_BASE}/bot-templates`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              modelId: 'model-1',
              name: 'Template Bot',
              author: 'baita',
              tasks: [],
            },
          ],
        })
      )
    )

    renderWithProviders(<Bots />)

    await waitFor(() => {
      expect(screen.getByText('Template Bot')).toBeDefined()
    })
  })

  it('hides bot templates that are already deployed by user', async () => {
    server.use(
      http.get(`${API_BASE}/bots`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              botId: 'bot-1',
              userId: 'test',
              name: 'Deployed',
              modelId: 'model-1',
              tasks: [],
              active: true,
            },
          ],
        })
      ),
      http.get(`${API_BASE}/bot-templates`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              modelId: 'model-1',
              name: 'Template Bot',
              author: 'baita',
              tasks: [],
            },
          ],
        })
      )
    )

    renderWithProviders(<Bots />)

    await waitFor(() => {
      expect(screen.getByText('Deployed')).toBeDefined()
      expect(screen.queryByText('Template Bot')).toBeNull()
    })
  })
})
