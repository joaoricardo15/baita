import { IFeeling } from './feeling.schema'

const NOW = Date.now()
const HOUR = 3600000
const DAY = 86400000

export const exampleFeeling: IFeeling = {
  feelingId: 'feeling-abc123',
  content: 'Had the most vivid dream about flying over mountains',
  mood: 'happy',
  tags: ['dream'],
  createdAt: NOW - 2 * HOUR,
  updatedAt: NOW - 2 * HOUR,
}

export const exampleFeelingList: IFeeling[] = [
  exampleFeeling,
  {
    feelingId: 'feeling-def456',
    content: 'Grateful for the quiet morning and a good cup of coffee',
    mood: 'calm',
    tags: ['gratitude'],
    createdAt: NOW - 5 * HOUR,
    updatedAt: NOW - 5 * HOUR,
  },
  {
    feelingId: 'feeling-ghi789',
    content: 'Woke up from a chase dream, heart still racing',
    mood: 'scared',
    tags: ['dream', 'recurring'],
    createdAt: NOW - DAY - 3 * HOUR,
    updatedAt: NOW - DAY - 3 * HOUR,
  },
  {
    feelingId: 'feeling-jkl012',
    content:
      'Feeling drained after a long day, but also accomplished. Managed to finish the project presentation and got positive feedback from the team.',
    mood: 'drained',
    tags: ['reflection'],
    createdAt: NOW - DAY - 8 * HOUR,
    updatedAt: NOW - DAY - 8 * HOUR,
  },
  {
    feelingId: 'feeling-mno345',
    content: 'Suddenly inspired by that podcast episode about creativity',
    mood: 'inspired',
    createdAt: NOW - 2 * DAY - 4 * HOUR,
    updatedAt: NOW - 2 * DAY - 4 * HOUR,
  },
]
