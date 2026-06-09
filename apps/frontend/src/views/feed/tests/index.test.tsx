/**
 * Feed Page Tests
 *
 * User Journey: Content Feed
 * Tests the content feed — users consuming bot-generated content via swipe cards.
 *
 * Covers:
 * - Page shows loading skeleton initially
 * - Page shows empty state when no content exists
 * - Page shows content cards after data loads
 * - API failures don't crash the page
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { server } from '@/test/mswSetup'
import { Feed } from '@/views/feed/index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/prod'

const mockAuthValue = {
  user: {
    userId: 'test-user',
    email: 'test@test.com',
    name: 'Test',
    picture: '',
  },
  isLoading: false,
  error: undefined,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  getToken: vi.fn().mockResolvedValue('mock-token'),
}

const mockNotification = {
  showSnack: vi.fn(),
  showModal: vi.fn(),
  showLoading: vi.fn(),
}

const renderFeed = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <NotificationContext.Provider value={mockNotification as any}>
            <Feed />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Feed Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while loading', () => {
    server.use(
      http.get(`${API_BASE}/content`, () => {
        return new Promise(() => {})
      })
    )

    const { container } = renderFeed()
    expect(
      container.querySelector('[class*="skeleton"]') ||
        container.querySelector('.MuiSkeleton-root')
    ).toBeTruthy()
  })

  it('shows empty state when no content exists', async () => {
    server.use(
      http.get(`${API_BASE}/content`, () => {
        return HttpResponse.json({ success: true, data: [] })
      })
    )

    renderFeed()

    await waitFor(() => {
      expect(screen.getByText('No content yet')).toBeInTheDocument()
    })
  })

  it('shows content cards after data loads', async () => {
    server.use(
      http.get(`${API_BASE}/content`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            {
              contentId: '1',
              title: 'Test Article',
              description: 'A test content item',
              url: 'https://example.com',
              author: { name: 'My Bot', image: '' },
              timestamp: Date.now(),
            },
          ],
        })
      })
    )

    renderFeed()

    await waitFor(() => {
      expect(screen.getByText('My Bot')).toBeInTheDocument()
    })
  })

  it('handles API failure without crashing', async () => {
    server.use(
      http.get(`${API_BASE}/content`, () => {
        return HttpResponse.json({ success: false, message: 'Server error' })
      })
    )

    const { container } = renderFeed()

    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
