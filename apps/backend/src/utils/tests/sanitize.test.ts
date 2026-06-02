import { sanitizeForCodeString } from '@/utils/code'

describe('sanitizeForCodeString', () => {
  test('should escape single quotes', () => {
    expect(sanitizeForCodeString("it's a test")).toBe("it\\'s a test")
  })

  test('should escape backticks', () => {
    expect(sanitizeForCodeString('hello `world`')).toBe('hello \\`world\\`')
  })

  test('should escape backslashes', () => {
    expect(sanitizeForCodeString('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  test('should escape dollar signs', () => {
    expect(sanitizeForCodeString('price is $10')).toBe('price is \\$10')
  })

  test('should handle multiple escape characters together', () => {
    expect(sanitizeForCodeString("it's `$cool`")).toBe("it\\'s \\`\\$cool\\`")
  })

  test('should return unchanged string when no special chars', () => {
    expect(sanitizeForCodeString('hello world')).toBe('hello world')
  })

  test('should handle empty string', () => {
    expect(sanitizeForCodeString('')).toBe('')
  })

  test('should prevent code injection via bot name', () => {
    const maliciousName = "'; process.exit(); '"
    const sanitized = sanitizeForCodeString(maliciousName)
    expect(sanitized).toBe("\\'; process.exit(); \\'")
    expect(sanitized.startsWith("'")).toBe(false)
  })
})
