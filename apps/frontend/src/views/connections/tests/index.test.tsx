/**
 * Connections Page Tests
 *
 * User Journey: Connection Management
 * Tests connection listing, health checks, and OAuth flow.
 *
 * Covers:
 * - Page renders correctly in all states (loading, empty, with data)
 * - Connection cards display correctly
 * - Health check updates connection status
 * - OAuth URL construction is correct
 * - Popup close behavior shows correct notifications
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'

import { server } from '@/test/mswSetup'
import { renderWithProviders, createWrapper } from '@/test/renderWithProviders'
import { NotificationContext } from '@/providers/notification'
import { Connections } from '@/views/connections/index'
import AddConnection from '@/views/connections/components/addConnection'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/prod'

describe('Connections page', () => {
  it('renders skeleton while loading', () => {
    server.use(
      http.get(`${API_BASE}/connections`, () => {
        return new Promise(() => {}) // never resolves — stays loading
      })
    )

    renderWithProviders(<Connections />)
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('renders empty state when no connections', async () => {
    renderWithProviders(<Connections />)

    await waitFor(() => {
      expect(screen.getByText('No connections yet')).toBeInTheDocument()
      expect(
        screen.getByText('Connect your first app to get started')
      ).toBeInTheDocument()
    })
  })

  it('renders connection cards when connections exist', async () => {
    server.use(
      http.get(`${API_BASE}/connections`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              appId: 'test-app',
              userId: 'test-user',
              connectionId: 'conn-1',
              name: 'My Pipedrive',
              email: 'user@company.com',
              credentials: {},
            },
            {
              appId: 'test-app-2',
              userId: 'test-user',
              connectionId: 'conn-2',
              name: 'My Google',
              email: 'user@gmail.com',
              credentials: {},
            },
          ],
        })
      )
    )

    renderWithProviders(<Connections />)

    await waitFor(() => {
      expect(screen.getByText('My Pipedrive')).toBeInTheDocument()
      expect(screen.getByText('My Google')).toBeInTheDocument()
      expect(screen.getByText('user@company.com')).toBeInTheDocument()
      expect(screen.getByText('user@gmail.com')).toBeInTheDocument()
    })
  })

  it('renders add connection button', async () => {
    renderWithProviders(<Connections />)

    await waitFor(() => {
      expect(screen.getByText('Add connection')).toBeInTheDocument()
    })
  })

  it('renders menu for each connection', async () => {
    server.use(
      http.get(`${API_BASE}/connections`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              appId: 'app-1',
              userId: 'test-user',
              connectionId: 'conn-1',
              name: 'Connection 1',
              email: 'a@b.com',
              credentials: {},
            },
          ],
        })
      )
    )

    renderWithProviders(<Connections />)

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="MoreVertIcon"]')
      ).toBeInTheDocument()
    })
  })

  it('health check updates status via menu', async () => {
    server.use(
      http.get(`${API_BASE}/connections`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              appId: 'app-1',
              userId: 'test-user',
              connectionId: 'conn-1',
              name: 'Test Conn',
              email: 'test@test.com',
              credentials: {},
            },
          ],
        })
      ),
      http.post(`${API_BASE}/connections/:id/health`, () =>
        HttpResponse.json({
          success: true,
          data: { status: 'healthy' },
        })
      )
    )

    renderWithProviders(<Connections />)

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="MoreVertIcon"]')
      ).toBeInTheDocument()
    })

    fireEvent.click(document.querySelector('[data-testid="MoreVertIcon"]')!)
    fireEvent.click(screen.getByText('Test'))

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })
})

describe('AddConnection OAuth URL construction', () => {
  const mockNotificationValue = {
    showSnack: vi.fn(),
    showLoading: vi.fn(),
    showModal: vi.fn(),
  }

  const renderAddConnection = (props = {}) => {
    const Wrapper = createWrapper()
    return render(
      <Wrapper>
        <NotificationContext.Provider value={mockNotificationValue}>
          <AddConnection open={true} onClose={vi.fn()} {...props} />
        </NotificationContext.Provider>
      </Wrapper>
    )
  }

  it('uses production redirect URI, never localhost', () => {
    const openSpy = vi.fn()
    vi.spyOn(window, 'open').mockImplementation(openSpy)

    renderAddConnection()

    fireEvent.click(screen.getByText('Pipedrive'))

    expect(openSpy).toHaveBeenCalled()
    const oauthUrl = openSpy.mock.calls[0][0] as string

    expect(oauthUrl).toContain(
      'redirect_uri=https%3A%2F%2Fapi.baita.help%2Foauth%2Fcallback'
    )
    expect(oauthUrl).not.toContain('localhost')
    expect(oauthUrl).toContain('response_type=code')
    expect(oauthUrl).toContain('client_id=987a469172b3ac62')
    expect(oauthUrl).toContain('state=')

    vi.restoreAllMocks()
  })

  it('includes correct state format with connectorId', () => {
    const openSpy = vi.fn()
    vi.spyOn(window, 'open').mockImplementation(openSpy)

    renderAddConnection()

    fireEvent.click(screen.getByText('Pipedrive'))

    const oauthUrl = openSpy.mock.calls[0][0] as string
    const urlObj = new URL(oauthUrl)
    const state = urlObj.searchParams.get('state') || ''

    const parts = state.split(':')
    expect(parts).toHaveLength(5)
    expect(parts[0]).toBe('19c1921c-9a6b-4def-91c8-8bcba8239bf5')
    expect(parts[1]).toBe('test-user')
    expect(parts[2]).toBe('')
    expect(parts[3]).toBe('0')
    expect(parts[4]).toBe('pipedrive')

    vi.restoreAllMocks()
  })
})

describe('AddConnection popup close behavior', () => {
  const mockShowSnack = vi.fn()
  const mockNotificationValue = {
    showSnack: mockShowSnack,
    showLoading: vi.fn(),
    showModal: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderAddConnection = (onClose = vi.fn()) => {
    const Wrapper = createWrapper()
    return render(
      <Wrapper>
        <NotificationContext.Provider value={mockNotificationValue}>
          <AddConnection open={true} onClose={onClose} />
        </NotificationContext.Provider>
      </Wrapper>
    )
  }

  it('shows success message when connection count increases after popup closes', async () => {
    server.use(
      http.get(`${API_BASE}/connections`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              appId: 'new-app',
              userId: 'test-user',
              connectionId: 'new-conn',
              name: 'New Connection',
              email: 'new@test.com',
              credentials: {},
            },
          ],
        })
      )
    )

    const mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any)

    const onClose = vi.fn()
    renderAddConnection(onClose)

    fireEvent.click(screen.getByText('Pipedrive'))

    mockPopup.closed = true

    await waitFor(() => {
      expect(mockShowSnack).toHaveBeenCalledWith(
        'Connection created successfully',
        'success'
      )
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('shows cancelled message when connection count stays the same after popup closes', async () => {
    server.use(
      http.get(`${API_BASE}/connections`, () =>
        HttpResponse.json({ success: true, data: [] })
      )
    )

    const mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any)

    const onClose = vi.fn()
    renderAddConnection(onClose)

    fireEvent.click(screen.getByText('Pipedrive'))

    mockPopup.closed = true

    await waitFor(() => {
      expect(mockShowSnack).toHaveBeenCalledWith(
        'Connection was not completed',
        'warning'
      )
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('does not show success message before popup closes', () => {
    const mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any)

    renderAddConnection()

    fireEvent.click(screen.getByText('Pipedrive'))

    expect(mockShowSnack).not.toHaveBeenCalled()
  })
})
