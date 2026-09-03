<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# Motion

## 3. Motion doctrine

This is the most-agreed and most-actionable body of knowledge in the corpus. Three
independent authors (`apple-design`, `emil-design-eng`, `find-animation-opportunities`)
converge hard.

### 3.1 The gate — should this animate at all?

`find-animation-opportunities` runs four questions, and **requires** the agent to
report what it *rejected*, not just what it proposed:

1. **Frequency** — how often will a user see this? High-frequency actions should
   animate *less*, not more.
2. **Purpose** — why does this animate? "Delight" alone is not a purpose.
3. **Speed** — can it stay inside budget?
4. **Function** — does motion help or hinder here?

The rejected-candidates requirement is the single best anti-slop mechanism found
anywhere in this corpus. Adopt it: **any motion proposal must come with a list of
things deliberately left still.**

Hard consequence, from `emil-design-eng`: *"Never animate keyboard-initiated actions.
These actions are repeated hundreds of times daily. Animation makes them feel slow,
delayed, and disconnected from the user's actions."*

### 3.2 Easing and duration

- *"Never use ease-in for UI animations. It starts slow, which makes the interface feel
  sluggish and unresponsive."* — `emil-design-eng`. A dropdown with `ease-in` at 300ms
  *feels* slower than `ease-out` at the same duration, because it delays movement at
  exactly the moment the user is watching.
- *"UI animations should stay under 300ms."* Same source. 180ms reads as more responsive
  than 400ms.
- Ambient/atmospheric motion is the exception — it lives on a different clock and should
  be slow enough to be nearly subliminal.

**The one hard contradiction in the corpus, and how to resolve it.** `emil-design-eng`
states a blanket "under 300ms for UI animations." `animation-systems` (modelled on
Stripe/Linear/Apple/Vercel) publishes a duration table that explicitly sanctions much
longer:

| Motion class | Duration |
|---|---|
| Micro — hover, press | 120–200ms |
| UI state change | 180–260ms |
| Small transition — popover, toast | 220–320ms |
| Page-section entrance | 400–800ms |
| Hero sequence | 800–1600ms |

Both state their numbers as universal, so an agent following both verbatim gets conflicting
guidance on, say, a marketing hero's CTA button. **The resolution is a boundary neither
author states: the cap governs the interactive feedback loop (anything the user triggers
and waits on), the long end governs one-time narrative choreography the user watches.**
Decide which of the two any given element is, then apply the matching budget. When an
element is both — a hero CTA — it is a feedback loop, and the cap wins.

Stagger default: 40–90ms per element, reduced on mobile.

### 3.3 Springs, and why they beat keyframes

`apple-design` calls interruptibility *"the single most important principle"* and the
reasoning generalizes far past Apple:

- **Always animate from the presentation (current) value, never the target value.**
  On interrupt, read the live on-screen transform and start from there. Starting from
  the logical value causes a visible jump.
- *"Avoid CSS transitions and `@keyframes` for anything gesture-driven — they can't be
  smoothly grabbed and reversed mid-flight."* Springs animate from the current value by
  default, which is exactly what interruption needs.
- **Never lock out input during a transition.**
- **Velocity handoff** — the seam between a drag and the animation that follows it is
  where cheap UI reveals itself. Carry the gesture's velocity into the spring.
- **Momentum projection** — don't snap to the boundary nearest the *release point*.
  Project where the gesture was *going*, then snap to the target nearest that. This is
  what makes a flick feel like a throw.
- **Rubber-banding** — boundaries should resist, not stop.

`emil-design-eng` supplies the concrete threshold for the same idea: don't require
dragging past a distance threshold; compute `velocity = |dragDistance| / elapsedTime`
and dismiss when velocity exceeds roughly `0.11`. A quick flick should be enough.

### 3.4 Component-level motion details worth stealing

From `emil-design-eng`, each of these is a small thing that compounds:

- **Never animate from `scale(0)`** — it looks like a bug, not an entrance.
- **Make popovers origin-aware** — they should grow from the control that opened them.
- **Tooltips: skip the delay on subsequent hovers** — the delay exists to prevent
  accidental triggering, which is no longer a risk once the user is clearly browsing.
- **Use blur to mask imperfect transitions** — a few px of blur hides interpolation
  the eye would otherwise catch.
- **`translateY` with percentages, not pixels** — adapts to content, less error-prone.
- **`scale()` scales children too** — usually not what you want on a card hover.
- **`clip-path: inset()` for reveals** — the hold-to-delete pattern, image reveals on
  scroll, and comparison sliders are all one technique.
- **`@starting-style`** for enter animations without JS.

### 3.5 Framework hygiene

- *"NEVER mix GSAP / Three.js with Motion in the same component tree. They fight over
  the same frames."* — `design-taste-frontend`
- *"NEVER use `useState` to track continuous values driven by user input (mouse
  position, scroll progress, pointer physics, magnetic hover). Use Motion's
  `useMotionValue` / `useTransform` / `useScroll`."* Same source — `useState`
  re-renders the tree on every change and collapses on mobile. **This single mistake
  is the most common cause of a beautiful desktop demo being unusable on a phone.**
- Save GSAP for real pin/scrub work; use lighter scroll-reveal for "enter on scroll."
- `will-change: transform` sparingly — only on elements that actually animate.

---

### 3.6 The strongest consensus in the entire corpus

**Six** independent sources — `apple-design`, the anti-slop catalog,
`build-awwwards-quality-sites`, `animation-systems`, `auteur` and `styleseed` — state the
same rule in different words, which makes it the highest-confidence finding here:

> **Reduced motion must present a stable final state — not the same animation played faster.**

Shortening durations under `prefers-reduced-motion` is the common implementation and it is
wrong. The correct behaviour is to render the settled end state immediately, and to bypass
scrubbed scroll timelines entirely rather than compressing them.

### What the corpus agrees on, ranked by independent-source count

Convergence across authors who did not cite each other is the strongest evidence available
here. Ranked:

| Rule | Independent sources |
|---|---|
| Animate `transform` / `opacity` only | 8+ |
| Purple-to-blue gradient is dead (one skill calls it "the lila ban") | 7 |
| Cream / warm-beige / terracotta "editorial" cluster is the reigning slop default | 6 |
| Reduced motion = complete stable state, never merely faster | 6 |
| WCAG 4.5:1 body / 3:1 large text | most-repeated exact number in the corpus |
| One accent colour, spent deliberately | near-universal, plus 4 real brand systems |
| `scale(0.95)` entrances, never `scale(0)` | 4 (identical number) |
| 44x44px minimum touch target | 4 |
| Frequency-gated animation permission (100+/day gets zero motion) | 3 |
| 3-8 mutually exclusive named page "grammars" as the structure decision | 3 |

The last row is notable: three skills independently arrived at the idea that page structure
should be chosen from a small set of *named, mutually exclusive* grammars rather than
assembled freeform — and each requires justifying why the other grammars did not fit.

Two companions from `build-awwwards-quality-sites` worth adopting verbatim:

- **"Evaluate Lenis and Locomotive Scroll, then choose exactly one. Never install or
  initialize both."** Two smooth-scroll engines fighting for the same scroll position is a
  common and very hard-to-diagnose failure.
- **Split text must preserve the accessible name.** Hide decorative split words from
  assistive technology, and never split links or meaningful inline markup.

---
