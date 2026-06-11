const BASE64URL_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function hexToBase64url(hex: string): string {
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16))
  }

  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1] ?? 0
    const b2 = bytes[i + 2] ?? 0

    result += BASE64URL_CHARS[(b0 >> 2) & 0x3f]
    result += BASE64URL_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f]
    if (i + 1 < bytes.length) {
      result += BASE64URL_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f]
    }
    if (i + 2 < bytes.length) {
      result += BASE64URL_CHARS[b2 & 0x3f]
    }
  }

  return result
}

function base64urlToHex(base64url: string): string {
  const lookup: Record<string, number> = {}
  for (let i = 0; i < BASE64URL_CHARS.length; i++) {
    lookup[BASE64URL_CHARS[i]] = i
  }

  const bytes: number[] = []
  for (let i = 0; i < base64url.length; i += 4) {
    const b0 = lookup[base64url[i]] ?? 0
    const b1 = lookup[base64url[i + 1]] ?? 0
    const b2 = lookup[base64url[i + 2]] ?? 0
    const b3 = lookup[base64url[i + 3]] ?? 0

    bytes.push((b0 << 2) | (b1 >> 4))
    if (i + 2 < base64url.length) bytes.push(((b1 << 4) | (b2 >> 2)) & 0xff)
    if (i + 3 < base64url.length) bytes.push(((b2 << 6) | b3) & 0xff)
  }

  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function computeTriggerToken(userId: string): string {
  return hexToBase64url(userId)
}

export function decodeTriggerToken(token: string): string {
  return base64urlToHex(token)
}

export function computeRunUrl(
  botId: string,
  userId: string,
  apiUrl: string
): string {
  return `${apiUrl}/bots/${botId}/run/${computeTriggerToken(userId)}`
}
