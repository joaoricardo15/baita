import { render, RenderOptions } from '@testing-library/react'
import { FC, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '../providers/auth'

const mockUser = {
  userId: 'test-user',
  email: 'test@test.com',
  name: 'Test User',
  picture: '',
}

const defaultAuthValue = {
  user: mockUser,
  isLoading: false,
  error: undefined,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  getToken: vi.fn().mockResolvedValue('mock-token'),
}

interface WrapperOptions {
  route?: string
  authValue?: Partial<typeof defaultAuthValue>
}

export const createWrapper = (options: WrapperOptions = {}) => {
  const { route = '/', authValue = {} } = options

  const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={{ ...defaultAuthValue, ...authValue }}>
        {children}
      </AuthContext.Provider>
    </MemoryRouter>
  )

  return Wrapper
}

export const renderWithProviders = (
  ui: ReactNode,
  options: WrapperOptions & { renderOptions?: RenderOptions } = {}
) => {
  const { renderOptions, ...wrapperOptions } = options
  const Wrapper = createWrapper(wrapperOptions)

  return render(ui as any, { wrapper: Wrapper, ...renderOptions })
}
