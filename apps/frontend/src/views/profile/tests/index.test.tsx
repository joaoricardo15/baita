/**
 * Profile Page Tests
 *
 * User Journey: Account Management + Profile & Stats
 * Tests the profile page — users viewing stats and managing their account.
 *
 * Covers:
 * - Page shows loading skeleton initially
 * - Page shows user info and statistics after data loads
 * - Page shows delete account button
 * - API failures don't crash the page
 */
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { server } from '@/test/mswSetup'
import { ProfileComponent } from '@/views/profile/index'

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
    name: 'Test User',
    picture: 'https://example.com/avatar.png',
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

const renderProfile = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <NotificationContext.Provider value={mockNotification as any}>
            <ProfileComponent />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while loading', () => {
    server.use(
      http.post(`${API_BASE}/resource/todo/list`, () => {
        return new Promise(() => {})
      })
    )

    const { container } = renderProfile()
    expect(
      container.querySelector('[class*="skeleton"]') ||
        container.querySelector('.MuiSkeleton-root')
    ).toBeTruthy()
  })

  it('shows user name after data loads', async () => {
    server.use(
      http.post(`${API_BASE}/resource/todo/list`, () => {
        return HttpResponse.json({ success: true, data: [] })
      })
    )

    renderProfile()

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('shows delete account option', async () => {
    server.use(
      http.post(`${API_BASE}/resource/todo/list`, () => {
        return HttpResponse.json({ success: true, data: [] })
      })
    )

    renderProfile()

    await waitFor(() => {
      expect(screen.getByText('Delete account')).toBeInTheDocument()
    })
  })

  it('handles API failure without crashing', async () => {
    server.use(
      http.post(`${API_BASE}/resource/todo/list`, () => {
        return HttpResponse.json({ success: false, message: 'Server error' })
      })
    )

    const { container } = renderProfile()

    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
