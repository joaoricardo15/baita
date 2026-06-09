import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import { FC, ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '@/providers/auth'

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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

export const createWrapper = (options: WrapperOptions = {}) => {
  const { route = '/', authValue = {} } = options
  const queryClient = createTestQueryClient()

  const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={{ ...defaultAuthValue, ...authValue }}>
          {children}
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )

  return Wrapper
}

export const renderWithProviders = (
  ui: ReactNode,
  options: WrapperOptions & { renderOptions?: RenderOptions } = {}
) => {
  const { renderOptions, ...wrapperOptions } = options
  const Wrapper = createWrapper(wrapperOptions)

  return render(ui as ReactElement, { wrapper: Wrapper, ...renderOptions })
}
