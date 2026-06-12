# To-Do Journey — Visual Tests

## Goal

Verify the to-do management page renders correctly at every step of the daily task workflow.

## User Story

As a user, I open my to-do list to manage daily tasks. I see my current tasks, add new ones, and mark them complete. The page should be clean, readable, and responsive on mobile.

## Visual Checkpoints

| Step | Screen State            | What to Verify                             |
| ---- | ----------------------- | ------------------------------------------ |
| 1    | Todo list loaded        | Tasks visible, checkbox alignment, spacing |
| 2    | After adding a task     | New task appears at correct position       |
| 3    | After completing a task | Visual distinction (strikethrough/opacity) |

## Viewport Coverage

- Mobile (375×812): Primary — this is a mobile-first app
- Desktop (1280×720): Secondary — verify no overflow issues

## Related

- E2E test: `tests/e2e/tests/todo-journey.spec.ts`
- User Journey: Journey 2 in `USER-JOURNEYS.md`
- Component: `apps/frontend/src/views/todo/`
