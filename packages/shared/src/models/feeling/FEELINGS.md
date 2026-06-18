# Feelings Model — Research & Design Decisions

> This document explains the psychological model behind Baita's feelings/mood
> journaling feature. Every design decision is grounded in peer-reviewed
> research and validated frameworks from affective science.

---

## The Model: Russell's Circumplex (Valence × Arousal)

Human emotions are best understood along two independent dimensions:

- **Valence** (horizontal axis): How pleasant or unpleasant the feeling is
- **Arousal / Energy** (vertical axis): How activated or deactivated you feel

This two-dimensional structure is the **most replicated finding in affective
science** — confirmed across languages, cultures, and response formats through
factor analysis and multidimensional scaling of subjective emotional reports.

> **Source:** Posner, J., Russell, J. A., & Peterson, B. S. (2005). "The
> circumplex model of affect: An integrative approach to affective neuroscience,
> cognitive development, and psychopathology."
> https://pmc.ncbi.nlm.nih.gov/articles/PMC2367156/

A 2025 methodological review confirms that dimensional (valence/arousal) and
discrete (named emotion) approaches are **complementary lenses**, not competing
frameworks — both are needed for a complete picture.

> **Source:** Barrett et al. (2025). "Dimensional vs. discrete models as
> complementary frameworks."
> https://link.springer.com/article/10.1007/s42761-025-00337-6

---

## The 4 Quadrants

