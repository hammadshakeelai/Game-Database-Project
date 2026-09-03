<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# Typography, colour and brand systems

## 5. Typography and color, briefly

- Establish a **type scale with real contrast**. The AI failure is three sizes all
  within 1.3× of each other. Editorial work wants ratios that are uncomfortable at first.
- **Optical sizing, tracking, leading** vary with size — `apple-design` treats these as
  non-optional. Large display text needs negative tracking; small text needs positive.
- **Fluid type** via `clamp()` beats breakpoint-stepped sizes.
- `text-wrap: balance` on headings, `pretty` on body — cheap, and it is one of the
  details that separates typeset from dumped.
- **Color:** `stitch-design-taste` — absolute neutral bases (zinc/slate) with a
  high-contrast singular accent beats a multi-hue palette almost always.
- One accent, used consistently, reads as brand. Three accents read as a template.
- Contrast is a hard constraint, not a preference: WCAG AA minimum, AAA for body.
- **Both themes are mandatory** for consumer-facing work, and logos must render in
  both (white-on-dark, black-on-light, or a theme variable).

---


## 8.5 What reverse-engineering real brand systems reveals

Five major product brands (Stripe, Linear, Apple, Vercel, Raycast) were analysed as
`DESIGN.md` files from an entirely different source population than the hand-authored
skills — real systems observed from the outside rather than principles written down. Two
findings survive across all five, which makes them unusually well-evidenced.

### One signature move, everything else quiet

**Every one of the five independently declares a single bold gesture and then enforces
silence everywhere else.** Stripe: a gradient mesh confined to the upper third of marketing
pages only. Linear: a single chromatic accent, *"no second chromatic color, no atmospheric
gradients, no spotlight cards."* Apple: alternating light/dark full-bleed tiles where *"the
color change IS the divider"* — no rules or gradients needed between sections. Vercel: the
mesh gradient is the brand, but hero-only and never at icon scale. Raycast: one red stripe
gradient, *"exactly once per page… never repeat the stripe deeper in the page."*

This is the §1 "one aesthetic risk" question, confirmed from the outside. The pattern is
not "be bold" or "be restrained" — it is **spend the entire boldness budget in one place
and protect it by keeping everything else quiet.**

### Negative tracking on display type is a named, sized rule

All five specify letter-spacing as an exact value keyed to font size, not a vague "tight
tracking": Stripe scales from −1.4px at 56px to −0.2px at 20px; Linear states it as a ratio
(*"−3.0px at 80px ≈ 4% of size"*); Apple gates it by size and never applies it at 12px or
below. Three of the five explicitly say reverting to default tracking **breaks the brand**.

Large type set at default tracking is one of the most reliable tells of unconsidered work,
and it is a one-line fix.

Other transferable specifics: Apple's weight ladder is 300/400/600/700 with **500
deliberately absent**, body copy at 17px rather than the conventional 16px, and exactly one
shadow value in the whole system reserved for product renders. Vercel uses **stacked
shadows** — several small layered offsets faking natural light — never a single generic
8px blur. Linear and Raycast both build a four-step surface ladder with a no-skipping rule
and neither uses drop shadows at all. Linear forbids `#000000` as canvas, using `#010102`.

### The artifact format worth stealing

The `DESIGN.md` convention itself is directly useful for agent work. Its thesis:

> *"A token tells you what to use but not where. A rule tells you where but not when to
> bend it. The rationale is what lets an agent make the right call when it hits a situation
> the file never covers."*

Token + rule + **rationale** in one versioned file. Colour keys are role names
(`surface-2`, not `gray-100`); typography keys are roles (`display-lg`, not `h1`);
components are composed only from `{token.refs}`, never inline hex or px; state variants
are sibling entries rather than nested objects. Two enforceable disciplines make it real: a
**coverage lint** requiring the token block and the prose section to match 1:1, and a
mandatory **`## Known Gaps`** section declaring what the file does *not* cover. Stating the
gaps up front is what keeps the contract honest — and is exactly what a coding agent needs
in order to know when it is improvising.

---
