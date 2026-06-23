import { IPlace } from './place.schema'

export const examplePlace: IPlace = {
  placeId: 'place-001',
  name: 'Coffee Shop Downtown',
  description: 'Great espresso, quiet in the mornings',
  pictures: [],
  position: { lat: 40.7128, lng: -74.006 },
  createdAt: '2025-01-15T10:30:00Z',
}

export const examplePlaceList: IPlace[] = [
  examplePlace,
  {
    placeId: 'place-002',
    name: 'Central Park',
    pictures: ['place-002-a1b2c3d4.jpg'],
    position: { lat: 40.7829, lng: -73.9654 },
    createdAt: '2025-02-20T14:00:00Z',
  },
  {
    placeId: 'place-003',
    name: 'Amsterdam Centraal',
    pictures: [],
    position: { lat: 52.3791, lng: 4.9003 },
    createdAt: '2025-03-10T09:15:00Z',
  },
]
