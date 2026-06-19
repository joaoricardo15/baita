import { IGuide } from './guide.schema'

export const exampleGuide: IGuide = {
  guideId: 'guide-001',
  name: 'Amsterdam for João',
  description: 'Best spots in the city center',
  placeIds: ['place-001', 'place-002', 'place-003'],
  createdAt: '2025-06-15T10:00:00Z',
}

export const exampleGuideList: IGuide[] = [
  exampleGuide,
  {
    guideId: 'guide-002',
    name: 'Coffee Route',
    placeIds: ['place-001'],
    createdAt: '2025-06-18T14:30:00Z',
  },
]
