/**
 * Places Page Tests
 *
 * User Journey: Places
 * Tests the places feature — map-first view with bottom sheet list.
 *
 * Covers:
 * - Page shows loading skeleton initially
 * - Page shows empty state when no places exist
 * - Page shows map and bottom sheet with place cards after data loads
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
import { Places } from '@/views/places/index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: unknown) => component,
}))

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  AdvancedMarker: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useMap: () => null,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: { en: Record<string, string> }) => labels.en,
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

const renderPlaces = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <NotificationContext.Provider
            value={mockNotification as unknown as never}
          >
            <Places />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Places Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while loading', () => {
    server.use(
      http.get(`${API_BASE}/data/place`, () => {
        return new Promise(() => {})
      })
    )

    const { container } = renderPlaces()
    expect(
      container.querySelector('[class*="skeleton"]') ||
        container.querySelector('.MuiSkeleton-root')
    ).toBeTruthy()
  })

  it('shows empty state when no places exist', async () => {
    server.use(
      http.get(`${API_BASE}/data/place`, () => {
        return HttpResponse.json({ success: true, data: [] })
      })
    )

    renderPlaces()

    await waitFor(() => {
      expect(screen.getByText('No places yet')).toBeInTheDocument()
    })
  })

  it('shows map and place cards after data loads', async () => {
    server.use(
      http.get(`${API_BASE}/data/place`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            {
              placeId: 'abc',
              name: 'My Cafe',
              description: 'Best coffee',
              pictures: [],
              position: { lat: 40.7128, lng: -74.006 },
              createdAt: '2025-01-01T00:00:00Z',
            },
            {
              placeId: 'def',
              name: 'The Park',
              pictures: [],
              position: { lat: 40.78, lng: -73.96 },
            },
          ],
        })
      })
    )

    renderPlaces()

    await waitFor(() => {
      expect(screen.getByTestId('google-map')).toBeInTheDocument()
      expect(screen.getAllByText('My Cafe').length).toBeGreaterThan(0)
      expect(screen.getAllByText('The Park').length).toBeGreaterThan(0)
    })
  })

  it('handles API failure without crashing', async () => {
    server.use(
      http.get(`${API_BASE}/data/place`, () => {
        return HttpResponse.json({ success: false, message: 'Server error' })
      })
    )

    const { container } = renderPlaces()

    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
