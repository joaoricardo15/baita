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
    expect(types).toContain('model')
    expect(types).toContain('connection')
    expect(types).toContain('note')
    expect(types).toContain('place')
    expect(types).toContain('todo')
    expect(types).toContain('content')
    expect(types).toContain('image')
    expect(types).toHaveLength(9)
  })

  it('getEntityConfig returns config for valid types', () => {
    const noteConfig = getEntityConfig('note')
    expect(noteConfig).toBeDefined()
    expect(noteConfig!.idField).toBe('noteId')
    expect(noteConfig!.singleton).toBe(false)
    expect(noteConfig!.schema).not.toBeNull()
  })

  it('getEntityConfig is case-insensitive', () => {
    expect(getEntityConfig('NOTE')).toEqual(getEntityConfig('note'))
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
    const noteConfig = getEntityConfig('note')!
    const validNote = {
      noteId: 'test-1',
      title: 'Test Note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(() => noteConfig.schema!.parse(validNote)).not.toThrow()

    const invalidNote = { noteId: 123, title: null }
    expect(() => noteConfig.schema!.parse(invalidNote)).toThrow()
  })
})
