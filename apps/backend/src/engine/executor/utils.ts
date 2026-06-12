import { DataType } from '@baita/shared'

export function interpolatePathParams(
  path: string,
  queryParams: Record<string, string> | undefined,
  bodyParams: Record<string, string> | undefined
): {
  path: string
  queryParams: Record<string, string> | undefined
  bodyParams: Record<string, string> | undefined
} {
  const qp = queryParams ? { ...queryParams } : undefined
  const bp = bodyParams ? { ...bodyParams } : undefined

  const resolved = path.replace(/\{(\w+)\}/g, (_match, paramName: string) => {
    if (qp && paramName in qp) {
      const value = qp[paramName]
      delete qp[paramName]
      return encodeURIComponent(value)
    }
    if (bp && paramName in bp) {
      const value = bp[paramName]
      delete bp[paramName]
      return encodeURIComponent(value)
    }
    return `{${paramName}}`
  })

  return { path: resolved, queryParams: qp, bodyParams: bp }
}

export function encodeEmailRfc2822(params: Record<string, string>): {
  raw: string
} {
  const { to, subject, body } = params
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return { raw: encoded }
}

export function applyBodyEncoding(
  bodyParams: Record<string, string> | undefined,
  bodyEncoding?: string
): DataType | undefined {
  if (!bodyEncoding || !bodyParams) return bodyParams

  switch (bodyEncoding) {
    case 'email-rfc2822':
      return encodeEmailRfc2822(bodyParams)
    case 'form':
      return new URLSearchParams(bodyParams).toString()
    default:
      return bodyParams
  }
}
