import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { server } from '@/test/mswSetup'
import { AuthContext } from '@/providers/auth'
import { UserContext } from '@/providers/user'
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
  getToken: vi.fn().mockResolvedValue('token'),
}

const createUserContextValue = (overrides = {}) => ({
  connections: undefined as any,
  retrieveConnections: vi.fn().mockResolvedValue(undefined),
  deleteConnection: vi.fn().mockResolvedValue(undefined),
  contents: undefined as any,
  retrieveContent: vi.fn().mockResolvedValue(undefined),
  reactToContent: vi.fn().mockResolvedValue(undefined),
  popContent: vi.fn(),
  todoTasks: undefined as any,
  retrieveTodoTasks: vi.fn().mockResolvedValue(undefined),
  updateTodoTasks: vi.fn().mockResolvedValue([]),
  setTodoTasks: vi.fn(),
  ...overrides,
})

const renderConnections = (userContextOverrides = {}) => {
  const userContext = createUserContextValue(userContextOverrides)

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <UserContext.Provider value={userContext}>
          <Connections />
        </UserContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('Connections page', () => {
  it('renders skeleton while loading', () => {
    renderConnections({ connections: undefined })
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('renders empty state when no connections', () => {
    renderConnections({ connections: [] })
    expect(screen.getByText('No connections yet')).toBeInTheDocument()
    expect(
      screen.getByText('Connect your first app to get started')
    ).toBeInTheDocument()
  })

  it('renders connection cards when connections exist', () => {
    renderConnections({
      connections: [
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

    expect(screen.getByText('My Pipedrive')).toBeInTheDocument()
    expect(screen.getByText('My Google')).toBeInTheDocument()
    expect(screen.getByText('user@company.com')).toBeInTheDocument()
    expect(screen.getByText('user@gmail.com')).toBeInTheDocument()
  })

  it('shows page title', () => {
    renderConnections({ connections: [] })
    expect(screen.getByText('Connections')).toBeInTheDocument()
  })

  it('renders test button for each connection', () => {
    renderConnections({
      connections: [
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

    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('health check updates status on click', async () => {
    server.use(
      http.post(
        'http://localhost:5000/prod/user/:userId/connection/:id/health',
        () =>
          HttpResponse.json({
            success: true,
            data: { status: 'healthy' },
          })
      )
    )

    renderConnections({
      connections: [
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

    screen.getByText('Test').click()

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

  it('uses production redirect URI, never localhost', () => {
    const openSpy = vi.fn()
    vi.spyOn(window, 'open').mockImplementation(openSpy)

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserContext.Provider
            value={createUserContextValue({ connections: [] })}
          >
            <NotificationContext.Provider value={mockNotificationValue}>
              <AddConnection open={true} onClose={vi.fn()} />
            </NotificationContext.Provider>
          </UserContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Pipedrive'))

    expect(openSpy).toHaveBeenCalled()
    const oauthUrl = openSpy.mock.calls[0][0] as string

    expect(oauthUrl).toContain(
      'redirect_uri=https%3A%2F%2Fapi.baita.help%2Fconnectors%2Foauth'
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

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserContext.Provider
            value={createUserContextValue({ connections: [] })}
          >
            <NotificationContext.Provider value={mockNotificationValue}>
              <AddConnection open={true} onClose={vi.fn()} />
            </NotificationContext.Provider>
          </UserContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

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
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows success message when connection count increases after popup closes', async () => {
    vi.useRealTimers()

    server.use(
      http.post(
        'http://localhost:5000/prod/user/:userId/resource/connection/list',
        () =>
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

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserContext.Provider
            value={createUserContextValue({ connections: [] })}
          >
            <NotificationContext.Provider value={mockNotificationValue}>
              <AddConnection open={true} onClose={onClose} />
            </NotificationContext.Provider>
          </UserContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

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
    vi.useRealTimers()

    server.use(
      http.post(
        'http://localhost:5000/prod/user/:userId/resource/connection/list',
        () => HttpResponse.json({ success: true, data: [] })
      )
    )

    const mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any)

    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserContext.Provider
            value={createUserContextValue({ connections: [] })}
          >
            <NotificationContext.Provider value={mockNotificationValue}>
              <AddConnection open={true} onClose={onClose} />
            </NotificationContext.Provider>
          </UserContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

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

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserContext.Provider
            value={createUserContextValue({ connections: [] })}
          >
            <NotificationContext.Provider value={mockNotificationValue}>
              <AddConnection open={true} onClose={vi.fn()} />
            </NotificationContext.Provider>
          </UserContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Pipedrive'))

    expect(mockShowSnack).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})
