import { haversineMeters, matchPositionToPlace } from '../utils/geo'

describe('Geo Utilities', () => {
  describe('haversineMeters', () => {
    it('returns 0 for the same point', () => {
      expect(haversineMeters(38.7223, -9.1393, 38.7223, -9.1393)).toBe(0)
    })

    it('computes a known distance between Lisbon and Porto', () => {
      const dist = haversineMeters(38.7223, -9.1393, 41.1579, -8.6291)
      expect(dist).toBeGreaterThan(270_000)
      expect(dist).toBeLessThan(280_000)
    })

    it('computes short distances accurately', () => {
      const dist = haversineMeters(38.7223, -9.1393, 38.7224, -9.1394)
      expect(dist).toBeGreaterThan(1)
      expect(dist).toBeLessThan(20)
    })

    it('handles antipodal points', () => {
      const dist = haversineMeters(0, 0, 0, 180)
      expect(dist).toBeCloseTo(Math.PI * 6_371_008.8, -2)
    })
  })

  describe('matchPositionToPlace', () => {
    const places = [
      { id: 'home', lat: 38.7223, lng: -9.1393, radiusM: 50 },
      { id: 'work', lat: 38.73, lng: -9.15, radiusM: 100 },
      { id: 'gym', lat: 38.74, lng: -9.16, radiusM: 30 },
    ]

    it('returns null when no places match', () => {
      const result = matchPositionToPlace({ lat: 40.0, lng: -8.0 }, places)
      expect(result).toBeNull()
    })

    it('returns null for empty places array', () => {
      const result = matchPositionToPlace({ lat: 38.7223, lng: -9.1393 }, [])
      expect(result).toBeNull()
    })

    it('matches a position within radius', () => {
      const result = matchPositionToPlace(
        { lat: 38.7223, lng: -9.1393 },
        places
      )
      expect(result).not.toBeNull()
      expect(result!.placeId).toBe('home')
      expect(result!.distance).toBeLessThan(50)
    })

    it('returns the nearest place when multiple match', () => {
      const overlapping = [
        { id: 'a', lat: 38.7223, lng: -9.1393, radiusM: 200 },
        { id: 'b', lat: 38.72235, lng: -9.13935, radiusM: 200 },
      ]
      const result = matchPositionToPlace(
        { lat: 38.7223, lng: -9.1393 },
        overlapping
      )
      expect(result).not.toBeNull()
      expect(result!.placeId).toBe('a')
    })

    it('does not match position outside radius', () => {
      const result = matchPositionToPlace({ lat: 38.723, lng: -9.1393 }, [
        { id: 'small', lat: 38.7223, lng: -9.1393, radiusM: 10 },
      ])
      expect(result).toBeNull()
    })
  })
})
