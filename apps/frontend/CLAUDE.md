# Baita Frontend

Personal automation app aimed at normal people available at https://baita.help.

Part of the Baita monorepo. Backend lives at `apps/backend/`, shared schemas at `packages/shared/`. See root `CLAUDE.md` for cross-workspace conventions.

## Core Philosophies

These principles must be considered before any change:

1. **Simplicity first** — The goal should always be achieved by the simplest solution possible. No over-engineering, no premature abstractions.
2. **Test what matters** — Every medium to large/relevant change must be properly unit tested and functionally tested (use screen reading/visual feedback for layout changes).
3. **Document changes** — Write new documentation or update existing documentation for every relevant change. This means ALL relevant docs (README, CLAUDE.md, inline). Do not claim a task is done until documentation is updated.
4. **Don't reinvent the wheel** — Search extensively for best practices and proper, simple, free tools before building custom solutions.
5. **Plan thoroughly, review extensively** — Plan before implementing. Review the solution extensively after implementing and before claiming it is ready.

### Completion Checklist

Before reporting a task as done, self-check:

- Is ALL documentation updated? (README.md, CLAUDE.md, inline docs)
- Are tests written/updated for non-trivial changes?
- Has the solution been verified (builds, passes tests, runs correctly)?
- **Has the app been checked in a browser?** (`npm run dev` → open localhost:3000 → verify visually)
- Is it the simplest solution that achieves the goal?
- **Code is NEVER pushed before being extensively tested and checked in the browser**

### Browser Verification Rules

- Build passing ≠ app working. Always open the app in a browser before claiming done.
- For routing/auth changes: click through the login flow, check protected routes.
- For layout changes: visually verify before/after.
- When writing tests: every bug fix or new feature must include a unit/integration test that would catch the issue if it regressed.

### Mobile-First Design

All layout and UI changes MUST be designed mobile-first:

- **No hover-only interactions** — every action must be accessible via tap (no tooltips as sole affordance, no hover-revealed buttons)
- **Touch targets** — minimum 44x44px for interactive elements
- **Clear buttons** — always visible (not hover-dependent) when a value is selected
- **Responsive layout** — components must work on 375px viewport width minimum
- **Test on mobile** — use Chrome DevTools responsive mode or a real device before pushing

### Visual Verification with Playwright (Layout Changes)

For ANY change involving UI layout, component rendering, or visual presentation:

1. Run the Playwright visual verification tool:
   ```bash
   cd tests/e2e
   VERIFY_PATH=/bots npm run verify
   ```
2. This opens a headed browser with Playwright Inspector — navigate to the affected page, inspect the rendering, take screenshots
3. Iterate on the code until the visual result matches expectations
4. Only then proceed to commit

The `verify` script auto-starts the Vite dev server, authenticates via Auth0, and navigates to `VERIFY_PATH`. Use it for:

- New components or layout changes
- Dropdown/modal/popover rendering
- Responsive behavior verification
- Any change where "it compiles" is not sufficient to confirm correctness

## Tech Stack

- **Framework**: React 18 + TypeScript (strict mode)
- **Build**: Vite 8 + @vitejs/plugin-react
- **Routing**: React Router v6
- **State**: React Context API (no Redux)
- **UI**: MUI Material v5 + SCSS + Bootstrap utilities
- **HTTP**: Axios (wrapped in custom hook)
- **Auth**: Auth0 (@auth0/auth0-react)
- **Push**: Web Push API (VAPID-based, works on all platforms including iOS PWA)
- **Analytics**: Firebase Analytics (production only)
- **PWA**: vite-plugin-pwa (Workbox-based service worker)
- **Drag & Drop**: @dnd-kit
- **Maps**: @vis.gl/react-google-maps
- **Testing**: Vitest + React Testing Library

## Project Structure

