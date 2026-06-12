# Notes Journey — Visual Tests

## Goal

Verify the notes page renders correctly through the note lifecycle.

## User Story

As a user, I create and manage personal notes. I see my note list, create new notes, and edit existing ones.

## Visual Checkpoints

| Step | Screen State          | What to Verify                       |
| ---- | --------------------- | ------------------------------------ |
| 1    | Notes list            | Note cards, category badges, spacing |
| 2    | After creating a note | New note appears in list             |

## Viewport Coverage

- Mobile (375×812): Primary — quick note-taking on mobile
- Desktop (1280×720): List layout

## Related

- E2E test: `tests/e2e/tests/notes-journey.spec.ts`
- User Journey: Journey 5 in `USER-JOURNEYS.md`
- Component: `apps/frontend/src/views/notes/`
