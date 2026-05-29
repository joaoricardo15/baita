import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, vi } from 'vitest'

import { IBot } from '../../../models/bot'
import { BotContext } from '../../../providers/bot'
import BotAssistant from '../components/assistant'

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
const mockParseTasksFromResponse = vi.fn()
const mockBuildMessagesWithContext = vi.fn()

vi.mock('../../../utils/ai', () => ({
  getAiService: (...args: any[]) => mockGetAiService(...args),
  parseTasksFromResponse: (...args: any[]) =>
    mockParseTasksFromResponse(...args),
  buildMessagesWithContext: (...args: any[]) =>
    mockBuildMessagesWithContext(...args),
}))

const mockValidateBot = vi.fn()
vi.mock('../../../models/bot', async () => {
  const actual = await vi.importActual('../../../models/bot')
  return {
    ...actual,
    validateBot: (...args: any[]) => mockValidateBot(...args),
  }
})

const mockBot: IBot = {
  botId: 'bot-1',
  userId: 'user-1',
  name: 'Test Bot',
  tasks: [],
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
  updateBotTask: vi.fn(),
  botModels: undefined as any,
  getBotModels: vi.fn(),
  deleteBotModel: vi.fn(),
  deployBotModel: vi.fn(),
  publishBotModel: vi.fn(),
  ...overrides,
})

const renderAssistant = (
  options: {
    bot?: IBot
    onTasksGenerated?: any
    botContextOverrides?: any
  } = {}
) => {
  const {
    bot = mockBot,
    onTasksGenerated = vi.fn(),
    botContextOverrides = {},
  } = options
  const botContext = createBotContextValue(botContextOverrides)

  return {
    ...render(
      <BotContext.Provider value={botContext}>
        <BotAssistant bot={bot} onTasksGenerated={onTasksGenerated} />
      </BotContext.Provider>
    ),
    botContext,
    onTasksGenerated,
  }
}

describe('BotAssistant', () => {
  beforeEach(() => {
    mockBuildMessagesWithContext.mockImplementation((msg) => [
      { role: 'user', content: msg },
    ])
    mockValidateBot.mockReturnValue({ valid: true, errors: [], warnings: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state with placeholder text', () => {
    renderAssistant()
    expect(
      screen.getByText('Describe what you want your bot to do...')
    ).toBeDefined()
  })

  it('renders input field with placeholder', () => {
    renderAssistant()
    expect(
      screen.getByPlaceholderText(
        'e.g., "Check the weather every morning and send me a notification"'
      )
    ).toBeDefined()
  })

  it('sends a message on Enter and displays it', async () => {
    const mockGenerate = vi.fn().mockResolvedValue('AI response')
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: mockGenerate,
    })
    mockParseTasksFromResponse.mockReturnValue(null)

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'make a weather bot' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('make a weather bot')).toBeDefined()
    })
  })

  it('shows loading spinner while AI is generating', async () => {
    let resolveGenerate: (v: string) => void
    const generatePromise = new Promise<string>((r) => {
      resolveGenerate = r
    })
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: () => generatePromise,
    })

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeDefined()
    })

    resolveGenerate!('done')
    mockParseTasksFromResponse.mockReturnValue(null)

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).toBeNull()
    })
  })

  it('displays AI response after generation', async () => {
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('Here is your bot config'),
    })
    mockParseTasksFromResponse.mockReturnValue(null)

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('Here is your bot config')).toBeDefined()
    })
  })

  it('shows "Bot ready!" when valid tasks are generated', async () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('```json\n[]\n```'),
    })
    mockParseTasksFromResponse.mockReturnValue(tasks)
    mockValidateBot.mockReturnValue({ valid: true, errors: [], warnings: [] })

    const onTasksGenerated = vi.fn()
    renderAssistant({ onTasksGenerated })

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'create bot' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('Bot ready! (1 tasks)')).toBeDefined()
    })
  })

  it('calls onTasksGenerated when valid tasks are parsed', async () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('json'),
    })
    mockParseTasksFromResponse.mockReturnValue(tasks)
    mockValidateBot.mockReturnValue({ valid: true, errors: [], warnings: [] })

    const onTasksGenerated = vi.fn()
    renderAssistant({ onTasksGenerated })

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(onTasksGenerated).toHaveBeenCalledWith(tasks)
    })
  })

  it('shows validation errors when validateBot returns errors', async () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('json'),
    })
    mockParseTasksFromResponse.mockReturnValue(tasks)
    mockValidateBot.mockReturnValue({
      valid: false,
      errors: ['First task must be a trigger'],
      warnings: [],
    })

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('First task must be a trigger')).toBeDefined()
    })
  })

  it('does not call onTasksGenerated when validation fails', async () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('json'),
    })
    mockParseTasksFromResponse.mockReturnValue(tasks)
    mockValidateBot.mockReturnValue({
      valid: false,
      errors: ['error'],
      warnings: [],
    })

    const onTasksGenerated = vi.fn()
    renderAssistant({ onTasksGenerated })

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('error')).toBeDefined()
    })
    expect(onTasksGenerated).not.toHaveBeenCalled()
  })

  it('shows error message when AI service throws', async () => {
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockRejectedValue(new Error('network')),
    })

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again.')
      ).toBeDefined()
    })
  })

  it('shows error when getAiService returns null', async () => {
    mockGetAiService.mockResolvedValue(null)

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again.')
      ).toBeDefined()
    })
  })

  it('Deploy chip calls updateBot and deployBot', async () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('json'),
    })
    mockParseTasksFromResponse.mockReturnValue(tasks)
    mockValidateBot.mockReturnValue({ valid: true, errors: [], warnings: [] })

    const updateBot = vi.fn().mockResolvedValue(undefined)
    const deployBot = vi.fn().mockResolvedValue({})

    renderAssistant({ botContextOverrides: { updateBot, deployBot } })

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('Deploy')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Deploy'))

    await waitFor(() => {
      expect(updateBot).toHaveBeenCalledWith(expect.objectContaining({ tasks }))
      expect(deployBot).toHaveBeenCalledWith(expect.objectContaining({ tasks }))
    })
  })

  it('Open in Builder chip calls onTasksGenerated', async () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn().mockResolvedValue('json'),
    })
    mockParseTasksFromResponse.mockReturnValue(tasks)
    mockValidateBot.mockReturnValue({ valid: true, errors: [], warnings: [] })

    const onTasksGenerated = vi.fn()
    renderAssistant({ onTasksGenerated })

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByText('Open in Builder')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Open in Builder'))

    expect(onTasksGenerated).toHaveBeenCalledWith(tasks)
  })

  it('disables send button and input while loading', async () => {
    let resolveGenerate: (v: string) => void
    const generatePromise = new Promise<string>((r) => {
      resolveGenerate = r
    })
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: () => generatePromise,
    })

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(input.disabled).toBe(true)
    })

    resolveGenerate!('done')
    mockParseTasksFromResponse.mockReturnValue(null)

    await waitFor(() => {
      expect(input.disabled).toBe(false)
    })
  })

  it('does not send on Shift+Enter (allows multiline)', () => {
    const mockGenerate = vi.fn()
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: mockGenerate,
    })

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.change(input, { target: { value: 'line 1' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(mockGetAiService).not.toHaveBeenCalled()
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('does not send when input is empty', () => {
    mockGetAiService.mockResolvedValue({
      provider: 'chrome-ai',
      generate: vi.fn(),
    })

    renderAssistant()

    const input = screen.getByPlaceholderText(
      'e.g., "Check the weather every morning and send me a notification"'
    )
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    expect(mockGetAiService).not.toHaveBeenCalled()
  })
})