```
src/
├── assets/        # SCSS styles + images
├── components/    # Shared reusable UI components
├── providers/     # React Context providers (auth, user, bot, apps, error, notification)
├── utils/         # Helpers (API client, firebase, config, date, labels, oauth)
├── views/         # Page-level components (each feature has index.tsx + components/)
├── app.tsx        # Theme + provider composition
├── router.tsx     # Route definitions + LINKS constants
├── navBar.tsx     # Navigation bar
└── index.tsx      # Entry point (Auth0Provider wrapping)

mocks/             # Local dev mock data (JSON files)
```

## Commands

```bash
npm start          # Dev server on localhost:3000 (alias for npm run dev)
npm run dev        # Vite dev server
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build locally
npm run test       # Vitest in watch mode
npm run test:run   # Vitest single run
npm run lint       # ESLint with auto-fix
npm run format     # Prettier formatting
npm run spell      # CSpell spell check on source files
npm run knip       # Dead code detection (unused files, exports, deps)
```

## AWS / Deployment

- **AWS Profile:** Always use `--profile baita` for AWS CLI commands in this repo
- **Amplify App ID:** `d35kx8fgop2qtf`
- **Region:** `us-east-1`
- **Branch:** `main` (production)
- **Fetch build logs:** `aws amplify list-jobs --app-id d35kx8fgop2qtf --branch-name main --profile baita --region us-east-1`
- **Before pushing:** Always `git pull --rebase` to sync with remote

## Architecture Decisions

- **Auth0 over Firebase Auth** — Simpler multi-provider OAuth setup
- **Context API over Redux** — Simpler for current scale; providers are: Auth → Error → Notification → User → Apps → Bot
- **SCSS + Bootstrap utilities** — Quick prototyping with utility classes, MUI for complex components
- **Environment variables via `.env.local`** — Sensitive config (API keys) stored in `.env.local` (gitignored); production values set in AWS Amplify Console
- **Vite over CRA** — Faster dev/build, actively maintained, eliminates react-scripts vulnerability debt

## Environment Configuration

- **Production**: hostname `www.baita.help` → API at `https://api.baita.help`
- **Local dev**: hostname `localhost` → API at `http://localhost:5000/dev`
- **Mock mode**: Uses Vite plugin (configureServer hook in vite.config.ts) pointing to local JSON files
- **Language**: Auto-detected from `navigator.language` (en-US or pt-BR)

### Environment Variables

Frontend env vars use Vite's `import.meta.env.VITE_*` pattern. They are injected at **build time** (not runtime).

| Variable                   | Purpose                         | Where to set                                 |
| -------------------------- | ------------------------------- | -------------------------------------------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key  | `.env.local` (local), Amplify Console (prod) |
| `VITE_GOOGLE_MAPS_MAP_ID`  | Google Maps custom map style ID | `.env.local` (local), Amplify Console (prod) |

**Local development:** Create `apps/frontend/.env.local` (gitignored):

```bash
VITE_GOOGLE_MAPS_API_KEY=<your-key>
VITE_GOOGLE_MAPS_MAP_ID=<your-map-id>
```

**Production (AWS Amplify):**

```bash
aws amplify update-app --app-id d35kx8fgop2qtf \
  --environment-variables VITE_GOOGLE_MAPS_API_KEY=<key>,VITE_GOOGLE_MAPS_MAP_ID=<map-id> \
  --profile baita --region us-east-1
```

**Security note:** Frontend API keys (Maps, Analytics) are inherently public — they end up in the JS bundle. Security is enforced via **API key restrictions** (HTTP referrer, API scoping) in the provider's console, not by hiding the key.

## Code Quality Enforcement

Consistency is enforced at 3 levels:

### Editor-time (ESLint — `eslint.config.js`)

- **No default React import** — use named imports only (`import { FC } from 'react'`)
- **No `any` type** — warn (fix incrementally)
- **Strict equality** — `===` enforced, `==` blocked
- **No console.log** — warn (use `console.warn`/`console.error` if needed)
- **Import sorting** — auto-sorted alphabetically by `eslint-plugin-simple-import-sort`

### Pre-commit (Husky + lint-staged)

