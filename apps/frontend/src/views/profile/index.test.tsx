import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'

import { ProfileComponent } from '.'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(() => ({
    loading: false,
    user: {
      name: 'Test user',
      email: 'test@user.com',
      picture: 'https://avatar.com',
    },
  })),
  withAuthenticationRequired: vi.fn(),
}))

describe('The profile component', () => {
  it('renders when loading = true', () => {
    const div = document.createElement('div')
    const root = createRoot(div)

    root.render(<ProfileComponent />)
  })
})
