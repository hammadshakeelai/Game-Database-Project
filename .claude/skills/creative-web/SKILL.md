---
name: creative-web
description: Use when building or reviewing a website that must look authored rather than generated - landing pages, portfolios, brand sites, scroll-driven narrative pages, or any UI where the visual result matters. Supplies a design decision procedure, an executable anti-slop gate, and a cross-build registry that stops the agent repeating itself. Also use when asked to make a page "less generic", "more distinctive", or "not look AI-made".
---

# Creative Web

Distilled from 60 design skills read as primary source, 5 reverse-engineered brand systems,
and 10 award-tier sites measured directly. Full corpus: `research/` at the repo root.

**The core problem this exists to solve:** an agent's default aesthetic is an average of
averages, and the obvious fix — avoiding the known clichés — has itself become a cliché.

## Order of operations

```
DESIGN READ → REFLEX LADDER → FINGERPRINT CHECK → DIALS → BUILD → SLOPSCAN → FEEL CHECK
```

Do not write CSS before the first three are done in writing.

---

## 1. Design read (write this out, ~5 lines)

- **Mode** — Persuade / Operate / Read / Experience. *What is the visitor here to do?*
  Most generic output fails by applying Persuade styling to an Operate or Read page.
- **Emotion** — one sentence.
- **Metaphor** — one sentence. Prevents unrelated effects being bolted on later.
- **Hero interaction** — exactly one thing gets the performance budget.
- **The one aesthetic risk** — one. Not zero, not five.

Then: **what stays still?** Any motion proposal must ship with a list of what you
deliberately left unanimated. This is the single best anti-slop mechanism in the corpus.

## 2. The reflex ladder — run before choosing a palette

1. *"An AI told to design a ⟨category⟩ site would produce ⟨palette, type, layout⟩."*
   If your plan matches — discard it.
2. *"An AI told to **avoid** that would produce ⟨…⟩."*
   If your plan matches that — **discard it too.** The second reflex is saturated.

| Category | 1st-order (dead) | 2nd-order (also dead) | Live escape |
|---|---|---|---|
| AI / dev tool | dark bg, purple-blue glow, terminal type | editorial serif on off-white | physical-material metaphor; single drenched hue; blueprint density |
| Fintech | navy + gold, trust badges, glass | terminal-native dark | ledger/print heritage; numerals that mean something |
| SaaS B2B | blue gradient hero, 3 cards, hero-metric | cream editorial + serif | product-as-hero (real annotated UI); mono-hue drench |
| Wellness | sage + beige + airy serif | clinical ultra-white | saturated botanical; candle-lit dark; documentary photo |
| Luxury | black + gold + thin serif | ultra-minimal white void | drenched jewel tone; cinematic letterbox |

## 3. Fingerprint check — do not repeat yourself

Read `FINGERPRINTS.md` in this skill directory. Your plan must differ from **every** prior
row on **at least 4 of 6** dimensions (grammar, nav, hero device, palette, type, signature
move) — against each row individually, not on average.

If it fails, change the plan, not the log. Append your row when the build ships.

*Why:* one skill measured its own output and found eight of nine builds dark, three within
0.002 lightness of each other, the same header in seven of nine. None is a mistake; all of
them together are a signature the client did not order.

## 4. Dials

Set explicitly: **VARIANCE / MOTION / DENSITY**, each 1–10.

| Page kind | V | M | D |
|---|---|---|---|
| Editorial / portfolio / brand | high | med-high | low |
| Marketing landing | med-high | med | med |
| Product UI / dashboard | low | low | high |
| Documentation | low | very low | med |

High motion and high density are mutually exclusive. A dense page that also animates
everywhere is unreadable.

---

## 5. Non-negotiables

Consensus rules, ranked by how many independent authors reached them. Violating these is
almost always wrong.

- Animate **`transform` and `opacity` only** (8+ sources).
- **No `ease-in` on UI motion** — it delays movement at the moment the user is watching.
- **UI feedback under 300ms.** Narrative/hero choreography may run 800–1600ms. Decide which
  one an element is; when it is both (a hero CTA), it is feedback, and the cap wins.
- **`scale(0.95)` entrances, never `scale(0)`** (4 sources, identical number).
- **`prefers-reduced-motion` renders a complete stable final state**, never the same
  animation played faster (6 sources).
- **One accent colour**, spent deliberately. No pure `#000000` — off-black at minimum.
- Contrast **4.5:1** body / **3:1** large. Over video, measure at the *brightest frame under
  each line*, not against a static swatch.
- Touch targets **≥44×44px**.
- **Not Inter by default.** Type is the most ownable layer — 8 of 10 measured award-tier
  sites used a custom or self-hosted face; none used Inter.
- **DOM budget.** Measured reference tier runs 175–2,089 nodes, median ~640. If you are
  emitting 4,000 nodes of wrappers, you are already off the path.
- Never route continuous pointer/scroll values through `useState` — use motion values. This
  is the most common cause of a good desktop demo collapsing on mobile.
- Never mix GSAP/Three.js with Motion in one component tree; they fight over frames.

## 6. Structure, for narrative scroll pages

- **Feeling curve before device.** One emotion + its on-screen cause per act, authored
  before any technique is chosen. Feeling is not energy: on a loud page the quiet act can be
  the most intense.
- **Exactly one engineered peak.** Zero or three competing peaks are both failures. Give it
  the most scroll room and the silence before it.
- *Five sections that behave identically are one section shown five times.*
- Page length 8–14 viewport-heights. At least 4 distinct device families. Never the same
  device twice consecutively. At most two video-scrub acts.
- Multi-screen product systems get **no** peak — there the failure mode is drift, not
  boredom.

## 7. Verify

```bash
node .claude/skills/creative-web/scripts/slopscan.mjs <src-dir>
```

Must exit 0. Fix failures; do not suppress them. Escape hatch requires a written reason
inline: `/* creative-web-allow: RULE_ID -- reason */`

Then the parts the scanner cannot do:

- **Feel check.** Scroll it cold, write one word per section, diff against the intended
  feeling curve. Where they disagree, **the page is wrong, not the brief.**
- **Greyscale check.** If the subject dissolves into its own field, the value collision is
  unmissable in greyscale and invisible in colour.
- **Three questions.** Could a stranger guess the category from the palette alone? *(then
  reflex won)* · Do any two sections open identically? · Would deleting the third
  font/colour/pattern hurt? *(if no, delete it)*
- **Real device.** Headless Chrome cannot reproduce a phone's video decoder, autoplay
  policy or Low Power Mode. One documented build passed four green automated rounds with a
  frozen hero clip on the actual device.

**Stop at the quality floor, not at 100.** Two sources independently warn that polishing
past roughly 80/100 sands off the risk that made the work distinctive.

---

## References — load on demand

| File | When |
|---|---|
| `references/anti-slop.md` | Full ban list, removal test, high-signal clusters, fabricated-proof rules |
| `references/motion.md` | Springs, interruptibility, velocity handoff, durations, gesture detail |
| `references/webgl-3d.md` | Draw-call budgets, instancing ladder, lights, post-processing order, DPR |
| `references/typography-color.md` | Type scale, tracking by size, OKLCH palettes, brand-system findings |
| `references/patterns.json` | 53 interaction patterns with tech, perf cost, mobile + a11y fallbacks |
| `references/recipes.md` | 8 build recipes (scroll reveal, WebGL planes, liquid distortion, …) |
| `references/measured-sites.md` | What 10 award-tier sites actually do structurally |