- **CSpell** — catches typos before they enter the codebase
- **ESLint --fix** — auto-fixes and blocks on errors
- **Prettier** — formats staged files

### Build-time (TypeScript — `tsconfig.json`)

- **noUnusedLocals** — errors on unused variables/imports
- **noUnusedParameters** — errors on unused function params (prefix with `_` to skip)
- **noImplicitReturns** — all code paths must return

### On-demand

- `npm run knip` — detects unused files, exports, and dependencies

## Conventions

### Naming

- Components: PascalCase (`TodoList.tsx` or `todoList.tsx` for sub-components)
- Interfaces: Prefixed with `I` (e.g., `IUser`, `IBot`, `ITodoTask`)
- Views: lowercase folders with `index.tsx` entry + `components/` subfolder
- Constants: UPPER_CASE for route links, camelCase for config

### Components

- Functional components only (no class components)
- `FC<Props>` type annotation (imported from 'react', not `React.FC`)
- No `import React from 'react'` — use named imports only (`import { FC, useState } from 'react'`)
- Authenticated views wrapped with `withAuthenticationRequired()` HOC
- Props defined inline or as interface above the component

### Internationalization

- Use `getLabels(LABELS)` from `src/utils/labels.ts` for all label access
- Define `LABELS` object with `en` and `pt` keys at the bottom of the file
- Call `const labels = getLabels(LABELS)` at module level (outside component body)
- Import `{ getLabels, Labels }` from `@/utils/labels`

### State

- Context providers hold both state and API methods
- `useContext()` hook for consuming state in components
- API calls made directly inside provider functions via `ApiRequest()` hook

### Styling

- Bootstrap utilities for layout (`d-flex`, `m-2`, `text-primary`)
- MUI components for interactive elements (Button, TextField, Modal)
- SCSS variables for color tokens and spacing (see `assets/variables.scss`, `assets/variables.module.scss`)
- Global styles in `assets/index.scss`, reusable classes in `assets/classes.scss`
- Animations in `assets/animations.scss`
- Avoid inline styles when a utility class or SCSS variable exists

## Key Files

- `vite.config.ts` — Vite config with React plugin, PWA plugin (injectManifest), mock API server, and test config
- `src/sw.ts` — Unified service worker (Workbox precaching + push notification handling)
- `src/utils/push.ts` — Web Push API utility (subscribe, permission, iOS detection)
- `src/utils/requests.ts` — Axios wrapper with auth token injection
- `src/utils/config.ts` — Environment detection and API URL mapping
- `src/utils/firebase.ts` — Firebase Analytics only (publishEvent)
- `src/providers/auth.tsx` — Auth0 integration, token management
- `src/providers/notification.tsx` — In-app notifications (snack, modal) + SW message listener for push
- `src/providers/user.tsx` — Todo, content, connections state
- `src/providers/bot.tsx` — Bot CRUD, deployment, testing logic
- `src/defines/apps.ts` — All supported app/service definitions
- `src/router.tsx` — All routes + LINKS constant for navigation

## Push Notifications Architecture

Uses standard Web Push API (VAPID-based) instead of Firebase messaging. Works on:

- Desktop Chrome/Firefox/Edge
- Android (Chrome PWA)
- iOS (Safari PWA — must be installed to Home Screen, iOS 16.4+)

**Flow:**

1. User clicks "Allow notifications" → `subscribeToPush()` requests permission
2. Browser returns `PushSubscription` (endpoint + keys)
3. Subscription stored in bot config and sent to backend
4. Backend uses `web-push` library with VAPID keys to send
5. `src/sw.ts` receives push event → shows system notification + posts message to app
6. App displays in-app modal when foreground message arrives from SW

**iOS-specific:**

- Must be installed to Home Screen (standalone mode) — `isInstalledPWA()` checks this
- Permission dialog shown only ONCE — if denied, user must enable in Settings
- Subscriptions can be revoked silently — `checkSubscriptionHealth()` re-subscribes on app open

**Lifecycle & Security:**

