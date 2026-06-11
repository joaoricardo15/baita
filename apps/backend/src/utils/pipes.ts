import { DataType } from '@baita/shared'

type PipeFn = (value: DataType) => DataType | undefined

function base64urlDecode(value: DataType): DataType | undefined {
  if (typeof value !== 'string') return value
  return Buffer.from(value, 'base64url').toString('utf-8')
}

function extractEmailBody(payload: DataType): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const p = payload as Record<string, unknown>

  const bodyData = (p.body as Record<string, unknown>)?.data
  if (typeof bodyData === 'string' && bodyData.length > 0) {
    const decoded = Buffer.from(bodyData, 'base64url').toString('utf-8')
    if (decoded.trim()) return decoded
  }

  const parts = p.parts as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(parts)) return undefined

  const textPart = parts.find((part) => part.mimeType === 'text/plain')
  if (textPart) {
    const data = (textPart.body as Record<string, unknown>)?.data
    if (typeof data === 'string' && data.length > 0) {
      const decoded = Buffer.from(data, 'base64url').toString('utf-8')
      if (decoded.trim()) return decoded
    }
  }

  const htmlPart = parts.find((part) => part.mimeType === 'text/html')
  if (htmlPart) {
    const data = (htmlPart.body as Record<string, unknown>)?.data
    if (typeof data === 'string' && data.length > 0) {
      const html = Buffer.from(data, 'base64url').toString('utf-8')
      const text = stripHtml(html)
      if (text) return text
    }
  }

  for (const part of parts) {
    const nested = extractEmailBody(part)
    if (nested) return nested
  }

  return undefined
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export const pipes: Record<string, PipeFn> = {
  base64url: base64urlDecode,
  'email-body': extractEmailBody,
}
