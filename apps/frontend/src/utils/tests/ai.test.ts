// Journey: Bot Automation (AI Assistant) — Chrome AI detection and response parsing
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildMessagesWithContext,
  buildRetryMessage,
  getAiService,
  parseTaskFromResponse,
} from '@/utils/ai'

afterEach(() => {
  delete (window as any).ai
  delete (window as any).LanguageModel
})

describe('getAiService', () => {
  it('returns AiService when Chrome AI is available', async () => {
    ;(window as any).ai = {
      languageModel: {
        capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        create: vi.fn(),
      },
    }
    const service = await getAiService()
    expect(service).not.toBeNull()
    expect(service?.provider).toBe('chrome-ai')
  })

  it('returns null when window.ai is undefined', async () => {
    const service = await getAiService()
    expect(service).toBeNull()
  })

  it('returns null when languageModel is undefined', async () => {
    ;(window as any).ai = {}
    const service = await getAiService()
    expect(service).toBeNull()
  })

  it('returns null when available is not readily', async () => {
    ;(window as any).ai = {
      languageModel: {
        capabilities: vi.fn().mockResolvedValue({ available: 'no' }),
      },
    }
    const service = await getAiService()
    expect(service).toBeNull()
  })

  it('returns service when LanguageModel global exists', async () => {
    ;(window as any).LanguageModel = class {}
    const service = await getAiService()
    expect(service).not.toBeNull()
  })
})

describe('parseTaskFromResponse', () => {
  it('parses a task object from markdown code block', () => {
    const response =
      '```json\n{"taskId": 1, "service": {"name": "schedule"}, "inputData": []}\n```'
    const result = parseTaskFromResponse(response)
    expect(result).toEqual({
      taskId: 1,
      service: { name: 'schedule' },
      inputData: [],
    })
  })

  it('parses raw JSON object', () => {
    const response = '{"taskId": 1, "inputData": []}'
    const result = parseTaskFromResponse(response)
    expect(result).toEqual({ taskId: 1, inputData: [] })
  })

  it('handles single-element array (extracts first)', () => {
    const response = '[{"taskId": 1, "inputData": []}]'
    const result = parseTaskFromResponse(response)
    expect(result).toEqual({ taskId: 1, inputData: [] })
  })

  it('returns null for invalid JSON', () => {
    expect(parseTaskFromResponse('not json')).toBeNull()
    expect(parseTaskFromResponse('')).toBeNull()
  })

  it('returns null for multi-element arrays', () => {
    const response = '[{"taskId": 1}, {"taskId": 2}]'
    expect(parseTaskFromResponse(response)).toBeNull()
  })

  it('handles markdown with surrounding text', () => {
    const response =
      'Here:\n```json\n{"taskId": 1, "inputData": []}\n```\nDone.'
    const result = parseTaskFromResponse(response)
    expect(result).toEqual({ taskId: 1, inputData: [] })
  })
})

describe('buildMessagesWithContext', () => {
  it('creates message with task context and user request', () => {
    const task = {
      taskId: 1,
      inputData: [{ name: 'expression', value: 'cron(0 9 * * ? *)' }],
      service: {
        name: 'schedule',
        config: { inputFields: [{ name: 'expression', type: 'options' }] },
      },
    } as any
    const result = buildMessagesWithContext('change to every 30 minutes', task)
    expect(result).toHaveLength(1)
    expect(result[0].content).toContain('Current task:')
    expect(result[0].content).toContain('change to every 30 minutes')
    expect(result[0].content).toContain('"expression"')
    expect(result[0].content).toContain('inputFields')
  })

  it('strips sampleResult from task context', () => {
    const task = {
      taskId: 1,
      inputData: [],
      sampleResult: { outputData: { big: 'data' } },
      sampleConfigHash: 'abc123',
    } as any
    const result = buildMessagesWithContext('edit', task)
    expect(result[0].content).not.toContain('sampleResult')
    expect(result[0].content).not.toContain('sampleConfigHash')
  })

  it('includes conversation history', () => {
    const task = { taskId: 1, inputData: [] } as any
    const history = [
      { role: 'user' as const, content: 'prev' },
      { role: 'assistant' as const, content: 'reply' },
    ]
    const result = buildMessagesWithContext('next', task, history)
    expect(result).toHaveLength(3)
    expect(result[0].content).toBe('prev')
    expect(result[1].content).toBe('reply')
  })
})

describe('buildRetryMessage', () => {
  it('returns a user message with formatted errors', () => {
    const result = buildRetryMessage('bad', ['Missing service field'])
    expect(result.role).toBe('user')
    expect(result.content).toContain('Missing service field')
    expect(result.content).toContain('```json')
  })
})
