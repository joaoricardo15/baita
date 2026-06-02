import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, vi } from 'vitest'

import { IBot, ITask } from '@baita/shared'
import { BotContext } from '@/providers/bot'
import BotAssistant from '@/views/bot/components/assistant'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const mockGetAiService = vi.fn()
const mockParseTaskFromResponse = vi.fn()
const mockBuildMessagesWithContext = vi.fn()
const mockBuildRetryMessage = vi.fn()

vi.mock('../../../utils/ai', () => ({
  getAiService: (...args: any[]) => mockGetAiService(...args),
  parseTaskFromResponse: (...args: any[]) => mockParseTaskFromResponse(...args),
  buildMessagesWithContext: (...args: any[]) =>
    mockBuildMessagesWithContext(...args),
  buildRetryMessage: (...args: any[]) => mockBuildRetryMessage(...args),
}))

const mockTask: ITask = {
  taskId: 1,
  inputData: [
    { name: 'expression', value: 'cron(0 9 * * ? *)', type: 'options' },
  ],
  service: { type: 'trigger', name: 'schedule', label: 'Schedule', config: {} },
  app: {
    name: 'Baita',
    appId: '2d12accb-4b7c-4d22-bdbc-4875a404b929',
    config: {},
  },
} as any

const mockBot: IBot = {
  botId: 'bot-1',
  userId: 'user-1',
  name: 'Test Bot',
  tasks: [mockTask],
  active: true,
} as any

const createBotContextValue = (overrides = {}) => ({
  bots: undefined as any,
  getBots: vi.fn(),
  bot: undefined,
  setBot: vi.fn(),
  getBot: vi.fn(),
  createBot: vi.fn(),
  deleteBot: vi.fn(),
  getBotInputs: vi.fn().mockReturnValue([]),
  updateBot: vi.fn().mockResolvedValue(undefined),
  deployBot: vi.fn().mockResolvedValue({}),
  testBotTask: vi.fn(),
  updateBotTask: vi.fn().mockResolvedValue(undefined),
  botModels: undefined as any,
  getBotModels: vi.fn(),
  deleteBotModel: vi.fn(),
  deployBotModel: vi.fn(),
  publishBotModel: vi.fn(),
  ...overrides,
})

const renderAssistant = (options: { botContextOverrides?: any } = {}) => {
  const { botContextOverrides = {} } = options
  const botContext = createBotContextValue(botContextOverrides)

  return {
    ...render(
      <BotContext.Provider value={botContext}>
        <BotAssistant bot={mockBot} task={mockTask} taskIndex={0} />
      </BotContext.Provider>
    ),
    botContext,
  }
}

describe('BotAssistant (task-level)', () => {
  beforeEach(() => {
    mockBuildMessagesWithContext.mockImplementation((msg) => [
      { role: 'user', content: msg },
    ])
    mockBuildRetryMessage.mockImplementation((_raw, errors) => ({
      role: 'user',
      content: `Fix: ${errors.join(', ')}`,
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders input with placeholder', () => {
    renderAssistant()
    expect(screen.getByPlaceholderText('Edit this task...')).toBeDefined()
  })

  it('shows confirmation dialog on valid result', async () => {
    const modifiedTask = {
      ...mockTask,
      inputData: [
        { name: 'expression', value: 'rate(30 minutes)', type: 'options' },
      ],
    }
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('```json\n{}\n```'),
    })
    mockParseTaskFromResponse.mockReturnValue(modifiedTask)

    renderAssistant()

    const input = screen.getByPlaceholderText('Edit this task...')
    fireEvent.change(input, { target: { value: 'change to every 30 min' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('Apply changes?')).toBeDefined()
    })
  })

  it('Apply calls updateBotTask with modified task', async () => {
    const modifiedTask = { ...mockTask, inputData: [] }
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('json'),
    })
    mockParseTaskFromResponse.mockReturnValue(modifiedTask)

    const updateBotTask = vi.fn().mockResolvedValue(undefined)
    renderAssistant({ botContextOverrides: { updateBotTask } })

    const input = screen.getByPlaceholderText('Edit this task...')
    fireEvent.change(input, { target: { value: 'remove inputs' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Apply'))

    await waitFor(() => {
      expect(updateBotTask).toHaveBeenCalledWith('bot-1', 0, modifiedTask)
    })
  })

  it('shows error after 3 failed attempts', async () => {
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('invalid'),
    })
    mockParseTaskFromResponse.mockReturnValue(null)

    renderAssistant()

    const input = screen.getByPlaceholderText('Edit this task...')
    fireEvent.change(input, { target: { value: 'do something' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText(/Failed to parse JSON/)).toBeDefined()
    })
  })
})
