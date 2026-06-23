import { IFeeling } from './feeling.schema'

export const exampleFeeling: IFeeling = {
  feelingId: 'feeling-abc123',
  content: 'Had the most vivid dream about flying over mountains',
  mood: 'joyful',
  tags: ['dream'],
  createdAt: '2025-06-15T08:30:00.000Z',
  updatedAt: '2025-06-15T08:30:00.000Z',
}

export const exampleFeelingList: IFeeling[] = [
  exampleFeeling,
  {
    feelingId: 'feeling-def456',
    content: 'Grateful for the quiet morning and a good cup of coffee',
    mood: 'grateful',
    tags: ['gratitude', 'family'],
    createdAt: '2025-06-15T05:30:00.000Z',
    updatedAt: '2025-06-15T05:30:00.000Z',
  },
  {
    feelingId: 'feeling-ghi789',
    content: 'Woke up from a chase dream, heart still racing',
    mood: 'anxious',
    tags: ['dream'],
    createdAt: '2025-06-14T07:30:00.000Z',
    updatedAt: '2025-06-14T07:30:00.000Z',
  },
  {
    feelingId: 'feeling-jkl012',
    content:
      'Feeling drained after a long day, but also accomplished. Managed to finish the project presentation and got positive feedback from the team.',
    mood: 'drained',
    tags: ['work', 'reflection'],
    createdAt: '2025-06-14T02:30:00.000Z',
    updatedAt: '2025-06-14T02:30:00.000Z',
  },
  {
    feelingId: 'feeling-mno345',
    content: 'Suddenly inspired by that podcast episode about creativity',
    mood: 'inspired',
    tags: ['creative'],
    createdAt: '2025-06-13T06:30:00.000Z',
    updatedAt: '2025-06-13T06:30:00.000Z',
  },
]
