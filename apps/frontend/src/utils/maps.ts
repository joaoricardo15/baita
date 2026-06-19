import { IPlace } from '@baita/shared'

export function buildGoogleMapsUrl(places: IPlace[]): string {
  if (places.length === 0) return ''

  if (places.length === 1) {
    const p = places[0]
    return `https://www.google.com/maps/search/?api=1&query=${p.position.lat},${p.position.lng}`
  }

  const origin = places[0]
  const destination = places[places.length - 1]
  const waypoints = places.slice(1, -1).slice(0, 9)

  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.position.lat},${origin.position.lng}`,
    destination: `${destination.position.lat},${destination.position.lng}`,
    travelmode: 'walking',
  })

  if (waypoints.length > 0) {
    params.set(
      'waypoints',
      waypoints.map((p) => `${p.position.lat},${p.position.lng}`).join('|')
    )
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export async function shareGuide(
  name: string,
  url: string
): Promise<'shared' | 'clipboard' | 'manual'> {
  const shareData = {
    title: name,
    text: name,
    url,
  }

  if (
    navigator.share &&
    (!navigator.canShare || navigator.canShare(shareData))
  ) {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return 'manual'
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'clipboard'
  } catch {
    return 'manual'
  }
}
