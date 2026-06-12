# Places Journey — Visual Tests

## Goal

Verify the places page renders the map and saved locations correctly.

## User Story

As a user, I save places I've visited. I see them on a map and can manage the list.

## Visual Checkpoints

| Step | Screen State | What to Verify                    |
| ---- | ------------ | --------------------------------- |
| 1    | Places page  | Map rendering, place list, layout |

## Notes

- The Google Maps tiles are non-deterministic (external CDN). The map container is masked in screenshots.
- Only the surrounding UI (header, place list, controls) is compared.

## Viewport Coverage

- Mobile (375×812): Map + list stacked
- Desktop (1280×720): Side-by-side or full-width map

## Related

- User Journey: Journey 6 in `USER-JOURNEYS.md`
- Component: `apps/frontend/src/views/places/`
