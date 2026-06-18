import {
  FeelingSchema,
  getMoodDefinition,
  getMoodEmoji,
  MOOD_BY_VALUE,
  MOOD_QUADRANTS,
  MOOD_VALUES,
  MOODS,
  SUGGESTED_TAGS,
  TAG_CATEGORIES,
} from '../models/feeling'

describe('Feeling Constants', () => {
  describe('MOOD_VALUES', () => {
    it('has 10 moods', () => {
      expect(MOOD_VALUES).toHaveLength(10)
    })

    it('contains expected moods', () => {
      expect(MOOD_VALUES).toContain('joyful')
      expect(MOOD_VALUES).toContain('excited')
      expect(MOOD_VALUES).toContain('inspired')
      expect(MOOD_VALUES).toContain('calm')
      expect(MOOD_VALUES).toContain('grateful')
      expect(MOOD_VALUES).toContain('anxious')
      expect(MOOD_VALUES).toContain('frustrated')
      expect(MOOD_VALUES).toContain('sad')
      expect(MOOD_VALUES).toContain('drained')
      expect(MOOD_VALUES).toContain('lonely')
    })
  })

  describe('MOODS definitions', () => {
    it('has a definition for every MOOD_VALUES entry', () => {
      for (const value of MOOD_VALUES) {
        const def = MOODS.find((m) => m.value === value)
        expect(def).toBeDefined()
      }
    })

    it('every mood has a valid quadrant', () => {
      const quadrants = Object.keys(MOOD_QUADRANTS)
      for (const mood of MOODS) {
        expect(quadrants).toContain(mood.quadrant)
      }
    })

    it('every mood has emoji, color, glow, and labels', () => {
      for (const mood of MOODS) {
        expect(mood.emoji).toBeTruthy()
        expect(mood.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(mood.glow).toMatch(/^rgba\(/)
        expect(mood.labels.en).toBeTruthy()
        expect(mood.labels.pt).toBeTruthy()
      }
    })

    it('covers all 4 quadrants', () => {
      const coveredQuadrants = new Set(MOODS.map((m) => m.quadrant))
      expect(coveredQuadrants.size).toBe(4)
    })
  })

  describe('MOOD_BY_VALUE', () => {
    it('has an entry for every mood', () => {
      for (const value of MOOD_VALUES) {
        expect(MOOD_BY_VALUE[value]).toBeDefined()
        expect(MOOD_BY_VALUE[value].value).toBe(value)
      }
    })
  })

  describe('getMoodEmoji', () => {
    it('returns emoji for valid moods', () => {
      expect(getMoodEmoji('joyful')).toBe('😄')
      expect(getMoodEmoji('anxious')).toBe('😟')
      expect(getMoodEmoji('lonely')).toBe('🫥')
    })

    it('returns undefined for invalid moods', () => {
      expect(getMoodEmoji('invalid')).toBeUndefined()
    })
  })

  describe('getMoodDefinition', () => {
    it('returns full definition for valid moods', () => {
      const def = getMoodDefinition('calm')
      expect(def).toBeDefined()
      expect(def?.quadrant).toBe('lowPositive')
      expect(def?.emoji).toBe('😌')
    })

    it('returns undefined for invalid moods', () => {
      expect(getMoodDefinition('invalid')).toBeUndefined()
    })
  })

  describe('Tags', () => {
    it('SUGGESTED_TAGS contains journaling + context tags', () => {
      for (const tag of TAG_CATEGORIES.journaling) {
        expect(SUGGESTED_TAGS).toContain(tag)
      }
      for (const tag of TAG_CATEGORIES.context) {
        expect(SUGGESTED_TAGS).toContain(tag)
      }
    })

    it('journaling tags come first in SUGGESTED_TAGS', () => {
      const firstJournaling = SUGGESTED_TAGS.indexOf(
        TAG_CATEGORIES.journaling[0]
      )
      const firstContext = SUGGESTED_TAGS.indexOf(TAG_CATEGORIES.context[0])
      expect(firstJournaling).toBeLessThan(firstContext)
    })
  })

  describe('FeelingSchema', () => {
    it('validates a complete feeling', () => {
      const result = FeelingSchema.safeParse({
        feelingId: 'test-123',
        content: 'Feeling good',
        mood: 'joyful',
        tags: ['dream', 'work'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      expect(result.success).toBe(true)
    })

    it('validates a feeling without mood or tags', () => {
      const result = FeelingSchema.safeParse({
        feelingId: 'test-456',
        content: 'Just a thought',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid mood values', () => {
      const result = FeelingSchema.safeParse({
        feelingId: 'test-789',
        content: 'Test',
        mood: 'invalid-mood',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      expect(result.success).toBe(false)
    })
  })
})
