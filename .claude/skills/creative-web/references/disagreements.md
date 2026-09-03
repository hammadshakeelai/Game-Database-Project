<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# Where the authors disagree

## 9. Where the authors disagree

The disagreements mark the genuinely discretionary choices. Five are substantive; two of
those are unresolved.

**A. Exit easing — a direct, verbatim conflict.** `genjutsu` specifies `ease-in` for exit
animations; `auteur` and `emil-design-eng` ban `ease-in` on *all* UI motion. There is no
page-type boundary to hide behind: these authors disagree about the same element in the
same situation. **Unresolved.** The majority position (ease-out for both enter and exit) has
more sources behind it and the better stated reason — `ease-in` delays movement at exactly
the moment the user is watching — so default to it, but know this is a real fork.

**B. Duration.** `emil-design-eng`'s blanket sub-300ms cap versus `animation-systems`'
800-1600ms hero sequences. **Resolved by surface type**: the cap governs interactive
feedback loops, the long end governs one-time narrative choreography (see §3.2).

**C. Cinematic scroll motion — slop or gold standard?** Some skills treat scroll-driven
cinematic pages as the height of the craft; others list the same devices as tells.
**Resolved by page type** — `styleseed` makes this explicit where others leave it implicit.
A scrubbed hero on a documentation site is slop; the same device on a product launch is the
point.

**D. Named grammars versus continuous dials — a real methodological fork.** `scroll-craft`,
`auteur` and `styleseed` use a small set of discrete, mutually exclusive page grammars.
`nxpatterns` (and `design-taste-frontend`'s three dials) instead use continuous numeric
levels. These are incompatible models of the same decision. **Unresolved**, and worth
knowing which one you are using: discrete grammars force a commitment and make repetition
detectable; dials interpolate and make drift invisible.

**E. Cards.** `nxpatterns` bans cards outright; `design-taste-frontend` restricts them to
cases where elevation communicates real hierarchy; `ckm:ui-styling` and the shadcn material
treat them as the default container. **The reverse-engineered brand files settle this
empirically**: Apple, Raycast and Vercel all use cards in production. The absolutist ban is
wrong. The correct rule is the restrictive one — cards when elevation carries meaning,
otherwise rules, dividers and negative space.

**F. Motion default.** Subtractive (`emil-design-eng`, `find-animation-opportunities`) versus
additive ambient motion (`gpt-taste`). **Resolved**: they address different layers. UI
response must be fast and minimal; ambient atmosphere is a separate, slower channel.
Conflating them produces the "everything floats" failure.

**G. Randomisation.** `gpt-taste` mandates seeded pseudo-randomness to escape default
composition; most others prefer deliberate art direction. **Resolved**: randomness is a
bias-correction crutch for generating candidates, not a design method. Choose among the
candidates deliberately.

**H. Design systems.** Token-first skills push reusable instances; taste-oriented skills warn
that a design system is what makes output look templated. **Resolved**: systematise the
invisible layer (spacing, colour, type scale, motion durations) and keep the signature layer
bespoke. Tokens should make risk-taking cheaper, not sand it off.

### The bounded polish loop

One rule appears in `impeccable` and `styleseed` and nowhere else, and it cuts against the
instinct of every agent: **stop improving at roughly 80/100, not 100.** The quality gate is
a *floor to clear*, not a ceiling to chase. Past that point the loop starts sanding off the
very risk that made the work distinctive — which is precisely how an ambitious design
converges back toward the safe default.

---
