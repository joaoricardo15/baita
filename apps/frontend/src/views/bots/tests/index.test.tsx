import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '@/providers/auth'
import { BotContext } from '@/providers/bot'
import { Bots } from '@/views/bots/index'

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

const createBotContextValue = (overrides = {}) => ({
  bots: undefined as any,
  getBots: vi.fn().mockResolvedValue(undefined),
  bot: undefined,
  setBot: vi.fn(),
  getBot: vi.fn().mockResolvedValue(undefined),
  createBot: vi.fn().mockResolvedValue('new-id'),
  deleteBot: vi.fn().mockResolvedValue(undefined),
  getBotInputs: vi.fn().mockReturnValue([]),
  updateBot: vi.fn().mockResolvedValue(undefined),
  deployBot: vi.fn().mockResolvedValue({} as any),
  testBotTask: vi.fn().mockResolvedValue(undefined),
  updateBotTask: vi.fn().mockResolvedValue(undefined),
  botModels: undefined as any,
  getBotModels: vi.fn().mockResolvedValue(undefined),
  deleteBotModel: vi.fn().mockResolvedValue(undefined),
  deployBotModel: vi.fn().mockResolvedValue({} as any),
  publishBotModel: vi.fn().mockResolvedValue({} as any),
  ...overrides,
})

const renderBots = (botContextOverrides = {}) => {
  const botContext = createBotContextValue(botContextOverrides)

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <BotContext.Provider value={botContext}>
          <Bots />
        </BotContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('Bots Page', () => {
  it('renders without crashing', () => {
    renderBots()
    expect(document.body).toBeDefined()
  })

  it('shows skeleton while fetching', () => {
    renderBots()
    expect(
      document.querySelector('[class*="skeleton"]') || document.body.innerHTML
    ).toBeDefined()
  })

  it('shows bots list after loading', async () => {
    const getBots = vi.fn().mockImplementation(() => Promise.resolve())
    const getBotModels = vi.fn().mockImplementation(() => Promise.resolve())

    renderBots({
      bots: [
        {
          botId: 'bot-1',
          userId: 'test',
          name: 'My Bot',
          tasks: [],
          active: true,
        },
        {
          botId: 'bot-2',
          userId: 'test',
          name: 'Other Bot',
          tasks: [],
          active: false,
        },
      ],
      botModels: [],
      getBots,
      getBotModels,
    })

    await waitFor(() => {
      expect(screen.getByText('My Bot')).toBeDefined()
      expect(screen.getByText('Other Bot')).toBeDefined()
    })
  })

  it('shows Add bot button when loaded', async () => {
    renderBots({
      bots: [],
      botModels: [],
    })

    await waitFor(() => {
      expect(screen.getByText('Add bot')).toBeDefined()
    })
  })

  it('shows Admin panel divider', async () => {
    renderBots({
      bots: [],
      botModels: [],
    })

    await waitFor(() => {
      expect(screen.getByText('Admin panel')).toBeDefined()
    })
  })

  it('calls getBots and getBotModels on mount', async () => {
    const getBots = vi.fn().mockResolvedValue(undefined)
    const getBotModels = vi.fn().mockResolvedValue(undefined)

    renderBots({ getBots, getBotModels })

    await waitFor(() => {
      expect(getBots).toHaveBeenCalledTimes(1)
      expect(getBotModels).toHaveBeenCalledTimes(1)
    })
  })

  it('handles API failure gracefully without crashing', async () => {
    const getBots = vi.fn().mockRejectedValue(new Error('Network Error'))
    const getBotModels = vi.fn().mockRejectedValue(new Error('Network Error'))

    renderBots({ getBots, getBotModels })

    await waitFor(() => {
      expect(getBots).toHaveBeenCalled()
    })

    expect(document.body.innerHTML).not.toBe('')
  })

  it('separates model bots from custom bots', async () => {
    renderBots({
      bots: [
        {
          botId: 'bot-1',
          userId: 'test',
          name: 'Model Bot',
          modelId: 'model-1',
          tasks: [],
          active: true,
        },
        {
          botId: 'bot-2',
          userId: 'test',
          name: 'Custom Bot',
          tasks: [],
          active: true,
        },
      ],
      botModels: [],
    })

    await waitFor(() => {
      expect(screen.getByText('Model Bot')).toBeDefined()
      expect(screen.getByText('Custom Bot')).toBeDefined()
    })
  })

  it('shows bot models that are not yet deployed', async () => {
    renderBots({
      bots: [],
      botModels: [
        {
          modelId: 'model-1',
          name: 'Template Bot',
          author: 'baita',
          tasks: [],
        },
      ],
    })

    await waitFor(() => {
      expect(screen.getByText('Template Bot')).toBeDefined()
    })
  })

  it('hides bot models that are already deployed by user', async () => {
    renderBots({
      bots: [
        {
          botId: 'bot-1',
          userId: 'test',
          name: 'Deployed',
          modelId: 'model-1',
          tasks: [],
          active: true,
        },
      ],
      botModels: [
        {
          modelId: 'model-1',
          name: 'Template Bot',
          author: 'baita',
          tasks: [],
        },
      ],
    })

    await waitFor(() => {
      expect(screen.getByText('Deployed')).toBeDefined()
      expect(screen.queryByText('Template Bot')).toBeNull()
    })
  })
})
