import { IPlace } from './place.schema'

export const examplePlace: IPlace = {
  placeId: 'place-001',
  name: 'Coffee Shop Downtown',
  pictures: [],
  position: { lat: 40.7128, lng: -74.006 },
}

export const examplePlaceList: IPlace[] = [
  examplePlace,
  {
    placeId: 'place-002',
    name: 'Central Park',
    pictures: ['https://example.com/uploads/park-1.jpg'],
    position: { lat: 40.7829, lng: -73.9654 },
  },
  {
    placeId: 'place-003',
    name: 'Amsterdam Centraal',
    pictures: [],
    position: { lat: 52.3791, lng: 4.9003 },
  },
]
