# Content Feed Journey — Visual Tests

## Goal

Verify the feed page renders content cards correctly.

## User Story

As a user, I open my feed to discover personalized content. I see swipeable cards with news articles and can interact with them.

## Visual Checkpoints

| Step | Screen State | What to Verify                                         |
| ---- | ------------ | ------------------------------------------------------ |
| 1    | Feed page    | Card stack rendering, swipe affordance, content layout |

## Viewport Coverage

- Mobile (375×812): Primary — feed is designed for mobile swiping
- Desktop (1280×720): Card centering

## Related

- E2E test: `tests/e2e/tests/content-feed.spec.ts`
- User Journey: Journey 3 in `USER-JOURNEYS.md`
- Component: `apps/frontend/src/views/feed/`
