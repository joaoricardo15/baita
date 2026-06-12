export function computeTriggerToken(userId: string): string {
  const bytes = new TextEncoder().encode(userId)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeTriggerToken(token: string): string {
  const padded =
    token.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (token.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function computeRunUrl(
  botId: string,
  userId: string,
  apiUrl: string
): string {
  return `${apiUrl}/bots/${botId}/run/${computeTriggerToken(userId)}`
}
