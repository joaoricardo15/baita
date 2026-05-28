import { render, screen } from '@testing-library/react'
import { FC, useContext } from 'react'
import { vi } from 'vitest'

import AuthProvider, { AuthContext } from '../providers/auth'

const mockUseAuth0 = vi.fn()

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockUseAuth0(),
}))

vi.mock('../utils/push', () => ({
  unsubscribeFromPush: vi.fn(),
}))

const TestConsumer: FC = () => {
  const { user, isLoading, isAdmin, getToken } = useContext(AuthContext)
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="userId">{user?.userId || 'none'}</span>
      <span data-testid="email">{user?.email || 'none'}</span>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
      <button
        onClick={async () => {
          const token = await getToken()
          document.title = token
        }}
      >
        getToken
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    mockUseAuth0.mockReturnValue({
      user: undefined,
      isLoading: true,
      isAuthenticated: false,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
      error: undefined,
    })
  })

  it('shows loading state when Auth0 is loading', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(screen.getByTestId('userId').textContent).toBe('none')
  })

  it('provides user data when authenticated', () => {
    mockUseAuth0.mockReturnValue({
      user: {
        sub: 'auth0|user123',
        email: 'test@test.com',
        name: 'Test User',
        picture: 'https://pic.com/avatar.jpg',
      },
      isLoading: false,
      isAuthenticated: true,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
      error: undefined,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(screen.getByTestId('userId').textContent).toBe('user123')
    expect(screen.getByTestId('email').textContent).toBe('test@test.com')
  })

  it('extracts userId from sub claim (splits on |)', () => {
    mockUseAuth0.mockReturnValue({
      user: {
        sub: 'google-oauth2|abc456',
        email: 'g@test.com',
        name: 'G',
        picture: '',
      },
      isLoading: false,
      isAuthenticated: true,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
      error: undefined,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('userId').textContent).toBe('abc456')
  })

  it('detects admin user by email', () => {
    mockUseAuth0.mockReturnValue({
      user: {
        sub: 'auth0|admin',
        email: 'joaoricardocardoso15@gmail.com',
        name: 'Admin',
        picture: '',
      },
      isLoading: false,
      isAuthenticated: true,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
      error: undefined,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('isAdmin').textContent).toBe('true')
  })

  it('non-admin user has isAdmin false', () => {
    mockUseAuth0.mockReturnValue({
      user: {
        sub: 'auth0|user',
        email: 'other@test.com',
        name: 'User',
        picture: '',
      },
      isLoading: false,
      isAuthenticated: true,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
      error: undefined,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('isAdmin').textContent).toBe('false')
  })

  it('returns undefined user when not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      user: {
        sub: 'auth0|user',
        email: 'test@test.com',
        name: 'Test',
        picture: '',
      },
      isLoading: false,
      isAuthenticated: false,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
      error: undefined,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('userId').textContent).toBe('none')
  })

  it('provides getToken that returns a promise', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('my-token-abc')

    mockUseAuth0.mockReturnValue({
      user: { sub: 'auth0|u1', email: 'e', name: 'n', picture: '' },
      isLoading: false,
      isAuthenticated: true,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: mockGetToken,
      error: undefined,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const btn = screen.getByText('getToken')
    btn.click()

    await vi.waitFor(() => {
      expect(mockGetToken).toHaveBeenCalled()
    })
  })
})
