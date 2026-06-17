import { IFeeling } from './feeling.schema'

export const exampleFeeling: IFeeling = {
  feelingId: 'feeling-abc123',
  content: 'Had the most vivid dream about flying over mountains',
  mood: 'joyful',
  tags: ['dream', 'lucid'],
  createdAt: 1718000000000,
  updatedAt: 1718000000000,
}

export const exampleFeelingList: IFeeling[] = [
  exampleFeeling,
  {
    feelingId: 'feeling-def456',
    content: 'Grateful for the quiet morning and a good cup of coffee',
    mood: 'peaceful',
    tags: ['gratitude'],
    createdAt: 1717950000000,
    updatedAt: 1717950000000,
  },
  {
    feelingId: 'feeling-ghi789',
    content: 'Woke up from a chase dream, heart still racing',
    mood: 'anxious',
    tags: ['dream', 'nightmare'],
    createdAt: 1717900000000,
    updatedAt: 1717900000000,
  },
]
