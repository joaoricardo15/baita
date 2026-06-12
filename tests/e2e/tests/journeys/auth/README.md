# Authentication Journey — Visual Tests

## Goal

Verify the authentication-related screens render correctly: landing page (unauthenticated) and auth callback states.

## User Story

As a visitor, I arrive at baita.help and see a clear landing page with a login button. After authenticating, I'm redirected into the app.

## Visual Checkpoints

| Step | Screen State              | What to Verify                       |
| ---- | ------------------------- | ------------------------------------ |
| 1    | Landing page (logged out) | Hero content, login button, branding |

## Notes

- This test uses a fresh browser context (no stored auth) to capture the unauthenticated state.
- The Auth0 login page itself is NOT screenshotted (external dependency, changes frequently).

## Viewport Coverage

- Mobile (375×812): Landing page mobile layout
- Desktop (1280×720): Landing page desktop layout

## Related

- E2E test: `tests/e2e/tests/user-lifecycle.spec.ts`
- User Journey: Journey 1 in `USER-JOURNEYS.md`
- Component: `apps/frontend/src/views/landing/`