- Health check only runs for authenticated users (inside `<PushHealthCheck />` in router)
- Foreground push modal only displays when user is authenticated (auth gate in notification provider)
- On logout: subscription is unsubscribed to prevent cross-user notification leakage
- Component validates real SW subscription, not just stored value (catches stale subscriptions)

## Feature Development Methodology

When developing or reviewing a feature, follow this use-case-driven approach:

1. **Use case mapping** — Identify ALL user states and scenarios (authenticated/not, permission granted/denied/default, platform differences, logout, device switch, etc.)
2. **Review** — Trace the code path for each use case, identify gaps and edge cases
3. **Propose** — Design solutions for unhandled cases
4. **Plan** — Write implementation steps before coding
5. **Implement** — Code the solutions
6. **Document** — Update all relevant docs
7. **Test** — Write unit tests covering each use case
8. **Final review** — Verify all use cases work end-to-end in browser
9. **Functional E2E testing** — Test the full flow (not just happy path) in a real browser

This ensures no edge case is missed and every feature is robust from the start.

## Live Feedback Loop

When the user provides an instruction or rule that is clearly valuable and applicable beyond the immediate task, generalize it and add it to these instructions (CLAUDE.md) and/or memory. This creates a continuous improvement cycle — the more we work together, the better aligned the assistance becomes. No need to ask permission; if the principle is obviously general and valuable, capture it proactively.

## Testing Requirements

### Test Infrastructure

- **Framework**: Vitest 4 + React Testing Library
- **Network Mocking**: MSW 2 (Mock Service Worker) — configured globally in `src/setupTests.ts`
- **MSW Handlers**: `src/test/mswSetup.ts` — default API response handlers for all endpoints
- **Test Wrapper**: `src/test/renderWithProviders.tsx` — provides AuthContext + MemoryRouter for component tests

### Testing Rules

1. **Every page/view that fetches data on mount MUST have a smoke test** verifying:
   - It renders without crashing
   - It shows loading state (skeleton) while data is undefined
   - It renders content after data loads
   - It handles API failure gracefully (no infinite loading, no crash)

