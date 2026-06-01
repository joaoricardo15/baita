import { render, screen } from '@testing-library/react'
import { FC } from 'react'
import { vi } from 'vitest'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(() => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/pic.jpg',
      sub: 'auth0|123',
    },
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(() => Promise.resolve('token')),
  })),
  Auth0Provider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  withAuthenticationRequired: (component: FC) => component,
}))

vi.mock('./assets/variables.module.scss', () => ({
  default: {
    infoColor: '#6391f6',
    errorColor: '#bf2c3d',
    warningColor: '#f6c863',
    successColor: '#575b6d',
    primaryColor: '#414451',
    secondaryColor: '#575b6d',
    backgroundColor: '#d5f2ef',
    contrastColor: '#ffffff',
  },
}))

vi.mock('./utils/firebase', () => ({
  publishEvent: vi.fn(),
}))

vi.mock('./utils/push', () => ({
  checkSubscriptionHealth: vi.fn(),
  canUsePushNotifications: vi.fn(() => false),
  getExistingSubscription: vi.fn(() => Promise.resolve(null)),
  subscribeToPush: vi.fn(() => Promise.resolve(null)),
  isIOSDevice: vi.fn(() => false),
  isInstalledPWA: vi.fn(() => false),
}))

import App from './app'

describe('App smoke test', () => {
  it('renders without crashing when authenticated', () => {
    render(<App />)

    expect(screen.getByText('Baita')).toBeInTheDocument()
  })

  it('renders navigation bar with logo', () => {
    render(<App />)

    const logos = screen.getAllByAltText('Baita logo')
    expect(logos.length).toBeGreaterThan(0)
  })

  it('renders authenticated navigation menu with icons', () => {
    render(<App />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('Feed')).toBeInTheDocument()
    expect(screen.getByText('Bots')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })
})
