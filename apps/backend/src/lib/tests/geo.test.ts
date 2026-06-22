import {
  classifyActivity,
  computePlaceScore,
  detectStayPoints,
  filterNoise,
  haversineMeters,
  IGpsPoint,
  isNewPlace,
  matchToPlace,
  segmentActivities,
} from '../geo'

describe('geo utilities', () => {
  describe('haversineMeters', () => {
    it('returns 0 for same point', () => {
      expect(haversineMeters(38.7223, -9.1393, 38.7223, -9.1393)).toBe(0)
    })

    it('calculates distance between two known points', () => {
      const dist = haversineMeters(38.7223, -9.1393, 38.7368, -9.1427)
      expect(dist).toBeGreaterThan(1500)
      expect(dist).toBeLessThan(1700)
    })

    it('handles antipodal points', () => {
      const dist = haversineMeters(0, 0, 0, 180)
      expect(dist).toBeGreaterThan(20_000_000)
    })
  })

  describe('filterNoise', () => {
    it('removes points implying impossible speed', () => {
      const points: IGpsPoint[] = [
        { lat: 38.72, lng: -9.13, timestamp: 0 },
        { lat: 40.0, lng: -9.13, timestamp: 1000 },
        { lat: 38.7201, lng: -9.13, timestamp: 60000 },
      ]
      const filtered = filterNoise(points)
      expect(filtered).toHaveLength(2)
      expect(filtered[0].lat).toBe(38.72)
      expect(filtered[1].lat).toBe(38.7201)
    })

    it('returns all points when data is clean', () => {
      const points: IGpsPoint[] = [
        { lat: 38.722, lng: -9.139, timestamp: 0 },
        { lat: 38.7221, lng: -9.1391, timestamp: 60000 },
        { lat: 38.7222, lng: -9.1392, timestamp: 120000 },
      ]
      expect(filterNoise(points)).toHaveLength(3)
    })
  })

  describe('detectStayPoints', () => {
    it('detects a stay when points cluster within radius for dwell time', () => {
      const points: IGpsPoint[] = []
      const baseTime = 0
      for (let i = 0; i < 10; i++) {
        points.push({
          lat: 38.722 + Math.random() * 0.0002,
          lng: -9.139 + Math.random() * 0.0002,
          timestamp: baseTime + i * 60000,
        })
      }
      const stays = detectStayPoints(points, 50, 5 * 60 * 1000)
      expect(stays.length).toBeGreaterThanOrEqual(1)
      expect(stays[0].durationMs).toBeGreaterThanOrEqual(5 * 60 * 1000)
    })

    it('does not detect a stay for brief stops', () => {
      const points: IGpsPoint[] = [
        { lat: 38.72, lng: -9.13, timestamp: 0 },
        { lat: 38.72, lng: -9.13, timestamp: 60000 },
        { lat: 38.72, lng: -9.13, timestamp: 120000 },
        { lat: 38.8, lng: -9.1, timestamp: 180000 },
      ]
      const stays = detectStayPoints(points, 50, 5 * 60 * 1000)
      expect(stays).toHaveLength(0)
    })

    it('returns empty for less than 2 points', () => {
      expect(detectStayPoints([{ lat: 0, lng: 0, timestamp: 0 }])).toHaveLength(
        0
      )
    })
  })

  describe('classifyActivity', () => {
    function makeTrace(speedKmh: number, count = 10): IGpsPoint[] {
      const speedMs = speedKmh / 3.6
      const points: IGpsPoint[] = []
      for (let i = 0; i < count; i++) {
        points.push({
          lat: 38.72 + (speedMs * i * 10) / 111320,
          lng: -9.13,
          timestamp: i * 10000,
        })
      }
      return points
    }

    it('classifies slow movement as walking', () => {
      const result = classifyActivity(makeTrace(4.5))
      expect(result.type).toBe('walking')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('classifies moderate speed as cycling', () => {
      const result = classifyActivity(makeTrace(18))
      expect(result.type).toBe('cycling')
    })

    it('classifies high speed as driving', () => {
      const result = classifyActivity(makeTrace(60))
      expect(result.type).toBe('driving')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('classifies running speed correctly', () => {
      const result = classifyActivity(makeTrace(9))
      expect(result.type).toBe('running')
    })
  })

  describe('matchToPlace', () => {
    const places = [
      { id: 'home', lat: 38.722, lng: -9.139, radiusM: 50 },
      { id: 'work', lat: 38.75, lng: -9.15, radiusM: 100 },
    ]

    it('matches a point inside a place radius', () => {
      const result = matchToPlace(38.7221, -9.1391, places)
      expect(result).not.toBeNull()
      expect(result!.placeId).toBe('home')
    })

    it('returns null for a point outside all places', () => {
      const result = matchToPlace(39.0, -9.0, places)
      expect(result).toBeNull()
    })

    it('returns the closest match when inside multiple places', () => {
      const overlapping = [
        { id: 'big', lat: 38.72, lng: -9.13, radiusM: 500 },
        { id: 'small', lat: 38.7201, lng: -9.1301, radiusM: 100 },
      ]
      const result = matchToPlace(38.7201, -9.1301, overlapping)
      expect(result!.placeId).toBe('small')
    })
  })

  describe('isNewPlace', () => {
    const places = [{ id: 'home', lat: 38.722, lng: -9.139, radiusM: 50 }]

    it('returns true when far from all known places', () => {
      expect(isNewPlace(39.0, -9.0, places)).toBe(true)
    })

    it('returns false when within threshold of a known place', () => {
      expect(isNewPlace(38.7225, -9.1395, places)).toBe(false)
    })
  })

  describe('computePlaceScore', () => {
    it('returns higher score for frequent recent places', () => {
      const highScore = computePlaceScore(20, 1, 60)
      const lowScore = computePlaceScore(2, 30, 10)
      expect(highScore).toBeGreaterThan(lowScore)
    })

    it('returns value between 0 and 1', () => {
      const score = computePlaceScore(50, 0, 120)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('decays with time since last visit', () => {
      const recent = computePlaceScore(10, 1, 30)
      const old = computePlaceScore(10, 60, 30)
      expect(recent).toBeGreaterThan(old)
    })
  })

  describe('segmentActivities', () => {
    it('returns a single segment for consistent speed trace', () => {
      const points: IGpsPoint[] = []
      for (let i = 0; i < 20; i++) {
        points.push({
          lat: 38.72 + i * 0.00004,
          lng: -9.13,
          timestamp: i * 10000,
        })
      }
      const segments = segmentActivities(points)
      expect(segments.length).toBeGreaterThanOrEqual(1)
      expect(segments[0].distanceM).toBeGreaterThan(0)
    })
  })
})