2. **Every provider that exposes API methods MUST have tests** verifying:
   - State updates correctly on API success
   - Methods return expected values
   - Error propagation works (doesn't silently swallow errors that should reach the user)

3. **Promise.all patterns MUST use `.catch()` or `.finally()`** to prevent infinite loading states. Never write:

   ```typescript
   // BAD — if either rejects, setFetching(false) never runs → infinite skeleton
   Promise.all([getA(), getB()]).then(() => setFetching(false))

   // GOOD — loading state always resets
   Promise.all([getA(), getB()])
     .catch(() => {})
     .finally(() => setFetching(false))
   ```

4. **When adding a new page**: add it to the Critical Pages table below, write a smoke test, ensure its data-fetching has error handling.

### Critical Pages & Data Dependencies

| Route               | Component   | Provider          | API Calls on Mount                     | Test File                                    |
| ------------------- | ----------- | ----------------- | -------------------------------------- | -------------------------------------------- |
| `/bots`             | Bots        | BotContext        | `getBots()` + `getBotModels()`         | `src/views/bots/tests/index.test.tsx`        |
| `/bots/:botId`      | Bot         | BotContext        | `getBot(botId)`                        | —                                            |
| `/bots/:botId/logs` | Logs        | BotContext        | `getBot(botId)` + `getLogs(botId)`     | —                                            |
| `/connections`      | Connections | UserContext       | `getAppConnections()` (pre-fetched)    | `src/views/connections/tests/index.test.tsx` |
| `/` / `/todo`       | ToDo        | UserContext       | `retrieveTodoTasks()`                  | `src/views/todo/tests/index.test.tsx`        |
| `/feed`             | Feed        | UserContext       | `retrieveContent()`                    | —                                            |
| `/notes`            | Notes       | Direct ApiRequest | `getNotes()`                           | —                                            |
| `/place`            | Places      | Direct ApiRequest | `listPlaces()`                         | —                                            |
| `/profile`          | Profile     | AuthContext       | None (relies on UserContext pre-fetch) | `src/views/profile/index.test.tsx`           |

**Provider-level data fetching (on auth):**

- UserProvider (`src/providers/user.tsx`): `getContent()`, `getTodo()`, `getAppConnections()` — fires when user authenticates
- AppsProvider (`src/providers/apps.tsx`): `getApps()` — reads local static data, safe

### Silent Failure Prevention

Pages that break silently (show infinite loading with no error feedback) are the most dangerous bugs — users see a blank page and don't know why. Every data-fetching pattern MUST handle rejection:

- Views: use `.finally()` to reset fetching state
- Providers: catch errors and either update error state or propagate to NotificationProvider
- API calls: the `getApiResponse` wrapper in `src/utils/requests.ts` rejects on `success: false` — callers must handle this

## AI Assistant (Bot Creation)

The bot page has an "AI Assistant" tab (shown only when Chrome Built-in AI is available) that lets users describe automations in natural language instead of using the visual builder.

**Architecture:**

- `src/utils/ai.ts` — AI service abstraction (Chrome AI detection, system prompt, response parsing)
- `src/views/bot/components/assistant.tsx` — Chat UI component
- Uses `window.ai.languageModel` (Chrome Built-in AI / Gemini Nano)
- If browser doesn't support it, the AI tab is hidden (graceful degradation)

**Flow:**

1. User describes bot in chat → Chrome AI generates ITask[] JSON
2. `parseTasksFromResponse()` extracts JSON from markdown code blocks
3. `validateBot()` checks the generated tasks for errors
4. User can deploy directly or open in visual builder to refine

**System Prompt:**
The system prompt in `ai.ts` teaches the LLM the bot schema structure (services, variables, output references). It must stay in sync with the actual `@baita/shared` schema. When the schema changes, update the prompt.

**Testing:**

- `src/utils/tests/ai.test.ts` — Tests for `parseTasksFromResponse` and `buildMessagesWithContext`
- The AI assistant does NOT modify the deployment flow — same `deployBot()` API call

## Known Limitations

- API logic is coupled to Context providers (no separate service layer)
- No lazy loading / code splitting on routes
- No memoization (React.memo, useMemo, useCallback) applied yet
- Admin detection is hardcoded (email check)

## UI Pattern Reference (Canonical Patterns)

Every list view MUST follow these patterns. The Bots and Connections pages are the reference implementations.

### Loading Skeleton

```tsx
<Skeleton elements={3} height={100} />
```

### Empty State

```tsx
<EmptyState
  icon={<SomeIcon style={{ fontSize: 48 }} />}
  title="No items yet"
  description="A helpful hint about what to do next."
/>
```

Uses the shared `EmptyState` component from `src/components/emptyState.tsx`.

### List Item (Card)

```tsx
<Card className="p-2">
  <div className="d-flex justify-content-between align-items-center">
    <div className="d-flex align-items-center">
      <div style={{ width: 30 }} className="m-2 d-flex align-items-center">
        <Icon style={{ width: 30, height: 30 }} color="secondary" />
      </div>
      <div className="mx-2">
        <Text className="fw-bold">{name}</Text>
        <Text className="fw-light fs-6">{subtitle}</Text>
      </div>
    </div>
    <Menu links={[...]}><MoreVertIcon /></Menu>
  </div>
</Card>
```

### Add Action (centered at bottom)

```tsx
<div className="d-flex align-items-center justify-content-center mt-5">
  <Button type="text" color="primary" icon={<AddIcon />}>
    {label}
  </Button>
</div>
```

### Rules

- **No FABs** — always use centered `<Button>` instead
- **No page titles** — the nav tells users where they are
- **Cards for list items** — wrap every list item in `<Card className="p-2">`
- **3-dot menu for actions** — use `<Menu>` with `<MoreVertIcon />`
- **Consistent spacing** — `mb-2` between cards, `mt-5` before add button
- **Modals for creation/editing** — use MUI `<Dialog>` for forms, not separate routes
