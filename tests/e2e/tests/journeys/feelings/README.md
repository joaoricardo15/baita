# Journey 5: Feelings

Verify the feelings page renders correctly through the feeling lifecycle.

## User Story

As a user, I capture my feelings, dreams, and reflections. I see my timeline, create new entries with mood and tags, and edit existing ones.

## Visual Checkpoints

| Step | State                    | Verify                            |
| ---- | ------------------------ | --------------------------------- |
| 1    | Feelings list            | Cards with mood emoji, tags, time |
| 2    | After creating a feeling | New feeling appears in timeline   |

## Viewports

- Mobile (375×812): Primary — capture feelings on mobile
- Tablet (768×1024): Secondary — review timeline

## Related

- E2E test: `tests/e2e/tests/journeys/feelings/feelings.spec.ts`
- Unit test: `apps/frontend/src/views/feelings/tests/index.test.tsx`
- Component: `apps/frontend/src/views/feelings/`
