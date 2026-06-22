import {
  entityRegistry,
  getEntityConfig,
  getRegisteredTypes,
  isRegisteredType,
} from '../registry'

describe('Entity Type Registry', () => {
  it('returns config for all registered types', () => {
    const types = getRegisteredTypes()
    expect(types).toContain('user')
    expect(types).toContain('bot')
    expect(types).toContain('template')
    expect(types).toContain('connection')
    expect(types).toContain('feeling')
    expect(types).toContain('place')
    expect(types).toContain('todo')
    expect(types).toContain('content')
    expect(types).toContain('image')
    expect(types).toContain('usual-place')
    expect(types).toContain('visit')
    expect(types).toContain('activity')
    expect(types).toHaveLength(13)
  })

  it('getEntityConfig returns config for valid types', () => {
    const feelingConfig = getEntityConfig('feeling')
    expect(feelingConfig).toBeDefined()
    expect(feelingConfig!.idField).toBe('feelingId')
    expect(feelingConfig!.singleton).toBe(false)
    expect(feelingConfig!.schema).not.toBeNull()
  })

  it('getEntityConfig is case-insensitive', () => {
    expect(getEntityConfig('FEELING')).toEqual(getEntityConfig('feeling'))
    expect(getEntityConfig('Bot')).toEqual(getEntityConfig('bot'))
  })

  it('getEntityConfig returns undefined for unknown types', () => {
    expect(getEntityConfig('unknown')).toBeUndefined()
    expect(getEntityConfig('')).toBeUndefined()
  })

  it('isRegisteredType identifies valid and invalid types', () => {
    expect(isRegisteredType('bot')).toBe(true)
    expect(isRegisteredType('BOT')).toBe(true)
    expect(isRegisteredType('unknown')).toBe(false)
  })

  it('singleton types have empty idField', () => {
    const singletons = Object.entries(entityRegistry).filter(
      ([, config]) => config.singleton
    )
    for (const [, config] of singletons) {
      expect(config.idField).toBe('')
    }
  })

  it('collection types have non-empty idField', () => {
    const collections = Object.entries(entityRegistry).filter(
      ([type, config]) => !config.singleton && type !== 'image'
    )
    for (const [, config] of collections) {
      expect(config.idField).not.toBe('')
    }
  })

  it('image type has null schema (passthrough)', () => {
    const imageConfig = getEntityConfig('image')
    expect(imageConfig!.schema).toBeNull()
  })

  it('validates data against schema for typed entities', () => {
    const feelingConfig = getEntityConfig('feeling')!
    const validFeeling = {
      feelingId: 'test-1',
      content: 'Feeling great today',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(() => feelingConfig.schema!.parse(validFeeling)).not.toThrow()

    const invalidFeeling = { feelingId: 123, content: null }
    expect(() => feelingConfig.schema!.parse(invalidFeeling)).toThrow()
  })
})
