# Baita UX Guidelines

This document defines the visual patterns and rules for the Baita frontend. It serves as the source of truth for verifying that screenshots from visual tests match the intended design.

---

## Layout Principles

| Rule              | Value                        | Reason                                       |
| ----------------- | ---------------------------- | -------------------------------------------- |
| Primary viewport  | 375px (iPhone SE)            | Mobile-first app                             |
| Max content width | 600px, horizontally centered | Readability on larger screens                |
| Main padding      | `p-2` (8px)                  | Consistent breathing room                    |
| Page titles       | None                         | Navigation bar tells the user where they are |
| Bottom padding    | `12rem`                      | Space for sticky bottom nav                  |

---

## Component Patterns

### Cards (List Items)

Every list view (bots, connections, notes, todos) uses the same card structure:

```
┌─────────────────────────────────────────────────┐
│ [Icon 30×30]  Name (bold)          [⋮ Menu]    │
│               Description (light)               │
└─────────────────────────────────────────────────┘
```

- Container: `<Card className="p-2">`
- Layout: `d-flex justify-content-between align-items-center`
- Icon area: `width: 30px`, centered
- Text: name `fw-bold`, description `fw-light fs-6`
- Action: 3-dot menu (`MoreVertIcon`) — never inline buttons
- Spacing between cards: `mb-2`

### Empty State

When no data exists for a page:

```
        [Icon 48px]
     No items yet
  Helpful description text
```

- Component: `<EmptyState icon={...} title="..." description="..." />`
- Icon: 48px fontSize, centered
- Text: centered below icon
- No action buttons inside empty state

### Loading State

While data is fetching:

- Component: `<Skeleton elements={3} height={100} />`
- Never show blank page
- Never infinite loading (always handle API errors with `.finally()`)

### Buttons

| Context     | Pattern                                                            |
| ----------- | ------------------------------------------------------------------ |
| Add action  | Centered at page bottom, `mt-5`, text type, primary color, AddIcon |
| Destructive | Red (error color), inside 3-dot menu only                          |
| Toggle      | MUI Switch (bot active/inactive)                                   |
| Icon action | `iconButton` prop on Button component                              |

- **Never** use Floating Action Buttons (FABs)
- Add buttons are always centered below content, never floating

### Accordions (Bot Editor)

The bot editor uses nested accordions for task configuration:

```
▶ Trigger
  ├── Service (Autocomplete dropdown)
  ├── Input Data (VariableInput fields)
  ├── Options (filter conditions, return data)
  └── Test (execute + results)

▶ Task 1: Run Code
  ├── Service
  ├── Input Data
  ├── Options
  └── Test
```

- Container: MUI `Accordion` / `AccordionSummary` / `AccordionDetails`
- Trigger task (index 0): shows "Trigger" label in primary bold
- Action tasks (index 1+): show delete button + task number + service icon + service label
- Selected task: `bg-light` background

### Forms & Inputs

| Component                   | Use Case                                               |
| --------------------------- | ------------------------------------------------------ |
| MUI TextField               | Standard text inputs                                   |
| Autocomplete (OptionsInput) | Service/action selection with grouped options          |
| TextInput                   | Inline editing (bot name, description)                 |
| VariableInput               | Input field mapping (output references, static values) |
| CheckBox                    | Toggle options (return data, filter conditions)        |

### Status Indicators

| Status     | Visual                                            |
| ---------- | ------------------------------------------------- |
| Success    | Green border (`border-success`), white background |
| Error/Fail | Red background (`bg-danger`), white text          |
| Filtered   | Gray background (`bg-secondary`), white text      |
| Active     | Blue icon (MUI `info` color)                      |
| Inactive   | Gray icon (MUI `secondary` color)                 |

### Modals & Dialogs

- MUI `Dialog` for forms (create, edit, OAuth connection)
- Never use separate routes for creation forms
- Dialog content scrollable, max-height responsive

---

## Spacing Rules

| Context               | Class                  | Pixels |
| --------------------- | ---------------------- | ------ |
| Between cards         | `mb-2`                 | 8px    |
| Before add button     | `mt-5`                 | 48px   |
| Between page sections | `mt-4`                 | 24px   |
| Card internal padding | `p-2`                  | 8px    |
| Icon margin           | `m-2` or `mx-2`        | 8px    |
| Page bottom           | `paddingBottom: 12rem` | 192px  |

---

## Typography

| Element          | Classes                     | Example                |
| ---------------- | --------------------------- | ---------------------- |
| Item name        | `fw-bold`                   | "My Bot"               |
| Item description | `fw-light fs-6`             | "Runs every morning"   |
| Interactive text | `text-primary`              | Task labels, links     |
| Task number      | `fs-4 fw-bold text-primary` | "1"                    |
| Section labels   | `text-primary fw-bold`      | "Trigger"              |
| Info/help text   | `fs-6 fst-italic`           | "No data received yet" |

---

## Responsive & Accessibility

| Rule               | Requirement                                               |
| ------------------ | --------------------------------------------------------- |
| Touch targets      | Minimum 44×44px for all interactive elements              |
| Hover interactions | Never hover-only — all actions accessible via tap         |
| Clear buttons      | Always visible when a value is selected (no hover-reveal) |
| Content width      | Must fit 375px viewport without horizontal scroll         |
| Cards              | Stack vertically on all viewports                         |
| Tooltips           | Supplementary only — never the sole way to access info    |

---

## Bot Editor Specific Patterns

### Webhook Trigger URL Display

After selecting "Receive Webhook" service:

```
┌─────────────────────────────────────┐
│  URL: https://api.baita.help/...    │
│              [📋 Copy]              │
└─────────────────────────────────────┘
```

- Layout: `d-flex justify-content-center my-3 align-middle`
- Copy button: `FileCopyIcon` in icon button
- On copy: success snack "URL copied to clipboard"

### Test Results Display

After running a task test:

```
┌─────────────────────────────────────┐
│ [●success] 2024-01-15 14:30:00     │
│                                     │
│ {                                   │
│   "result": "Hello World"           │
│ }                                   │
└─────────────────────────────────────┘
```

- Status: `StatusChip` component (green/red/gray)
- Timestamp: formatted date next to chip
- Output: `Highlight` component (JSON syntax highlighting)
- No result yet: italic info text

### Bot Power Toggle

```
Active:   [🔵 Power Icon] (info color)
Inactive: [⚫ Power Icon] (secondary color)
```

- Toggle via power icon button in top bar
- Confirmation: snack notification with status message
- Validation: if errors found, first error shown in snack

---

## Verification Checklist

When reviewing a screenshot against these guidelines, verify:

- [ ] Content fits within 600px max-width, centered
- [ ] No horizontal overflow at 375px viewport
- [ ] Cards follow the standard pattern (icon + text + menu)
- [ ] Spacing is consistent (mb-2 between cards, mt-5 before add button)
- [ ] Text hierarchy correct (bold names, light descriptions)
- [ ] Status indicators use correct colors
- [ ] No page titles (only nav bar)
- [ ] Touch targets visually large enough (44px+)
- [ ] Empty states show icon + title + description (not blank)
- [ ] Loading shows skeleton (not blank)
