# Connections Journey — Visual Tests

## Goal

Verify the connections page renders OAuth service cards correctly.

## User Story

As a user, I manage my connected services (Google, Pipedrive, etc.) to enable bot automations. I see which services are connected, their health status, and can manage them.

## Visual Checkpoints

| Step | Screen State     | What to Verify                          |
| ---- | ---------------- | --------------------------------------- |
| 1    | Connections list | Service cards, icons, status indicators |

## Viewport Coverage

- Mobile (375×812): Card stack layout
- Desktop (1280×720): Wider card layout

## Related

- E2E test: `tests/e2e/tests/connections.spec.ts`
- User Journey: Journey 7 in `USER-JOURNEYS.md`
- Component: `apps/frontend/src/views/connections/`
