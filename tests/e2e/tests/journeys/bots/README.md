# Bot Journey — Visual Tests

## Goal

Verify the bot automation pages render correctly through the complete bot lifecycle: list, create, configure trigger, add tasks, test, deploy, and view logs.

## User Story

As a user, I create bots to automate tasks. I configure a webhook trigger, add code tasks, test them, deploy, and monitor execution logs. Every screen must be clear, functional, and match UX guidelines.

## Visual Checkpoints

| Step | Screen State               | What to Verify                                                 |
| ---- | -------------------------- | -------------------------------------------------------------- |
| 1    | Bots list page             | Empty state or card layout, add button centered                |
| 2    | Bot editor (empty)         | New bot with unconfigured trigger, top bar with name input     |
| 3    | Trigger accordion expanded | Service dropdown visible, accordion open                       |
| 4    | Webhook selected           | Trigger URL displayed with copy button                         |
| 5    | Action task added          | Second task visible with delete button + number + service icon |
| 6    | Test result                | StatusChip (green=success), timestamp, JSON output highlighted |
| 7    | Bot deployed (active)      | Power icon blue (info color), bot is active                    |
| 8    | Bot logs page              | Log entries with status, timestamps                            |

## UX Guidelines Verification

Each screenshot is checked against `apps/frontend/UX-GUIDELINES.md`:

- Cards follow standard pattern (icon + text + menu)
- Accordions properly expanded/collapsed
- Webhook URL uses centered layout with copy button
- Test results show StatusChip + Highlight component
- Power toggle uses correct color indicators
- All content fits 375px viewport (mobile)
- Touch targets are 44px+

## Viewport Coverage

- Mobile (375×812): Primary — bot management on the go
- Desktop (1280×720): Wider task editor, more horizontal space

## Related

- E2E test: `tests/e2e/tests/bot-journey.spec.ts`
- User Journey: Journey 4 in `USER-JOURNEYS.md`
- UX reference: `apps/frontend/UX-GUIDELINES.md`
- Components: `apps/frontend/src/views/bots/`, `apps/frontend/src/views/bot/`
