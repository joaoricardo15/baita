import { IPlace, IUsualPlace } from '@baita/shared'

import { matchFeelingToPlace } from '../geo'

const makeUsualPlaces = (
  overrides: Array<Partial<IUsualPlace> & { usualPlaceId: string }>
): IUsualPlace[] =>
  overrides.map((p) => ({
    name: 'Test Place',
    position: { lat: 0, lng: 0 },
    radiusM: 50,
    category: 'new' as const,
    visitCount: 1,
    score: 0.1,
    ...p,
  }))

const makePlaces = (
  overrides: Array<Partial<IPlace> & { placeId: string }>
): IPlace[] =>
  overrides.map((p) => ({
    name: 'Regular Place',
    position: { lat: 0, lng: 0 },
    pictures: [],
    ...p,
  }))

describe('matchFeelingToPlace', () => {
  it('returns null when position is undefined', () => {
    const places = makeUsualPlaces([
      { usualPlaceId: 'a', position: { lat: 38.72, lng: -9.14 } },
    ])
    expect(matchFeelingToPlace(undefined, places)).toBeNull()
  })

  it('returns null when both arrays are empty', () => {
    expect(matchFeelingToPlace({ lat: 38.72, lng: -9.14 }, [], [])).toBeNull()
  })

  it('returns null when position is far from all places', () => {
    const places = makeUsualPlaces([
      {
        usualPlaceId: 'home',
        position: { lat: 38.72, lng: -9.14 },
        radiusM: 50,
      },
    ])
    expect(matchFeelingToPlace({ lat: 40.0, lng: -8.0 }, places)).toBeNull()
  })

  it('matches usual-place when position is within radius', () => {
    const places = makeUsualPlaces([
      {
        usualPlaceId: 'cafe',
        name: 'Café da Esquina',
        position: { lat: 38.7223, lng: -9.1393 },
        radiusM: 50,
      },
    ])
    const result = matchFeelingToPlace({ lat: 38.7223, lng: -9.1393 }, places)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Café da Esquina')
    expect(result!.id).toBe('cafe')
  })

  it('matches regular place with default 50m radius', () => {
    const regularPlaces = makePlaces([
      {
        placeId: 'my-spot',
        name: 'My Spot',
        position: { lat: 38.7223, lng: -9.1393 },
      },
    ])
    const result = matchFeelingToPlace(
      { lat: 38.7223, lng: -9.1393 },
      [],
      regularPlaces
    )
    expect(result).not.toBeNull()
    expect(result!.name).toBe('My Spot')
    expect(result!.id).toBe('my-spot')
  })

  it('returns the nearest when both types match', () => {
    const usualPlaces = makeUsualPlaces([
      {
        usualPlaceId: 'far-usual',
        name: 'Far Usual',
        position: { lat: 38.7225, lng: -9.1395 },
        radiusM: 200,
      },
    ])
    const regularPlaces = makePlaces([
      {
        placeId: 'near-regular',
        name: 'Near Regular',
        position: { lat: 38.7223, lng: -9.1393 },
      },
    ])
    const result = matchFeelingToPlace(
      { lat: 38.7223, lng: -9.1393 },
      usualPlaces,
      regularPlaces
    )
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Near Regular')
  })
})
