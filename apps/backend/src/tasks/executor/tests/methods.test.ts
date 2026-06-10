// Journey: Bot Automation — path parameter interpolation and body encoding
// These utilities ensure connector API calls are constructed correctly.
import {
  applyBodyEncoding,
  encodeEmailRfc2822,
  interpolatePathParams,
} from '../utils'

describe('interpolatePathParams', () => {
  test('substitutes single param from queryParams', () => {
    const result = interpolatePathParams(
      'gmail/v1/users/me/messages/{messageId}',
      { messageId: 'abc123', maxResults: '5' },
      undefined
    )
    expect(result.path).toBe('gmail/v1/users/me/messages/abc123')
    expect(result.queryParams).toEqual({ maxResults: '5' })
  })

  test('substitutes multiple params from queryParams', () => {
    const result = interpolatePathParams(
      'users/{userId}/messages/{messageId}',
      { userId: 'user1', messageId: 'msg1' },
      undefined
    )
    expect(result.path).toBe('users/user1/messages/msg1')
    expect(result.queryParams).toEqual({})
  })

  test('substitutes param from bodyParams when not in queryParams', () => {
    const result = interpolatePathParams('contacts/{contactId}', undefined, {
      contactId: '42',
      name: 'John',
    })
    expect(result.path).toBe('contacts/42')
    expect(result.bodyParams).toEqual({ name: 'John' })
  })

  test('prefers queryParams over bodyParams', () => {
    const result = interpolatePathParams(
      'items/{id}',
      { id: 'from-query' },
      { id: 'from-body' }
    )
    expect(result.path).toBe('items/from-query')
    expect(result.queryParams).toEqual({})
    expect(result.bodyParams).toEqual({ id: 'from-body' })
  })

  test('leaves unresolved params as literal', () => {
    const result = interpolatePathParams(
      'users/{userId}/messages/{messageId}',
      { messageId: 'msg1' },
      undefined
    )
    expect(result.path).toBe('users/{userId}/messages/msg1')
  })

  test('URI-encodes special characters', () => {
    const result = interpolatePathParams(
      'search/{query}',
      { query: 'hello world&foo=bar' },
      undefined
    )
    expect(result.path).toBe('search/hello%20world%26foo%3Dbar')
  })

  test('passthrough when no placeholders', () => {
    const result = interpolatePathParams(
      'gmail/v1/users/me/messages',
      { maxResults: '3' },
      undefined
    )
    expect(result.path).toBe('gmail/v1/users/me/messages')
    expect(result.queryParams).toEqual({ maxResults: '3' })
  })

  test('handles undefined queryParams and bodyParams', () => {
    const result = interpolatePathParams('path/{id}', undefined, undefined)
    expect(result.path).toBe('path/{id}')
    expect(result.queryParams).toBeUndefined()
    expect(result.bodyParams).toBeUndefined()
  })
})

describe('encodeEmailRfc2822', () => {
  test('builds correct RFC 2822 structure', () => {
    const result = encodeEmailRfc2822({
      to: 'user@example.com',
      subject: 'Hello',
      body: 'World',
    })

    const decoded = Buffer.from(result.raw, 'base64').toString('utf-8')
    expect(decoded).toContain('To: user@example.com')
    expect(decoded).toContain('Subject: Hello')
    expect(decoded).toContain('Content-Type: text/plain; charset="UTF-8"')
    expect(decoded).toContain('\r\n\r\nWorld')
  })

  test('produces valid base64url encoding (no +, /, or trailing =)', () => {
    const result = encodeEmailRfc2822({
      to: 'test+alias@example.com',
      subject: 'Symbols: +/= test',
      body: 'Content with special chars: +/=',
    })

    expect(result.raw).not.toMatch(/[+/=]/)
  })

  test('handles unicode in subject and body', () => {
    const result = encodeEmailRfc2822({
      to: 'user@example.com',
      subject: 'Olá mundo 🌍',
      body: 'Conteúdo com acentos: é, à, ç',
    })

    const decoded = Buffer.from(result.raw, 'base64url').toString('utf-8')
    expect(decoded).toContain('Subject: Olá mundo 🌍')
    expect(decoded).toContain('Conteúdo com acentos: é, à, ç')
  })
})

describe('applyBodyEncoding', () => {
  test('returns bodyParams unchanged when bodyEncoding is undefined', () => {
    const params = { to: 'a', subject: 'b', body: 'c' }
    expect(applyBodyEncoding(params, undefined)).toEqual(params)
  })

  test('returns bodyParams unchanged for unknown encoding', () => {
    const params = { key: 'value' }
    expect(applyBodyEncoding(params, 'unknown-encoding')).toEqual(params)
  })

  test('returns undefined when bodyParams is undefined', () => {
    expect(applyBodyEncoding(undefined, 'email-rfc2822')).toBeUndefined()
  })

  test('applies email-rfc2822 encoding', () => {
    const result = applyBodyEncoding(
      { to: 'user@test.com', subject: 'Test', body: 'Hello' },
      'email-rfc2822'
    ) as { raw: string }

    expect(result).toHaveProperty('raw')
    const decoded = Buffer.from(result.raw, 'base64url').toString('utf-8')
    expect(decoded).toContain('To: user@test.com')
    expect(decoded).toContain('Subject: Test')
    expect(decoded).toContain('Hello')
  })

  test('applies form encoding', () => {
    const result = applyBodyEncoding({ name: 'John', age: '30' }, 'form')
    expect(result).toBe('name=John&age=30')
  })
})
