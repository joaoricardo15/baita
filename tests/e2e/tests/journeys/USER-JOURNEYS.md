# Baita — User Journey Tests

This document maps every test to its corresponding user journey. It serves as the **guide for understanding what each test protects** and how to maintain the suite.

Anyone — developers, product owners, designers — can use this document to understand what's being tested and why.

---

## How Tests Work

### E2E Tests (`.spec.ts`)

Functional tests that exercise the full user flow via real API calls. They create data, perform actions, verify API responses, and clean up.

### Visual Tests (`.visual.ts`)

Screenshot-based tests that capture the app at key moments and compare against approved baselines. If layout shifts, elements overflow, or components disappear, the test fails with a visual diff.

### Running Tests

```bash
cd tests/e2e

# Full E2E suite (creates user → runs tests → cleans up)
npm test

# Visual tests only (creates user → screenshots → cleans up)
npm run visual

# Update visual baselines after intentional changes
npm run visual:update

# Run against production (same as CI)
npm run test:prod
```

### When Visual Tests Fail

1. A diff image is generated showing what changed (red = removed, green = added)
2. Review the diff — is the change intentional?
   - **Yes (new design, updated component):** Run `npm run visual:update` to approve new baselines
   - **No (regression, broken layout):** Fix the code and re-run

---

## Test Structure

Each journey has its own folder containing:

- `README.md` — Human-readable description (what, why, checkpoints)
- `*.spec.ts` — E2E functional test
- `*.visual.ts` — Visual regression test
- Baselines stored in `screenshots/{journey}/{test-file}/`

```
tests/e2e/tests/journeys/
├── auth/           → Journey 1: Authentication
│   ├── auth.spec.ts
│   ├── auth.visual.ts
│   └── README.md
├── todo/           → Journey 2: To-Do Management
│   ├── todo.spec.ts
│   ├── todo.visual.ts
│   └── README.md
├── feed/           → Journey 3: Content Feed
│   ├── feed.spec.ts
│   ├── feed.visual.ts
│   └── README.md
├── bots/           → Journey 4: Bot Automation
│   ├── bots.spec.ts
│   ├── bots.visual.ts
│   └── README.md
├── notes/          → Journey 5: Notes
│   ├── notes.spec.ts
│   ├── notes.visual.ts
│   └── README.md
├── places/         → Journey 6: Places
│   ├── places.visual.ts
│   └── README.md
├── connections/    → Journey 7: OAuth Connections
│   ├── connections.spec.ts
│   ├── connections.visual.ts
│   └── README.md
├── profile/        → Journey 8: Profile & Stats
│   ├── profile.visual.ts
│   └── README.md
├── helpers.ts      → Shared visual utilities
└── USER-JOURNEYS.md (this file)
```

---

## Journey Map

| #   | Journey           | E2E Test                          | Visual Test                         | Visual Checkpoints                                                                          |
| --- | ----------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Authentication    | `auth/auth.spec.ts`               | `auth/auth.visual.ts`               | Landing page (logged out)                                                                   |
| 2   | To-Do Management  | `todo/todo.spec.ts`               | `todo/todo.visual.ts`               | Initial, after add, after complete                                                          |
| 3   | Content Feed      | `feed/feed.spec.ts`               | `feed/feed.visual.ts`               | Feed with cards                                                                             |
| 4   | Bot Automation    | `bots/bots.spec.ts`               | `bots/bots.visual.ts`               | List, editor empty, trigger expanded, webhook URL, action task, test result, deployed, logs |
| 5   | Notes             | `notes/notes.spec.ts`             | `notes/notes.visual.ts`             | Initial, after creating note                                                                |
| 6   | Places            | —                                 | `places/places.visual.ts`           | Map page (map masked)                                                                       |
| 7   | OAuth Connections | `connections/connections.spec.ts` | `connections/connections.visual.ts` | Service list                                                                                |
| 8   | Profile & Stats   | —                                 | `profile/profile.visual.ts`         | Profile page                                                                                |

---

## Viewport

All tests target **mobile only** (375×812, iPhone SE viewport at 2x scale). This is a mobile-first app — if it works well on 375px, it works everywhere.

---

## Authentication

Tests use **real authentication** (Auth0 signup flow):

1. The `setup` project creates a real test user via browser-based Auth0 login
2. Stores authenticated browser state in `playwright/.auth/user.json`
3. Journey and visual tests load this state — they see the app as an authenticated user
4. After all tests complete, the test user is **deleted** (cleanup always runs)

This means tests see **real data from the production database** through the local backend.

---

## CI Integration

Visual tests run as a **separate job** in the CI pipeline, parallel with quality checks:

```
quality ─────┐
             ├──→ deploy-frontend
visual  ─────┘    deploy-backend
                   deploy-auth0
                       │
                       ↓
                      e2e
```

Both `quality` and `visual` must pass before any deploy happens.

---

## Adding a New Journey

1. Create a folder: `tests/e2e/tests/journeys/{journey-name}/`
2. Write a `README.md` (copy from an existing one)
3. Write a `{journey-name}.spec.ts` for E2E functional tests
4. Write a `{journey-name}.visual.ts` for visual regression tests
5. Run `npm run visual:update` to generate initial baselines
6. Commit the baselines alongside the test code
7. Update this document with the new journey entry

---

## Glossary

| Term           | Meaning                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| **Baseline**   | The approved screenshot that represents "correct"                        |
| **Diff**       | Visual comparison showing what pixels changed                            |
| **Threshold**  | How much pixel difference is tolerated (1% in CI, 5% locally)            |
| **Checkpoint** | A specific moment in a user flow where a screenshot is taken             |
| **Viewport**   | The browser window size used for the screenshot (375×812)                |
| **Mask**       | An area intentionally excluded from comparison (e.g., Google Maps tiles) |
