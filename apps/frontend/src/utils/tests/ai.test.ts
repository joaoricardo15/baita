import { describe, expect, it } from 'vitest'

import { buildMessagesWithContext, parseTasksFromResponse } from '../ai'

describe('parseTasksFromResponse', () => {
  it('parses JSON from markdown code block', () => {
    const response = '```json\n[{"taskId": 1, "inputData": []}]\n```'
    const result = parseTasksFromResponse(response)
    expect(result).toEqual([{ taskId: 1, inputData: [] }])
  })

  it('parses raw JSON array', () => {
    const response = '[{"taskId": 1, "inputData": []}]'
    const result = parseTasksFromResponse(response)
    expect(result).toEqual([{ taskId: 1, inputData: [] }])
  })

  it('parses object with tasks property', () => {
    const response = '{"tasks": [{"taskId": 1, "inputData": []}]}'
    const result = parseTasksFromResponse(response)
    expect(result).toEqual([{ taskId: 1, inputData: [] }])
  })

  it('returns null for invalid JSON', () => {
    expect(parseTasksFromResponse('not json')).toBeNull()
    expect(parseTasksFromResponse('')).toBeNull()
    expect(parseTasksFromResponse('{ broken')).toBeNull()
  })

  it('returns null for non-array JSON', () => {
    expect(parseTasksFromResponse('{"key": "value"}')).toBeNull()
  })

  it('handles markdown with surrounding text', () => {
    const response =
      'Here is your bot:\n```json\n[{"taskId": 1000, "inputData": []}]\n```\nLet me know if you need changes.'
    const result = parseTasksFromResponse(response)
    expect(result).toEqual([{ taskId: 1000, inputData: [] }])
  })
})

describe('buildMessagesWithContext', () => {
  it('creates messages with user input only', () => {
    const result = buildMessagesWithContext('make a bot')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ role: 'user', content: 'make a bot' })
  })

  it('includes existing tasks as context when more than one task', () => {
    const tasks = [
      { taskId: 1, inputData: [] },
      { taskId: 2, inputData: [] },
    ]
    const result = buildMessagesWithContext('edit this', tasks as any)
    expect(result).toHaveLength(2)
    expect(result[0].content).toContain('Current bot tasks')
    expect(result[1]).toEqual({ role: 'user', content: 'edit this' })
  })

  it('includes conversation history', () => {
    const history = [
      { role: 'user' as const, content: 'hello' },
      { role: 'assistant' as const, content: 'hi' },
    ]
    const result = buildMessagesWithContext('next message', undefined, history)
    expect(result).toHaveLength(3)
    expect(result[0].content).toBe('hello')
    expect(result[1].content).toBe('hi')
    expect(result[2].content).toBe('next message')
  })

  it('does not include tasks context for single-task bots', () => {
    const tasks = [{ taskId: 1, inputData: [] }]
    const result = buildMessagesWithContext('create', tasks as any)
    expect(result).toHaveLength(1)
  })
})