Our moods are organized into a 2×2 grid following the **Yale Mood Meter**
convention (Marc Brackett's RULER framework), used by the How We Feel app
(10M+ downloads) and emotional intelligence programs worldwide:

```
                        PLEASANT →
         ┌──────────────────────┬──────────────────────┐
         │                      │                      │
    ↑    │    HIGH ENERGY       │    HIGH ENERGY       │
  HIGH   │    UNPLEASANT        │    PLEASANT          │
  ENERGY │                      │                      │
         │    😟 Anxious        │    😄 Joyful         │
         │    😤 Frustrated     │    🤩 Excited        │
         │                      │    🤗 Inspired       │
         │                      │                      │
         │    Color: Red/Coral  │    Color: Yellow/Gold│
         ├──────────────────────┼──────────────────────┤
         │                      │                      │
    ↓    │    LOW ENERGY        │    LOW ENERGY        │
  LOW    │    UNPLEASANT        │    PLEASANT          │
  ENERGY │                      │                      │
         │    😢 Sad            │    😌 Calm           │
         │    😩 Drained        │    🥰 Grateful       │
         │    🫥 Lonely         │                      │
         │                      │                      │
         │    Color: Blue/Slate │    Color: Green/Teal │
         └──────────────────────┴──────────────────────┘
```

**Why this hybrid approach?** The How We Feel app demonstrated that organizing
discrete emotion words within a dimensional space is optimal for daily use:
users get the approachability of named feelings with the structural clarity
of the 2D model. Pure dimensional scales (sliders) are too abstract; pure
discrete lists lose the relational structure between emotions.

> **Source:** Yale Center for Emotional Intelligence — How We Feel app.
> https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/

---

## Why 10 Moods?

### Research Finding: 8–16 is the safe range

A 2025 study (n=652) found **no choice overload effect** at 16 options in
self-care contexts. Decision satisfaction was higher with 16 choices than 1
choice, and 16 vs 4 showed no significant difference (t=1.36, P=.37). The
classic "paradox of choice" does not apply to emotional self-report.

> **Source:** "No choice overload in mental health self-care" (2025, n=652)
> https://pmc.ncbi.nlm.nih.gov/articles/PMC12705060/

### Research Finding: PANAS validates 5+5

The PANAS-X (Positive and Negative Affect Schedule) is the most commonly used
affect measure in Ecological Momentary Assessment — used in more than a quarter
of 234 reviewed EMA studies. Its structure: 5 positive items + 5 negative items.
Short 5-item versions do not significantly sacrifice between-person reliability
compared to 10-item versions.

> **Source:** Hall et al. (2021). "PANAS as dominant EMA measure."
> https://pmc.ncbi.nlm.nih.gov/articles/PMC10213137/

### Our decision

**10 moods** — 5 positive (3 high-energy + 2 low-energy) and 5 negative
(2 high-energy + 3 low-energy). The slight asymmetry toward negative
low-energy options reflects research showing negative emotions are more
differentiated in self-report measures and daily experience.

---

## Each Mood — Why It Was Chosen

### 😄 Joyful (High Energy + Pleasant)

A specific, granular label for high-energy happiness. Research on **emotional
granularity** shows that people who use specific labels (like "joyful",
"elated", "content") rather than generic ones ("happy", "good") have
significantly better emotion regulation outcomes. The How We Feel app is
explicitly designed to promote this specificity.

> **Source:** Yale/Brackett — How We Feel app promotes emotional granularity.
> https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/

---

### 🤩 Excited (High Energy + Pleasant)

High-energy anticipatory state present in nearly every validated mood scale
(PANAS, GEW, Daylio). Distinct from joyful (which is about current-moment
happiness) in that it carries forward-looking anticipation and energetic buzz.

---

### 🤗 Inspired (High Energy + Pleasant)

Creative, open, motivated state. Captures the "aha" moment — the feeling of
being moved or sparked by something. Maps to the "attentiveness/interest"
subscale in PANAS-X. Distinct from excitement (which is anticipatory) in that
inspiration is about receptivity and creative flow.

---

### 😌 Calm (Low Energy + Pleasant)

Universal low-arousal positive state. Represents peace, ease, and absence of
tension. The counterpart to "anxious" on the arousal axis. Maps to
"serene/relaxed/calm" in the Geneva Emotion Wheel and "at ease" in the
Mood Meter.

---

### 🥰 Grateful (Low Energy + Pleasant)

Gratitude is strongly linked to wellbeing in longitudinal research. It's a
distinct low-energy positive state — warm, relational, appreciative — that is
psychologically different from "calm" (which is absence of tension). Grateful
involves outward appreciation toward people, circumstances, or experiences.

> **Source:** Emotion frequency research shows gratitude as a common positive
> daily experience distinct from calm/content.
> https://pmc.ncbi.nlm.nih.gov/articles/PMC8751584/

---

### 😟 Anxious (High Energy + Unpleasant)

The most common high-energy negative emotion in daily life. Factor analysis of
EMA items consistently identifies an "anxious/tense" factor that is
psychologically and neurologically distinct from anger/frustration.

> **Source:** PANAS-X factor structure separates "fear" subscale from
> "hostility" subscale.
> https://pmc.ncbi.nlm.nih.gov/articles/PMC10213137/

---

### 😤 Frustrated (High Energy + Unpleasant)

Anger-family emotion (irritation, frustration, blocked goals). The EMA
literature consistently distinguishes an "anxious/fear" component from a
"hostile/irritated" component within negative affect — these are separate
emotion families that feel different and require different coping strategies.
Including both ensures users can distinguish "worried about the future"
(anxious) from "blocked by the present" (frustrated).

> **Source:** Factor analysis supports separating anxious vs. hostile negative
> affect in daily mood measurement.
> https://pmc.ncbi.nlm.nih.gov/articles/PMC10213137/

---

### 😢 Sad (Low Energy + Unpleasant)

One of Ekman's 6 basic emotions, sadness appears in **every single validated
emotion measure** (PANAS, Geneva Emotion Wheel, Ekman, Plutchik, Mood Meter).
It represents emotional pain, loss, or disappointment — low-energy and
inward-focused. Distinct from "drained" (which is physical exhaustion) and
"lonely" (which is relational absence).

> **Source:** Geneva Emotion Wheel — 20 emotion families include sadness
> as fundamental.
> https://www.unige.ch/cisa/gew

---

### 😩 Drained (Low Energy + Unpleasant)

Physical and mental exhaustion. Represents burnout, depletion, and fatigue —
the feeling that your resources are used up. Distinct from sadness (emotional
pain) in that it maps to the fatigue/depletion cluster. Particularly relevant
for modern life: work burnout, caregiver fatigue, screen exhaustion, social
battery depletion.

---

### 🫥 Lonely (Low Energy + Unpleasant)

A distinct low-energy unpleasant state that is neither sad nor drained. Lonely
is specifically about **relational absence** — feeling disconnected, isolated,
or unseen even when physically surrounded by people. Research validates it as a
psychologically distinct state that appears in EMA instruments designed for
non-clinical daily use.

> **Source:** 11-item EMA mood set validated for non-clinical daily use includes
> "lonely" as a distinct item.
> https://sciety.org/articles/activity/10.31234/osf.io/q4e9b_v1

---

## Emoji Design Principle

All 10 moods use **face emojis** exclusively. This creates:

1. **Visual consistency** — every mood option looks and feels the same "type"
2. **Instant recognition** — facial expressions are universally understood
   across cultures (Ekman's universality thesis)
3. **Emotional resonance** — seeing a face triggers mirror neuron activation,
   helping users connect with the emotion they're selecting

No abstract symbols (sparkles, hands, objects) are used in the mood set.

---

## Quadrant Colors — Why These Specific Colors?

The color scheme follows the **Yale Mood Meter** convention, which is the most
widely adopted color coding for the valence-arousal model in educational and
clinical settings worldwide:

| Quadrant                 | Color Family  | Primary Hex | Rationale                                                           |
| ------------------------ | ------------- | ----------- | ------------------------------------------------------------------- |
| High Energy + Pleasant   | Yellow / Gold | `#F2C94C`   | Bright, warm, sun-associated — universally linked to energy and joy |
| Low Energy + Pleasant    | Green / Teal  | `#43C59E`   | Cool, natural, soothing — universally linked to peace and nature    |
| High Energy + Unpleasant | Red / Coral   | `#E85D5D`   | Intense, hot, urgent — universally linked to alarm and activation   |
| Low Energy + Unpleasant  | Blue / Slate  | `#4D8DFF`   | Cool, withdrawn, still — "feeling blue" is a universal metaphor     |

Sub-moods within a quadrant use **lighter shades** of the family color to
maintain visual cohesion while remaining individually distinguishable:

| Mood       | Hex       | Shade level     |
| ---------- | --------- | --------------- |
| Joyful     | `#F2C94C` | Primary         |
| Excited    | `#FFDD67` | Light           |
| Inspired   | `#FFE99A` | Lighter         |
| Calm       | `#43C59E` | Primary         |
| Grateful   | `#6EE7B7` | Light           |
| Anxious    | `#E85D5D` | Primary         |
| Frustrated | `#F87171` | Light           |
| Sad        | `#4D8DFF` | Primary         |
| Drained    | `#7BA3E8` | Light           |
| Lonely     | `#94A3B8` | Lighter (faded) |

> **Source:** Brackett, M. A. (2019). _Permission to Feel._ The Mood Meter
> uses red/blue/green/yellow as canonical quadrant colors in educational
> settings worldwide. The How We Feel app adopted the same convention.

---

## Tags — Why Context Triggers?

### Decision

Tags represent **what triggered the feeling** (context), not sub-types of the
emotion itself.

### Rationale

The mood selection already serves emotional granularity — that's its purpose.
Adding sub-emotion tags would create redundancy and decision fatigue ("Am I
sad-lonely or lonely-sad?").

EMA (Ecological Momentary Assessment) studies consistently pair mood items with
**contextual questions**: "What were you doing?", "Who were you with?", "Where
were you?" This pattern — emotion + context — predicts wellbeing outcomes
better than emotion-only logging.

The How We Feel app similarly asks "What are you doing?" after mood selection —
not "What subtype of sadness is this?"

> **Source:** Barrett, L. F. (2017). "The theory of constructed emotion" —
> emotions are constructed from context, not context-free.
> https://www.sciencedirect.com/science/article/pii/S2352250X15000986

### Tag Categories

| Category             | Tags                                                        | Purpose                    |
| -------------------- | ----------------------------------------------------------- | -------------------------- |
| **Journaling mode**  | dream, gratitude, reflection, milestone                     | What kind of entry this is |
| **Context triggers** | work, relationship, health, social, family, creative, money | What prompted the feeling  |

Tags are shown as suggestions but users can always type custom tags freely.
This ensures the system grows with the user's vocabulary while providing
helpful starting points.

---

## Visual Design — Why Quadrant-Based UI?

### The Mood Picker (2×2 Grid)

Moods are arranged in a **2×2 quadrant grid** with subtle color tinting per
cell, not a flat list:

```
┌─────────────────┬─────────────────┐
│  (red tint)     │  (yellow tint)  │
│  😟 😤          │  😄 🤩 🤗       │
├─────────────────┼─────────────────┤
│  (blue tint)    │  (green tint)   │
│  😢 😩 🫥       │  😌 🥰          │
└─────────────────┴─────────────────┘
```

**Why this layout?**

1. **Spatial learning** — Users internalize "top = high energy, right =
   pleasant" through repeated use, building emotional vocabulary implicitly
2. **Color grouping** — After a few uses, users recognize their emotional
   quadrant at a glance without reading labels
3. **Granularity nudge** — The structure prevents always picking the same
   generic option; users naturally explore within their quadrant
4. **Teaching the model** — The layout itself is a micro-lesson in emotional
   awareness. Users learn the valence-arousal framework without being told.

### The Feelings List (Color Accent Borders)

Each feeling card has a **4px colored left border** matching its mood's
quadrant color. This creates a visual "emotional timeline" when scrolling:

- Streak of red borders → stressful, activated period
- Streak of green borders → calm, grounded period
- Mix of yellow → energetic, positive period
- Lots of blue → withdrawn, low-energy period

**Why this works:** The same color coding as the picker creates a consistent
mental model. Users don't need to read each entry's mood — the color pattern
tells the story at a glance. This supports the core goal of journaling:
recognizing patterns over time.

---

## Full Source List

| #   | Citation                                                                         | URL                                                                                                     |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Posner, Russell & Peterson (2005) — "The circumplex model of affect"             | https://pmc.ncbi.nlm.nih.gov/articles/PMC2367156/                                                       |
| 2   | Kuppens et al. (2013) — "The relation between valence and arousal in daily life" | https://www.sciencedirect.com/science/article/abs/pii/S0092656612001468                                 |
| 3   | Barrett et al. (2025) — "Dimensional vs. discrete: complementary frameworks"     | https://link.springer.com/article/10.1007/s42761-025-00337-6                                            |
| 4   | Hall et al. (2021) — "PANAS-X as dominant EMA measure"                           | https://pmc.ncbi.nlm.nih.gov/articles/PMC10213137/                                                      |
| 5   | Yale/Brackett — "How We Feel app: emotional granularity by design"               | https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/ |
| 6   | Scherer (2005) — "Geneva Emotion Wheel (20 emotion families)"                    | https://www.unige.ch/cisa/gew                                                                           |
| 7   | Choice overload in self-care (2025, n=652)                                       | https://pmc.ncbi.nlm.nih.gov/articles/PMC12705060/                                                      |
| 8   | Barrett (2017) — "The theory of constructed emotion"                             | https://www.sciencedirect.com/science/article/pii/S2352250X15000986                                     |
| 9   | EMA mood set validation (preprint, N=93)                                         | https://sciety.org/articles/activity/10.31234/osf.io/q4e9b_v1                                           |
| 10  | Trampe et al. (2015) — "Emotions in everyday life"                               | https://pmc.ncbi.nlm.nih.gov/articles/PMC8751584/                                                       |

---

## Implementation Notes

### Single Source of Truth

All mood and tag definitions live in
`packages/shared/src/models/feeling/feeling.constants.ts`. Frontend components
import from `@baita/shared` — no hardcoded mood lists anywhere in the UI layer.

### Schema Validation

The Zod schema (`feeling.schema.ts`) derives its mood enum directly from the
constants file, ensuring compile-time safety: if a mood is added or removed in
constants, TypeScript catches all mismatches across the entire monorepo.

### i18n

Each mood carries `labels: { en, pt }`. The frontend reads the app's current
language setting and selects the appropriate label at render time.

### Emoji Consistency

All 10 moods use face emojis exclusively. This is a deliberate constraint for
visual harmony and instant emotional recognition.
